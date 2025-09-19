# API Запросы для тестирования новой функциональности

## Аутентификация

Сначала необходимо получить JWT токен:

### 1. Регистрация пользователя
```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "name": "Test User"
}
```

### 2. Вход в систему
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

**Ответ содержит access_token, который нужно использовать в заголовке Authorization**

## Управление отчетами

### 3. Получить список всех отчетов пользователя
```http
GET http://localhost:3000/api/uploads
Authorization: Bearer YOUR_JWT_TOKEN
```

### 4. Загрузить новый отчет
```http
POST http://localhost:3000/api/uploads
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data

# Форма должна содержать:
# file: файл (CSV/Excel)
# marketplace: "WILDBERRIES" или "OZON"
```

### 5. Получить детали конкретного отчета
```http
GET http://localhost:3000/api/uploads/REPORT_ID
Authorization: Bearer YOUR_JWT_TOKEN
```

### 6. Удалить конкретный отчет
```http
DELETE http://localhost:3000/api/uploads/REPORT_ID
Authorization: Bearer YOUR_JWT_TOKEN
```

### 7. Удалить все отчеты пользователя
```http
DELETE http://localhost:3000/api/uploads
Authorization: Bearer YOUR_JWT_TOKEN
```

### 8. Заменить отчет новым файлом
```http
POST http://localhost:3000/api/uploads/REPORT_ID/replace
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data

# Форма должна содержать:
# file: новый файл (CSV/Excel)
# marketplace: "WILDBERRIES" или "OZON"
```

## Аналитика

### 9. Получить аналитику дашборда
```http
GET http://localhost:3000/api/analytics/dashboard
Authorization: Bearer YOUR_JWT_TOKEN
```

### 10. Получить аналитику дашборда за период
```http
GET http://localhost:3000/api/analytics/dashboard?period=30d
Authorization: Bearer YOUR_JWT_TOKEN
```

### 11. Получить аналитику конкретного отчета
```http
GET http://localhost:3000/api/analytics/report/REPORT_ID
Authorization: Bearer YOUR_JWT_TOKEN
```

### 12. 🆕 НОВЫЙ: Сбросить всю статистику пользователя
```http
DELETE http://localhost:3000/api/analytics/clear
Authorization: Bearer YOUR_JWT_TOKEN
```

**Ответ:**
```json
{
  "message": "Вся статистика очищена. Удалено отчетов: 3, записей данных: 1500",
  "deletedReports": 3,
  "deletedSalesData": 1500
}
```

## Примеры использования с curl

### Регистрация
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### Вход
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Получить список отчетов
```bash
curl -X GET http://localhost:3000/api/uploads \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Сбросить всю статистику (НОВЫЙ ENDPOINT)
```bash
curl -X DELETE http://localhost:3000/api/analytics/clear \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Удалить все отчеты
```bash
curl -X DELETE http://localhost:3000/api/uploads \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Загрузить файл
```bash
curl -X POST http://localhost:3000/api/uploads \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/your/file.csv" \
  -F "marketplace=WILDBERRIES"
```

## Swagger документация

Полная документация API доступна по адресу:
```
http://localhost:3000/api/docs
```

## Статус коды

- `200` - Успешный запрос
- `201` - Ресурс создан
- `400` - Неверный запрос
- `401` - Не авторизован
- `403` - Доступ запрещен
- `404` - Ресурс не найден
- `500` - Внутренняя ошибка сервера

## Тестирование в Postman

1. Создайте новую коллекцию в Postman
2. Добавьте переменную окружения `baseUrl` = `http://localhost:3000/api`
3. Добавьте переменную окружения `token` для хранения JWT токена
4. Импортируйте запросы из этого файла
5. Сначала выполните регистрацию/вход, сохраните токен
6. Используйте токен в заголовках остальных запросов