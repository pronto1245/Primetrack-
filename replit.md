# PrimeTrack - SaaS Affiliate Platform

## Overview

PrimeTrack is a centralized SaaS affiliate tracking platform that combines:
- **Affiliate Tracker** (multi-advertiser)
- **Mini-Tracker** (like Keitaro/Binom with click_id and redirect logic)
- **Anti-Fraud** (IP, proxy, fingerprint checks)
- **Financial Management** (advertiser/publisher payouts)
- **White-Label** support with custom domains
- **Centralized Orchestrator** for all events

**Core Principle**: The platform is the PRIMARY SOURCE OF TRUTH for all tracking data. ALL events (clicks, leads, sales, conversions) are recorded internally regardless of external postback configurations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Internationalization**: i18next for multi-language support
- **Build Tool**: Vite with custom plugins for Replit deployment

The frontend follows a role-based dashboard pattern where users select their role (admin/advertiser/publisher/partner-manager) and see role-specific views.

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **Session Management**: express-session with MemoryStore (development) or connect-pg-simple (production)
- **Authentication**: Session-based auth with bcrypt password hashing
- **API Style**: RESTful JSON APIs under `/api/*` routes
- **Core Components**:
  - **Click Handler** - generates click_id, performs anti-fraud checks
  - **Orchestrator** - validates events, calculates monetization, triggers postbacks
  - **Storage Layer** - database abstraction using Drizzle ORM

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Definition**: Shared schema in `/shared/schema.ts` using drizzle-zod for validation
- **Migrations**: Managed via `drizzle-kit push`

Core entities:
- **Users** (roles: admin, advertiser, publisher, partner-manager)
- **Offers** (with pricing models: CPA, CPL, CPI, CPS, RevShare, Hybrid)
- **OfferLandings** (geo-specific landing pages with individual payouts)
- **Clicks** (traffic tracking with click_id)
- **Conversions** (lead/sale tracking with status and payout)
- **PublisherAdvertisers** (many-to-many: one publisher, multiple advertisers)

## Project Phase

**PHASE 1: FOUNDATION (50% complete)**
- ✅ Database schema (basic)
- ✅ Authentication
- ✅ Offer creation form (WIP)

**PHASE 2: MINI-TRACKER (0% - PRIORITY)**
- Click flow: `/click?offer_id=X&partner_id=Y`
- click_id generation and storage
- Anti-fraud checks (IP, User-Agent, GEO, fingerprint)
- Redirect logic (to advertiser or external tracker)

**PHASE 3: MONETIZATION ORCHESTRATOR (0% - PRIORITY)**
- Support all payout models: CPA, CPL, CPI, CPS, RevShare, Hybrid
- Calculate advertiser_price vs publisher_payout
- Event validation and status handling
- Postback sending (AFTER internal recording)

**PHASE 4: PARTNER SYSTEM (0% - PRIORITY)**
- One publisher, multiple advertisers
- Publisher dashboard with advertiser switcher
- Individual tracking links per advertiser
- White-label per advertiser

**PHASE 5: STATISTICS & ANALYTICS (0%)**
- Advertiser dashboard (clicks, leads, sales, ROI, margin, payouts)
- Publisher dashboard (earnings, status, history)
- Real-time metrics

**PHASE 6: ANTI-FRAUD (0%)**
- IP/proxy/VPN detection
- Fingerprint analysis
- Click-spam detection
- Duplicate lead detection
- CPA anomaly detection

**PHASE 7: API & INTEGRATIONS (0%)**
- Click API documentation
- Postback API
- Stats API
- Publisher offer subscription API
- Swagger documentation

**PHASE 8: WHITE-LABEL & CUSTOM DOMAINS (0%)**
- Custom domain support
- Advertiser branding
- Partner registration whitelabel

## External Dependencies

### Database
- PostgreSQL (required, connection via `DATABASE_URL` environment variable)

### Authentication & Security
- bcrypt for password hashing
- express-session for session management
- connect-pg-simple for production session storage

### UI Components
- Radix UI primitives (full suite: dialog, dropdown, tabs, etc.)
- Lucide React for icons
- Framer Motion for animations
- embla-carousel for carousels
- react-day-picker for calendar components
- cmdk for command palette
- vaul for drawer components

### Data & Validation
- Zod for schema validation
- drizzle-zod for database schema to Zod integration
- TanStack React Query for data fetching

### Build & Development
- Vite with React plugin
- Tailwind CSS v4 with @tailwindcss/vite
- esbuild for server bundling
- Custom Replit plugins for deployment (cartographer, dev-banner, meta-images)

### Cloud Storage
- Google Cloud Storage (via Replit integration) for file uploads

## Technical Debt & To-Do

### IMMEDIATE (Blocking other features)
1. Extend offers schema: add monetizationType, advertiserPrice, publisherPayout, revSharePercent, holdPeriod
2. Build click handler endpoint (`/api/click`) with:
   - click_id generation
   - Basic anti-fraud checks
   - Clicks table persistence
3. Build orchestrator service (moneyization logic, payout calculations)
4. Add publisherAdvertisers junction table (many-to-many relationships)

### HIGH PRIORITY
5. Publisher dashboard (list of offers from multiple advertisers)
6. Click redirect logic (to landing URL or external tracker)
7. Conversion postback handler
8. Statistics aggregation (for advertiser & publisher dashboards)
9. Anti-fraud rule engine

### MEDIUM PRIORITY
10. White-label UI components (advertiser can customize)
11. Custom domain routing
12. API documentation (Swagger)
13. Notification system (email, Telegram, webhook)

### TECH DEBT
- Add proper error logging
- Add request validation middleware
- Consider adding rate limiting
- Add API key authentication for publisher APIs

## Development Guidelines

Follow the mockup_js stack instructions:
- Data model first (shared/schema.ts)
- Storage interface (IStorage in server/storage.ts)
- API routes (server/routes.ts)
- Frontend pages (client/src/pages/)
- Always add data-testid attributes to interactive elements
- Update meta tags in client/index.html for proper social sharing
