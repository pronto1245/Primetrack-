# Деплой PrimeTrack на Koyeb

## 1. Подготовка кода

### Изменить vite.config.ts

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

### Изменить package.json

Удалить из `devDependencies`:
```json
"@replit/vite-plugin-cartographer": "^0.4.4",
"@replit/vite-plugin-dev-banner": "^0.1.1",
"@replit/vite-plugin-runtime-error-modal": "^0.0.4",
```

## 2. Настройка Neon PostgreSQL

1. Создай проект на neon.tech
2. Скопируй `DATABASE_URL` (формат: `postgresql://user:pass@host/db?sslmode=require`)

## 3. Деплой на Koyeb

### Вариант 1: Через GitHub

1. Залей код на GitHub
2. В Koyeb → Create App → GitHub
3. Выбери репозиторий
4. Build command: `npm run build`
5. Start command: `npm start`
6. Port: `5000`

### Вариант 2: Через Docker

1. Залей код на GitHub
2. В Koyeb → Create App → Docker
3. Укажи Dockerfile

## 4. Переменные окружения

В Koyeb → Settings → Environment Variables добавь:

```
DATABASE_URL=postgresql://...
SESSION_SECRET=твой-секретный-ключ
NODE_ENV=production
PORT=5000
RESEND_API_KEY=... (если нужен email)
```

## 5. Миграция базы данных

После деплоя запусти миграцию:

```bash
# Локально с новым DATABASE_URL
DATABASE_URL="postgresql://..." npm run db:push
```

## 6. Миграция данных с Replit

Если нужно перенести данные:

```bash
# Экспорт с Replit
pg_dump $DATABASE_URL > backup.sql

# Импорт на Neon
psql "postgresql://..." < backup.sql
```

## Готово!

Приложение будет доступно по адресу: `https://primetrack-xxx.koyeb.app`
