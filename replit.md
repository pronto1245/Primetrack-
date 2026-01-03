# PrimeTrack - SaaS Affiliate Platform

## Overview

Централизованная SaaS платформа для партнёрского трекинга. Все клики и конверсии записываются внутренне, постбеки опциональны.

## User Preferences

Preferred communication style: Simple, everyday language (Russian).

## Домены

- **Production Domain:** primetrack.pro
- **Replit Domain:** 24b37059-5b12-44cb-b70b-19a2dcb6cd9e-00-2qvmj5tosito.riker.replit.dev

---

## РЕАЛИЗОВАННЫЙ ФУНКЦИОНАЛ

### Аутентификация
- ✅ Регистрация/вход (email + пароль, bcrypt)
- ✅ Session-based аутентификация (connect-pg-simple)
- ✅ Обязательная 2FA (TOTP) для активных пользователей
- ✅ QR-код для настройки (Google Authenticator)
- ✅ Сброс 2FA через админа

### Роли
- ✅ Admin - полный доступ
- ✅ Advertiser - офферы, партнёры, финансы
- ✅ Publisher - доступ к офферам, ссылки, выплаты
- ✅ Advertiser Staff (Manager, Support, Finance)

---

## МЕНЮ ПО РОЛЯМ (АКТУАЛЬНО В UI)

### Admin
1. Обзор
2. Офферы (полный доступ: создание, редактирование, архивирование)
3. Отчёты
4. Пользователи
5. Антифрод
6. Финансы
7. Новости
8. Постбеки
9. Команда
10. Настройки

### Advertiser
1. Обзор
2. Офферы
3. Запросы
4. Партнёры
5. Отчёты
6. Антифрод
7. Финансы
8. Новости
9. Постбеки
10. Webhooks
11. Команда
12. Настройки (Профиль, Безопасность, White-label, Домены, Уведомления, Webhooks, Миграция)

### Publisher
1. Обзор
2. Ссылки (офферы)
3. Отчёты
4. Выплаты
5. Новости
6. Постбеки
7. Настройки (Профиль, Безопасность, Платёжные методы, Уведомления)

---

## BACKEND СЕРВИСЫ

### Mini-Tracker (Click Handler)
- ✅ `/api/click/:offerId/:publisherId`
- ✅ Генерация click_id
- ✅ GEO (geoip-lite), IP, User-Agent, fingerprint
- ✅ Редирект 302 на landing_url

### Orchestrator (Конверсии)
- ✅ `/api/conversion`
- ✅ События: click, lead, sale, install, rejected, hold_released
- ✅ Расчёт payouts
- ✅ Триггер постбеков и webhooks

### Постбеки (Универсальная система)
- ✅ **Один универсальный входящий постбек:** `/api/postback?click_id={click_id}&status={status}&payout={payout}`
- ✅ Автоматическое определение offer_id и publisher_id из click_id
- ✅ Поддержка параметров: click_id, clickid, subid, subid_1, tid, sub1, cid
- ✅ Маппинг статусов: lead/reg → Lead, sale/dep/ftd → Sale, install → Install
- ✅ Исходящие постбеки партнёрам с макросами
- ✅ Retry (5 попыток с экспоненциальным backoff)
- ✅ Логирование с direction (inbound/outbound)

### Webhooks
- ✅ CRUD endpoints
- ✅ Фильтрация по событиям/офферам/партнёрам
- ✅ HMAC-SHA256 подпись
- ✅ Retry: 1м → 5м → 15м → 1ч → 2ч
- ✅ UI в панели Advertiser

### Экспорт данных
- ✅ Форматы: CSV, Excel (xlsx), PDF
- ✅ **Отчёты** (клики, конверсии) — все роли
- ✅ **Финансы** (транзакции, выплаты) — Admin, Advertiser, Publisher
- ✅ **Постбеки** (логи) — все роли
- ✅ Role-based access control (publisher видит только свои данные)
- ✅ Фильтры синхронизированы с UI (поиск, даты, GEO, устройство)
- ✅ Сервис: server/services/export-service.ts
- ✅ Компонент: client/src/components/ui/export-menu.tsx

