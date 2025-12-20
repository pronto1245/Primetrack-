# PrimeTrack - SaaS Affiliate Platform

## Overview

PrimeTrack is a centralized SaaS affiliate tracking platform that combines:
- **Affiliate Tracker** (multi-advertiser)
- **Mini-Tracker** (like Keitaro/Binom with click_id and redirect logic)
- **Anti-Fraud** (IP, proxy, VPN, fingerprint, click-spam, duplicate leads)
- **Financial Management** (advertiser/publisher payouts, hold, ROI)
- **White-Label** support with custom domains
- **Centralized Orchestrator** for all events

**Core Principle**: The platform is the PRIMARY SOURCE OF TRUTH for all tracking data. ALL events (clicks, leads, sales, conversions) are recorded internally FIRST, postback is OPTIONAL and secondary.

## User Preferences

Preferred communication style: Simple, everyday language (Russian).

## System Architecture

### Key Principles from TZ (3 pages)

1. **ЦЕНТРАЛИЗАЦИЯ** - ВСЁ проходит через наш минитрекер и оркестратор
2. **Наша система = источник истины** - postback опционален, статистика ВСЕГДА у нас
3. **Один партнёр - много рекламодателей** - переключаемый контекст
4. **6 моделей монетизации** - CPA, CPL, CPI, CPS, RevShare, Hybrid
5. **White-label + кастомные домены** для рекламодателей
6. **Полноценный антифрод** - IP, proxy, VPN, fingerprint, click-spam

### Roles (5 types)
- **Owner** - владелец SaaS, полный доступ
- **Platform Admin** - управление пользователями, мониторинг
- **Advertiser** - создаёт офферы, платит за действия, white-label
- **Publisher (Affiliate)** - приводит трафик, видит ТОЛЬКО publisher_payout
- **Partner Manager** - менеджер партнёров
- **Advertiser Staff** - сотрудники рекламодателя
- **Support** - просмотр статистики, помощь

### Click Flow (Mini-Tracker)
```
Traffic → /api/click?offer_id=X&partner_id=Y&sub1=...&sub10=...
  → Generate OUR click_id (UUID)
  → Save: IP, User-Agent, GEO, Fingerprint, device, OS, browser
  → Anti-fraud checks
  → Orchestrator
  → 302 Redirect to landing with macros: {click_id}, {sub1}, {affiliate_id}
  → Optional: pass to external tracker with OUR click_id
```

### Conversion Flow (Orchestrator)
```
EVENT (click/lead/sale/install) → Orchestrator
  → Validate status
  → Check offer monetization model
  → Calculate payout (advertiser_price vs publisher_payout)
  → Write OUR stats FIRST
  → THEN optional external postback (with retry 5x)
```

### Monetization Models
| Model | Description | Triggered by |
|-------|-------------|--------------|
| CPA | Cost Per Action | sale or lead |
| CPL | Cost Per Lead | lead |
| CPI | Cost Per Install | install |
| CPS | Cost Per Sale | sale |
| RevShare | % от транзакции | sale (с суммой) |
| Hybrid | Фикс + % | lead + sale |

### Offer Pricing (CRITICAL)
- **advertiser_price** - сколько рекламодатель платит системе
- **publisher_payout** - сколько получает партнёр (ТОЛЬКО это видит партнёр!)
- **margin** = advertiser_price - publisher_payout
- **ROI** = (margin / publisher_payout) * 100

### Statuses
| Status | Counted | Money |
|--------|---------|-------|
| click | да | нет |
| lead | да | CPL/Hybrid |
| install | да | CPI |
| sale | да | CPA/CPS/RevShare |
| rejected | да | 0 |
| hold | да | заморожено |

### Partner System
- Один глобальный аккаунт партнёра
- Подключение к НЕСКОЛЬКИМ рекламодателям
- Переключатель контекста: [Advertiser A ▼]
- Видит ТОЛЬКО данные выбранного рекламодателя
- Регистрация через ссылку рекламодателя

### White-Label
- Свой домен для рекламодателя
- Логотип, цвета, брендинг
- Партнёры видят бренд рекла, не платформу
- SSL автоматический

### Anti-Fraud
- IP/subnet проверка
- Proxy/VPN detection
- Fingerprint analysis
- Click-spam detection
- Duplicate lead detection
- CR anomaly detection
- Реакции: reject, hold, notify, auto-ban

