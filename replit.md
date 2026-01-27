# PrimeTrack - SaaS Affiliate Platform

## Overview
PrimeTrack is a centralized SaaS platform for affiliate tracking, designed to internally record all clicks and conversions with optional postbacks. The platform provides a robust solution for managing affiliate programs, including offer management, partner tracking, financial oversight, and anti-fraud measures. It supports various user roles with tailored access and integrates with external services for enhanced functionality. PrimeTrack aims to scale for numerous advertisers and publishers, handling millions of clicks.

## User Preferences
Preferred communication style: Simple, everyday language (Russian).

## System Architecture

### UI/UX
- **Frontend Technologies:** React, Vite, TailwindCSS, shadcn/ui, wouter, framer-motion.
- **User Interface:** Role-based menu filtering ensures tailored user experiences.
- **Landing Page Design:** Advanced visual effects including:
  - Accent font (Space Grotesk) via `.font-display` class for headings
  - Gradient text via `.gradient-text` class on key headings
  - Noise texture overlay via `.noise-overlay` class on sections
  - Animated gradient borders via `.gradient-border` class on cards
  - Parallax scroll effects using `useScroll`/`useTransform` hooks
  - 3D card transforms (rotateX/rotateY) on hover with perspective
  - Icon morphing animations (scale/rotate) on hover
  - Floating decorative elements with varied animation speeds
  - Scroll-triggered animations with viewport margins ("-80px")

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

## Click ID Architecture (Архитектура click_id)

### Два типа click_id в системе:
1. **Внутренний clickId (UUID)** - генерируется PrimeTrack, отправляется рекламодателю
2. **Партнёрский click_id (sub1)** - приходит от трекера партнёра, возвращается в постбеке партнёру

### Поля в схеме offer_landings:
- **clickIdParam** - параметр для отправки внутреннего clickId рекламодателю (default: "click_id")
- **storeClickIdIn** - из какого параметра читать click_id партнёра (default: "sub1")

### Helper-функция extractPartnerClickId():
Извлекает партнёрский click_id из входящего запроса. Приоритет:
1. Параметр указанный в storeClickIdIn
2. Fallback: sub1, subid, aff_click_id, clickid, click_id, и др.

### Полная цепочка:
```
1. Партнёр (Keitaro) → PrimeTrack
   URL: /click/ABC/XYZ?partner_id=PUB&subid=keitaro123
   → PrimeTrack сохраняет: clickId=UUID, sub1=keitaro123

2. PrimeTrack → Рекламодатель (302 redirect)
   URL: advertiser.com/landing?click_id=UUID

3. Рекламодатель → PrimeTrack (постбек)
   URL: /api/postback?click_id=UUID&status=lead
   → Поиск по clickId или sub1

4. PrimeTrack → Партнёр (постбек)
   URL: keitaro/postback?subid=keitaro123&status=lead
   → Используется макрос {sub1}
```

### Настройка Keitaro (партнёр):
1. Создать сеть "PrimeTrack"
2. Параметры для оффера: `subid={subid}`
3. Постбек: настраивается в PrimeTrack с макросом `{sub1}`

### Постбек рекламодателя → PrimeTrack:
```
/api/postback?click_id={click_id}&status=lead
```
Где {click_id} - макрос из системы рекламодателя (параметр который он получил)

### Постбек PrimeTrack → Партнёр:
```
http://tracker/postback?subid={sub1}&status={status}&payout={payout}
```
Где {sub1} - оригинальный click_id партнёра

## TODO (Запланированные функции)

### Миграция данных из внешних трекеров (ПОЛНОЕ ТЗ)

**Статус:** НЕ РЕАЛИЗОВАНО (текущая реализация — заглушка)

**Трекеры:** Scaleo, Affilka, Affise, Alanbase (4 штуки)

**Что импортируем:**
- Офферы (все)
- Паблишеры (все)  
- Лендинги (автоматически из данных трекера)
- Конверсии/клики — НЕТ (чистый лист)

**API эндпоинты трекеров:**
| Трекер | Офферы | Паблишеры |
|--------|--------|-----------|
| Scaleo | `GET /api/v2/network/offers` | `GET /api/v2/network/affiliates` |
| Affilka | `GET /api/v1/offers` | `GET /api/v1/affiliates` |
| Affise | `GET /3.0/offers` | `GET /3.0/affiliates` |
| Alanbase | `GET /api/v1/offers` | `GET /api/v1/affiliates` |

**Маппинг офферов:**
```
title/name → name
description → description (default: "")
logo_url → logoUrl
payout → partnerPayout (default: "0.00")
revenue → internalCost (default: payout)
currency → currency (default: "USD")
hold_days → holdPeriodDays (default: 7)
geo[]/countries[] → geo[] (default: ["WW"])
vertical/category → category (default: "other")
traffic_sources[] → trafficSources[]
status → status (матрица: active→active, иначе→paused)
caps → dailyCap/monthlyCap/totalCap
```

**Маппинг лендингов (offer_landings):**
```
landing_url → url
preview_url → previewUrl
name → name (default: "Default Landing")
geo[] → наследует от оффера
payout → наследует от оффера
```

**Маппинг паблишеров (users):**
```
email → email (проверка дубликатов!)
login/username → username
status → pending (требует активации)
password → bcrypt(сгенерированный temp)
role → "publisher"
+ создаётся связь publisher_advertisers
```

**Критические требования:**
1. ✅ UI: показывать только 4 трекера (убрать Voluum/Keitaro, добавить Alanbase)
2. ✅ Матрица дефолтов для пустых полей (description, category, geo, currency)
3. ✅ Дедупликация: проверка существующих по name+advertiserId (офферы), email (паблишеры), url+offerId (лендинги)
4. ✅ Импорт ВСЕХ лендингов оффера (не только первого)
5. ✅ Пагинация API (цикл по страницам, не только первые 100)
6. ✅ Preflight-проверка API ключа (тестовый запрос до импорта)
7. ✅ Детальный лог ошибок (какой оффер не импортировался и почему)
8. ✅ Импорт паблишеров для Affilka/Affise (сейчас только Scaleo/Alanbase)
9. ✅ Удалить чекбоксы конверсий/кликов из UI
10. ✅ Исправить LSP ошибки в migration-service.ts

**Процесс миграции:**
```
1. Рекламодатель выбирает трекер
2. Вводит API URL + API Key
3. Система проверяет подключение (preflight)
4. Показывает превью: "Найдено X офферов, Y паблишеров"
5. Рекламодатель подтверждает
6. Импорт с прогресс-баром (каждый оффер в отдельной транзакции)
7. Результат: "Импортировано X/Y офферов, Z/W паблишеров"
8. Ошибки показываются в детальном логе
```

**Оценка времени:** ~4-6 часов

---

### Индивидуальные ставки для партнёров
**Описание:** Рекламодатель может назначать разные ставки разным партнёрам по одному офферу (например, партнёр A получает $50, партнёр B получает $70 за один и тот же оффер).

**Реализация (~30-40 мин):**
1. Добавить поле `customPayout` в таблицу `publisher_offers`
2. Обновить логику расчёта конверсий (проверка custom → default)
3. UI для рекламодателя (поле ввода индивидуальной ставки в профиле партнёра)
4. Отображение персональной ставки в статистике партнёра