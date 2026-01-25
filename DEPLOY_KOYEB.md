# Деплой PrimeTrack на Koyeb

## 1. Подготовка кода

### 1.1 Изменить vite.config.ts

Убрать Replit-плагины. Заменить файл на:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { metaImagesPlugin } from "./vite-plugin-meta-images";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    metaImagesPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
```

### 1.2 Изменить package.json

Удалить из `devDependencies`:
```json
"@replit/vite-plugin-cartographer": "^0.4.4",
"@replit/vite-plugin-dev-banner": "^0.1.1",
"@replit/vite-plugin-runtime-error-modal": "^0.0.4",
```

### 1.3 Переустановить зависимости

```bash
rm -rf node_modules package-lock.json
npm install
```

### 1.4 Проверить сборку локально

```bash
npm run build
```

## 2. Настройка Neon PostgreSQL

1. Создай проект на [neon.tech](https://neon.tech)
2. Скопируй `DATABASE_URL` (формат: `postgresql://user:pass@host/db?sslmode=require`)

## 3. Деплой на Koyeb

### Вариант 1: Через GitHub (рекомендуется)

1. Залей код на GitHub
2. В Koyeb → Create App → GitHub
3. Выбери репозиторий
4. **Build command:** `npm run build`
5. **Start command:** `npm start`
6. **Port:** `5000`

> **Важно:** Koyeb автоматически устанавливает переменную `PORT`. Приложение уже настроено использовать `process.env.PORT || "5000"`.

### Вариант 2: Через Docker

1. Залей код на GitHub с Dockerfile
2. В Koyeb → Create App → Docker
3. Укажи путь к Dockerfile: `./Dockerfile`

## 4. Переменные окружения (ОБЯЗАТЕЛЬНО)

В Koyeb → Settings → Environment Variables добавь:

### Обязательные:
```
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
SESSION_SECRET=сгенерируй-через-openssl-rand-base64-32
ENCRYPTION_KEY=сгенерируй-через-openssl-rand-base64-32
APP_DOMAIN=https://твой-домен.koyeb.app
PLATFORM_DOMAIN=твой-домен.koyeb.app
NODE_ENV=production
```

### Для email уведомлений:
```
RESEND_API_KEY=твой-ключ-resend
```

### Опциональные:
```
TELEGRAM_NOTIFY_BOT_TOKEN=токен-бота
IPINFO_TOKEN=токен-ipinfo
CORS_ORIGIN=https://твой-домен.koyeb.app
```

> Полный список переменных смотри в `.env.example`

## 5. Миграция базы данных

После создания Neon базы, **локально** запусти:

```bash
# Установи DATABASE_URL для Neon
export DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Создай таблицы
npm run db:push
```

## 6. Миграция данных с Replit (опционально)

Если нужно перенести существующие данные:

```bash
# 1. На Replit: экспорт базы
pg_dump $DATABASE_URL > backup.sql

# 2. Скачай backup.sql

# 3. Локально: импорт в Neon
psql "postgresql://user:pass@neon-host/db?sslmode=require" < backup.sql
```

## 7. Проверка после деплоя

1. Открой URL приложения на Koyeb
2. Проверь логи в Koyeb Dashboard
3. Убедись что подключение к базе работает

## Готово!

Приложение будет доступно по адресу: `https://primetrack-xxx.koyeb.app`

---

## Troubleshooting

### Ошибка "Cannot find module"
Убедись что удалил Replit плагины из vite.config.ts и package.json

### Ошибка подключения к базе
Проверь что `?sslmode=require` добавлен в DATABASE_URL

### Приложение не стартует
Проверь логи в Koyeb → твоё приложение → Logs
