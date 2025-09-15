# Структура проекта Marketplace Analytics

## 📁 Полная структура файлов

```
marketplace-analytics/
├── README.md                           # Основная документация
├── DEPLOYMENT.md                       # Инструкции по развертыванию
├── API_EXAMPLES.md                     # Примеры использования API
├── PROJECT_STRUCTURE.md               # Этот файл
├── docker-compose.yml                 # Docker конфигурация
│
├── backend/                           # NestJS Backend
│   ├── package.json                   # Зависимости backend
│   ├── nest-cli.json                  # Конфигурация NestJS CLI
│   ├── tsconfig.json                  # TypeScript конфигурация
│   ├── .env.example                   # Пример переменных окружения
│   ├── .env                          # Переменные окружения (локально)
│   │
│   ├── prisma/
│   │   └── schema.prisma             # Схема базы данных
│   │
│   └── src/
│       ├── main.ts                   # Точка входа приложения
│       ├── app.module.ts             # Главный модуль
│       ├── app.controller.ts         # Главный контроллер
│       ├── app.service.ts            # Главный сервис
│       │
│       ├── prisma/                   # Prisma модуль
│       │   ├── prisma.module.ts
│       │   └── prisma.service.ts
│       │
│       ├── auth/                     # Модуль аутентификации
│       │   ├── auth.module.ts
│       │   ├── auth.service.ts
│       │   ├── auth.controller.ts
│       │   ├── dto/
│       │   │   ├── login.dto.ts
│       │   │   └── register.dto.ts
│       │   ├── strategies/
│       │   │   ├── jwt.strategy.ts
│       │   │   └── local.strategy.ts
│       │   └── guards/
│       │       ├── jwt-auth.guard.ts
│       │       └── local-auth.guard.ts
│       │
│       ├── users/                    # Модуль пользователей
│       │   ├── users.module.ts
│       │   ├── users.service.ts
│       │   ├── users.controller.ts
│       │   └── dto/
│       │       ├── create-user.dto.ts
│       │       └── update-user.dto.ts
│       │
│       ├── uploads/                  # Модуль загрузки файлов
│       │   ├── uploads.module.ts
│       │   ├── uploads.service.ts
│       │   ├── uploads.controller.ts
│       │   ├── dto/
│       │   │   └── upload-file.dto.ts
│       │   └── processors/
│       │       └── file-parsing.processor.ts
│       │
│       ├── analytics/                # Модуль аналитики
│       │   ├── analytics.module.ts
│       │   ├── analytics.service.ts
│       │   └── analytics.controller.ts
│       │
│       └── common/                   # Общие компоненты
│           ├── decorators/
│           ├── guards/
│           ├── interceptors/
│           ├── pipes/
│           └── filters/
│
├── frontend/                         # Vue 3 Frontend
│   ├── package.json                  # Зависимости frontend
│   ├── vite.config.ts               # Конфигурация Vite
│   ├── tsconfig.json                # TypeScript конфигурация
│   ├── tailwind.config.js           # Конфигурация TailwindCSS
│   ├── postcss.config.js            # Конфигурация PostCSS
│   ├── index.html                   # HTML шаблон
│   ├── env.d.ts                     # TypeScript декларации
│   ├── .env.example                 # Пример переменных окружения
│   ├── .env                         # Переменные окружения (локально)
│   │
│   └── src/
│       ├── main.ts                  # Точка входа приложения
│       ├── App.vue                  # Главный компонент
│       │
│       ├── router/
│       │   └── index.ts             # Конфигурация маршрутов
│       │
│       ├── stores/
│       │   └── auth.ts              # Pinia store для аутентификации
│       │
│       ├── services/                # HTTP сервисы
│       │   ├── api.ts               # Базовый API сервис
│       │   ├── auth.ts              # Сервис аутентификации
│       │   ├── uploads.ts           # Сервис загрузки файлов
│       │   └── analytics.ts         # Сервис аналитики
│       │
│       ├── components/
│       │   ├── layout/              # Layout компоненты
│       │   │   ├── AppLayout.vue
│       │   │   └── AuthLayout.vue
│       │   │
│       │   ├── ui/                  # UI компоненты
│       │   │   ├── BaseButton.vue
│       │   │   ├── BaseInput.vue
│       │   │   ├── StatsCard.vue
│       │   │   └── FileUpload.vue
│       │   │
│       │   └── charts/              # Компоненты графиков
│       │       ├── LineChart.vue
│       │       └── PieChart.vue
│       │
│       ├── views/                   # Страницы
│       │   ├── DashboardView.vue    # Дашборд
│       │   ├── UploadView.vue       # Загрузка файлов
│       │   ├── AnalyticsView.vue    # Аналитика
│       │   ├── ReportsView.vue      # Список отчетов
│       │   ├── ReportDetailsView.vue # Детали отчета
│       │   ├── ProfileView.vue      # Профиль пользователя
│       │   ├── NotFoundView.vue     # 404 страница
│       │   └── auth/                # Страницы аутентификации
│       │       ├── LoginView.vue
│       │       └── RegisterView.vue
│       │
│       ├── assets/
│       │   └── css/
│       │       └── main.css         # Основные стили
│       │
│       ├── composables/             # Vue composables (пусто)
│       └── types/                   # TypeScript типы (пусто)
│
└── shared/                          # Общие типы
    └── types.ts                     # TypeScript типы для frontend и backend
```

