const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testUpload() {
  try {
    console.log('=== ЛОГИН ПОЛЬЗОВАТЕЛЯ ===');
    
    // Логинимся
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.accessToken;
    console.log('Получен токен:', token ? token.substring(0, 20) + '...' : 'undefined');
    
    console.log('\n=== ЗАГРУЗКА ФАЙЛА ===');
    
    // Создаем FormData для загрузки файла
    const form = new FormData();
    form.append('file', fs.createReadStream('./correct_test_file.csv'));
    form.append('marketplace', 'OZON');
    
    // Загружаем файл
    const uploadResponse = await axios.post(`${API_BASE}/uploads`, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Файл загружен:', uploadResponse.data);
    
    const reportId = uploadResponse.data.id;
    
    console.log('\n=== ОЖИДАНИЕ ОБРАБОТКИ ===');
    
    // Ждем обработки файла
    let processed = false;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (!processed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Ждем 2 секунды
      
      try {
        const reportResponse = await axios.get(`${API_BASE}/uploads/${reportId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log(`Попытка ${attempts + 1}: Статус обработки:`, reportResponse.data.processed);
        
        if (reportResponse.data.processed) {
          processed = true;
          console.log('Отчет обработан!');
          console.log('Общая выручка:', reportResponse.data.totalRevenue);
          console.log('Общая прибыль:', reportResponse.data.totalProfit);
        }
      } catch (error) {
        console.log(`Ошибка при проверке статуса (попытка ${attempts + 1}):`, error.message);
      }
      
      attempts++;
    }
    
    if (!processed) {
      console.log('Файл не был обработан за отведенное время');
    }
    
    console.log('\n=== ПОЛУЧЕНИЕ АНАЛИТИКИ ===');
    
    // Получаем аналитику дашборда
    const analyticsResponse = await axios.get(`${API_BASE}/analytics/dashboard?period=7d`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Аналитика дашборда:');
    console.log('- Общая выручка:', analyticsResponse.data.totalRevenue);
    console.log('- Общая прибыль:', analyticsResponse.data.totalProfit);
    console.log('- Количество заказов:', analyticsResponse.data.totalOrders);
    console.log('- Количество дней с продажами:', analyticsResponse.data.dailySales.length);
    console.log('- Топ товаров:', analyticsResponse.data.topProducts.length);
    
    if (analyticsResponse.data.topProducts.length > 0) {
      console.log('\nТоп 5 товаров по прибыли:');
      analyticsResponse.data.topProducts.slice(0, 5).forEach((product, index) => {
        console.log(`${index + 1}. ${product.productName} (${product.sku}): ${product.quantity} шт., прибыль ${product.profit}`);
      });
    }
    
    if (analyticsResponse.data.dailySales.length > 0) {
      console.log('\nПродажи по дням:');
      analyticsResponse.data.dailySales.forEach(day => {
        console.log(`${day.date}: выручка ${day.revenue}, прибыль ${day.profit}, заказов ${day.orders}`);
      });
    }
    
  } catch (error) {
    console.error('Ошибка:', error.response?.data || error.message);
  }
}

testUpload();