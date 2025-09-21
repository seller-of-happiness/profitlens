import { Process, Processor } from "@nestjs/bull";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bull";
import { PrismaService } from "../../prisma/prisma.service";
import { AnalyticsService } from "../../analytics/analytics.service";
import { Marketplace } from "../../common/constants";
import * as XLSX from "xlsx";
import * as Papa from "papaparse";
import * as fs from "fs";
import * as path from "path";

interface FileParsingJob {
  reportId: string;
  filePath: string;
  marketplace: Marketplace;
}

class CSVParser {
  private logger = new Logger(CSVParser.name);

  parseCSV(content: string) {
    const delimiter = this.detectDelimiter(content);
    let fixedContent = this.fixCommonCSVErrors(content, delimiter);

    // Дополнительное исправление trailing quotes
    fixedContent = this.fixTrailingQuotes(fixedContent);

    return Papa.parse(fixedContent, {
      header: true,
      skipEmptyLines: true,
      delimiter,
      quoteChar: '"',
      escapeChar: '"',
      transformHeader: (header) => header.trim(),
    });
  }

  private detectDelimiter(csvContent: string): string {
    // Берем первые строки, чтобы понять разделитель
    const sample = csvContent.split("\n").slice(0, 5).join("\n");
    const commaCount = (sample.match(/,/g) || []).length;
    const semicolonCount = (sample.match(/;/g) || []).length;
    return semicolonCount > commaCount ? ";" : ",";
  }

  private fixMultilineFields(csvContent: string, delimiter: string): string {
    this.logger.debug("Fixing multiline fields and mixed data in CSV content");
    
    const lines = csvContent.split('\n');
    const fixedLines: string[] = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      
      // Заголовок или пустая строка - пропускаем
      if (i === 0 || !line.trim()) {
        fixedLines.push(line);
        i++;
        continue;
      }
      
      // Проверяем, содержит ли строка смешанные данные (несколько дат)
      const dateMatches = line.match(/\d{2}\.\d{2}\.\d{4}/g);
      
      if (dateMatches && dateMatches.length > 1) {
        this.logger.debug(`Found ${dateMatches.length} dates in line, splitting...`);
        
        // Разделяем смешанную строку на отдельные записи
        const splitRows = this.splitMixedCSVLine(line, delimiter);
        fixedLines.push(...splitRows);
        
        this.logger.debug(`Split line into ${splitRows.length} separate rows`);
      } else {
        // Обычная обработка - объединяем многострочные поля
        let combinedLine = line;
        let nextIndex = i + 1;
        
        while (nextIndex < lines.length && !this.isCompleteCSVLine(combinedLine, delimiter)) {
          combinedLine += ' ' + lines[nextIndex].trim();
          nextIndex++;
        }
        
        // Очищаем название товара от артефактов
        combinedLine = this.cleanProductNameField(combinedLine, delimiter);
        
        fixedLines.push(combinedLine);
        i = nextIndex - 1; // -1 потому что цикл сам увеличит i
      }
      
      i++;
    }
    
    const result = fixedLines.join('\n');
    
    if (result !== csvContent) {
      this.logger.debug("CSV content was modified to fix multiline fields and mixed data");
    }
    
