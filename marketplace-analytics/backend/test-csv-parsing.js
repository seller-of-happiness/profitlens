const fs = require('fs');
const Papa = require('papaparse');

// Читаем ваш CSV файл
const fileContent = fs.readFileSync('./correct_test_file.csv', 'utf8');

console.log('=== ИСХОДНЫЙ ФАЙЛ ===');
console.log('Первые 500 символов:', fileContent.substring(0, 500));
console.log('Количество строк:', fileContent.split('\n').length);

// Парсим файл
const parsed = Papa.parse(fileContent, {
  header: true,
  skipEmptyLines: true,
  delimiter: ',',
  quoteChar: '"',
  escapeChar: '"',
  transformHeader: (header) => header.trim(),
});

console.log('\n=== РЕЗУЛЬТАТ ПАРСИНГА ===');
console.log('Количество строк данных:', parsed.data.length);
console.log('Ошибки парсинга:', parsed.errors.length);
if (parsed.errors.length > 0) {
  console.log('Первые 5 ошибок:', parsed.errors.slice(0, 5));
}

console.log('\n=== ЗАГОЛОВКИ ===');
console.log('Поля:', parsed.meta.fields);

console.log('\n=== ПЕРВЫЕ 5 ЗАПИСЕЙ ===');
parsed.data.slice(0, 5).forEach((row, index) => {
  console.log(`Запись ${index + 1}:`);
  console.log('  Дата:', row['Дата']);
  console.log('  Артикул:', row['Артикул']);
  console.log('  Название:', row['Название товара']);
  console.log('  Цена:', row['Цена за единицу']);
  console.log('  Количество:', row['Количество']);
  console.log('  ---');
});

console.log('\n=== ПРОБЛЕМНЫЕ ЗАПИСИ ===');
// Ищем записи с куртками
const kurtkiRecords = parsed.data.filter(row => 
  row['Название товара'] && row['Название товара'].includes('Куртка зимняя мужская')
);

console.log('Найдено записей с курткой:', kurtkiRecords.length);
kurtkiRecords.forEach((row, index) => {
  console.log(`Куртка ${index + 1}:`);
  console.log('  Дата:', row['Дата']);
  console.log('  Артикул:', row['Артикул']);
  console.log('  Количество:', row['Количество']);
  console.log('  ---');
});

console.log('\n=== АГРЕГАЦИЯ ПО АРТИКУЛАМ ===');
// Группируем по артикулам
const productMap = new Map();
parsed.data.forEach((row) => {
  const sku = row['Артикул'];
  const quantity = parseInt(row['Количество']) || 0;
  const name = row['Название товара'];
  
  if (productMap.has(sku)) {
    const existing = productMap.get(sku);
    existing.quantity += quantity;
    existing.count += 1;
  } else {
    productMap.set(sku, {
      sku: sku,
      name: name,
      quantity: quantity,
      count: 1
    });
  }
});

// Показываем топ 10 товаров по количеству
const topProducts = Array.from(productMap.values())
  .sort((a, b) => b.quantity - a.quantity)
  .slice(0, 10);

console.log('Топ 10 товаров по общему количеству:');
topProducts.forEach((product, index) => {
  console.log(`${index + 1}. ${product.name} (${product.sku}): ${product.quantity} шт. в ${product.count} записях`);
});

// Специально ищем куртку
const kurtkaSku = '817905285';
if (productMap.has(kurtkaSku)) {
  const kuртка = productMap.get(kurtkaSku);
  console.log(`\nСпециально куртка ${kurtkaSku}:`);
  console.log(`  Название: ${kuртка.name}`);
  console.log(`  Общее количество: ${kuртка.quantity}`);
  console.log(`  Количество записей: ${kuртка.count}`);
}