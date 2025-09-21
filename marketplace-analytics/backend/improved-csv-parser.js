const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

class ImprovedCSVParser {
  constructor() {
    this.prisma = new PrismaClient();
  }

  // Улучшенный парсер CSV с корректной обработкой кавычек
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

  // Парсинг одной строки CSV с учетом многострочных полей
  parseCSVRow(lines, startIndex, expectedFields) {
    let currentLine = startIndex;
    let combinedLine = lines[currentLine];
    let fields = [];
    
    // Проверяем, завершена ли строка (все кавычки закрыты)
    while (currentLine < lines.length && !this.isRowComplete(combinedLine, expectedFields)) {
      currentLine++;
      if (currentLine < lines.length) {
        combinedLine += '\n' + lines[currentLine];
      }
    }
    
    try {
      fields = this.parseCSVLine(combinedLine);
      
      // Если количество полей не совпадает, пытаемся исправить
      if (fields.length !== expectedFields) {
        console.log(`⚠️ Несоответствие количества полей: ожидалось ${expectedFields}, получено ${fields.length}`);
        console.log(`Строка: ${combinedLine.substring(0, 100)}...`);
        
        // Пытаемся восстановить данные
        fields = this.repairCSVLine(combinedLine, expectedFields);
      }
      
      return { row: fields, nextIndex: currentLine + 1 };
    } catch (error) {
      console.error(`❌ Ошибка парсинга строки ${startIndex + 1}: ${error.message}`);
      return { row: null, nextIndex: startIndex + 1 };
    }
  }

  // Проверка завершенности строки
  isRowComplete(line, expectedFields) {
    const fields = this.parseCSVLine(line);
    return fields.length >= expectedFields;
  }