    return result;
  }

  private splitMixedCSVLine(line: string, delimiter: string): string[] {
    // Ищем все даты в строке
    const datePattern = /(\d{2}\.\d{2}\.\d{4})/g;
    const datePositions: Array<{ date: string; index: number }> = [];
    let match;
    
    while ((match = datePattern.exec(line)) !== null) {
      datePositions.push({
        date: match[1],
        index: match.index
      });
    }
    
    if (datePositions.length < 2) {
      return [line]; // Нет смешанных данных
    }
    
    const rows: string[] = [];
    
    // Разделяем строку по позициям дат
    for (let i = 0; i < datePositions.length; i++) {
      const startPos = i === 0 ? 0 : datePositions[i].index;
      const endPos = i === datePositions.length - 1 ? line.length : datePositions[i + 1].index;
      
      let rowData = line.substring(startPos, endPos).trim();
      
      // Очищаем каждую строку от артефактов
      rowData = this.cleanSingleCSVRow(rowData, delimiter);
      
      if (rowData && this.isValidCSVRow(rowData, delimiter)) {
        rows.push(rowData);
      }
    }
    
    return rows;
  }

  private cleanSingleCSVRow(row: string, delimiter: string): string {
    if (!row) return '';
    
    // Исправляем неправильно экранированные кавычки в названии товара
    // Паттерн: "название "внутренние кавычки"",число
    row = row.replace(/"([^"]*)"([^"]*)"",(\d+)/g, '"$1""$2"",$3');
    
    // Убираем артефакты данных, попавшие в название товара
    // Ищем паттерн где в названии есть числа и даты
    const nameFieldMatch = row.match(/^([^,]*,[^,]*,)"([^"]*)",(\d+.*)/);
    if (nameFieldMatch) {
      let nameContent = nameFieldMatch[2];
      
      // Убираем из названия числа и даты, которые туда попали
      nameContent = nameContent.replace(/,\d+,\d+,[\d,\s]+\d{2}\.\d{2}\.\d{4}.*$/, '');
      
      row = nameFieldMatch[1] + '"' + nameContent + '",' + nameFieldMatch[3];
    }
    
    // Исправляем незакрытые кавычки
    const quoteCount = (row.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      // Ищем последнее поле в кавычках без закрывающей кавычки
      row = row.replace(/,"([^"]*),(\d+)/g, ',"$1",$2');
    }
    
    return row;
  }

  private isValidCSVRow(row: string, delimiter: string): boolean {
    const fieldCount = this.countCSVFields(row, delimiter);
    const hasDate = /^\d{2}\.\d{2}\.\d{4}/.test(row.trim());
    const hasBasicFields = fieldCount >= 3;
    
    return hasDate && hasBasicFields;
  }

  private isCompleteCSVLine(line: string, delimiter: string): boolean {
    // Подсчитываем кавычки
    const quotes = (line.match(/"/g) || []).length;
    
    // Если нечетное количество кавычек, строка неполная
    if (quotes % 2 !== 0) {
      return false;
    }
    
    // Проверяем минимальное количество полей (должно быть хотя бы 7 полей для Ozon)
    const fields = this.countCSVFields(line, delimiter);
    if (fields < 7) {
      return false;
    }
    
    return true;
  }

  private countCSVFields(line: string, delimiter: string): number {
    let fieldCount = 1;
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        fieldCount++;
      }
    }
    
    return fieldCount;
  }

  private cleanProductNameField(line: string, delimiter: string): string {
    // Ищем поле с названием товара (обычно 3-е поле) и очищаем его от артефактов
    const fields = this.parseCSVLineSimple(line, delimiter);
    
    if (fields.length >= 3) {
      let nameField = fields[2];
      
      // Удаляем артефакты, которые попали в название товара
      if (nameField.includes(',') && (nameField.includes('\n') || nameField.length > 100)) {
        // Ищем настоящее название товара - берем часть до первой запятой с числом
        const realNameMatch = nameField.match(/^"?([^"]*?)"?(?=,\d)/);
        if (realNameMatch) {
          const realName = realNameMatch[1].trim();
          this.logger.debug(`Cleaned product name: "${nameField.substring(0, 50)}..." -> "${realName}"`);
          fields[2] = `"${realName}"`;
          
          // Пересобираем строку
          return fields.join(delimiter);
        }
      }
      
      // Исправляем неправильно экранированные кавычки
      if (nameField.includes('"') && !nameField.includes('""')) {
        const correctedName = nameField.replace(/^"([^"]*)"([^"]*)"$/, '"$1""$2"');
        if (correctedName !== nameField) {
          this.logger.debug(`Fixed quotes in product name: "${nameField}" -> "${correctedName}"`);
          fields[2] = correctedName;
          return fields.join(delimiter);
        }
      }
    }
    
    return line;
  }

  private parseCSVLineSimple(line: string, delimiter: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === delimiter && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    fields.push(current);
    return fields;
  }

  private fixCommonCSVErrors(csvContent: string, delimiter: string): string {
    // Сначала исправляем многострочные поля
    const fixedContent = this.fixMultilineFields(csvContent, delimiter);
    
    const lines = fixedContent.split("\n");
    const fixedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // первая строка — заголовок, её не трогаем
      if (i === 0) {
        fixedLines.push(line);
        continue;
      }

      if (!line.trim()) {
        continue;
      }

      // чиним кавычки внутри полей
      line = this.fixInnerQuotes(line, delimiter);
      fixedLines.push(line);
    }

    const result = fixedLines.join("\n");

    // Логируем первые строки для отладки
    this.logger.debug("Fixed CSV lines:");
    fixedLines.slice(0, 5).forEach((line, index) => {
      this.logger.debug(`Line ${index}: ${line}`);
    });

    return result;
  }

  private fixInnerQuotes(line: string, delimiter: string): string {
    // Разбиваем строку по разделителю, учитывая кавычки
    const parts: string[] = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
        current += char;
      } else if (char === delimiter && !insideQuotes) {
        parts.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    parts.push(current);

    // Внутри каждого поля заменяем одинарные " на "" (если это поле в кавычках)
    const fixed = parts.map((part, index) => {
      if (part.startsWith('"') && part.endsWith('"')) {
        const inner = part.slice(1, -1).replace(/"/g, '""');
        const result = `"${inner}"`;
        if (inner !== part.slice(1, -1)) {
          this.logger.debug(
            `Fixed quotes in field ${index}: "${part}" -> "${result}"`
          );
        }
        return result;
      }
      // Если поле содержит кавычки, но не заключено в кавычки, заключаем его
      if (part.includes('"')) {
        const escaped = part.replace(/"/g, '""');
        const result = `"${escaped}"`;
        this.logger.debug(
          `Wrapped field with quotes ${index}: "${part}" -> "${result}"`
        );
        return result;
      }
      return part;
    });

    const result = fixed.join(delimiter);
    if (result !== line) {
      this.logger.debug(`Fixed line: "${line}" -> "${result}"`);
    }
    return result;
  }

  // Дополнительная функция для исправления trailing quotes
  private fixTrailingQuotes(csvContent: string): string {
    const lines = csvContent.split("\n");
    const fixedLines = lines.map((line, index) => {
      if (index === 0 || !line.trim()) return line;

      // Исправляем случаи типа: "текст"" -> "текст"
      // или "текст""" -> "текст"
      let fixed = line.replace(/"""+/g, '"');

      // Исправляем неправильные trailing quotes в полях
      // Паттерн: ,"текст""  -> ,"текст"
      fixed = fixed.replace(/,"([^"]*)""+/g, ',"$1"');

      if (fixed !== line) {
        this.logger.debug(`Fixed trailing quotes: "${line}" -> "${fixed}"`);
      }

      return fixed;
    });

    return fixedLines.join("\n");
  }
}

@Processor("file-parsing")
@Injectable()
export class FileParsingProcessor {
  private readonly logger = new Logger(FileParsingProcessor.name);
  private csvParser = new CSVParser();

  constructor(
    private prisma: PrismaService,
    private analyticsService: AnalyticsService
  ) {}

  @Process("parse-file")
  async handleFileParsingJob(job: Job<FileParsingJob>) {
    const { reportId, filePath, marketplace } = job.data;

    this.logger.log(`Starting to parse file for report ${reportId}`);

    try {
      const parsedData = await this.parseFile(filePath, marketplace);

      // ВРЕМЕННО: сохраняем результат парсинга в файл для диагностики
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const debugFilePath = path.join(
        process.cwd(),
        `debug_parsed_${timestamp}.json`
      );
      fs.writeFileSync(debugFilePath, JSON.stringify(parsedData, null, 2));
      this.logger.log(`Debug: Parsed data saved to ${debugFilePath}`);

      // Также выводим первые 3 записи в лог
      this.logger.log(
        `Debug: First 3 parsed records: ${JSON.stringify(
          parsedData.slice(0, 3),
          null,
          2
        )}`
      );
      console.log("=== DEBUG PARSED DATA ===");
      console.log(JSON.stringify(parsedData.slice(0, 3), null, 2));
      console.log("=========================");

      const salesData = await Promise.allSettled(
        parsedData.map(async (row, index) => {
          try {
            this.logger.debug(
              `Processing row ${index}: ${JSON.stringify(row)}`
            );

            const analytics = await this.analyticsService.calculateRowAnalytics(
              row,
              marketplace
            );

            this.logger.debug(
              `Analytics result for row ${index}: ${JSON.stringify(analytics)}`
            );

            return {
              reportId,
              ...analytics,
            };
          } catch (error) {
            this.logger.warn(
              `Failed to process row ${index} with SKU ${row?.sku}: ${error.message}`
            );
            return null;
          }
        })
      );

      const validSalesData = salesData
        .filter(
          (result): result is PromiseFulfilledResult<any> =>
            result.status === "fulfilled" && result.value !== null
        )
        .map((result) => result.value);

      // ВРЕМЕННО: сохраняем финальные данные для диагностики
      const finalDebugPath = path.join(
        process.cwd(),
        `debug_final_${timestamp}.json`
      );
      fs.writeFileSync(finalDebugPath, JSON.stringify(validSalesData, null, 2));
      this.logger.log(`Debug: Final data saved to ${finalDebugPath}`);

      // Также выводим первые 3 финальные записи в лог
      this.logger.log(
        `Debug: First 3 final records: ${JSON.stringify(
          validSalesData.slice(0, 3),
          null,
          2
        )}`
      );
      console.log("=== DEBUG FINAL DATA ===");
      console.log(JSON.stringify(validSalesData.slice(0, 3), null, 2));
      console.log("========================");

      await this.prisma.$transaction(async (tx) => {
        if (validSalesData.length === 0) {
          throw new Error("No valid sales data found after processing");
        }

        this.logger.log(
          `Processing ${validSalesData.length} valid sales records`
        );

        await tx.salesData.createMany({
          data: validSalesData,
        });

        const totalRevenue = validSalesData.reduce(
          (sum, item) => sum + item.revenue,
          0
        );
        const totalProfit = validSalesData.reduce(
          (sum, item) => sum + item.netProfit,
          0
        );
        const profitMargin =
          totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

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

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      this.logger.log(`Successfully parsed file for report ${reportId}`);
    } catch (error) {
      this.logger.error(`Error parsing file for report ${reportId}:`, error);

      await this.prisma.report.update({
        where: { id: reportId },
        data: { processed: false },
      });

      throw error;
    }
  }

  private async parseFile(filePath: string, marketplace: Marketplace) {
    const fileExtension = path.extname(filePath).toLowerCase();

    if (fileExtension === ".csv") {
      return this.parseCsvFile(filePath, marketplace);
    } else if (fileExtension === ".xlsx" || fileExtension === ".xls") {
      return this.parseExcelFile(filePath, marketplace);
    } else {
      throw new Error(`Unsupported file format: ${fileExtension}`);
    }
  }

  private async parseCsvFile(filePath: string, marketplace: Marketplace) {
    const fileContent = fs.readFileSync(filePath, "utf8");

    // Используем новый CSVParser
    const parsed = this.csvParser.parseCSV(fileContent);

    // Детальное логирование ошибок парсинга
    if (parsed.errors && parsed.errors.length > 0) {
      this.logger.warn(`CSV parsing found ${parsed.errors.length} errors:`);
      parsed.errors.slice(0, 10).forEach((error, index) => {
        this.logger.warn(
          `Error ${index + 1}: ${error.message} at row ${error.row}, field ${
            error.field
          }`
        );
      });
    }

    // Логируем заголовки
    if (parsed.meta && parsed.meta.fields) {
      this.logger.debug(`CSV headers: ${JSON.stringify(parsed.meta.fields)}`);
    }

    // Логируем первые несколько строк данных
    if (parsed.data && parsed.data.length > 0) {
      this.logger.debug(`Total parsed rows: ${parsed.data.length}`);
      console.log(`=== ALL PARSED CSV ROWS (${parsed.data.length} total) ===`);

      parsed.data.forEach((row, index) => {
        console.log(`Row ${index + 1}:`, JSON.stringify(row, null, 2));
        this.logger.debug(`Row ${index + 1}: ${JSON.stringify(row)}`);
      });

      console.log("==========================================");
    }

    return this.mapRowsToSalesData(parsed.data, marketplace);
  }

  private fixCommonCSVErrors(csvContent: string): string {
    const lines = csvContent.split("\n");
    const fixedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      if (i === 0) {
        // Заголовок - не трогаем
        fixedLines.push(line);
        continue;
      }

      if (!line.trim()) {
        // Пустая строка - пропускаем
        continue;
      }

      // Исправляем неэкранированные кавычки внутри полей
      line = this.fixInnerQuotes(line);

      // Дополнительная проверка на незакрытые кавычки
      line = this.fixUnclosedQuotes(line);

      fixedLines.push(line);
    }

    return fixedLines.join("\n");
  }

  private fixInnerQuotes(line: string): string {
    this.logger.debug(`Fixing inner quotes for line: ${line}`);

    // Разбиваем строку на поля, учитывая что третье поле может содержать проблемные кавычки
    const parts = line.split(",");

    if (parts.length >= 4) {
      // Проверяем третье поле (название товара) - индекс 2
      let nameField = parts[2];

      // Случай 1: поле не в кавычках, но содержит кавычки
      // Пример: Книга "Атомные привычки"
      if (!nameField.startsWith('"') && nameField.includes('"')) {
        const escaped = nameField.replace(/"/g, '""');
        parts[2] = `"${escaped}"`;
        const fixed = parts.join(",");
        this.logger.debug(
          `Fixed unquoted field with quotes: "${line}" -> "${fixed}"`
        );
        return fixed;
      }

      // Случай 2: поле в кавычках, но внутренние кавычки не экранированы
      // Пример: "Книга "Атомные привычки""
      if (
        nameField.startsWith('"') &&
        nameField.includes('"') &&
        nameField.length > 1
      ) {
        // Убираем внешние кавычки
        let content = nameField;
        if (content.startsWith('"')) content = content.substring(1);
        if (content.endsWith('"'))
          content = content.substring(0, content.length - 1);

        // Если есть неэкранированные кавычки, исправляем их
        if (content.includes('"') && !content.includes('""')) {
          const escapedContent = content.replace(/"/g, '""');
          parts[2] = `"${escapedContent}"`;
          const fixed = parts.join(",");
          this.logger.debug(
            `Fixed quoted field with unescaped quotes: "${line}" -> "${fixed}"`
          );
          return fixed;
        }
      }
    }

    // Если основной алгоритм не сработал, пробуем regex как запасной вариант
    let fixed = line;

    // Паттерн: ,название "с кавычками",число
    const unquotedPattern = /,([^,]*"[^"]*"[^,]*),(\d+)/g;
    fixed = fixed.replace(unquotedPattern, (match, content, number) => {
      const escaped = content.replace(/"/g, '""');
      this.logger.debug(
        `Regex fix unquoted: "${match}" -> ","${escaped}",${number}"`
      );
      return `,"${escaped}",${number}`;
    });

    // Паттерн: ,"название "с кавычками"",
    const quotedPattern = /,"([^"]*)"([^"]*)"([^"]*)",/g;
    fixed = fixed.replace(quotedPattern, (match, before, inner, after) => {
      const escaped = `${before}""${inner}""${after}`;
      this.logger.debug(`Regex fix quoted: "${match}" -> ","${escaped}","`);
      return `,"${escaped}",`;
    });

    return fixed;
  }

  private fixUnclosedQuotes(line: string): string {
    // Подсчитываем количество кавычек
    const quoteCount = (line.match(/"/g) || []).length;

    // Если нечетное количество кавычек, добавляем недостающую
    if (quoteCount % 2 !== 0) {
      this.logger.debug(`Line with uneven quotes detected: ${line}`);

      // Простая стратегия: ищем последнее поле без закрывающей кавычки
      // Паттерн: ,"текст,число - добавляем кавычку перед запятой
      const match = line.match(/^(.*,")([^"]*),(\d+.*)/);
      if (match) {
        const fixed = `${match[1]}${match[2]}",${match[3]}`;
        this.logger.debug(`Fixed unclosed quote: "${line}" -> "${fixed}"`);
        return fixed;
      }
    }

    return line;
  }

  private parseCSVWithAlternativeMethod(csvContent: string): any {
    const lines = csvContent.split("\n").filter((line) => line.trim());
    if (lines.length === 0)
      return { data: [], errors: [], meta: { fields: [] } };

    const headers = this.parseCSVLine(lines[0]);
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const fields = this.parseCSVLine(lines[i]);
        if (fields.length >= headers.length) {
          const row: any = {};
          headers.forEach((header, index) => {
            row[header.trim()] = fields[index] || "";
          });
          data.push(row);
        }
      } catch (error) {
        this.logger.warn(
          `Alternative parsing error on line ${i + 1}: ${error.message}`
        );
      }
    }

    return {
      data,
      errors: [],
      meta: { fields: headers },
    };
  }

  private parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let currentField = "";
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (!inQuotes) {
          // Начало кавычек
          inQuotes = true;
        } else if (nextChar === '"') {
          // Экранированные кавычки
          currentField += '"';
          i++; // Пропускаем следующую кавычку
        } else {
          // Конец кавычек
          inQuotes = false;
        }
      } else if (char === "," && !inQuotes) {
        // Разделитель полей
        fields.push(currentField.trim());
        currentField = "";
      } else {
        currentField += char;
      }

      i++;
    }

    // Добавляем последнее поле
    fields.push(currentField.trim());

    return fields;
  }

  private async parseExcelFile(filePath: string, marketplace: Marketplace) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    return this.mapRowsToSalesData(data, marketplace);
  }

  private mapRowsToSalesData(rows: any[], marketplace: Marketplace) {
    this.logger.debug(
      `Mapping ${rows.length} rows for marketplace: ${marketplace}`
    );

    console.log(`=== MAPPING ROWS TO SALES DATA ===`);
    console.log(`Input rows count: ${rows.length}`);
    console.log(`Marketplace: ${marketplace}`);

    const result = rows
      .map((row, index) => {
        let mapped = null;

        if (marketplace === Marketplace.WILDBERRIES) {
          mapped = this.mapWildberriesRow(row);
        } else if (marketplace === Marketplace.OZON) {
          mapped = this.mapOzonRow(row);
        } else {
          throw new Error(`Unsupported marketplace: ${marketplace}`);
        }

        console.log(`Row ${index + 1} mapping:`, {
          input: row,
          output: mapped,
          success: mapped !== null,
        });

        return mapped;
      })
      .filter(Boolean);

    console.log(`=== MAPPING RESULT ===`);
    console.log(
      `Successfully mapped: ${result.length} out of ${rows.length} rows`
    );
    console.log(`====================`);

    this.logger.debug(
      `Successfully mapped ${result.length} out of ${rows.length} rows`
    );

    return result;
  }

  private mapWildberriesRow(row: any) {
    this.logger.debug(`Processing WB row: ${JSON.stringify(row)}`);

    const dateField = row["Дата продажи"] || row["Date"] || row["date"];
    const skuField = row["Артикул WB"] || row["SKU"] || row["sku"];
    const nameField = row["Наименование"] || row["Product Name"] || row["name"];
    const priceField = row["Цена продажи"] || row["Price"] || row["price"];
    const quantityField =
      row["Количество"] || row["Quantity"] || row["quantity"];
    const commissionField =
      row["Комиссия WB"] || row["Commission"] || row["commission"];

    this.logger.debug(
      `WB Fields - Date: ${dateField}, SKU: ${skuField}, Name: ${nameField}`
    );

    if (
      !dateField ||
      !skuField ||
      !nameField ||
      !priceField ||
      !quantityField
    ) {
      this.logger.warn(
        `Missing required fields for WB row: ${JSON.stringify(row)}`
      );
      return null;
    }

    const parsedDate = this.parseDate(dateField);
    if (!parsedDate) {
      this.logger.warn(`Invalid date for WB SKU ${skuField}: ${dateField}`);
      return null;
    }

    const quantity = parseInt(quantityField);
    const price = parseFloat(priceField);

    if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price < 0) {
      this.logger.warn(
        `Invalid numeric data for WB SKU ${skuField}: qty=${quantityField}, price=${priceField}`
      );
      return null;
    }

    const result = {
      sku: String(skuField).trim(),
      productName: String(nameField).trim(),
      saleDate: parsedDate,
      quantity,
      price,
      commission: parseFloat(commissionField) || 0,
    };

    this.logger.debug(`WB Result: ${JSON.stringify(result)}`);
    return result;
  }

  private mapOzonRow(row: any) {
    console.log(`=== MAPPING OZON ROW ===`);
    console.log(`Input row:`, JSON.stringify(row, null, 2));

    const dateField = row["Дата"] || row["Date"] || row["date"];
    const skuField = row["Артикул"] || row["SKU"] || row["sku"];
    let nameField =
      row["Название товара"] || row["Product Name"] || row["name"];
    const priceField = row["Цена за единицу"] || row["Price"] || row["price"];
    const quantityField =
      row["Количество"] || row["Quantity"] || row["quantity"];
    const commissionField =
      row["Комиссия за продажу"] || row["Commission"] || row["commission"];

    // Дополнительно очищаем название товара от артефактов
    if (nameField) {
      nameField = this.cleanProductName(String(nameField));
    }

    console.log(`Extracted fields:`, {
      date: dateField,
      sku: skuField,
      name: nameField,
      price: priceField,
      quantity: quantityField,
      commission: commissionField,
    });

    if (
      !dateField ||
      !skuField ||
      !nameField ||
      !priceField ||
      !quantityField
    ) {
      console.log(`❌ Missing required fields, skipping row`);
      this.logger.warn(
        `Missing required fields for Ozon row: ${JSON.stringify(row)}`
      );
      return null;
    }

    const parsedDate = this.parseDate(dateField);
    if (!parsedDate) {
      console.log(`❌ Invalid date: ${dateField}`);
      this.logger.warn(`Invalid date for Ozon SKU ${skuField}: ${dateField}`);
      return null;
    }

    const quantity = parseInt(quantityField);
    const price = parseFloat(priceField);

    if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price < 0) {
      console.log(
        `❌ Invalid numeric data: qty=${quantityField}, price=${priceField}`
      );
      this.logger.warn(
        `Invalid numeric data for Ozon SKU ${skuField}: qty=${quantityField}, price=${priceField}`
      );
      return null;
    }

    const result = {
      sku: String(skuField).trim(),
      productName: String(nameField).trim(),
      saleDate: parsedDate,
      quantity,
      price,
      commission: parseFloat(commissionField) || 0,
    };

    console.log(`✅ Successfully mapped:`, result);
    console.log(`======================`);

    return result;
  }

  private parseDate(dateField: any): Date | null {
    if (!dateField) return null;

    const dateString = String(dateField).trim();

    // Обработка формата DD.MM.YYYY
    if (dateString.includes(".")) {
      const parts = dateString.split(".");
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const year = parseInt(parts[2]);

        if (
          day >= 1 &&
          day <= 31 &&
          month >= 1 &&
          month <= 12 &&
          year >= 2020 &&
          year <= 2030
        ) {
          const date = new Date(year, month - 1, day);

          // Проверяем, что дата не "переехала" (например, 32.01 -> 01.02)
          if (
            date.getDate() === day &&
            date.getMonth() === month - 1 &&
            date.getFullYear() === year
          ) {
            return date;
          }
        }
      }
    }

    // Обработка формата YYYY-MM-DD
    if (dateString.includes("-")) {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  }

  private cleanProductName(name: string): string {
    if (!name) return '';
    
    let cleaned = name;
    
    // Удаляем лишние кавычки в начале и конце
    cleaned = cleaned.replace(/^"/, '').replace(/"$/, '');
    
    // Исправляем экранированные кавычки
    cleaned = cleaned.replace(/""/g, '"');
    
    // ГЛАВНОЕ ИСПРАВЛЕНИЕ: удаляем все артефакты CSV данных
    // Паттерн 1: ,число,число,последовательность чисел и запятых (артефакты из CSV)
    cleaned = cleaned.replace(/,\d+,\d+,[\d,]+$/, '');
    
    // Паттерн 2: перенос строки с датой и данными (смешанные строки CSV)
    cleaned = cleaned.replace(/\n\d{2}\.\d{2}\.\d{4}.*$/, '');
    
    // Паттерн 3: дата и данные после пробелов
    cleaned = cleaned.replace(/\s+\d{2}\.\d{2}\.\d{4},\d+.*$/, '');
    
    // Паттерн 4: последовательность чисел и запятых, заканчивающаяся датой
    cleaned = cleaned.replace(/,[\d,\s]*\d{2}\.\d{2}\.\d{4}.*$/, '');
    
    // Паттерн 5: специфичный для проблемной строки - убираем все после первого вхождения большого числа
    if (cleaned.includes(',29810') || cleaned.match(/,\d{5}/)) {
      const match = cleaned.match(/^([^,]*?)(?=,\d{4,})/);
      if (match) {
        cleaned = match[1];
      }
    }
    
    // Удаляем переносы строк и лишние пробелы
    cleaned = cleaned.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Удаляем завершающие кавычки, запятые и пробелы
    cleaned = cleaned.replace(/[",\s]+$/, '');
    
    // Если название стало пустым, возвращаем исходное (обрезанное)
    if (!cleaned.trim()) {
      cleaned = name.substring(0, Math.min(name.length, 50)).replace(/[",\n]+$/, '');
    }
    
    return cleaned.trim();
  }
}
