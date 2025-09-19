const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

async function testFileProcessing() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Проверка состояния базы данных...');
    
    // Проверяем отчеты
    const reports = await prisma.report.findMany({
      include: {
        _count: {
          select: { salesData: true }
        }
      }
    });
    
    console.log(`📊 Найдено отчетов: ${reports.length}`);
    
    reports.forEach((report, index) => {
      console.log(`\n📄 Отчет ${index + 1}:`);
      console.log(`  - ID: ${report.id}`);
      console.log(`  - Файл: ${report.fileName}`);
      console.log(`  - Маркетплейс: ${report.marketplace}`);
      console.log(`  - Обработан: ${report.processed ? '✅' : '❌'}`);
      console.log(`  - Записей продаж: ${report._count.salesData}`);
      console.log(`  - Выручка: ${report.totalRevenue || 'не рассчитана'}`);
      console.log(`  - Прибыль: ${report.totalProfit || 'не рассчитана'}`);
      
      // Проверяем существование файла
      const uploadDir = process.env.UPLOAD_DEST || './uploads';
      const filePath = path.join(uploadDir, `${report.id}_${report.fileName}`);
      const fileExists = fs.existsSync(filePath);
      console.log(`  - Файл существует: ${fileExists ? '✅' : '❌'} (${filePath})`);
      
      if (fileExists) {
        const stats = fs.statSync(filePath);
        console.log(`  - Размер файла: ${stats.size} байт`);
      }
    });
    
    // Проверяем данные продаж
    const salesData = await prisma.salesData.findMany();
    console.log(`\n💰 Всего записей продаж: ${salesData.length}`);
    
    if (salesData.length > 0) {
      console.log('\n📈 Первые 3 записи продаж:');
      salesData.slice(0, 3).forEach((sale, index) => {
        console.log(`  ${index + 1}. ${sale.productName} (${sale.sku}) - ${sale.revenue}₽`);
      });
    }
    
    // Проверяем файлы в uploads директории
    const uploadDir = process.env.UPLOAD_DEST || './uploads';
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      console.log(`\n📁 Файлы в директории uploads: ${files.length}`);
      files.forEach(file => {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);
        console.log(`  - ${file} (${stats.size} байт)`);
      });
    } else {
      console.log(`\n❌ Директория uploads не существует: ${uploadDir}`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testFileProcessing();