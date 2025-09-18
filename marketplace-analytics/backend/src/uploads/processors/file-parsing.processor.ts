import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from '../../analytics/analytics.service';
import { Marketplace } from '../../common/constants';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import * as fs from 'fs';
import * as path from 'path';

interface FileParsingJob {
  reportId: string;
  filePath: string;
  marketplace: Marketplace;
}

@Processor('file-parsing')
@Injectable()
export class FileParsingProcessor {
  private readonly logger = new Logger(FileParsingProcessor.name);

  constructor(
    private prisma: PrismaService,
    private analyticsService: AnalyticsService,
  ) {}

  @Process('parse-file')
  async handleFileParsingJob(job: Job<FileParsingJob>) {
    const { reportId, filePath, marketplace } = job.data;
    
    this.logger.log(`Starting to parse file for report ${reportId}`);

    try {
      // Парсинг файла
      const parsedData = await this.parseFile(filePath, marketplace);
      
      // Расчет аналитики для каждой строки с обработкой ошибок
      const salesData = await Promise.allSettled(
        parsedData.map(async (row) => {
          try {
            const analytics = await this.analyticsService.calculateRowAnalytics(
              row,
              marketplace,
            );
            return {
              reportId,
              ...analytics,
            };
          } catch (error) {
            this.logger.warn(`Failed to process row with SKU ${row?.sku}: ${error.message}`);
            return null;
          }
        }),
      );

      // Extract successful results and filter out failed ones
      const validSalesData = salesData
        .filter((result): result is PromiseFulfilledResult<any> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value);

      // Additional validation to ensure all dates are valid before database insertion
      const finalValidatedData = validSalesData.filter(item => {
        if (!item.saleDate || isNaN(item.saleDate.getTime())) {
          this.logger.warn(`Filtering out item with invalid date - SKU: ${item.sku}, Date: ${item.saleDate}`);
          return false;
        }
        return true;
      });

      // Сохранение данных в БД
      await this.prisma.$transaction(async (tx) => {
        if (finalValidatedData.length === 0) {
          throw new Error('No valid sales data found after processing and validation. Please check your file format and date fields.');
        }

        this.logger.log(`Processing ${finalValidatedData.length} valid sales records out of ${parsedData.length} total parsed records`);

        // Сохранение данных продаж
        await tx.salesData.createMany({
          data: finalValidatedData,
        });

        // Расчет общих метрик отчета
        const totalRevenue = finalValidatedData.reduce((sum, item) => sum + item.revenue, 0);
        const totalProfit = finalValidatedData.reduce((sum, item) => sum + item.netProfit, 0);
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        // Обновление отчета
        await tx.report.update({
          where: { id: reportId },
          data: {
            processed: true,
            totalRevenue,
            totalProfit,
            profitMargin,
          },
        });
      });

      // Удаление временного файла
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      this.logger.log(`Successfully parsed file for report ${reportId}`);
    } catch (error) {
      this.logger.error(`Error parsing file for report ${reportId}:`, error);
      
      // Обновление статуса отчета как ошибочного
      await this.prisma.report.update({
        where: { id: reportId },
        data: { processed: false },
      });

      throw error;
    }
  }