### Антифрод
- ✅ Fraud score
- ✅ Proxy/VPN детекция
- ✅ Fingerprint анализ
- ✅ Click-spam (velocity checks)
- ✅ Дубликаты лидов
- ✅ Автоматическая пометка подозрительного трафика (isSuspicious)
- ✅ Уведомления рекламодателю о подозрительных кликах
- ✅ UI вкладка "Подозрительные" в AntifraudDashboard
- ✅ API endpoint `/api/antifraud/suspicious-clicks`
- ⚠️ Доступ: Admin, Advertiser (Publisher НЕ видит)

### Финансы
- ✅ Балансы (available, hold, pending)
- ✅ Транзакции
- ✅ Запросы на выплату
- ✅ Крипто-биржи: Binance, Bybit, Kraken, Coinbase, EXMO, MEXC, OKX

### Централизованный HTTP-клиент (server/lib/http-client.ts)
- ✅ Единый HTTP-клиент для всех внешних API
- ✅ Retry с экспоненциальным backoff и jitter
- ✅ AbortController для таймаутов
- ✅ Correlation ID для трассировки запросов
- ✅ ExternalApiError для типизированных ошибок
- ✅ Методы: request() для JSON, requestRaw() для полного ответа
- ✅ Мигрированные сервисы: Telegram, IPinfo, Blockchain verifiers, Webhooks, Postbacks, Cloudflare
- ⏳ Отложены: crypto-payout (сложная HMAC логика бирж), migration-service (редко используется)

### Уведомления
- ✅ In-app (колокольчик)
- ✅ Telegram уведомления (см. инструкцию ниже)

### Telegram Уведомления (Инструкция)

**1. Администратор (глобальная настройка бота):**
- Создать бота через @BotFather → получить токен
- Admin → Настройки → Платформа → "Telegram бот платформы" → вставить токен
- Сообщить ссылку на бота рекламодателям/партнёрам

**2. Рекламодатель (Advertiser):**
- Написать сообщение боту платформы
- Узнать Chat ID через @userinfobot
- Настройки → Уведомления → указать Chat ID (обязательно)
- Bot Token — оставить пустым (будет использоваться бот платформы)
- Опционально: указать свой токен бота для использования личного бота
- Включить нужные уведомления → Сохранить → Тест

**3. Партнёр (Publisher):**
- Написать сообщение боту платформы
- Узнать Chat ID через @userinfobot
- Настройки → Уведомления → указать Chat ID → Сохранить → Тест

**Типы уведомлений:**
| Тип | Admin | Advertiser | Publisher |
|-----|-------|------------|-----------|
| Системные | ✅ | ✅ | ✅ |
| Лиды | — | ✅ | ✅ |
| Продажи | — | ✅ | ✅ |
| Выплаты | ✅ | ✅ | ✅ |

**Логика токенов:**
- Сначала проверяется токен рекламодателя (если есть)
- Если нет — используется глобальный токен платформы

### Data Migration API
- ✅ `/api/migration/import`
- ✅ Scaleo, Affilka, Affise, Voluum, Keitaro

### SMTP (Email)
- ✅ Настройки в админке (host, port, user, password)
- ✅ Шифрование в БД

### Stripe
- ✅ Настройка Secret Key в админке
- ✅ Шифрование в БД

### Custom Domains (Backend)
- ✅ Таблица custom_domains с Cloudflare полями (cloudflareHostnameId, cloudflareStatus, cloudflareSslStatus, dnsTarget)
- ✅ DNS верификация (CNAME/TXT) через Google DNS resolvers
- ✅ TLS Checker - реальная проверка SSL через TLS handshake
- ✅ Честные SSL статусы: unverified, verified_no_ssl, ssl_activating, ssl_active, ssl_failed
- ✅ Endpoint `/api/domains/:id/check-ssl` - проверка SSL
- ✅ Endpoint `/api/domains/:id/sync` - синхронизация статуса Cloudflare
- ✅ **Cloudflare SSL for SaaS интеграция:**
  - ✅ server/cloudflare-service.ts - полное API (createCustomHostname, getCustomHostname, deleteCustomHostname, syncDomainStatus)
  - ✅ Автоматический provisioning при создании домена
  - ✅ Автоматический deprovisioning при удалении
  - ✅ Настройки в Admin → Платформа (Zone ID, API Token, Fallback Origin, CNAME Target, Worker Origin)
