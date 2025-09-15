# API Examples - Примеры использования API

## 🔐 Аутентификация

### Регистрация пользователя
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "Иван Иванов"
  }'
```

**Ответ:**
```json
{
  "user": {
    "id": "clxxxxx",
    "email": "user@example.com",
    "name": "Иван Иванов",
    "plan": "FREE",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Вход в систему
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Получение профиля
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📤 Загрузка файлов

### Загрузка отчета Wildberries
```bash
curl -X POST http://localhost:3000/api/uploads \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/wildberries_report.xlsx" \
  -F "marketplace=WILDBERRIES"
```

**Ответ:**
```json
{
  "reportId": "clxxxxx",
  "message": "Файл загружен и отправлен на обработку"
}
```

### Получение списка отчетов
```bash
curl -X GET http://localhost:3000/api/uploads \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Ответ:**
```json
[
  {
    "id": "clxxxxx",
    "fileName": "wildberries_report.xlsx",
    "marketplace": "WILDBERRIES",
    "uploadDate": "2024-01-01T00:00:00.000Z",
    "processed": true,
    "totalRevenue": 150000,
    "totalProfit": 45000,
    "profitMargin": 30.0,
    "_count": {
      "salesData": 150
    }
  }
]
```

### Получение конкретного отчета
```bash
curl -X GET http://localhost:3000/api/uploads/clxxxxx \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Удаление отчета
```bash
curl -X DELETE http://localhost:3000/api/uploads/clxxxxx \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📊 Аналитика

### Получение аналитики дашборда
```bash
curl -X GET http://localhost:3000/api/analytics/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**С фильтром по периоду:**
```bash
curl -X GET "http://localhost:3000/api/analytics/dashboard?period=30d" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Ответ:**
```json
{
  "totalRevenue": 150000,
  "totalProfit": 45000,
  "profitMargin": 30.0,
  "totalOrders": 150,
  "topProducts": [
    {
      "sku": "WB12345",
      "productName": "Товар 1",
      "revenue": 25000,
      "profit": 7500,
      "profitMargin": 30.0,
      "quantity": 25
    }
  ],
  "dailySales": [
    {
      "date": "2024-01-01",
      "revenue": 5000,
      "profit": 1500,
      "orders": 5
    }
  ],
  "expenseBreakdown": {
    "commission": 7500,
    "logistics": 6000,
    "storage": 3750,
    "returns": 2250
  }
}
```

### Получение аналитики по отчету
```bash
curl -X GET http://localhost:3000/api/analytics/report/clxxxxx \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 👤 Управление пользователем

### Получение данных пользователя
```bash
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Обновление данных пользователя
```bash
curl -X PATCH http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Новое Имя",
    "plan": "START"
  }'
```

### Удаление аккаунта
```bash
curl -X DELETE http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🏥 Health Check

### Проверка состояния API
```bash
curl -X GET http://localhost:3000/api/health
```

**Ответ:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

## 📝 Swagger документация

Полная интерактивная документация API доступна по адресу:
http://localhost:3000/api/docs

## 🔄 Коды ошибок

| Код | Описание |
|-----|----------|
| 200 | Успешный запрос |
| 201 | Ресурс создан |
| 400 | Неверный запрос |
| 401 | Не авторизован |
| 403 | Доступ запрещен |
| 404 | Ресурс не найден |
| 409 | Конфликт (например, email уже существует) |
| 429 | Слишком много запросов |
| 500 | Внутренняя ошибка сервера |

## 📊 Форматы файлов

### Wildberries (ожидаемые колонки):
- "Дата продажи" (дата в формате DD.MM.YYYY или YYYY-MM-DD)
- "Артикул WB" (строка)
- "Наименование" (строка)
- "Цена продажи" (число)
- "Количество" (целое число)
- "Комиссия WB" (число, опционально)

### Ozon (ожидаемые колонки):
- "Дата" (дата в формате DD.MM.YYYY или YYYY-MM-DD)
- "Артикул" (строка)
- "Название товара" (строка)
- "Цена за единицу" (число)
- "Количество" (целое число)
- "Комиссия за продажу" (число, опционально)

## 🔒 Безопасность

### Rate Limiting
- По умолчанию: 100 запросов в минуту на IP
- Для авторизованных пользователей: увеличенные лимиты

### JWT Токены
- Время жизни: 7 дней (по умолчанию)
- Автоматическое обновление при запросах
- Безопасное хранение в localStorage (frontend)

### Валидация файлов
- Максимальный размер: 50MB
- Поддерживаемые форматы: .xlsx, .xls, .csv
- Проверка MIME типов
- Сканирование на вредоносный код (в продакшене)