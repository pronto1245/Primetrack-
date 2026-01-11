# PrimeTrack - SaaS Affiliate Platform

## Overview
PrimeTrack is a centralized SaaS platform for affiliate tracking, designed to internally record all clicks and conversions with optional postbacks. The platform aims to provide a robust solution for managing affiliate programs, including offer management, partner tracking, financial oversight, and anti-fraud measures. It supports various user roles, each with tailored access to features, and integrates with external services for enhanced functionality.

## User Preferences
Preferred communication style: Simple, everyday language (Russian).

## System Architecture

### UI/UX
- Frontend: React, Vite, TailwindCSS, shadcn/ui, wouter.
- Role-based menu filtering for tailored user experiences.

### Technical Implementations
- **Authentication:** Email/password (bcrypt), session-based (connect-pg-simple), mandatory TOTP 2FA for active users (QR code setup), admin-initiated 2FA reset.
- **User Roles:** Admin (full access), Advertiser (offers, partners, finance), Publisher (offers, links, payouts), Advertiser Staff (Manager, Analyst, Support, Finance) with granular permissions.
- **Mini-Tracker (Click Handler):** Records clicks, generates `click_id`, captures GEO (geoip-lite), IP, User-Agent, fingerprint, and performs 302 redirects.
- **Orchestrator (Conversions):** Handles conversion events (click, lead, sale, install, rejected, hold_released), calculates payouts, and triggers postbacks/webhooks.
- **Universal Postback System:** Single inbound endpoint `/api/postback` with automatic `offer_id` and `publisher_id` detection, support for various click ID parameters, status mapping, and outbound postbacks with macros. Includes retry logic and logging.
- **Webhooks:** CRUD endpoints, event/offer/partner filtering, HMAC-SHA256 signing, retry mechanism, and UI management for Advertisers.
- **Data Export:** Supports CSV, Excel, PDF formats for reports (clicks, conversions), financials (transactions, payouts), and postback logs. Features role-based access control and UI-synchronized filters.
- **Anti-Fraud:** Implements fraud scoring, proxy/VPN detection, fingerprint analysis, click-spam checks, duplicate lead detection, automatic suspicious traffic flagging, and Advertiser notifications.
- **Financial Management:** Tracks balances (available, hold, pending), transactions, and payout requests.
- **Centralized HTTP-Client:** Provides a unified client for external APIs with retry, exponential backoff, jitter, AbortController for timeouts, and correlation ID for tracing.
- **Notifications:** In-app (bell icon) and Telegram notifications, configurable by Admin, Advertiser, and Publisher, with token logic for platform-wide or personal bots.
- **Data Migration API:** `/api/advertiser/migrations` endpoints for importing data from external trackers:
  - Supported trackers: Scaleo, Affilka, Affise, Alanbase (NOT Voluum/Keitaro)
  - Backend: `server/services/migration-service.ts` with parsers for each tracker
  - Database: `migration_history` table tracks import status, progress, and errors
  - Endpoints: GET (list), POST (start), GET /:id (status)
  - UI: `client/src/components/dashboard/DataMigrationSettings.tsx` (needs connection to real endpoints)
- **Custom Domains:** Supports custom domain integration with Cloudflare SSL for SaaS, including DNS verification, TLS checking, and automated provisioning/deprovisioning of SSL certificates. Cloudflare Worker Proxy is used to handle Host header issues in Replit.
- **IP Intelligence:** Integration with ipinfo.io for IP data.
- **Fingerprinting:** Utilizes FingerprintJS for visitor identification, with integration script available in Advertiser settings.
- **Tracker Integration:** Universal postback endpoint is compatible with Keitaro, Binom, Voluum, and similar trackers.

## External Dependencies
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **GEO-IP:** geoip-lite
- **2FA:** otplib, qrcode
- **HTTP Client:** axios (underlying for custom http-client)
- **Email:** SMTP (configurable)
- **Payments:** Stripe
- **Cloudflare:** For custom domains and Worker Proxy.
- **IP Intelligence:** ipinfo.io
- **Fingerprinting:** FingerprintJS
- **Telegram:** For notifications.
- **Crypto Exchanges:** Binance, Bybit, Kraken, Coinbase, EXMO, MEXC, OKX (all 7 adapters production-ready with correct HMAC signing, network normalization, and API v3 compliance).

---

## ПОЛНЫЙ АУДИТ ПРОЕКТА (2025-01-11)

### ПОЛЬЗОВАТЕЛИ И РОЛИ

| Роль | Описание | Статус |
|------|----------|--------|
| Admin | Полный доступ: пользователи, настройки платформы, домены, финансы | ✅ Работает |
| Advertiser | Офферы, партнёры, финансы, настройки, команда | ✅ Работает |
| Publisher | Офферы, ссылки, выплаты, статистика | ✅ Работает |
| Advertiser Staff | Manager, Analyst, Support, Finance - гранулярные права | ✅ Работает |

**Аутентификация:**
- Email/password (bcrypt) ✅
- Session-based (connect-pg-simple) ✅
- TOTP 2FA обязательный для активных юзеров ✅
- Telegram уведомления ✅