## 🎯 Ключевые компоненты

### Backend (NestJS)
- **Модульная архитектура**: Каждый функционал выделен в отдельный модуль
- **JWT аутентификация**: Безопасная авторизация с токенами
- **Prisma ORM**: Типобезопасная работа с базой данных
- **Bull Queue**: Фоновая обработка файлов
- **Swagger**: Автоматическая документация API
- **Валидация**: Class-validator для проверки входных данных

### Frontend (Vue 3)
- **Composition API**: Современный подход Vue 3
- **TypeScript**: Типизация для надежности
- **Pinia**: Управление состоянием приложения
- **Vue Router**: Маршрутизация с защищенными роутами
- **TailwindCSS**: Utility-first CSS фреймворк
- **Chart.js**: Интерактивные графики
- **Компонентная архитектура**: Переиспользуемые UI компоненты

### База данных (PostgreSQL)
- **Prisma схема**: Декларативное описание моделей
- **Миграции**: Версионирование изменений БД
- **Связи**: Правильно настроенные foreign keys
- **Индексы**: Для оптимизации запросов

## 🔧 Конфигурационные файлы

### Backend
- `package.json` - Зависимости и скрипты
- `nest-cli.json` - Настройки NestJS CLI
- `tsconfig.json` - Конфигурация TypeScript
- `.env` - Переменные окружения
- `prisma/schema.prisma` - Схема базы данных

### Frontend  
- `package.json` - Зависимости и скрипты
- `vite.config.ts` - Настройки сборщика Vite
- `tsconfig.json` - Конфигурация TypeScript
- `tailwind.config.js` - Настройки TailwindCSS
- `postcss.config.js` - Обработка CSS

### Docker
- `docker-compose.yml` - PostgreSQL, Redis, PgAdmin

## 📊 Статистика проекта

- **Общее количество файлов**: ~50
- **Строки кода (приблизительно)**:
  - Backend: ~2000 строк
  - Frontend: ~3000 строк
  - Конфигурация: ~500 строк
- **Технологии**: 15+ современных технологий
- **Модули Backend**: 5 основных модулей
- **Компоненты Frontend**: 15+ переиспользуемых компонентов
- **API endpoints**: 20+ endpoints

## 🚀 MVP функционал

Реализованный MVP включает:
1. ✅ Полную аутентификацию (регистрация, вход, JWT)
2. ✅ Загрузку и парсинг Excel/CSV файлов
3. ✅ Расчет прибыли с учетом комиссий WB/Ozon
4. ✅ Интерактивный дашборд с графиками
5. ✅ Адаптивный дизайн для всех устройств
6. ✅ API документацию (Swagger)
7. ✅ Безопасность и валидацию данных
8. ✅ Обработку файлов в фоновом режиме

Проект готов к развертыванию и дальнейшему развитию! 🎉