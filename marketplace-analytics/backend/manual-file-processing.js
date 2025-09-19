const { PrismaClient } = require('@prisma/client');
const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');

async function processFile(reportId, filePath, marketplace) {
  const prisma = new PrismaClient();
  
  try {
    console.log(`🔄 Обработка файла: ${filePath}`);
    console.log(`📊 Отчет ID: ${reportId}`);
    console.log(`🏪 Маркетплейс: ${marketplace}`);
    
    // Читаем файл
    const fileContent = fs.readFileSync(filePath, 'utf8');
    console.log(`📄 Размер файла: ${fileContent.length} символов`);
    
    // Парсим CSV
    const parsed = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      delimiter: ',',
      quoteChar: '"',
      escapeChar: '"',
      transformHeader: (header) => header.trim(),
    });
    
    console.log(`📋 Найдено строк данных: ${parsed.data.length}`);
    console.log(`❌ Ошибок парсинга: ${parsed.errors.length}`);
    
    if (parsed.errors.length > 0) {
      console.log('Первые 3 ошибки:');
      parsed.errors.slice(0, 3).forEach(error => {
        console.log(`  - ${error.message} (строка ${error.row})`);
      });
    }
    
    console.log(`📊 Заголовки: ${parsed.meta.fields?.join(', ')}`);
    
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
          const productName = row['Название товара'];
          const price = parseFloat(row['Цена за единицу']) || 0;
          const quantity = parseInt(row['Количество']) || 0;
          const commission = parseFloat(row['Комиссия за продажу']) || 0;
          
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