  private async parseFile(filePath: string, marketplace: Marketplace) {
    const fileExtension = path.extname(filePath).toLowerCase();
    
    if (fileExtension === '.csv') {
      return this.parseCsvFile(filePath, marketplace);
    } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      return this.parseExcelFile(filePath, marketplace);
    } else {
      throw new Error(`Unsupported file format: ${fileExtension}`);
    }
  }

  private async parseCsvFile(filePath: string, marketplace: Marketplace) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Clean up the file content to handle potential encoding issues
    let cleanedContent = fileContent
      .replace(/\0/g, '') // Remove null bytes
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n'); // Handle old Mac line endings
    
    // Split into lines and clean up each line
    const lines = cleanedContent.split('\n');
    const cleanedLines = lines.map((line, index) => {
      // Skip header line
      if (index === 0) return line;
      
      // Skip empty lines
      if (!line.trim()) return '';
      
      // CRITICAL FIX: More aggressive cleaning for corrupted lines
      // Check if line starts with a valid date pattern (DD.MM.YYYY)
      const startsWithDate = /^\d{1,2}\.\d{1,2}\.\d{4}/.test(line.trim());
      
      if (!startsWithDate) {
        // Line doesn't start with a date - it's likely corrupted
        // Try to find a date pattern anywhere in the line and extract valid data from there
        const dateMatch = line.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
        if (dateMatch) {
          const dateStr = dateMatch[1];
          const dateIndex = line.indexOf(dateStr);
          
          // Extract everything from the date onwards
          let reconstructedLine = line.substring(dateIndex);
          
          // Clean up the reconstructed line - remove any leading commas or quotes
          reconstructedLine = reconstructedLine.replace(/^[,"\s]+/, '');
          
          // Check if we have a reasonable number of fields after cleaning
          const parts = reconstructedLine.split(',');
          if (parts.length >= 7) {
            this.logger.debug(`Reconstructed corrupted line: "${line.substring(0, 100)}..." -> "${reconstructedLine.substring(0, 100)}..."`);
            return reconstructedLine;
          }
        }
        
        // If we can't reconstruct, skip this line
        this.logger.warn(`Skipping corrupted line that doesn't start with date: "${line.substring(0, 100)}..."`);
        return '';
      }
      
      // Additional check for lines that have product names mixed into other fields
      // Split by comma and check if any field contains suspicious content
      const parts = line.split(',');
      if (parts.length >= 3) {
        // Check if SKU field (second field) looks suspicious
        const skuField = parts[1];
        if (skuField && (skuField.includes('Книга') || skuField.includes('Видеокарта') || 
            skuField.includes('Фен') || skuField.includes('Кофеварка') || 
            skuField.includes('Пылесос') || skuField.includes('Электрочайник') ||
            skuField.length > 50)) {
          this.logger.warn(`Skipping line with corrupted SKU field: "${line.substring(0, 100)}..."`);
          return '';
        }
        
        // Check if product name field (third field) is reasonable
        const nameField = parts[2];
        if (nameField && (nameField.length > 200 || nameField.includes('\n'))) {
          this.logger.warn(`Skipping line with corrupted name field: "${line.substring(0, 100)}..."`);
          return '';
        }
      }
      
      return line;
    }).filter(line => line.trim() !== ''); // Remove empty lines
    
    cleanedContent = cleanedLines.join('\n');
    
    const parsed = Papa.parse(cleanedContent, {
      header: true,
      skipEmptyLines: true,
      delimiter: ',',
      quoteChar: '"',
      escapeChar: '"',
      transformHeader: (header) => header.trim(), // Clean headers
    });

    // Log parsing errors if any
    if (parsed.errors && parsed.errors.length > 0) {
      this.logger.warn(`CSV parsing errors found:`, parsed.errors.slice(0, 5)); // Log first 5 errors
    }

    // Filter out rows that still look corrupted
    const validRows = parsed.data.filter((row: any) => {
      // Check if the row has the basic required fields
      const dateField = row['Дата'] || row['Date'] || row['date'];
      const skuField = row['Артикул'] || row['SKU'] || row['sku'];
      
      // Skip rows where date field contains product names
      if (dateField && typeof dateField === 'string') {
        const dateStr = dateField.toString();
        if (dateStr.includes('Книга') || dateStr.includes('Видеокарта') || 
            dateStr.includes('Фен') || dateStr.includes('Кофеварка') ||
            dateStr.includes('Пылесос') || dateStr.includes('Электрочайник') ||
            dateStr.length > 50) {
          return false;
        }
      }
      
      // Skip rows where SKU field is obviously wrong (too long or contains product names)
      if (skuField && typeof skuField === 'string') {
        const skuStr = skuField.toString();
        if (skuStr.length > 50 || skuStr.includes('Видеокарта') ||
            skuStr.includes('Фен') || skuStr.includes('Книга')) {
          return false;
        }
      }
      
      return true;
    });

    this.logger.log(`Filtered ${parsed.data.length - validRows.length} corrupted rows, processing ${validRows.length} valid rows`);

    return this.mapRowsToSalesData(validRows, marketplace);
  }

  private async parseExcelFile(filePath: string, marketplace: Marketplace) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    return this.mapRowsToSalesData(data, marketplace);
  }

  private mapRowsToSalesData(rows: any[], marketplace: Marketplace) {
    return rows.map((row) => {
      if (marketplace === Marketplace.WILDBERRIES) {
        return this.mapWildberriesRow(row);
      } else if (marketplace === Marketplace.OZON) {
        return this.mapOzonRow(row);
      } else {
        throw new Error(`Unsupported marketplace: ${marketplace}`);
      }
    }).filter(Boolean); // Удаляем пустые строки
  }

  private mapWildberriesRow(row: any) {
    const dateField = row['Дата продажи'] || row['Date'] || row['date'];
    const skuField = row['Артикул WB'] || row['SKU'] || row['sku'];
    const nameField = row['Наименование'] || row['Product Name'] || row['name'];
    const priceField = row['Цена продажи'] || row['Price'] || row['price'];
    const quantityField = row['Количество'] || row['Quantity'] || row['quantity'];
    const commissionField = row['Комиссия WB'] || row['Commission'] || row['commission'];

    if (!dateField || !skuField || !nameField || !priceField || !quantityField) {
      return null;
    }

    // Additional validation for corrupted data
    const skuString = String(skuField).trim();
    const nameString = String(nameField).trim();
    
    // Skip rows with obviously corrupted data
    if (skuString.length < 3 || skuString.length > 20 || 
        nameString.length < 3 || nameString.length > 200 ||
        nameString.includes('\n') || nameString.includes(',')) {
      this.logger.warn(`Skipping corrupted row: SKU ${skuString}, Name: ${nameString.substring(0, 50)}...`);
      return null;
    }

    // Validate numeric fields first
    const quantity = parseInt(quantityField);
    const price = parseFloat(priceField);
    
    if (isNaN(quantity) || quantity <= 0 || quantity > 10000) {
      this.logger.warn(`Invalid quantity for SKU ${skuField}: ${quantityField}`);
      return null;
    }
    
    if (isNaN(price) || price < 0 || price > 1000000) {
      this.logger.warn(`Invalid price for SKU ${skuField}: ${priceField}`);
      return null;
    }

    // Validate and parse date - this must be the last validation step
    const parsedDate = this.parseAndValidateDate(dateField);
    if (!parsedDate) {
      this.logger.warn(`Invalid date field for SKU ${skuField}: "${dateField}" (type: ${typeof dateField})`);
      return null;
    }
    
    // Double-check that the parsed date is valid
    if (isNaN(parsedDate.getTime())) {
      this.logger.warn(`Parsed date is NaN for SKU ${skuField}: "${dateField}" -> ${parsedDate}`);
      return null;
    }

    return {
      sku: skuString,
      productName: nameString,
      saleDate: parsedDate,
      quantity,
      price,
      commission: parseFloat(commissionField) || 0,
    };
  }

  private mapOzonRow(row: any) {
    const dateField = row['Дата'] || row['Date'] || row['date'];
    const skuField = row['Артикул'] || row['SKU'] || row['sku'];
    const nameField = row['Название товара'] || row['Product Name'] || row['name'];
    const priceField = row['Цена за единицу'] || row['Price'] || row['price'];
    const quantityField = row['Количество'] || row['Quantity'] || row['quantity'];
    const commissionField = row['Комиссия за продажу'] || row['Commission'] || row['commission'];

    if (!dateField || !skuField || !nameField || !priceField || !quantityField) {
      return null;
    }

    // Additional validation for corrupted data
    const skuString = String(skuField).trim();
    const nameString = String(nameField).trim();
    
    // Skip rows with obviously corrupted data
    if (skuString.length < 3 || skuString.length > 20 || 
        nameString.length < 3 || nameString.length > 200 ||
        nameString.includes('\n') || nameString.includes(',')) {
      this.logger.warn(`Skipping corrupted row: SKU ${skuString}, Name: ${nameString.substring(0, 50)}...`);
      return null;
    }

    // Validate numeric fields first
    const quantity = parseInt(quantityField);
    const price = parseFloat(priceField);
    
    if (isNaN(quantity) || quantity <= 0 || quantity > 10000) {
      this.logger.warn(`Invalid quantity for SKU ${skuField}: ${quantityField}`);
      return null;
    }
    
    if (isNaN(price) || price < 0 || price > 1000000) {
      this.logger.warn(`Invalid price for SKU ${skuField}: ${priceField}`);
      return null;
    }

    // Validate and parse date - this must be the last validation step
    const parsedDate = this.parseAndValidateDate(dateField);
    if (!parsedDate) {
      this.logger.warn(`Invalid date field for SKU ${skuField}: "${dateField}" (type: ${typeof dateField})`);
      return null;
    }
    
    // Double-check that the parsed date is valid
    if (isNaN(parsedDate.getTime())) {
      this.logger.warn(`Parsed date is NaN for SKU ${skuField}: "${dateField}" -> ${parsedDate}`);
      return null;
    }

    return {
      sku: skuString,
      productName: nameString,
      saleDate: parsedDate,
      quantity,
      price,
      commission: parseFloat(commissionField) || 0,
    };
  }

  /**
   * Parse and validate date field
   * @param dateField - The date field from CSV/Excel
   * @returns Valid Date object or null if invalid
   */
  private parseAndValidateDate(dateField: any): Date | null {
    if (!dateField) {
      return null;
    }

    // Convert to string and trim whitespace
    let dateString = String(dateField).trim();
    
    // Log the original date field for debugging
    if (dateString.length > 20 || /[а-яё]/i.test(dateString)) {
      this.logger.debug(`Processing suspicious date field: "${dateString}"`);
    }
    
    // First, check if this looks like a date at all
    // Must contain at least one digit and be reasonable length
    if (!/\d/.test(dateString) || dateString.length < 8 || dateString.length > 50) {
      this.logger.warn(`Date field too short or too long: "${dateString}"`);
      return null;
    }
    
    // Skip if the field looks corrupted (contains product names or other non-date data)
    if (/[а-яё]/i.test(dateString) || // Contains Cyrillic characters
        dateString.includes('"') ||
        dateString.includes('\n') ||
        /\d{10,}/.test(dateString) || // Contains long numbers (likely corrupted)
        /[,;:]{2,}/.test(dateString) || // Multiple delimiters
        dateString.includes('Видеокарта') || 
        dateString.includes('Фен') || 
        dateString.includes('Книга') ||
        dateString.includes('Кофеварка') ||
        dateString.includes('Пылесос') ||
        dateString.includes('Электрочайник') ||
        dateString.includes('Куртка') ||
        dateString.includes('Косметический') ||
        dateString.includes('Игровая') ||
        dateString.includes('Колонка') ||
        dateString.includes('Увлажнитель') ||
        dateString.includes('Рюкзак') ||
        dateString.includes('Наушники') ||
        dateString.includes('Часы') ||
        dateString.includes('Термос') ||
        dateString.includes('Смартфон') ||
        dateString.includes('Планшет') ||
        dateString.includes('Набор') ||
        dateString.includes('Кроссовки') ||
        dateString.includes('Матрас') ||
        dateString.includes('Apple') ||
        dateString.includes('Nike') ||
        dateString.includes('Samsung') ||
        dateString.includes('Dyson') ||
        dateString.includes('JBL') ||
        dateString.includes('Logitech') ||
        dateString.includes('Stanley') ||
        dateString.includes('Tefal') ||
        dateString.includes('Philips') ||
        dateString.includes('iPad') ||
        dateString.includes('iPhone') ||
        dateString.includes('AirPods') ||
        dateString.includes('Galaxy') ||
        dateString.includes('Watch') ||
        dateString.includes('RTX') ||
        dateString.includes('HD7447')) {
      return null;
    }
    
    // Extract potential date from the beginning of the string if it contains other data
    // Look for DD.MM.YYYY pattern at the start
    const dateMatch = dateString.match(/^(\d{1,2}\.\d{1,2}\.\d{4})/);
    if (dateMatch) {
      dateString = dateMatch[1];
    } else {
      // Look for other common date patterns
      const altDateMatch = dateString.match(/^(\d{4}-\d{1,2}-\d{1,2})/);
      if (altDateMatch) {
        dateString = altDateMatch[1];
      }
    }

    // CRITICAL FIX: Always parse DD.MM.YYYY format explicitly to avoid MM/DD/YYYY confusion
    let parsedDate: Date;
    
    // Handle different date formats - prioritize DD.MM.YYYY format
    if (dateString.includes('.')) {
      // DD.MM.YYYY format (most common for Russian CSV files)
      const parts = dateString.split('.');
      if (parts.length === 3) {
        const day = parseInt(parts[0].trim());
        const month = parseInt(parts[1].trim());
        const year = parseInt(parts[2].trim());
        
        // Validate day, month and year ranges
        if (isNaN(day) || isNaN(month) || isNaN(year) ||
            day < 1 || day > 31 || 
            month < 1 || month > 12 ||
            year < 1900 || year > 2100) {
          this.logger.warn(`Invalid date components: day=${day}, month=${month}, year=${year} from "${dateString}"`);
          return null;
        }
        
        // CRITICAL: Create date with explicit validation - use UTC to avoid timezone issues
        // Month is 0-indexed in JavaScript Date constructor
        parsedDate = new Date(Date.UTC(year, month - 1, day));
        
        // Additional validation: check if the created date components match input
        // Use UTC methods to avoid timezone confusion
        const createdDay = parsedDate.getUTCDate();
        const createdMonth = parsedDate.getUTCMonth() + 1; // Convert back to 1-indexed
        const createdYear = parsedDate.getUTCFullYear();
        
        if (createdDay !== day || createdMonth !== month || createdYear !== year) {
          this.logger.warn(`Date rollover detected for "${dateString}": expected ${day}/${month}/${year}, got ${createdDay}/${createdMonth}/${createdYear}`);
          return null;
        }
        
        this.logger.debug(`Successfully parsed date "${dateString}" -> ${parsedDate.toISOString()}`);
        
        // Validate the parsed date immediately
        if (isNaN(parsedDate.getTime())) {
          this.logger.warn(`Date creation failed for "${dateString}": parsedDate.getTime() is NaN`);
          return null;
        }
        
        return parsedDate; // Return immediately to avoid further processing
      } else {
        // Fallback for malformed dot-separated dates
        this.logger.warn(`Malformed dot-separated date: "${dateString}" (${parts.length} parts)`);
        return null;
      }
    } else if (dateString.includes('-') && /^\d{4}-\d{1,2}-\d{1,2}/.test(dateString)) {
      // YYYY-MM-DD format - parse explicitly to avoid confusion
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const day = parseInt(parts[2]);
        
        if (isNaN(day) || isNaN(month) || isNaN(year) ||
            day < 1 || day > 31 || 
            month < 1 || month > 12 ||
            year < 1900 || year > 2100) {
          return null;
        }
        
        // Use UTC to avoid timezone issues
        parsedDate = new Date(Date.UTC(year, month - 1, day));
        
        // Validate using UTC methods
        const createdDay = parsedDate.getUTCDate();
        const createdMonth = parsedDate.getUTCMonth() + 1;
        const createdYear = parsedDate.getUTCFullYear();
        
        if (createdDay !== day || createdMonth !== month || createdYear !== year) {
          return null;
        }
      } else {
        return null;
      }
    } else if (dateString.includes('/')) {
      // Handle DD/MM/YYYY format (assume DD/MM/YYYY for European format, not MM/DD/YYYY)
      const parts = dateString.split('/');
      if (parts.length === 3) {
        // Assume DD/MM/YYYY format for slash-separated dates in European context
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        
        if (isNaN(day) || isNaN(month) || isNaN(year) ||
            day < 1 || day > 31 || 
            month < 1 || month > 12 ||
            year < 1900 || year > 2100) {
          return null;
        }
        
        // Use UTC to avoid timezone issues
        parsedDate = new Date(Date.UTC(year, month - 1, day));
        
        // Validate using UTC methods
        const createdDay = parsedDate.getUTCDate();
        const createdMonth = parsedDate.getUTCMonth() + 1;
        const createdYear = parsedDate.getUTCFullYear();
        
        if (createdDay !== day || createdMonth !== month || createdYear !== year) {
          return null;
        }
      } else {
        return null;
      }
    } else if (/^\d{1,2}\s+\d{1,2}\s+\d{4}$/.test(dateString)) {
      // Handle space-separated dates like "17 09 2025" - assume DD MM YYYY
      const parts = dateString.split(/\s+/);
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        
        if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
          return null;
        }
        
        // Use UTC to avoid timezone issues
        parsedDate = new Date(Date.UTC(year, month - 1, day));
        
        // Validate using UTC methods
        const createdDay = parsedDate.getUTCDate();
        const createdMonth = parsedDate.getUTCMonth() + 1;
        const createdYear = parsedDate.getUTCFullYear();
        
        if (createdDay !== day || createdMonth !== month || createdYear !== year) {
          return null;
        }
      } else {
        return null;
      }
    } else {
      // For any unrecognized format, try one more time to parse as DD.MM.YYYY
      const dotParts = dateString.split('.');
      if (dotParts.length === 3) {
        const day = parseInt(dotParts[0]);
        const month = parseInt(dotParts[1]);
        const year = parseInt(dotParts[2]);
        
        if (isNaN(day) || isNaN(month) || isNaN(year) ||
            day < 1 || day > 31 || 
            month < 1 || month > 12 ||
            year < 1900 || year > 2100) {
          return null;
        }
        
        // Use UTC to avoid timezone issues
        parsedDate = new Date(Date.UTC(year, month - 1, day));
        
        // Validate using UTC methods
        const createdDay = parsedDate.getUTCDate();
        const createdMonth = parsedDate.getUTCMonth() + 1;
        const createdYear = parsedDate.getUTCFullYear();
        
        if (createdDay !== day || createdMonth !== month || createdYear !== year) {
          return null;
        }
      } else {
        this.logger.warn(`Unrecognized date format: "${dateString}"`);
        return null;
      }
    }

    // Validate the parsed date
    if (isNaN(parsedDate.getTime())) {
      this.logger.warn(`Final date validation failed for "${dateString}": parsedDate.getTime() is NaN`);
      return null;
    }

    // Additional validation: check if date is reasonable (not too far in past/future)
    const currentYear = new Date().getFullYear();
    const dateYear = parsedDate.getUTCFullYear();
    
    if (dateYear < 2020 || dateYear > currentYear + 1) {
      this.logger.warn(`Date year out of range for "${dateString}": ${dateYear} (expected 2020-${currentYear + 1})`);
      return null;
    }

    return parsedDate;
  }

  /**
   * Helper function to safely parse date from string with DD.MM.YYYY format
   * @param dateString - Date string in DD.MM.YYYY format
   * @returns Valid Date object or null if invalid
   */
  private parseDate(dateString: string): Date | null {
    if (!dateString || typeof dateString !== 'string') {
      return null;
    }

    // Clean the date string
    const cleanDateString = dateString.trim();
    
    // Handle DD.MM.YYYY format specifically
    const dateParts = cleanDateString.split('.');
    if (dateParts.length === 3) {
      const day = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]);
      const year = parseInt(dateParts[2]);
      
      // Validate ranges
      if (isNaN(day) || isNaN(month) || isNaN(year) ||
          day < 1 || day > 31 || 
          month < 1 || month > 12 ||
          year < 2020 || year > 2030) {
        return null;
      }
      
      // Use UTC to avoid timezone issues
      const date = new Date(Date.UTC(year, month - 1, day));
      
      // Verify the date didn't roll over using UTC methods
      const createdDay = date.getUTCDate();
      const createdMonth = date.getUTCMonth() + 1;
      const createdYear = date.getUTCFullYear();
      
      if (createdDay !== day || createdMonth !== month || createdYear !== year) {
        return null;
      }
      
      return date;
    }
    
    // Fallback to regular Date parsing for other formats
    const parsed = new Date(cleanDateString);
    if (isNaN(parsed.getTime())) {
      return null;
    }
    
    return parsed;
  }
}