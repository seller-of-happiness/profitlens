const { PrismaClient } = require('@prisma/client');
const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');

// Улучшенный CSV парсер
class ImprovedCSVParser {
  parseCSV(content) {
    const lines = content.split('\n');
    const headers = this.parseCSVLine(lines[0]);
    const data = [];
    
    let i = 1;
    while (i < lines.length) {
      if (!lines[i].trim()) {
        i++;
        continue;
      }
      
      const { row, nextIndex } = this.parseCSVRow(lines, i, headers.length);
      if (row) {
        const rowObject = {};
        headers.forEach((header, index) => {
          rowObject[header.trim()] = row[index] || '';
        });
        data.push(rowObject);
      }
      i = nextIndex;
    }
    
    return { data, headers };
  }

  parseCSVRow(lines, startIndex, expectedFields) {
    let currentLine = startIndex;
    let combinedLine = lines[currentLine];
    
    while (currentLine < lines.length && !this.isRowComplete(combinedLine, expectedFields)) {
      currentLine++;
      if (currentLine < lines.length) {
        combinedLine += '\n' + lines[currentLine];
      }
    }
    
    try {
      let fields = this.parseCSVLine(combinedLine);
      
      if (fields.length !== expectedFields) {
        console.log(`⚠️ Несоответствие количества полей: ожидалось ${expectedFields}, получено ${fields.length}`);
        fields = this.repairCSVLine(combinedLine, expectedFields);
      }
      
      return { row: fields, nextIndex: currentLine + 1 };
    } catch (error) {
      console.error(`❌ Ошибка парсинга строки ${startIndex + 1}: ${error.message}`);
      return { row: null, nextIndex: startIndex + 1 };
    }
  }

  isRowComplete(line, expectedFields) {
    try {
      const fields = this.parseCSVLine(line);
      return fields.length >= expectedFields;
    } catch (error) {
      return false;
    }
  }

  parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes) {
          if (nextChar === '"') {
            current += '"';
            i += 2;
            continue;
          } else {
            inQuotes = false;
          }
        } else {
          inQuotes = true;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
        i++;
        continue;
      } else {
        current += char;
      }
      i++;
    }
    
    fields.push(current.trim());
    return fields;
  }

  repairCSVLine(line, expectedFields) {
    console.log('🔧 Попытка восстановления строки...');
    
    if (line.includes('\n')) {
      console.log('📝 Обнаружены переносы строк - разбиваем на отдельные строки');
      return this.splitMultipleRows(line, expectedFields);
    }
    
    let fields = this.parseCSVLine(line);
    
    if (fields.length < expectedFields) {
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const dataPattern = /^(.+?),(\d+),(\d+),(\d+),(\d+),(\d+)$/;
        const match = field.match(dataPattern);
        if (match) {
          console.log(`🎯 Найден паттерн объединенных данных`);
          const cleanName = match[1].replace(/"/g, '');
          fields.splice(i, 1, cleanName, match[2], match[3], match[4], match[5], match[6]);
          break;
        }
      }
    }
    
    while (fields.length < expectedFields) {
      fields.push('');
    }
    
    if (fields.length > expectedFields) {
      fields = fields.slice(0, expectedFields);
    }
    
    return fields;
  }

  splitMultipleRows(combinedLine, expectedFields) {
    console.log('🔀 Разделение объединенной строки на отдельные записи');
    
    const datePattern = /(\d{2}\.\d{2}\.\d{4})/g;
    const dates = [];
    let match;
    
    while ((match = datePattern.exec(combinedLine)) !== null) {
      dates.push({
        date: match[1],
        index: match.index
      });
    }
    
    if (dates.length > 1) {
      const rows = [];
      for (let i = 0; i < dates.length; i++) {
        const startIndex = dates[i].index;
        const endIndex = i < dates.length - 1 ? dates[i + 1].index : combinedLine.length;
        const rowData = combinedLine.substring(startIndex, endIndex).trim();
        
        if (rowData) {
          const cleanRow = rowData.replace(/\n/g, ',').replace(/,+/g, ',').replace(/^,|,$/g, '');
          rows.push(cleanRow);
        }
      }
      
      if (rows.length > 0) {
        let firstRowFields = this.parseCSVLine(rows[0]);
        
        if (firstRowFields.length < expectedFields) {
          for (let i = 0; i < firstRowFields.length; i++) {
            const field = firstRowFields[i];
            const dataPattern = /^(.+?),(\d+),(\d+),(\d+),(\d+),(\d+)$/;
            const match = field.match(dataPattern);
            if (match) {
              console.log(`🎯 Разделяем объединенное поле в восстановленной строке`);
              const cleanName = match[1].replace(/"/g, '');
              firstRowFields.splice(i, 1, cleanName, match[2], match[3], match[4], match[5], match[6]);
              break;
            }
          }
        }
        
        while (firstRowFields.length < expectedFields) {
          firstRowFields.push('');
        }
        
        return firstRowFields.slice(0, expectedFields);
      }
    }
    
    const fields = this.parseCSVLine(combinedLine);
    while (fields.length < expectedFields) {
      fields.push('');
    }
    return fields.slice(0, expectedFields);
  }

  cleanProductName(name) {
    if (!name) return '';
    let cleaned = name.replace(/^""|""$/g, '').replace(/""/g, '"');
    cleaned = cleaned.replace(/,\d+,\d+,[\d,]+$/g, '');
    cleaned = cleaned.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned;
  }
}