### Postback Logic (CRITICAL)
1. Событие принимается у НАС
2. Статистика считается у НАС
3. Монетизация считается у НАС
4. **ТОЛЬКО ПОТОМ** отправляется postback (если указан)
5. Даже если postback упал - наша статистика НЕ ломается

## Current Implementation Status

### ✅ COMPLETED
- Database schema (users, offers, offer_landings, clicks, conversions, publisher_advertisers, postback_logs, advertiser_settings)
- Authentication (session-based)
- Offer creation form
- **/api/click** endpoint - click tracking with:
  - click_id generation
  - IP, User-Agent saving
  - Basic anti-fraud (bot detection)
  - Placeholder support ({click_id}, {sub1}...)
  - 302 redirect to landing
- **/api/postback** endpoint - conversion processing with:
  - Status validation (lead/sale/install)
  - Monetization calculation (CPA, CPL, CPS, RevShare, Hybrid)
  - advertiser_cost and publisher_payout calculation
- ClickHandler service (server/services/click-handler.ts)
- Orchestrator service (server/services/orchestrator.ts)

### 🔄 IN PROGRESS
- None

### ❌ TODO (Priority Order)
1. **Outgoing Postback Sender** - отправка постбеков во внешние трекеры (с retry, логированием)
2. **Publisher-Advertiser System** - M-to-M связь, переключатель контекста
3. **Advertiser Dashboard** - clicks, leads, sales, ROI, margin, партнёры
4. **Publisher Dashboard** - офферы от разных рекла, заработок, статистика
5. **Advanced Anti-Fraud** - proxy/VPN detection, fingerprint, click-spam
6. **Caps/Limits** - лимиты по офферам
7. **GEO Rules** - проверка GEO при клике
8. **White-Label UI** - брендинг для рекламодателя
9. **Custom Domains** - поддержка своих доменов
10. **Notifications** - email, Telegram, webhook
11. **SaaS Tariffs** - Starter/Pro/Business/Enterprise
12. **API Documentation** - Swagger

## Database Schema

### Core Tables
- **users** - id, username, password, email, role
- **offers** - id, advertiser_id, name, payout_model, internal_cost, partner_payout, geo, currency, status, rev_share_percent, hold_period_days
- **offer_landings** - id, offer_id, geo, landing_url, partner_payout, internal_cost
- **clicks** - id, click_id, offer_id, publisher_id, landing_id, ip, user_agent, geo, referer, sub1-sub5, fraud_score, is_proxy, is_vpn, redirect_url
- **conversions** - id, click_id, offer_id, publisher_id, conversion_type, advertiser_cost, payout, status, hold_until, external_id
- **publisher_advertisers** - id, publisher_id, advertiser_id, status, postback_url
- **postback_logs** - id, conversion_id, url, status, response_code, retry_count
- **advertiser_settings** - id, advertiser_id, postback_url, white_label_enabled, custom_domain, logo_url, primary_color

## API Endpoints

### Public (No Auth)
- `GET /api/click?offer_id=X&partner_id=Y&sub1=...` - Click tracking → 302 redirect
- `GET /api/postback?click_id=X&status=lead|sale|install&sum=123` - Conversion postback

### Auth Required
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user
- `GET /api/offers` - List offers (advertiser)
- `POST /api/offers` - Create offer
- `GET /api/marketplace` - Active offers for publishers
- `GET /api/stats/publisher` - Publisher stats
- `GET /api/stats/advertiser` - Advertiser stats

## File Structure

```
server/
  index.ts           - Server entry
  routes.ts          - API routes (includes /api/click, /api/postback)
  storage.ts         - Database operations
  services/
    click-handler.ts - Click processing, anti-fraud
    orchestrator.ts  - Conversion processing, monetization
shared/
  schema.ts          - Drizzle DB schema
client/
  src/
    pages/           - React pages
    components/      - UI components
```

## Development Guidelines

- Data model first (shared/schema.ts)
- Storage interface (IStorage in server/storage.ts)
- API routes (server/routes.ts)
- Frontend pages (client/src/pages/)
- Always add data-testid attributes
- Партнёр НИКОГДА не видит advertiser_price (internal_cost)
