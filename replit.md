# PrimeTrack - SaaS Affiliate Platform

## Overview

PrimeTrack is a centralized SaaS affiliate tracking platform that combines an affiliate tracker, mini-tracker (similar to Keitaro/Binom), anti-fraud capabilities, financial management, and white-label support. The platform serves multiple user roles including Admins, Advertisers, Publishers, and Partner Managers, with all traffic events passing through a centralized orchestrator.

The core principle is that the platform acts as the primary source of truth for all tracking data - clicks, leads, sales, and conversions are recorded internally regardless of external postback configurations.

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

The frontend follows a role-based dashboard pattern where users select their role (admin/advertiser/publisher) and see role-specific views. Components are organized into pages, dashboard components, layout components, and UI primitives.

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **Session Management**: express-session with MemoryStore (development) or connect-pg-simple (production)
- **Authentication**: Session-based auth with bcrypt password hashing
- **API Style**: RESTful JSON APIs under `/api/*` routes

The server uses a storage abstraction pattern (`IStorage` interface) that separates data access logic from route handlers, making it easier to swap implementations.

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Definition**: Shared schema in `/shared/schema.ts` using drizzle-zod for validation
- **Migrations**: Managed via `drizzle-kit push`

Core entities include:
- Users (with roles: admin, advertiser, publisher)
- Offers (with pricing models: CPA, CPL, CPI, CPS, RevShare, Hybrid)
- Offer Landings (geo-specific landing pages with individual payouts)
- Clicks (traffic tracking)
- Conversions (lead/sale tracking)

### Build System
- **Client**: Vite builds to `dist/public`
- **Server**: esbuild bundles to `dist/index.cjs` with selective dependency bundling for faster cold starts
- **Development**: Vite dev server with HMR proxied through Express

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