- ✅ UI: кнопка "Проверить SSL", кнопка "Синхронизировать", инструкции для Cloudflare
- ✅ CNAME Target динамически берётся из platform_settings
- ❌ ACME/Let's Encrypt удалён (не работает на Replit - нет доступа к порту 80)

### Cloudflare Worker Proxy (для Replit)
Replit не передаёт оригинальный Host header при проксировании через кастомные домены. Решение — Cloudflare Worker как промежуточный слой.

**Архитектура:**
```
[Клиент] → [Cloudflare Custom Hostname] → [Worker] → [Replit App]
                                              ↓
                                    X-Forwarded-Host: original.domain.com
                                    X-CF-Worker-Auth: <secret>
                                    Host: app.replit.app
```

**Настройка:**
1. Admin → Платформа → указать "Worker Proxy Origin" (Replit origin, например: `theme-forge--username.replit.app`)
2. Сгенерировать Worker Secret (кнопка "Сгенерировать")
3. Сохранить настройки
4. Скопировать сгенерированный Worker скрипт (появится после заполнения Origin + Secret)
5. Cloudflare Dashboard → Workers & Pages → Create Worker → вставить код
6. Привязать Worker к кастомным доменам через Routes

**Безопасность:**
- ✅ Worker Secret валидация — X-Forwarded-Host доверяется ТОЛЬКО если запрос содержит правильный X-CF-Worker-Auth
- ✅ Без секрета — используется только req.hostname (безопасный fallback)
- ✅ Защита от спуфинга — атакующий не может подставить фейковый X-Forwarded-Host без знания секрета

**Backend обработка:**
- ✅ `server/lib/request-utils.ts` — утилиты resolveRequestHost(), resolveRequestOrigin(), setWorkerSecret()
- ✅ Загрузка секрета при старте сервера из platform_settings.cloudflareWorkerSecret
- ✅ Валидация X-CF-Worker-Auth перед доверием X-Forwarded-Host
- ✅ Middleware кастомных доменов использует resolveRequestHost()

### IP Intelligence (ipinfo.io)
- ✅ Токен хранится зашифрованно в platformSettings (ipinfoToken)
- ✅ UI в AdminSettings → Antifraud секция
- ✅ ip-intel-service.ts читает токен из БД или fallback на env
- ✅ Маскирование с SENTINEL "***configured***"

### FingerprintJS
- ✅ Библиотека @fingerprintjs/fingerprintjs установлена
- ✅ UI интеграционного скрипта в AdvertiserSettings → White-label
- ✅ Click endpoint принимает visitor_id и fp_confidence параметры
- ✅ client/src/lib/fingerprint.ts утилита

### Keitaro/Binom/Voluum Интеграция
- ✅ **Устаревшие endpoints удалены** - Используйте универсальный `/api/postback`
- ✅ Поддержка sub1-sub10 параметров в clicks
- ✅ Универсальный постбек совместим со всеми трекерами (Keitaro, Binom, Voluum и др.)

---

## ТЕХНОЛОГИИ

- Frontend: React + Vite + TailwindCSS + shadcn/ui + wouter
- Backend: Express.js + TypeScript
- Database: PostgreSQL + Drizzle ORM
- Auth: Session-based (connect-pg-simple)
- 2FA: TOTP (otplib + qrcode)
- GEO: geoip-lite
- SSL: Cloudflare (внешний, TLS handshake проверка)
- IP Intel: ipinfo.io (опционально)
- Fingerprinting: FingerprintJS (опционально)
- Platform Domain: primetrack.pro

---

## НЕ РЕАЛИЗОВАНО

- ⏳ Расширенный FingerprintJS Pro API (платная версия)