### ЧТО ПОЛНОСТЬЮ РАБОТАЕТ

#### Трекинг
- [x] Mini-Tracker: клики, click_id, GEO (geoip-lite), IP, UA, fingerprint, 302 redirect
- [x] Универсальный постбек `/api/postback` с автоопределением offer_id/publisher_id
- [x] Поддержка внешних трекеров (Keitaro, Binom, Voluum, Scaleo)
- [x] Sub-параметры (sub1-sub10)
- [x] Входящие/исходящие постбеки с retry логикой

#### Офферы и Лендинги
- [x] CRUD офферов с geo, категориями, источниками трафика
- [x] Мульти-лендинги с разными ценами по geo
- [x] A/B варианты лендингов
- [x] Капы (daily/monthly/total) с редиректом
- [x] Приватные/эксклюзивные/топ офферы

#### Конверсии
- [x] Orchestrator: click, lead, sale, install, rejected, hold_released
- [x] Расчёт выплат партнёрам
- [x] Hold период
- [x] Воронка конверсий (Funnel Aggregation)
- [x] Player Sessions для gambling

#### Финансы
- [x] Балансы (available, hold, pending)
- [x] Запросы на выплату
- [x] История транзакций
- [x] PDF счета для партнёров
- [x] UI в разделе Finance для Advertiser/Publisher/Admin

#### Антифрод
- [x] Fraud scoring
- [x] Proxy/VPN detection
- [x] Fingerprint analysis
- [x] Click-spam checks
- [x] Duplicate lead detection
- [x] Автофлаг подозрительного трафика

#### Вебхуки
- [x] CRUD endpoints
- [x] Event/offer/partner фильтрация
- [x] HMAC-SHA256 подпись
- [x] Retry mechanism
- [x] UI управления

#### Кастомные Домены
- [x] DNS верификация
- [x] TLS checking
- [x] Cloudflare Worker Proxy
- [x] Admin approval workflow
- [x] UI для advertiser и admin

#### Уведомления
- [x] In-app (bell icon)
- [x] Telegram бот
- [x] Настраиваемые события

#### Экспорт данных
- [x] CSV, Excel, PDF
- [x] Клики, конверсии, транзакции
- [x] Role-based access

#### Крипто-выплаты (ГОТОВО)
- [x] DB Schema: `exchangeApiKeys`, `cryptoPayoutQueue`, `cryptoPayoutLogs`
- [x] CryptoPayoutOrchestrator с очередью и retry
- [x] Все 7 адаптеров готовы к production:
  - Binance: HMAC-SHA256
  - Bybit: HMAC-SHA256 с headers
  - Kraken: HMAC-SHA512 с base64 secret, monotonic nonce
  - Coinbase: Advanced Trade API v3, portfolio_uuid, base64 secret
  - EXMO: HMAC-SHA512 с nonce
  - MEXC: HMAC-SHA256 с recvWindow
  - OKX: HMAC-SHA256 base64 + passphrase
- [x] API routes: GET/POST/DELETE `/api/advertiser/crypto/keys`
- [x] AES-256-GCM шифрование API ключей
- [x] UI с инструкцией по получению ключей в AdvertiserFinance.tsx

#### Cloudflare Worker Proxy (ГОТОВО)
- [x] Worker код: `cloudflare/worker.js`
- [x] Wrangler конфигурация: `cloudflare/wrangler.toml`
- [x] Документация: `cloudflare/README.md`
- [x] Конфигурируемый PLATFORM_DOMAIN через env
- [x] X-CF-Worker-Auth для безопасной проверки forwarded headers

### ЧТО ЧАСТИЧНО РАБОТАЕТ / ТРЕБУЕТ ДОРАБОТКИ

#### Миграция данных
- [x] Backend service для Scaleo, Affilka, Affise, Alanbase
- [x] API endpoints `/api/advertiser/migrations`
- [ ] UI не подключён к реальным endpoints
- [ ] Voluum/Keitaro надо убрать из UI

### ЧТО НЕ СДЕЛАНО

1. **Миграция:**
   - [ ] Подключить UI к реальным API
   - [ ] Real-time polling статуса

### СТРУКТУРА ФАЙЛОВ

**Frontend:**
- `client/src/pages/` - страницы (Login, Dashboard, Register, etc.)
- `client/src/components/dashboard/` - 36 компонентов для ролей

**Backend:**
- `server/routes.ts` - все API endpoints
- `server/storage.ts` - Drizzle ORM storage layer
- `server/services/` - 30+ сервисов (crypto, email, antifraud, etc.)

**Shared:**
- `shared/schema.ts` - 1908 строк, все таблицы БД

### КЛЮЧЕВЫЕ ПРАВИЛА

1. ALL advertiser endpoints используют `getEffectiveAdvertiserId(req)` для staff support
2. Staff write access через `requireStaffWriteAccess("module")`
3. Domain workflow: Add → Configure NS → Submit → Admin approves → Provisions → Admin activates
4. White-label endpoint: `PATCH /api/advertiser/settings/whitelabel`
5. Crypto keys хранятся в `exchangeApiKeys` таблице (НЕ в advertiserSettings)