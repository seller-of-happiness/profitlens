const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testAPI() {
  console.log('🧪 Тестирование API...\n');
  
  try {
    // 1. Проверка health endpoint
    console.log('1️⃣ Проверка health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log(`✅ Health check: ${healthResponse.status} - ${JSON.stringify(healthResponse.data)}\n`);
    
    // 2. Регистрация тестового пользователя
    console.log('2️⃣ Регистрация тестового пользователя...');
    const registerData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    };
    
    try {
      const registerResponse = await axios.post(`${BASE_URL}/auth/register`, registerData);
      console.log(`✅ Регистрация: ${registerResponse.status}`);
      console.log(`   Token: ${registerResponse.data.accessToken?.substring(0, 20)}...`);
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('⚠️ Пользователь уже существует, пробуем войти...');
      } else {
        throw error;
      }
    }
    
    // 3. Логин
    console.log('\n3️⃣ Вход в систему...');
    const loginData = {
      email: 'test@example.com',
      password: 'password123'
    };
    
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, loginData);
    console.log(`✅ Логин: ${loginResponse.status}`);
    const token = loginResponse.data.accessToken;
    console.log(`   Token: ${token.substring(0, 20)}...`);
    
    // Настраиваем заголовки для авторизованных запросов
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 4. Получение отчетов
    console.log('\n4️⃣ Получение списка отчетов...');
    const reportsResponse = await axios.get(`${BASE_URL}/uploads`, { headers: authHeaders });
    console.log(`✅ Отчеты: ${reportsResponse.status}`);
    console.log(`   Количество отчетов: ${reportsResponse.data.length}`);
    
    if (reportsResponse.data.length > 0) {
      console.log('   Первый отчет:');
      const firstReport = reportsResponse.data[0];
      console.log(`     - Файл: ${firstReport.fileName}`);
      console.log(`     - Маркетплейс: ${firstReport.marketplace}`);
      console.log(`     - Обработан: ${firstReport.processed}`);
      console.log(`     - Записей продаж: ${firstReport._count?.salesData || 0}`);
      console.log(`     - Выручка: ${firstReport.totalRevenue || 'не рассчитана'}`);
      console.log(`     - Прибыль: ${firstReport.totalProfit || 'не рассчитана'}`);
    }
    
    // 5. Получение аналитики дашборда
    console.log('\n5️⃣ Получение аналитики дашборда...');
    const analyticsResponse = await axios.get(`${BASE_URL}/analytics/dashboard`, { headers: authHeaders });
    console.log(`✅ Аналитика: ${analyticsResponse.status}`);
    const analytics = analyticsResponse.data;
    console.log(`   Общая выручка: ${analytics.totalRevenue}₽`);
    console.log(`   Общая прибыль: ${analytics.totalProfit}₽`);
    console.log(`   Маржинальность: ${analytics.profitMargin?.toFixed(2)}%`);
    console.log(`   Количество заказов: ${analytics.totalOrders}`);
    console.log(`   Топ товаров: ${analytics.topProducts?.length || 0}`);
    console.log(`   Дневных продаж: ${analytics.dailySales?.length || 0}`);
    
    if (analytics.topProducts && analytics.topProducts.length > 0) {
      console.log('\n   🏆 Топ-3 товара по прибыли:');
      analytics.topProducts.slice(0, 3).forEach((product, index) => {
        console.log(`     ${index + 1}. ${product.productName} (${product.sku})`);
        console.log(`        Выручка: ${product.revenue}₽, Прибыль: ${product.profit}₽`);
      });
    }
    
    // 6. Получение детальной аналитики по отчету
    if (reportsResponse.data.length > 0) {
      const reportId = reportsResponse.data.find(r => r._count?.salesData > 0)?.id;
      if (reportId) {
        console.log('\n6️⃣ Получение детальной аналитики по отчету...');
        const reportAnalyticsResponse = await axios.get(`${BASE_URL}/analytics/report/${reportId}`, { headers: authHeaders });
        console.log(`✅ Аналитика отчета: ${reportAnalyticsResponse.status}`);
        const reportAnalytics = reportAnalyticsResponse.data;
        console.log(`   Выручка отчета: ${reportAnalytics.totalRevenue}₽`);
        console.log(`   Прибыль отчета: ${reportAnalytics.totalProfit}₽`);
        console.log(`   Заказов в отчете: ${reportAnalytics.totalOrders}`);
      }
    }
    
    console.log('\n🎉 Все тесты API прошли успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка API:', error.response?.data || error.message);
    if (error.response) {
      console.error(`   Статус: ${error.response.status}`);
      console.error(`   URL: ${error.config?.url}`);
    }
  }
}

testAPI();