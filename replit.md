# PrimeTrack - SaaS Affiliate Platform

## Overview
PrimeTrack is a centralized SaaS platform for affiliate tracking, designed to internally record all clicks and conversions with optional postbacks. The platform provides a robust solution for managing affiliate programs, including offer management, partner tracking, financial oversight, and anti-fraud measures. It supports various user roles with tailored access and integrates with external services for enhanced functionality. PrimeTrack aims to scale for numerous advertisers and publishers, handling millions of clicks.

## User Preferences
Preferred communication style: Simple, everyday language (Russian).

## Test Credentials
- **Admin:** username: `admin`, password: `admin123`
- **Login path:** `/login` (NOT /auth)

## System Architecture

### UI/UX
- **Frontend Technologies:** React, Vite, TailwindCSS, shadcn/ui, wouter, framer-motion.
- **User Interface:** Role-based menu filtering ensures tailored user experiences.
- **Landing Page Design:** Advanced visual effects including accent fonts, gradient text, noise texture overlays, animated gradient borders, parallax scrolling, 3D card transforms on hover, icon morphing animations, floating decorative elements, and scroll-triggered animations.

### Technical Implementations
- **Authentication:** Email/password (bcrypt), session-based, mandatory TOTP 2FA with admin-initiated reset.
- **User Roles:** Admin, Advertiser, Publisher, and Advertiser Staff (Manager, Analyst, Support, Finance) with granular permissions.
- **Tracking:** Mini-Tracker for click recording (GEO, IP, User-Agent, fingerprint, 302 redirects), Orchestrator for conversion events and payouts, and a Universal Postback System for inbound/outbound postbacks with retry logic.
- **Webhooks:** CRUD endpoints with event/offer/partner filtering, HMAC-SHA256 signing, and retry mechanism.
- **Data Export:** Supports CSV, Excel, PDF for various reports with role-based access control.
- **Anti-Fraud:** Fraud scoring, proxy/VPN detection, fingerprint analysis, click-spam checks, duplicate lead detection, and suspicious traffic flagging.
- **Financial Management:** Tracks balances, transactions, and payout requests, including crypto payouts across 7 major exchanges with secure API key handling.
- **Centralized HTTP-Client:** Unified client for external APIs with retry, exponential backoff, jitter, timeouts, and correlation ID.
- **Notifications:** In-app and Telegram notifications configurable by users.
- **Data Migration:** API and CSV-based migration tools for importing data from external trackers (Scaleo, Affilka, Affise, Alanbase) with data mapping, deduplication, and error logging.
- **Custom Domains:** Integration with Cloudflare SSL for custom domain provisioning via a Cloudflare Worker Proxy. Supports multiple domains per advertiser with `useForTracking` flag to designate which domains generate tracking links (vs login-only domains).
- **White-Label Branding:** Advertisers can customize partner-facing UI with their own logo and brand name. When `hidePlatformBranding` is enabled, publishers see the advertiser's brand instead of the platform name. Uses BrandingContext for domain-based lookup on login, and AdvertiserContext for dashboard branding.
- **IP Intelligence:** Integration for IP data.
- **Fingerprinting:** Utilizes FingerprintJS for visitor identification.
- **Tracker Integration:** Universal postback endpoint compatible with major trackers like Keitaro, Binom, Voluum.
- **Advertiser Sources:** Manages advertiser-specific offer sources with secure credential storage.
- **Performance Optimization:** Extensive SQL-based optimizations for reporting and data retrieval.

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