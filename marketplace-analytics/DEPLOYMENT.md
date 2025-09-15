# Инструкция по развертыванию Marketplace Analytics

## Предварительные требования

- Node.js 18+
- Docker и Docker Compose
- PostgreSQL (если не используете Docker)
- Redis (если не используете Docker)

## 🚀 Быстрый старт

### 1. Клонирование и установка зависимостей

```bash
git clone <repository-url>
cd marketplace-analytics

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Настройка переменных окружения

```bash
# Backend
cp backend/.env.example backend/.env
# Отредактируйте backend/.env с вашими настройками

# Frontend
cp frontend/.env.example frontend/.env
# Отредактируйте frontend/.env с вашими настройками
```

### 3. Запуск базы данных

#### Вариант A: Через Docker (рекомендуется)
```bash
# Из корневой папки проекта
docker compose up -d
```

#### Вариант B: Локальная установка
Установите PostgreSQL и Redis локально, затем обновите строки подключения в `.env` файлах.

### 4. Настройка базы данных

```bash
cd backend

# Генерация Prisma Client
npx prisma generate

# Создание и применение миграций
npx prisma migrate dev --name init

# Опционально: заполнение тестовыми данными
npx prisma db seed
```

### 5. Запуск приложений

#### Терминал 1: Backend
```bash
cd backend
npm run start:dev
```

#### Терминал 2: Frontend
```bash
cd frontend
npm run dev
```

### 6. Доступ к приложению

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api
- Swagger документация: http://localhost:3000/api/docs
- PgAdmin (если используете Docker): http://localhost:8080

## 🐳 Docker окружение

### Переменные окружения для Docker

**PostgreSQL:**
- Пользователь: `postgres`
- Пароль: `postgres123`
- База данных: `marketplace_analytics`
- Порт: `5432`

**Redis:**
- Порт: `6379`

**PgAdmin:**
- Email: `admin@admin.com`
- Пароль: `admin123`
- Порт: `8080`

## 📊 Структура базы данных

Проект использует следующие основные таблицы:

- `users` - пользователи системы
- `reports` - загруженные отчеты
- `sales_data` - данные о продажах

## 🔧 Конфигурация

### Backend (.env)
```env
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/marketplace_analytics?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
REDIS_HOST="localhost"
REDIS_PORT="6379"
MAX_FILE_SIZE=52428800
UPLOAD_DEST="./uploads"
PORT=3000
CORS_ORIGIN="http://localhost:5173"
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## 🧪 Тестирование

### Backend
```bash
cd backend
npm run test
npm run test:e2e
```

### Frontend
```bash
cd frontend
npm run test
```

## 📦 Сборка для продакшена

### Backend
```bash
cd backend
npm run build
npm run start:prod
```

### Frontend
```bash
cd frontend
npm run build
# Статические файлы будут в папке dist/
```

## 🔐 Безопасность

### Для продакшена обязательно:

1. Смените JWT_SECRET на случайную строку
2. Используйте сложные пароли для базы данных
3. Настройте HTTPS
4. Ограничьте CORS_ORIGIN до вашего домена
5. Настройте файрвол
6. Используйте переменные окружения для секретов

## 📈 Мониторинг

### Health check endpoints:
- Backend: `GET /api/health`
- Database: через PgAdmin или прямое подключение

### Логи:
- Backend логи: консоль приложения
- База данных: логи Docker контейнера

## 🚨 Устранение неполадок

### Проблемы с подключением к БД
1. Проверьте, что PostgreSQL запущен
2. Проверьте строку подключения в .env
3. Убедитесь, что база данных создана

### Проблемы с CORS
1. Проверьте CORS_ORIGIN в backend/.env
2. Убедитесь, что frontend запущен на правильном порту

### Проблемы с загрузкой файлов
1. Проверьте права доступа к папке uploads/
2. Проверьте MAX_FILE_SIZE в .env
3. Убедитесь, что Redis запущен для очередей

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи приложений
2. Убедитесь, что все сервисы запущены
3. Проверьте переменные окружения
4. Перезапустите сервисы при необходимости

## 🎯 Следующие шаги

После успешного развертывания:
1. Создайте тестовый аккаунт
2. Загрузите пример файла для тестирования
3. Проверьте работу аналитики
4. Настройте резервное копирование БД