  // Парсинг одной строки CSV
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
            // Экранированная кавычка
            current += '"';
            i += 2;
            continue;
          } else {
            // Конец поля в кавычках
            inQuotes = false;
          }
        } else {
          // Начало поля в кавычках
          inQuotes = true;
        }
      } else if (char === ',' && !inQuotes) {
        // Разделитель полей
        fields.push(current.trim());
        current = '';
        i++;
        continue;
      } else {
        current += char;
      }
      
      i++;
    }
    
    // Добавляем последнее поле
    fields.push(current.trim());
    
    return fields;
  }

  // Восстановление поврежденной строки CSV
  repairCSVLine(line, expectedFields) {
    console.log('🔧 Попытка восстановления строки...');
    
    // Простая эвристика: если поля слились, пытаемся их разделить
    let fields = this.parseCSVLine(line);
    
    if (fields.length < expectedFields) {
      // Ищем поля, которые могли слиться
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        
        // Если поле содержит несколько чисел, разделенных запятыми
        if (/^\d+,\d+/.test(field)) {
          const parts = field.split(',');
          fields.splice(i, 1, ...parts);
          break;
        }
        
        // Если поле содержит дату в начале
        if (/^\d{2}\.\d{2}\.\d{4}/.test(field)) {
          const match = field.match(/^(\d{2}\.\d{2}\.\d{4}),(.+)/);
          if (match) {
            fields.splice(i, 1, match[1], match[2]);
            break;
          }
        }
      }
    }
    
    // Если все еще не хватает полей, добавляем пустые
    while (fields.length < expectedFields) {
      fields.push('');
    }
    
    // Если слишком много полей, обрезаем
    if (fields.length > expectedFields) {
      fields = fields.slice(0, expectedFields);
    }
    
    return fields;
  }

  // Очистка названия товара от артефактов
  cleanProductName(name) {
    if (!name) return '';
    
    // Удаляем лишние кавычки и экранирование
    let cleaned = name.replace(/^""|""$/g, '').replace(/""/g, '"');
    
    // Удаляем артефакты, похожие на CSV данные в конце
    cleaned = cleaned.replace(/,\d+,\d+,[\d,]+$/g, '');
    
    // Удаляем переносы строк и лишние пробелы
    cleaned = cleaned.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }

  async processFile(reportId, filePath, marketplace) {
    try {
      console.log(`🔄 Обработка файла: ${filePath}`);
      console.log(`📊 Отчет ID: ${reportId}`);
      console.log(`🏪 Маркетплейс: ${marketplace}`);
      
      // Читаем файл
      const fileContent = fs.readFileSync(filePath, 'utf8');
      console.log(`📄 Размер файла: ${fileContent.length} символов`);
      
      // Парсим CSV улучшенным парсером
      const { data, headers } = this.parseCSV(fileContent);
      
      console.log(`📋 Найдено строк данных: ${data.length}`);
      console.log(`📊 Заголовки: ${headers.join(', ')}`);
      
      // Показываем первые 3 строки
      if (data.length > 0) {
        console.log('\n📝 Первые 3 строки данных:');
        data.slice(0, 3).forEach((row, index) => {
          console.log(`  Строка ${index + 1}:`);
          Object.entries(row).forEach(([key, value]) => {
            console.log(`    ${key}: ${value}`);
          });
          console.log('');
        });
      }
      
      // Маппинг данных
      const salesData = [];
      let processedCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        console.log(`\n🔄 Обрабатываем строку ${i + 1}/${data.length}:`);
        console.log(`  Исходные данные: ${JSON.stringify(row)}`);
        
        try {
          if (marketplace === 'OZON') {
            const mappedRow = await this.mapOzonRow(row, reportId);
            if (mappedRow) {
              console.log(`  ✅ Маппинг успешен: ${JSON.stringify({
                sku: mappedRow.sku,
                productName: mappedRow.productName,
                saleDate: mappedRow.saleDate,
                quantity: mappedRow.quantity,
                price: mappedRow.price,
                commission: mappedRow.commission
              })}`);
              
              // Рассчитываем аналитику
              const analytics = this.calculateAnalytics(mappedRow, marketplace);
              const finalRow = { ...mappedRow, ...analytics };
              
              console.log(`  📊 Аналитика рассчитана: ${JSON.stringify(finalRow)}`);
              
              salesData.push(finalRow);
              processedCount++;
              console.log(`  ✅ Строка ${i + 1} успешно обработана`);
            } else {
              console.log(`  ❌ Строка ${i + 1} пропущена из-за некорректных данных`);
              errorCount++;
            }
          }
        } catch (error) {
          console.log(`  ❌ Ошибка обработки строки ${i + 1}: ${error.message}`);
          errorCount++;
        }
      }
      
      console.log(`\n✅ Обработано строк: ${processedCount}, ошибок: ${errorCount}`);
      
      if (salesData.length > 0) {
        await this.saveToDatabase(reportId, salesData);
        
        const totalRevenue = salesData.reduce((sum, item) => sum + item.revenue, 0);
        const totalProfit = salesData.reduce((sum, item) => sum + item.netProfit, 0);
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        
        console.log(`💰 Выручка: ${totalRevenue}₽, Прибыль: ${totalProfit}₽, Маржа: ${profitMargin.toFixed(2)}%`);
        console.log(`✅ Файл ${path.basename(filePath)} успешно обработан`);
      }
      
    } catch (error) {
      console.error('❌ Критическая ошибка:', error.message);
      throw error;
    }
  }

  async mapOzonRow(row, reportId) {
    const dateStr = row['Дата'];
    const sku = row['Артикул'];
    let productName = row['Название товара'];
    const price = parseFloat(row['Цена за единицу']) || 0;
    const quantity = parseInt(row['Количество']) || 0;
    const commission = parseFloat(row['Комиссия за продажу']) || 0;
    
    // Очищаем название товара
    productName = this.cleanProductName(productName);
    
    // Парсинг даты DD.MM.YYYY
    const dateParts = dateStr.split('.');
    if (dateParts.length === 3) {
      const day = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]);
      const year = parseInt(dateParts[2]);
      const saleDate = new Date(year, month - 1, day);
      
      if (!isNaN(saleDate.getTime()) && sku && productName && price > 0 && quantity > 0) {
        return {
          reportId,
          sku: sku.toString(),
          productName: productName.toString(),
          saleDate,
          quantity,
          price,
          commission,
        };
      }
    }
    
    return null;
  }

  calculateAnalytics(row, marketplace) {
    const revenue = row.price * row.quantity;
    
    // Комиссии и расходы для Ozon
    let logistics = 0;
    let storage = 0;
    let totalCommission = row.commission;
    
    if (marketplace === 'OZON') {
      logistics = revenue * 0.035; // 3.5%
      storage = revenue * 0.02;   // 2%
      totalCommission = revenue * 0.08; // 8% базовая комиссия Ozon
    }
    
    const netProfit = revenue - totalCommission - logistics - storage;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    
    return {
      revenue,
      netProfit,
      profitMargin,
      commission: totalCommission,
      logistics,
      storage,
    };
  }

  async saveToDatabase(reportId, salesData) {
    console.log('\n💾 Сохранение в базу данных...');
    
    // Удаляем старые данные
    await this.prisma.salesData.deleteMany({
      where: { reportId }
    });
    
    // Сохраняем новые данные
    await this.prisma.salesData.createMany({
      data: salesData
    });
    
    // Обновляем отчет
    const totalRevenue = salesData.reduce((sum, item) => sum + item.revenue, 0);
    const totalProfit = salesData.reduce((sum, item) => sum + item.netProfit, 0);
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    
    await this.prisma.report.update({
      where: { id: reportId },
      data: {
        processed: true,
        totalRevenue,
        totalProfit,
        profitMargin,
      },
    });
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}

// Функция для обработки конкретного файла
async function processSpecificFile(filePath, marketplace = 'OZON') {
  const parser = new ImprovedCSVParser();
  
  try {
    // Создаем тестовый отчет
    const reportId = 'test-' + Date.now();
    await parser.processFile(reportId, filePath, marketplace);
  } catch (error) {
    console.error('Ошибка:', error.message);
  } finally {
    await parser.disconnect();
  }
}

// Если файл запущен напрямую
if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.log('Использование: node improved-csv-parser.js <путь_к_файлу>');
    process.exit(1);
  }
  
  processSpecificFile(filePath);
}

module.exports = { ImprovedCSVParser };