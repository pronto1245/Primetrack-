# PrimeTrack Cloudflare Worker Proxy

Cloudflare Worker для проксирования всех запросов к PrimeTrack через HTTPS.

## Зачем это нужно?

При использовании кастомного домена (например primetrack.pro) все запросы, включая tracking links (`/click/*`), должны проходить через Cloudflare Worker для корректной работы SSL.

## Быстрая настройка

### 1. Установите Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Авторизуйтесь в Cloudflare

```bash
wrangler login
```

### 3. Обновите конфигурацию

Отредактируйте `wrangler.toml`:

```toml
[vars]
ORIGIN_URL = "https://your-repl.replit.app"  # Ваш Replit URL
```

Раскомментируйте и обновите routes:

```toml
routes = [
  { pattern = "primetrack.pro/*", zone_name = "primetrack.pro" },
  { pattern = "www.primetrack.pro/*", zone_name = "primetrack.pro" }
]
```

### 4. Добавьте секрет для авторизации

```bash
wrangler secret put WORKER_SECRET
```

Введите случайную строку (минимум 32 символа). Этот же секрет нужно добавить в настройки платформы.

### 5. Деплой

```bash
cd cloudflare
wrangler deploy
```

## Настройка в PrimeTrack

### Переменные окружения

Добавьте в Replit Secrets:

| Переменная | Описание |
|------------|----------|
| `PLATFORM_DOMAIN` | Ваш домен (например: `primetrack.pro`) |

### Секрет Worker в базе данных

В таблице `platform_settings` установите `cloudflareWorkerSecret` равным тому же значению, что вы ввели при `wrangler secret put WORKER_SECRET`.

## Настройка DNS в Cloudflare

1. Добавьте домен в Cloudflare
2. Настройте DNS записи:

| Тип | Имя | Значение | Proxy |
|-----|-----|----------|-------|
| CNAME | @ | your-repl.replit.app | Proxied (оранжевое облако) |
| CNAME | www | your-repl.replit.app | Proxied (оранжевое облако) |

3. SSL/TLS настройки:
   - Режим: **Full (strict)**
   - Always Use HTTPS: **Включено**
   - Minimum TLS Version: **1.2**

## Проверка работы

После деплоя проверьте:

```bash
# Главная страница
curl -I https://primetrack.pro

# Tracking link
curl -I "https://primetrack.pro/click/0001/0001?partner_id=001"
```

Оба запроса должны вернуть HTTP 200 или 302 (для click - редирект на оффер).

## Troubleshooting

### SSL не работает для /click/*

1. Убедитесь что Worker привязан к маршруту `primetrack.pro/*` (со звёздочкой)
2. Проверьте что WORKER_SECRET совпадает в Worker и в platform_settings
3. Очистите кэш Cloudflare: Caching → Configuration → Purge Everything

### 502 Bad Gateway

1. Проверьте что ORIGIN_URL указывает на работающий Replit
2. Убедитесь что Replit не заблокировал IP Cloudflare

### Редиректы не работают

Worker настроен с `redirect: 'manual'` - это позволяет передавать 302 редиректы от click handler напрямую клиенту.

## Архитектура

```
Браузер → Cloudflare CDN → Worker → Replit Origin
         (SSL терминация)   (проксирование)
```

Worker добавляет заголовки:
- `X-Forwarded-Host`: оригинальный домен
- `X-Original-Host`: оригинальный домен (legacy)
- `X-Forwarded-Proto`: https
- `X-CF-Worker-Auth`: секрет для авторизации

Express middleware проверяет `X-CF-Worker-Auth` и доверяет `X-Forwarded-Host` только если секрет совпадает.
