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
- **Mini-Tracker (Click Handler):** Records clicks, generates `click_id`, captures GEO (geoip-lite), IP, User-Agent, fingerprint, and performs 302 redirects. **Universal Click ID Aliases:** При редиректе автоматически добавляются все алиасы click_id (`click_id`, `clickid`, `cid`, `subid`, `aff_sub`) для совместимости с разными трекерами (Scaleo, Keitaro, Binom, Voluum).
- **Orchestrator (Conversions):** Handles conversion events (click, lead, sale, install, rejected, hold_released), calculates payouts, and triggers postbacks/webhooks.
- **Universal Postback System:** Single inbound endpoint `/api/postback` with automatic `offer_id` and `publisher_id` detection. **Поддерживаемые параметры click_id:** `click_id`, `clickid`, `subid`, `subid_1`, `tid`, `sub1`, `cid`, `aff_sub`. Status mapping, outbound postbacks with macros. Includes retry logic and logging.
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
- **Crypto Exchanges:** Binance, Bybit, Kraken, Coinbase, EXMO, MEXC, OKX (for financial transactions, though specific HMAC logic for payouts is pending).

## Pending Tasks (2025-01-07)

### Data Migration UI
- [ ] Update `DataMigrationSettings.tsx` to connect to real API endpoints
- [ ] Remove Voluum/Keitaro from UI, show only: Scaleo, Affilka, Affise, Alanbase
- [ ] Add migration history display from `/api/advertiser/migrations`
- [ ] Add real-time status polling for in-progress migrations

### Key Implementation Notes
- ALL advertiser endpoints use `getEffectiveAdvertiserId(req)` for staff support
- Staff write access for migrations: `requireStaffWriteAccess("settings")`
- Domain workflow: Add → Configure NS (angela/drake.ns.cloudflare.com) → Submit → Admin approves → Provisions → Admin activates
- White-label consolidated endpoint: `PATCH /api/advertiser/settings/whitelabel`