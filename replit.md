# PrimeTrack - SaaS Affiliate Platform

## Overview
PrimeTrack is a centralized SaaS platform for affiliate tracking, designed to internally record all clicks and conversions with optional postbacks. The platform provides a robust solution for managing affiliate programs, including offer management, partner tracking, financial oversight, and anti-fraud measures. It supports various user roles with tailored access and integrates with external services for enhanced functionality. PrimeTrack aims to scale for numerous advertisers and publishers, handling millions of clicks.

## User Preferences
Preferred communication style: Simple, everyday language (Russian).

## System Architecture

### UI/UX
- **Frontend Technologies:** React, Vite, TailwindCSS, shadcn/ui, wouter.
- **User Interface:** Role-based menu filtering ensures tailored user experiences.

### Technical Implementations
- **Authentication:** Email/password (bcrypt), session-based, mandatory TOTP 2FA for active users (QR code setup), admin-initiated 2FA reset.
- **User Roles:** Admin, Advertiser, Publisher, and Advertiser Staff (Manager, Analyst, Support, Finance) with granular permissions.
- **Mini-Tracker:** Records clicks, generates `click_id`, captures GEO (geoip-lite), IP, User-Agent, fingerprint, and performs 302 redirects.
- **Orchestrator:** Handles conversion events (click, lead, sale, install, rejected, hold_released), calculates payouts, and triggers postbacks/webhooks.
- **Universal Postback System:** Single inbound endpoint `/api/postback` with automatic `offer_id` and `publisher_id` detection, support for various click ID parameters, status mapping, and outbound postbacks with macros, including retry logic and logging.
- **Webhooks:** CRUD endpoints with event/offer/partner filtering, HMAC-SHA256 signing, retry mechanism, and UI management.
- **Data Export:** Supports CSV, Excel, PDF formats for reports (clicks, conversions), financials (transactions, payouts), with role-based access control and UI-synchronized filters.
- **Anti-Fraud:** Implements fraud scoring, proxy/VPN detection, fingerprint analysis, click-spam checks, duplicate lead detection, automatic suspicious traffic flagging, and Advertiser notifications.
- **Financial Management:** Tracks balances (available, hold, pending), transactions, and payout requests.
- **Centralized HTTP-Client:** Provides a unified client for external APIs with retry, exponential backoff, jitter, `AbortController` for timeouts, and correlation ID for tracing.
- **Notifications:** In-app and Telegram notifications, configurable by Admin, Advertiser, and Publisher, with token logic for platform-wide or personal bots.
- **Data Migration API:** `/api/advertiser/migrations` endpoints for importing data from external trackers (Scaleo, Affilka, Affise, Alanbase) using `server/services/migration-service.ts` with parsers for each tracker.
- **Custom Domains:** Supports custom domain integration with Cloudflare SSL, including DNS verification, TLS checking, and automated provisioning/deprovisioning of SSL certificates, using a Cloudflare Worker Proxy.
- **IP Intelligence:** Integration for IP data.
- **Fingerprinting:** Utilizes FingerprintJS for visitor identification.
- **Tracker Integration:** Universal postback endpoint is compatible with Keitaro, Binom, Voluum, and similar trackers.
- **Crypto Payouts:** Implemented with support for 7 major crypto exchanges, including secure API key handling (AES-256-GCM encryption), a payout orchestrator with queue and retry, and dedicated API routes.
- **Advertiser Sources:** Manages advertiser-specific offer sources, including secure storage of credentials, CRUD operations via API, and UI integration.
- **Performance Optimization:** Extensive SQL-based optimizations for reporting, statistics, and data retrieval using `GROUP BY`, `LIMIT/OFFSET`, `COUNT/SUM` with `FILTER`, `inArray` for batch operations, and database indexing.

## External Dependencies
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **GEO-IP:** geoip-lite
- **2FA:** otplib, qrcode
- **HTTP Client:** axios
- **Email:** SMTP
- **Payments:** Stripe
- **Cloudflare:** For custom domains and Worker Proxy.
- **IP Intelligence:** ipinfo.io
- **Fingerprinting:** FingerprintJS
- **Messaging:** Telegram
- **Crypto Exchanges:** Binance, Bybit, Kraken, Coinbase, EXMO, MEXC, OKX.

## TODO (Запланированные функции)

### Индивидуальные ставки для партнёров
**Описание:** Рекламодатель может назначать разные ставки разным партнёрам по одному офферу (например, партнёр A получает $50, партнёр B получает $70 за один и тот же оффер).

**Реализация (~30-40 мин):**
1. Добавить поле `customPayout` в таблицу `publisher_offers`
2. Обновить логику расчёта конверсий (проверка custom → default)
3. UI для рекламодателя (поле ввода индивидуальной ставки в профиле партнёра)
4. Отображение персональной ставки в статистике партнёра