async function processFile(reportId, filePath, marketplace) {
  const prisma = new PrismaClient();
  
  try {
    console.log(`🔄 Обработка файла: ${filePath}`);
    console.log(`📊 Отчет ID: ${reportId}`);
    console.log(`🏪 Маркетплейс: ${marketplace}`);
    
    // Читаем файл
    const fileContent = fs.readFileSync(filePath, 'utf8');
    console.log(`📄 Размер файла: ${fileContent.length} символов`);
    
    // Парсим CSV улучшенным парсером
    const csvParser = new ImprovedCSVParser();
    const parsed = csvParser.parseCSV(fileContent);
    
    console.log(`📋 Найдено строк данных: ${parsed.data.length}`);
    console.log(`📊 Заголовки: ${parsed.headers.join(', ')}`);
    
    // Показываем первые 3 строки
    if (parsed.data.length > 0) {
      console.log('\n📝 Первые 3 строки данных:');
      parsed.data.slice(0, 3).forEach((row, index) => {
        console.log(`  Строка ${index + 1}:`);
        Object.entries(row).forEach(([key, value]) => {
          console.log(`    ${key}: ${value}`);
        });
        console.log('');
      });
    }
    
    // Маппинг данных в зависимости от маркетплейса
    const salesData = [];
    let processedCount = 0;
    let errorCount = 0;
    
    for (const row of parsed.data) {
      try {
        let mappedRow;
        
        if (marketplace === 'OZON') {
          // Маппинг для Ozon
          const dateStr = row['Дата'];
          const sku = row['Артикул'];
          let productName = row['Название товара'];
          const price = parseFloat(row['Цена за единицу']) || 0;
          const quantity = parseInt(row['Количество']) || 0;
          const commission = parseFloat(row['Комиссия за продажу']) || 0;
          
          // Очищаем название товара от возможных артефактов
          productName = csvParser.cleanProductName(productName);
          
          // Парсинг даты DD.MM.YYYY
          const dateParts = dateStr.split('.');
          if (dateParts.length === 3) {
            const day = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]);
            const year = parseInt(dateParts[2]);
            const saleDate = new Date(year, month - 1, day);
            
            if (!isNaN(saleDate.getTime()) && sku && productName && price > 0 && quantity > 0) {
              const revenue = price * quantity;
              const netProfit = revenue - commission;
              const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
              
              mappedRow = {
                reportId,
                sku: sku.toString(),
                productName: productName.toString(),
                saleDate,
                quantity,
                price,
                revenue,
                netProfit,
                profitMargin,
                commission,
                logistics: revenue * 0.035, // 3.5% для Ozon
                storage: revenue * 0.02, // 2% для Ozon
              };
              
              salesData.push(mappedRow);
              processedCount++;
            } else {
              console.log(`⚠️ Пропущена строка с некорректными данными: ${JSON.stringify(row)}`);
              errorCount++;
            }
          } else {
            console.log(`⚠️ Некорректная дата: ${dateStr}`);
            errorCount++;
          }
        } else if (marketplace === 'WILDBERRIES') {
          // Маппинг для Wildberries (если понадобится)
          console.log('Обработка Wildberries файлов пока не реализована в этом скрипте');
        }
      } catch (error) {
        console.log(`❌ Ошибка обработки строки: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n✅ Успешно обработано строк: ${processedCount}`);
    console.log(`❌ Ошибок обработки: ${errorCount}`);
    
    if (salesData.length > 0) {
      console.log('\n💾 Сохранение в базу данных...');
      
      // Удаляем старые данные для этого отчета
      await prisma.salesData.deleteMany({
        where: { reportId }
      });
      
      // Сохраняем новые данные
      await prisma.salesData.createMany({
        data: salesData
      });
      
      // Рассчитываем общие метрики
      const totalRevenue = salesData.reduce((sum, item) => sum + item.revenue, 0);
      const totalProfit = salesData.reduce((sum, item) => sum + item.netProfit, 0);
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      
      // Обновляем отчет
      await prisma.report.update({
        where: { id: reportId },
        data: {
          processed: true,
          totalRevenue,
          totalProfit,
          profitMargin,
        },
      });
      
      console.log(`💰 Общая выручка: ${totalRevenue.toFixed(2)}₽`);
      console.log(`💵 Общая прибыль: ${totalProfit.toFixed(2)}₽`);
      console.log(`📈 Маржинальность: ${profitMargin.toFixed(2)}%`);
      console.log('✅ Данные успешно сохранены!');
    } else {
      console.log('❌ Нет данных для сохранения');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function processAllFiles() {
  const prisma = new PrismaClient();
  
  try {
    const reports = await prisma.report.findMany({
      where: {
        // Обрабатываем только те отчеты, у которых нет данных продаж
        salesData: {
          none: {}
        }
      }
    });
    
    console.log(`🔍 Найдено отчетов для обработки: ${reports.length}`);
    
    for (const report of reports) {
      const uploadDir = process.env.UPLOAD_DEST || './uploads';
      const filePath = path.join(uploadDir, `${report.id}_${report.fileName}`);
      
      if (fs.existsSync(filePath)) {
        console.log(`\n${'='.repeat(50)}`);
        await processFile(report.id, filePath, report.marketplace);
      } else {
        console.log(`❌ Файл не найден: ${filePath}`);
      }
    }
    
    console.log('\n🎉 Обработка всех файлов завершена!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем обработку
processAllFiles();