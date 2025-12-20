# PrimeTrack - SaaS Affiliate Platform

## Overview

PrimeTrack is a centralized SaaS affiliate tracking platform designed to be the primary source of truth for all tracking data. It integrates multi-advertiser affiliate tracking, a mini-tracker with click_id and redirect logic, robust anti-fraud measures (IP, proxy, VPN, fingerprint, click-spam, duplicate leads), and comprehensive financial management for advertiser/publisher payouts and ROI calculation. The platform supports white-labeling with custom domains, offers a centralized orchestrator for all events, and provides Telegram, email, and webhook notifications. A key feature is its Data Migration API, facilitating transitions from other platforms like Scaleo, Affilka, Affise, Voluum, and Keitaro. All events (clicks, leads, sales, conversions) are recorded internally first, with postbacks being an optional, secondary step.

## User Preferences

Preferred communication style: Simple, everyday language (Russian).

## System Architecture

### Key Principles

1.  **Centralization**: All traffic flows through the mini-tracker and orchestrator.
2.  **Primary Data Source**: The system is the definitive source of truth; statistics are always internal, and postbacks are optional.
3.  **One Partner, Many Advertisers**: Supports a switchable context for partners to work with multiple advertisers.
4.  **Monetization Models**: Supports CPA, CPL, CPI, CPS, RevShare, and Hybrid models.
5.  **White-Labeling**: Custom domains and branding for advertisers.
6.  **Comprehensive Anti-Fraud**: IP, proxy, VPN, fingerprint, and click-spam detection.

### Roles

The platform defines several roles: Owner, Platform Admin, Advertiser, Publisher (Affiliate), Partner Manager, Advertiser Staff, and Support. Each role has specific access levels and functionalities.

### Core Flows

*   **Click Flow (Mini-Tracker)**: Traffic is routed to `/api/click`, generating a unique `click_id`. It captures user data (IP, User-Agent, GEO, Fingerprint), performs anti-fraud checks, and orchestrates a 302 redirect to the landing page with relevant macros.
*   **Conversion Flow (Orchestrator)**: Events (click/lead/sale/install) are processed by the orchestrator, which validates status, checks monetization models, calculates payouts (advertiser_price vs. publisher_payout), writes internal statistics, and then optionally sends external postbacks (with retries) and notifications.

### Monetization & Pricing

*   **Models**: CPA, CPL, CPI, CPS, RevShare, Hybrid.
*   **Offer Pricing**: `advertiser_price` (what the advertiser pays), `publisher_payout` (what the partner receives, only visible to the partner), `margin` (advertiser_price - publisher_payout), and `ROI`.

### Statuses

Clicks, leads, installs, and sales are tracked, alongside `rejected` and `hold` statuses, each impacting counting and financial implications.

### Partner System

A global partner account can connect to multiple advertisers, with a context switcher to view data relevant to the selected advertiser. Publishers register via an advertiser's link.

### Offer Access System (CRITICAL)

```
1. Рекламодатель создаёт оффер
2. Партнёр видит оффер в маркетплейсе:
   - Название, описание, категория, GEO
   - Payout модель и ставка (partner_payout)
   - Креативы (ссылки на диск)
   - ❌ НЕ ВИДИТ: ссылки на лендинги (landing_url)
3. Партнёр отправляет ЗАПРОС на доступ к офферу
4. Рекламодатель получает уведомление о запросе
5. Рекламодатель ОДОБРЯЕТ или ОТКЛОНЯЕТ запрос
6. При ОДОБРЕНИИ:
   - Партнёр получает полный доступ к офферу
   - Видит ссылки на лендинги
   - Может генерировать трекинг-ссылки
   - Может лить трафик
```

**Таблицы:**
- `offer_access_requests` - id, offer_id, publisher_id, status (pending/approved/rejected), message, created_at
- `publisher_offers` - id, offer_id, publisher_id, approved_at (создаётся при approved)

### White-Label

Advertisers can use their own domains, logos, colors, and branding, ensuring partners see the advertiser's brand, not the platform's. Automatic SSL is supported.

**Кастомный домен для рекламодателя:**
- Рекламодатель может привязать свой домен (например: tracking.mybrand.com)
- Все трекинг-ссылки будут генерироваться с этого домена
- Партнёры видят бренд рекламодателя, а не платформы
- Автоматический SSL через Let's Encrypt
- Настройки: домен, логотип, цвета, название компании

**Таблица:** `advertiser_settings` - custom_domain, logo_url, brand_name, primary_color, etc.

### Anti-Fraud Mechanisms (ТОЛЬКО ДЛЯ ADVERTISER И ADMIN)

**ВАЖНО: Партнёр (Publisher) НЕ имеет доступа к антифрод-данным!**

Includes IP/subnet verification, proxy/VPN detection, fingerprint analysis, click-spam detection, duplicate lead detection, and Conversion Rate (CR) anomaly detection, with reactions like reject, hold, notify, or auto-ban.

Доступ к антифроду:
- ✅ Admin - полный доступ ко всем антифрод-данным
- ✅ Advertiser - видит антифрод по своим офферам
- ❌ Publisher - НЕ видит антифрод-данные (fraud_score, is_proxy, is_vpn и т.д.)

### Postback Logic

Events, statistics, and monetization are processed internally first. Only then is an optional postback sent, ensuring internal data integrity regardless of external postback success.

### Technology Choices

*   **Database**: Drizzle ORM.
*   **Authentication**: Session-based.
*   **Backend Services**: `ClickHandler`, `Orchestrator`, `PostbackSender` (with 5x retry logic).

## External Dependencies

*   **Postback Integration**: Supports sending postbacks to external systems.
*   **Notification Channels**:
    *   **Telegram**: Integration with a Telegram Bot for user account linking and notifications.
    *   **Email**: SMTP integration (or Mailgun/SendGrid) for email notifications.
    *   **Webhooks**: Custom webhook configurations for notifications.
*   **Data Migration**: Adapters for importing data from Scaleo, Affilka, Affise, and Voluum.
*   **Anti-Fraud (Planned)**: IP2Location or ipinfo.io for proxy/VPN detection, FingerprintJS for fingerprint analysis.
*   **Billing (Planned)**: Stripe integration for SaaS tariff plans and billing.