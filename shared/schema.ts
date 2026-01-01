import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// USERS
// ============================================
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shortId: integer("short_id").unique(), // 001, 002...
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("publisher"), // admin, advertiser, publisher, partner-manager
  email: text("email").notNull().unique(),
  referralCode: text("referral_code").unique(),
  status: text("status").notNull().default("active"), // pending, active, blocked (advertisers start as pending)
  logoUrl: text("logo_url"),
  telegram: text("telegram"),
  phone: text("phone"),
  companyName: text("company_name"),
  
  // Contact preferences (telegram, whatsapp, viber, phone)
  contactType: text("contact_type"), 
  contactValue: text("contact_value"),
  fullName: text("full_name"),
  
  // 2FA Settings
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"), // encrypted TOTP secret
  twoFactorSetupCompleted: boolean("two_factor_setup_completed").default(false), // true after first 2FA setup
  
  // Telegram Notifications
  telegramChatId: text("telegram_chat_id"),
  telegramNotifyClicks: boolean("telegram_notify_clicks").default(false),
  telegramNotifyLeads: boolean("telegram_notify_leads").default(true),
  telegramNotifySales: boolean("telegram_notify_sales").default(true),
  telegramNotifyPayouts: boolean("telegram_notify_payouts").default(true),
  telegramNotifySystem: boolean("telegram_notify_system").default(true),
  telegramLinkCode: text("telegram_link_code"),
  telegramLinkExpires: timestamp("telegram_link_expires"),
  
  // API Tokens (for publishers)
  apiToken: text("api_token"),
  apiTokenCreatedAt: timestamp("api_token_created_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  shortId: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ============================================
// ADVERTISER STAFF (Team members)
// ============================================
export const advertiserStaff = pgTable("advertiser_staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advertiserId: varchar("advertiser_id").notNull().references(() => users.id),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  staffRole: text("staff_role").notNull(), // manager, analyst, support, finance
  password: text("password").notNull(),
  status: text("status").notNull().default("active"), // active, blocked
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAdvertiserStaffSchema = createInsertSchema(advertiserStaff).omit({
  id: true,
  createdAt: true,
});

export type InsertAdvertiserStaff = z.infer<typeof insertAdvertiserStaffSchema>;
export type AdvertiserStaff = typeof advertiserStaff.$inferSelect;

// ============================================
// PUBLISHER-ADVERTISER RELATIONSHIPS (M-to-M)
// One publisher can work with multiple advertisers
// ============================================
export const publisherAdvertisers = pgTable("publisher_advertisers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  publisherId: varchar("publisher_id").notNull().references(() => users.id),
  advertiserId: varchar("advertiser_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // pending, active, paused, blocked
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPublisherAdvertiserSchema = createInsertSchema(publisherAdvertisers).omit({
  id: true,
  createdAt: true,
});

export type InsertPublisherAdvertiser = z.infer<typeof insertPublisherAdvertiserSchema>;
export type PublisherAdvertiser = typeof publisherAdvertisers.$inferSelect;

// ============================================
// OFFERS
// ============================================
export const offers = pgTable("offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shortId: integer("short_id").unique(), // 0001, 0002...
  advertiserId: varchar("advertiser_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  logoUrl: text("logo_url"),
  
  // Pricing (per-landing prices are the source of truth)
  partnerPayout: numeric("partner_payout", { precision: 10, scale: 2 }),
  internalCost: numeric("internal_cost", { precision: 10, scale: 2 }),
  payoutModel: text("payout_model").notNull().default("CPA"), // CPA, CPL, CPI, CPS, RevShare, Hybrid
  currency: text("currency").notNull().default("USD"),
  
  // RevShare / Hybrid settings
  revSharePercent: numeric("rev_share_percent", { precision: 5, scale: 2 }),
  holdPeriodDays: integer("hold_period_days").default(0),
  
  // Targeting
  geo: text("geo").array().notNull(),
  category: text("category").notNull(),
  
  // Traffic Sources (Facebook, Google, TikTok, UAC, PPC, etc.)
  trafficSources: text("traffic_sources").array().notNull().default(sql`ARRAY[]::text[]`),
  
  // App Types (PWA, WebView, iOS, Android, etc.)
  appTypes: text("app_types").array().notNull().default(sql`ARRAY[]::text[]`),
  
  // Creative Links (Google/Yandex disk links)
  creativeLinks: text("creative_links").array().notNull().default(sql`ARRAY[]::text[]`),
  
  status: text("status").notNull().default("active"), // active, paused, draft
  
  // Special badges
  isTop: boolean("is_top").notNull().default(false),
  isExclusive: boolean("is_exclusive").notNull().default(false),
  isPrivate: boolean("is_private").notNull().default(false),
  
  // Caps/Limits
  dailyCap: integer("daily_cap"), // Daily conversions limit (null = unlimited)
  totalCap: integer("total_cap"), // Total conversions limit (null = unlimited)
  capReachedAction: text("cap_reached_action").notNull().default("block"), // block, redirect
  capRedirectUrl: text("cap_redirect_url"), // URL to redirect when cap reached
  
  // Archive status
  archived: boolean("archived").notNull().default(false),
  archivedAt: timestamp("archived_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  shortId: true,
  createdAt: true,
  archived: true,
  archivedAt: true,
});

export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Offer = typeof offers.$inferSelect;

// Offer without internal cost for publishers
export type PublisherOffer = Omit<Offer, 'internalCost'>;

// ============================================
// OFFER LANDINGS
// Each offer can have multiple landings with different geo/prices
// ============================================
export const offerLandings = pgTable("offer_landings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shortId: integer("short_id").unique(), // 0001, 0002...
  offerId: varchar("offer_id").notNull().references(() => offers.id),
  geo: text("geo").notNull(),
  landingName: text("landing_name"),
  landingUrl: text("landing_url").notNull(),
  partnerPayout: numeric("partner_payout", { precision: 10, scale: 2 }).notNull(),
  internalCost: numeric("internal_cost", { precision: 10, scale: 2 }),
  currency: text("currency").notNull().default("USD"),
});

export const insertOfferLandingSchema = createInsertSchema(offerLandings).omit({
  id: true,
  shortId: true,
});

export type InsertOfferLanding = z.infer<typeof insertOfferLandingSchema>;
export type OfferLanding = typeof offerLandings.$inferSelect;

// ============================================
// CLICKS (MINI-TRACKER CORE)
// All traffic passes through our click handler
// ============================================
export const clicks = pgTable("clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clickId: varchar("click_id").notNull().unique(), // OUR unique click_id (UUID)
  
  // Relations
  offerId: varchar("offer_id").notNull().references(() => offers.id),
  publisherId: varchar("publisher_id").notNull().references(() => users.id),
  landingId: varchar("landing_id").references(() => offerLandings.id),
  
  // Tracking data
  ip: text("ip"),
  userAgent: text("user_agent"),
  geo: text("geo"), // Country code (RU, US, etc.)
  city: text("city"), // City name
  referer: text("referer"),
  
  // Device info (parsed from User-Agent)
  device: text("device"), // mobile, desktop, tablet
  os: text("os"), // Windows, iOS, Android, MacOS, Linux
  browser: text("browser"), // Chrome, Safari, Firefox, Edge
  
  // Sub-IDs for partner tracking (sub1-10)
  sub1: text("sub1"),
  sub2: text("sub2"),
  sub3: text("sub3"),
  sub4: text("sub4"),
  sub5: text("sub5"),
  sub6: text("sub6"),
  sub7: text("sub7"),
  sub8: text("sub8"),
  sub9: text("sub9"),
  sub10: text("sub10"),
  
  // Click quality flags
  isUnique: boolean("is_unique").default(true), // First click from this IP+offer+publisher today
  isGeoMatch: boolean("is_geo_match").default(true), // GEO matches offer allowed GEOs
  isBot: boolean("is_bot").default(false), // Detected as bot traffic
  
  // Anti-fraud data (visible only to advertiser/admin)
  fingerprint: text("fingerprint"),
  visitorId: text("visitor_id"), // FingerprintJS Pro visitor ID
  fingerprintConfidence: numeric("fingerprint_confidence", { precision: 5, scale: 4 }), // FingerprintJS confidence score
  isProxy: boolean("is_proxy").default(false),
  isVpn: boolean("is_vpn").default(false),
  isTor: boolean("is_tor").default(false),
  isDatacenter: boolean("is_datacenter").default(false),
  fraudScore: integer("fraud_score").default(0),
  
  // Suspicious traffic detection
  isSuspicious: boolean("is_suspicious").default(false),
  suspiciousReasons: text("suspicious_reasons"), // JSON array of reasons
  
  // Enhanced GEO from IP Intelligence (ipinfo.io)
  region: text("region"), // State/Province
  isp: text("isp"), // Internet Service Provider
  asn: text("asn"), // Autonomous System Number
  
  // Redirect info
  redirectUrl: text("redirect_url"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertClickSchema = createInsertSchema(clicks).omit({
  id: true,
  createdAt: true,
});

export type InsertClick = z.infer<typeof insertClickSchema>;
export type Click = typeof clicks.$inferSelect;

// ============================================
// CONVERSIONS (ORCHESTRATOR CORE)
// All conversions are recorded HERE first, then optional postback
// ============================================
export const conversions = pgTable("conversions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Relations
  clickId: varchar("click_id").notNull().references(() => clicks.id),
  offerId: varchar("offer_id").notNull().references(() => offers.id),
  publisherId: varchar("publisher_id").notNull().references(() => users.id),
  
  // Conversion type
  conversionType: text("conversion_type").notNull().default("lead"), // lead, sale, install
  
  // Money (ALWAYS calculated internally)
  advertiserCost: numeric("advertiser_cost", { precision: 10, scale: 2 }).notNull(), // What advertiser pays
  publisherPayout: numeric("payout", { precision: 10, scale: 2 }).notNull(), // What publisher gets
  transactionSum: numeric("transaction_sum", { precision: 10, scale: 2 }), // For RevShare
  currency: text("currency").notNull().default("USD"),
  
  // Status
  status: text("status").notNull().default("pending"), // pending, approved, rejected, hold
  holdUntil: timestamp("hold_until"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  
  // External reference (from advertiser postback)
  externalId: text("external_id"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertConversionSchema = createInsertSchema(conversions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertConversion = z.infer<typeof insertConversionSchema>;
export type Conversion = typeof conversions.$inferSelect;

// ============================================
// POSTBACK LOGS
// Track all inbound and outbound postbacks
// ============================================
export const postbackDirectionEnum = pgEnum("postback_direction", ["inbound", "outbound"]);

export const postbackLogs = pgTable("postback_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversionId: varchar("conversion_id").references(() => conversions.id),
  
  direction: postbackDirectionEnum("direction").notNull().default("outbound"),
  
  recipientType: text("recipient_type").notNull().default("advertiser"),
  recipientId: varchar("recipient_id").references(() => users.id),
  
  offerId: varchar("offer_id").references(() => offers.id),
  publisherId: varchar("publisher_id").references(() => users.id),
  
  endpointId: varchar("endpoint_id"),
  
  url: text("url").notNull(),
  method: text("method").notNull().default("GET"),
  requestPayload: text("request_payload"),
  responseCode: integer("response_code"),
  responseBody: text("response_body"),
  
  success: boolean("success").notNull().default(false),
  retryCount: integer("retry_count").notNull().default(0),
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPostbackLogSchema = createInsertSchema(postbackLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertPostbackLog = z.infer<typeof insertPostbackLogSchema>;
export type PostbackLog = typeof postbackLogs.$inferSelect;

// ============================================
// ADVERTISER SETTINGS (for postbacks, white-label, etc.)
// ============================================
export const advertiserSettings = pgTable("advertiser_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advertiserId: varchar("advertiser_id").notNull().references(() => users.id).unique(),
  
  // Postback settings (global for all offers)
  postbackUrl: text("postback_url"),
  postbackMethod: text("postback_method").default("GET"),
  // Separate postback URLs for different conversion types
  leadPostbackUrl: text("lead_postback_url"),
  leadPostbackMethod: text("lead_postback_method").default("GET"),
  salePostbackUrl: text("sale_postback_url"),
  salePostbackMethod: text("sale_postback_method").default("GET"),
  
  // White-label
  brandName: text("brand_name"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  customDomain: text("custom_domain"),
  hidePlatformBranding: boolean("hide_platform_branding").default(false),
  
  // Financial settings
  defaultHoldPeriodDays: integer("default_hold_period_days").default(7),
  
  // Crypto exchange API keys (encrypted)
  binanceApiKey: text("binance_api_key"),
  binanceSecretKey: text("binance_secret_key"),
  bybitApiKey: text("bybit_api_key"),
  bybitSecretKey: text("bybit_secret_key"),
  krakenApiKey: text("kraken_api_key"),
  krakenSecretKey: text("kraken_secret_key"),
  coinbaseApiKey: text("coinbase_api_key"),
  coinbaseSecretKey: text("coinbase_secret_key"),
  exmoApiKey: text("exmo_api_key"),
  exmoSecretKey: text("exmo_secret_key"),
  mexcApiKey: text("mexc_api_key"),
  mexcSecretKey: text("mexc_secret_key"),
  okxApiKey: text("okx_api_key"),
  okxSecretKey: text("okx_secret_key"),
  okxPassphrase: text("okx_passphrase"),
  
  // Telegram Bot for notifications (advertiser's own bot)
  telegramBotToken: text("telegram_bot_token"), // encrypted
  
  // Email notification settings
  emailNotifyLeads: boolean("email_notify_leads").default(true),
  emailNotifySales: boolean("email_notify_sales").default(true),
  emailNotifyPayouts: boolean("email_notify_payouts").default(true),
  emailNotifySystem: boolean("email_notify_system").default(true),
  
  // SMTP settings for custom email sending
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpUser: text("smtp_user"),
  smtpPassword: text("smtp_password"), // encrypted
  smtpFromEmail: text("smtp_from_email"),
  smtpFromName: text("smtp_from_name"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAdvertiserSettingsSchema = createInsertSchema(advertiserSettings).omit({
  id: true,
  createdAt: true,
});

export type InsertAdvertiserSettings = z.infer<typeof insertAdvertiserSettingsSchema>;
export type AdvertiserSettings = typeof advertiserSettings.$inferSelect;

// ============================================
// OFFER ACCESS REQUESTS
// Publisher requests access to an offer (sees offer without landing URLs)
// ============================================
export const offerAccessRequests = pgTable("offer_access_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").notNull().references(() => offers.id),
  publisherId: varchar("publisher_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  message: text("message"), // Optional message from publisher
  rejectionReason: text("rejection_reason"), // Reason if rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertOfferAccessRequestSchema = createInsertSchema(offerAccessRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOfferAccessRequest = z.infer<typeof insertOfferAccessRequestSchema>;
export type OfferAccessRequest = typeof offerAccessRequests.$inferSelect;

// ============================================
// PUBLISHER OFFERS (Approved Access)
// Created when advertiser approves access request
// ============================================
export const publisherOffers = pgTable("publisher_offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").notNull().references(() => offers.id),
  publisherId: varchar("publisher_id").notNull().references(() => users.id),
  approvedAt: timestamp("approved_at").notNull().defaultNow(),
});

export const insertPublisherOfferSchema = createInsertSchema(publisherOffers).omit({
  id: true,
  approvedAt: true,
});

export type InsertPublisherOffer = z.infer<typeof insertPublisherOfferSchema>;
export type PublisherOfferAccess = typeof publisherOffers.$inferSelect;

// ============================================
// OFFER CAPS STATS (Daily counters for caps)
// ============================================
export const offerCapsStats = pgTable("offer_caps_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").notNull().references(() => offers.id),
  date: text("date").notNull(), // YYYY-MM-DD format for daily tracking
  dailyConversions: integer("daily_conversions").notNull().default(0),
  totalConversions: integer("total_conversions").notNull().default(0),
}, (table) => ({
  offerDateUnique: sql`CREATE UNIQUE INDEX IF NOT EXISTS offer_caps_stats_offer_date_idx ON offer_caps_stats(offer_id, date)`,
}));

export const insertOfferCapsStatsSchema = createInsertSchema(offerCapsStats).omit({
  id: true,
});

export type InsertOfferCapsStats = z.infer<typeof insertOfferCapsStatsSchema>;
export type OfferCapsStats = typeof offerCapsStats.$inferSelect;

// ============================================
// PAYMENT METHODS (Advertiser's payment options)
// Advertiser configures how they pay publishers
// ============================================
export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advertiserId: varchar("advertiser_id").notNull().references(() => users.id),
  
  // Method type: crypto, bank_card, exchange, other
  methodType: text("method_type").notNull(), // crypto, bank_card, exchange, other
  
  // Specific method: USDT_TRC20, USDT_ERC20, BTC, BANK_CARD, BINANCE, BYBIT, PAYPAL, etc.
  methodName: text("method_name").notNull(),
  
  // Currency: USD, USDT, BTC, EUR, RUB, etc.
  currency: text("currency").notNull(),
  
  // Min/max payout amounts
  minPayout: numeric("min_payout", { precision: 10, scale: 2 }).notNull().default("0"),
  maxPayout: numeric("max_payout", { precision: 10, scale: 2 }),
  
  // Processing fee (percentage or fixed)
  feePercent: numeric("fee_percent", { precision: 5, scale: 2 }).default("0"),
  feeFixed: numeric("fee_fixed", { precision: 10, scale: 2 }).default("0"),
  
  // Instructions for publisher (optional)
  instructions: text("instructions"),
  
  // Active status
  isActive: boolean("is_active").notNull().default(true),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true,
});

export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;

// ============================================
// PUBLISHER WALLETS (Publisher's payment details)
// Publisher specifies where to receive payments
// ============================================
export const publisherWallets = pgTable("publisher_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  publisherId: varchar("publisher_id").notNull().references(() => users.id),
  advertiserId: varchar("advertiser_id").notNull().references(() => users.id),
  
  // Links to advertiser's payment method
  paymentMethodId: varchar("payment_method_id").notNull().references(() => paymentMethods.id),
  
  // Wallet address / card number / account details
  walletAddress: text("wallet_address").notNull(),
  
  // Additional info (account name, bank name, etc.)
  accountName: text("account_name"),
  additionalInfo: text("additional_info"),
  
  // Verification status
  isVerified: boolean("is_verified").notNull().default(false),
  
  // Default wallet for this payment method
  isDefault: boolean("is_default").notNull().default(false),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPublisherWalletSchema = createInsertSchema(publisherWallets).omit({
  id: true,
  createdAt: true,
});

export type InsertPublisherWallet = z.infer<typeof insertPublisherWalletSchema>;
export type PublisherWallet = typeof publisherWallets.$inferSelect;

// ============================================
// PAYOUT REQUESTS (Publisher requests payment)
// Publisher submits payout request based on earned balance
// ============================================
export const payoutRequests = pgTable("payout_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  publisherId: varchar("publisher_id").notNull().references(() => users.id),
  advertiserId: varchar("advertiser_id").notNull().references(() => users.id),
  
  // Payment details
  walletId: varchar("wallet_id").notNull().references(() => publisherWallets.id),
  paymentMethodId: varchar("payment_method_id").notNull().references(() => paymentMethods.id),
  
  // Amounts
  requestedAmount: numeric("requested_amount", { precision: 10, scale: 2 }).notNull(),
  approvedAmount: numeric("approved_amount", { precision: 10, scale: 2 }),
  feeAmount: numeric("fee_amount", { precision: 10, scale: 2 }).default("0"),
  currency: text("currency").notNull(),
  
  // Status: pending, approved, rejected, partial, paid
  status: text("status").notNull().default("pending"),
  
  // Publisher's message
  publisherNote: text("publisher_note"),
  
  // Advertiser's response
  advertiserNote: text("advertiser_note"),
  rejectionReason: text("rejection_reason"),
  
  // Payment info (after paid)
  transactionId: text("transaction_id"),
  paidAt: timestamp("paid_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertPayoutRequestSchema = createInsertSchema(payoutRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPayoutRequest = z.infer<typeof insertPayoutRequestSchema>;
export type PayoutRequest = typeof payoutRequests.$inferSelect;

// ============================================
// PAYOUTS (Completed payments history)
// Record of all completed payouts
// ============================================
export const payouts = pgTable("payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  payoutRequestId: varchar("payout_request_id").references(() => payoutRequests.id),
  
  publisherId: varchar("publisher_id").notNull().references(() => users.id),
  advertiserId: varchar("advertiser_id").notNull().references(() => users.id),
  
  // Payment details
  paymentMethodId: varchar("payment_method_id").notNull().references(() => paymentMethods.id),
  walletAddress: text("wallet_address").notNull(),
  
  // Amounts
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  feeAmount: numeric("fee_amount", { precision: 10, scale: 2 }).default("0"),
  netAmount: numeric("net_amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  
  // Payout type: manual, auto, bonus
  payoutType: text("payout_type").notNull().default("manual"),
  
  // Transaction info
  transactionId: text("transaction_id"),
  transactionHash: text("transaction_hash"),
  
  // Notes
  note: text("note"),
  
  // Status: pending, processing, completed, failed
  status: text("status").notNull().default("completed"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPayoutSchema = createInsertSchema(payouts).omit({
  id: true,
  createdAt: true,
});

export type InsertPayout = z.infer<typeof insertPayoutSchema>;
export type Payout = typeof payouts.$inferSelect;

// ============================================
// PUBLISHER BALANCES (Cached balance per advertiser)
// Updated on each conversion approval
// ============================================
export const publisherBalances = pgTable("publisher_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  publisherId: varchar("publisher_id").notNull().references(() => users.id),
  advertiserId: varchar("advertiser_id").notNull().references(() => users.id),
  
  // Balance amounts
  availableBalance: numeric("available_balance", { precision: 10, scale: 2 }).notNull().default("0"),
  pendingBalance: numeric("pending_balance", { precision: 10, scale: 2 }).notNull().default("0"),
  holdBalance: numeric("hold_balance", { precision: 10, scale: 2 }).notNull().default("0"),
  totalPaid: numeric("total_paid", { precision: 10, scale: 2 }).notNull().default("0"),
  
  currency: text("currency").notNull().default("USD"),
  
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPublisherBalanceSchema = createInsertSchema(publisherBalances).omit({
  id: true,
  updatedAt: true,
});

export type InsertPublisherBalance = z.infer<typeof insertPublisherBalanceSchema>;
export type PublisherBalance = typeof publisherBalances.$inferSelect;

// ============================================
// OFFER POSTBACK SETTINGS (Per Offer override)
// ============================================
export const offerPostbackSettings = pgTable("offer_postback_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").notNull().references(() => offers.id).unique(),
  advertiserId: varchar("advertiser_id").notNull().references(() => users.id),
  
  // Override postback URL (if empty, uses advertiser default)
  postbackUrl: text("postback_url"),
  httpMethod: text("http_method").default("GET"),
  
  // Override events
  sendOnLead: boolean("send_on_lead").default(true),
  sendOnSale: boolean("send_on_sale").default(true),
  sendOnRejected: boolean("send_on_rejected").default(false),
  
  isActive: boolean("is_active").notNull().default(true),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOfferPostbackSettingSchema = createInsertSchema(offerPostbackSettings).omit({
  id: true,
  createdAt: true,
});

export type InsertOfferPostbackSetting = z.infer<typeof insertOfferPostbackSettingSchema>;
export type OfferPostbackSetting = typeof offerPostbackSettings.$inferSelect;

// ============================================
// USER POSTBACK SETTINGS (Universal for all roles)
// ============================================
export const userPostbackSettings = pgTable("user_postback_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  
  // Lead/Registration postback
  leadPostbackUrl: text("lead_postback_url"),
  leadPostbackMethod: text("lead_postback_method").default("GET"),
  
  // Sale/Deposit postback
  salePostbackUrl: text("sale_postback_url"),
  salePostbackMethod: text("sale_postback_method").default("GET"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertUserPostbackSettingSchema = createInsertSchema(userPostbackSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserPostbackSetting = z.infer<typeof insertUserPostbackSettingSchema>;
export type UserPostbackSetting = typeof userPostbackSettings.$inferSelect;

// ============================================
// ANTI-FRAUD RULES
// Configurable rules for fraud detection
// scope: global (admin only), advertiser (per-advertiser)
// ============================================
export const antifraudRules = pgTable("antifraud_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  scope: text("scope").notNull().default("global"), // global, advertiser
  advertiserId: varchar("advertiser_id").references(() => users.id), // null for global rules
  
  name: text("name").notNull(),
  description: text("description"),
  
  // Rule type and conditions
  ruleType: text("rule_type").notNull(), // fraud_score, proxy_vpn, bot, duplicate_click, geo_mismatch, device_fingerprint
  
  // Thresholds
  threshold: integer("threshold"), // e.g., fraud score >= 80
  
  // Action when triggered
  action: text("action").notNull().default("flag"), // block, hold, flag, notify, reject
  
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(100), // Lower = higher priority
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertAntifraudRuleSchema = createInsertSchema(antifraudRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAntifraudRule = z.infer<typeof insertAntifraudRuleSchema>;
export type AntifraudRule = typeof antifraudRules.$inferSelect;

// ============================================
// ANTI-FRAUD LOGS
// Detailed log of each evaluated click with fraud signals
// ============================================
export const antifraudLogs = pgTable("antifraud_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  clickId: varchar("click_id").references(() => clicks.id),
  offerId: varchar("offer_id").references(() => offers.id),
  advertiserId: varchar("advertiser_id").references(() => users.id),
  publisherId: varchar("publisher_id").references(() => users.id),
  
  // Fraud signals
  fraudScore: integer("fraud_score").notNull().default(0),
  isProxy: boolean("is_proxy").default(false),
  isVpn: boolean("is_vpn").default(false),
  isBot: boolean("is_bot").default(false),
  isDatacenter: boolean("is_datacenter").default(false),
  
  // Detection details (JSON)
  signals: text("signals"), // JSON array of detected signals
  
  // Matched rules
  matchedRuleIds: text("matched_rule_ids").array().default(sql`ARRAY[]::text[]`),
  
  // Action taken
  action: text("action").notNull().default("allow"), // allow, block, hold, flag, reject
  
  // Context
  ip: text("ip"),
  userAgent: text("user_agent"),
  country: text("country"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAntifraudLogSchema = createInsertSchema(antifraudLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAntifraudLog = z.infer<typeof insertAntifraudLogSchema>;
export type AntifraudLog = typeof antifraudLogs.$inferSelect;

// ============================================
// ANTI-FRAUD DAILY METRICS
// Aggregated metrics for dashboard
// ============================================
export const antifraudMetrics = pgTable("antifraud_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  date: timestamp("date").notNull(),
  advertiserId: varchar("advertiser_id").references(() => users.id), // null for platform-wide
  offerId: varchar("offer_id").references(() => offers.id), // null for advertiser-level
  
  // Counts
  totalClicks: integer("total_clicks").notNull().default(0),
  blockedClicks: integer("blocked_clicks").notNull().default(0),
  flaggedClicks: integer("flagged_clicks").notNull().default(0),
  
  // By type
  proxyVpnCount: integer("proxy_vpn_count").notNull().default(0),
  botCount: integer("bot_count").notNull().default(0),
  datacenterCount: integer("datacenter_count").notNull().default(0),
  
  // Fraud score distribution
  lowRiskCount: integer("low_risk_count").notNull().default(0), // score 0-30
  mediumRiskCount: integer("medium_risk_count").notNull().default(0), // score 31-60
  highRiskCount: integer("high_risk_count").notNull().default(0), // score 61-100
  
  averageFraudScore: numeric("average_fraud_score", { precision: 5, scale: 2 }).default("0"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAntifraudMetricSchema = createInsertSchema(antifraudMetrics).omit({
  id: true,
  createdAt: true,
});

export type InsertAntifraudMetric = z.infer<typeof insertAntifraudMetricSchema>;
export type AntifraudMetric = typeof antifraudMetrics.$inferSelect;

// ============================================
// VELOCITY COUNTERS
// Real-time click counting for rate limiting
// ============================================
export const velocityCounters = pgTable("velocity_counters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Counter key (IP, fingerprint, publisherId)
  counterType: text("counter_type").notNull(), // ip, fingerprint, publisher, device
  counterKey: text("counter_key").notNull(), // actual value (IP address, fingerprint hash, etc.)
  
  // Context
  advertiserId: varchar("advertiser_id").references(() => users.id),
  offerId: varchar("offer_id").references(() => offers.id),
  
  // Counters for different periods
  clicksMinute: integer("clicks_minute").notNull().default(0),
  clicksHour: integer("clicks_hour").notNull().default(0),
  clicksDay: integer("clicks_day").notNull().default(0),
  
  // Last update timestamps for counter reset
  minuteReset: timestamp("minute_reset").notNull().defaultNow(),
  hourReset: timestamp("hour_reset").notNull().defaultNow(),
  dayReset: timestamp("day_reset").notNull().defaultNow(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertVelocityCounterSchema = createInsertSchema(velocityCounters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVelocityCounter = z.infer<typeof insertVelocityCounterSchema>;
export type VelocityCounter = typeof velocityCounters.$inferSelect;

// ============================================
// CONVERSION FINGERPRINTS
// For duplicate detection by email, phone, transaction_id
// ============================================
export const conversionFingerprints = pgTable("conversion_fingerprints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  offerId: varchar("offer_id").references(() => offers.id),
  advertiserId: varchar("advertiser_id").references(() => users.id),
  publisherId: varchar("publisher_id").references(() => users.id),
  
  // Fingerprint data (hashed)
  emailHash: text("email_hash"),
  phoneHash: text("phone_hash"),
  transactionId: text("transaction_id"),
  deviceFingerprint: text("device_fingerprint"),
  
  // Original conversion
  conversionId: varchar("conversion_id").references(() => conversions.id),
  clickId: varchar("click_id").references(() => clicks.id),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConversionFingerprintSchema = createInsertSchema(conversionFingerprints).omit({
  id: true,
  createdAt: true,
});

export type InsertConversionFingerprint = z.infer<typeof insertConversionFingerprintSchema>;
export type ConversionFingerprint = typeof conversionFingerprints.$inferSelect;

// ============================================
// PUBLISHER STATS CACHE
// For CR anomaly detection
// ============================================
export const publisherStatsCache = pgTable("publisher_stats_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  publisherId: varchar("publisher_id").notNull().references(() => users.id),
  advertiserId: varchar("advertiser_id").references(() => users.id),
  offerId: varchar("offer_id").references(() => offers.id),
  
  // Stats for period (rolling 7 days)
  totalClicks: integer("total_clicks").notNull().default(0),
  totalConversions: integer("total_conversions").notNull().default(0),
  approvedConversions: integer("approved_conversions").notNull().default(0),
  rejectedConversions: integer("rejected_conversions").notNull().default(0),
  
  // Calculated rates (updated periodically)
  conversionRate: numeric("conversion_rate", { precision: 5, scale: 4 }), // CR = conversions/clicks
  approvalRate: numeric("approval_rate", { precision: 5, scale: 4 }), // AR = approved/total conversions
  
  // Baseline for anomaly detection (historical average)
  baselineCr: numeric("baseline_cr", { precision: 5, scale: 4 }),
  baselineAr: numeric("baseline_ar", { precision: 5, scale: 4 }),
  
  // Anomaly flags
  isCrAnomaly: boolean("is_cr_anomaly").default(false),
  isArAnomaly: boolean("is_ar_anomaly").default(false),
  
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPublisherStatsCacheSchema = createInsertSchema(publisherStatsCache).omit({
  id: true,
  createdAt: true,
});

export type InsertPublisherStatsCache = z.infer<typeof insertPublisherStatsCacheSchema>;
export type PublisherStatsCache = typeof publisherStatsCache.$inferSelect;

// ============================================
// PLATFORM SETTINGS (Admin only)
// Global platform configuration
// ============================================
export const platformSettings = pgTable("platform_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Platform branding
  platformName: text("platform_name").default("Affiliate Platform"),
  platformDescription: text("platform_description"),
  platformLogoUrl: text("platform_logo_url"),
  platformFaviconUrl: text("platform_favicon_url"),
  supportEmail: text("support_email"),
  supportPhone: text("support_phone"),
  supportTelegram: text("support_telegram"),
  copyrightText: text("copyright_text"),
  
  // Default notification settings
  defaultTelegramBotToken: text("default_telegram_bot_token"), // encrypted - platform bot for system notifications
  
  // Registration settings
  allowPublisherRegistration: boolean("allow_publisher_registration").default(true),
  allowAdvertiserRegistration: boolean("allow_advertiser_registration").default(true),
  requireAdvertiserApproval: boolean("require_advertiser_approval").default(true),
  
  // Anti-fraud global settings
  enableProxyDetection: boolean("enable_proxy_detection").default(true),
  enableVpnDetection: boolean("enable_vpn_detection").default(true),
  enableFingerprintTracking: boolean("enable_fingerprint_tracking").default(true),
  maxFraudScore: integer("max_fraud_score").default(70),
  
  // IP Intelligence (ipinfo.io)
  ipinfoToken: text("ipinfo_token"), // encrypted
  
  // FingerprintJS settings
  fingerprintjsApiKey: text("fingerprintjs_api_key"), // encrypted (for Pro version, optional)
  
  // Billing settings (for future Stripe integration)
  stripePublicKey: text("stripe_public_key"),
  stripeSecretKey: text("stripe_secret_key"), // encrypted
  
  // Crypto wallet addresses for subscription payments
  cryptoBtcAddress: text("crypto_btc_address"),
  cryptoUsdtTrc20Address: text("crypto_usdt_trc20_address"),
  cryptoEthAddress: text("crypto_eth_address"),
  cryptoUsdtErc20Address: text("crypto_usdt_erc20_address"),
  
  // Cloudflare SSL for SaaS integration
  cloudflareZoneId: text("cloudflare_zone_id"), // Zone ID from Cloudflare dashboard
  cloudflareApiToken: text("cloudflare_api_token"), // encrypted API token
  cloudflareCnameTarget: text("cloudflare_cname_target"), // e.g., customers.example.com
  cloudflareFallbackOrigin: text("cloudflare_fallback_origin"), // e.g., tracking.example.com
  
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPlatformSettingsSchema = createInsertSchema(platformSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlatformSettings = z.infer<typeof insertPlatformSettingsSchema>;
export type PlatformSettings = typeof platformSettings.$inferSelect;

// ============================================
// DATA MIGRATIONS
// Track imports from external trackers
// ============================================
export const dataMigrations = pgTable("data_migrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  advertiserId: varchar("advertiser_id").notNull().references(() => users.id),
  
  // Source tracker
  sourceTracker: text("source_tracker").notNull(), // scaleo, affilka, affise, voluum, keitaro
  
  // Credentials (encrypted)
  apiUrl: text("api_url"),
  apiKey: text("api_key"), // encrypted
  apiSecret: text("api_secret"), // encrypted
  
  // Migration status
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, failed
  
  // What to migrate
  migrateOffers: boolean("migrate_offers").default(true),
  migratePublishers: boolean("migrate_publishers").default(true),
  migrateClicks: boolean("migrate_clicks").default(false),
  migrateConversions: boolean("migrate_conversions").default(true),
  
  // Progress
  totalRecords: integer("total_records").default(0),
  processedRecords: integer("processed_records").default(0),
  failedRecords: integer("failed_records").default(0),
  
  // Logs
  errorLog: text("error_log"),
  
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDataMigrationSchema = createInsertSchema(dataMigrations).omit({
  id: true,
  createdAt: true,
});

export type InsertDataMigration = z.infer<typeof insertDataMigrationSchema>;
export type DataMigration = typeof dataMigrations.$inferSelect;

// ============================================
// NOTIFICATIONS
// In-app notifications system
// ============================================
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Sender (null for system notifications)
  senderId: varchar("sender_id").references(() => users.id),
  senderRole: text("sender_role"), // admin, advertiser
  
  // Recipient
  recipientId: varchar("recipient_id").notNull().references(() => users.id),
  
  // For advertiser-scoped notifications (advertiser → their publishers)
  advertiserScopeId: varchar("advertiser_scope_id").references(() => users.id),
  
  // Notification content
  type: text("type").notNull(), // system, offer_approved, offer_rejected, payout, new_lead, account_approved, etc.
  title: text("title").notNull(),
  body: text("body").notNull(),
  
  // Link to related entity
  entityType: text("entity_type"), // offer, payout, conversion, etc.
  entityId: varchar("entity_id"),
  
  // Status
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ============================================
// NEWS POSTS
// Platform and advertiser news/announcements
// ============================================
export const newsPosts = pgTable("news_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Author
  authorId: varchar("author_id").notNull().references(() => users.id),
  authorRole: text("author_role").notNull(), // admin, advertiser
  
  // For advertiser news (only visible to their publishers)
  advertiserScopeId: varchar("advertiser_scope_id").references(() => users.id),
  
  // Content
  title: text("title").notNull(),
  body: text("body").notNull(),
  imageUrl: text("image_url"), // uploaded via Object Storage
  
  // Categorization
  category: text("category").notNull().default("update"), // important, promo, update
  
  // Target audience (for admin posts)
  targetAudience: text("target_audience").notNull().default("all"), // all, advertisers, publishers
  
  // Display settings
  isPinned: boolean("is_pinned").default(false),
  isPublished: boolean("is_published").default(true),
  
  publishedAt: timestamp("published_at").defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertNewsPostSchema = createInsertSchema(newsPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNewsPost = z.infer<typeof insertNewsPostSchema>;
export type NewsPost = typeof newsPosts.$inferSelect;

// ============================================
// NEWS READS - Track which users have read which news
// ============================================
export const newsReads = pgTable("news_reads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  newsId: varchar("news_id").notNull().references(() => newsPosts.id),
  readAt: timestamp("read_at").notNull().defaultNow(),
});

export type NewsRead = typeof newsReads.$inferSelect;

// ============================================
// PASSWORD RESET TOKENS
// ============================================
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// ============================================
// WEBHOOK ENDPOINTS
// Custom webhook notifications for advertisers
// ============================================
export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  advertiserId: varchar("advertiser_id").notNull().references(() => users.id),
  
  // Endpoint configuration
  name: text("name").notNull(),
  url: text("url").notNull(),
  secret: text("secret"), // For HMAC signature verification
  
  // Events to trigger
  events: text("events").array().notNull().default(sql`'{}'::text[]`), // click, lead, sale, install, rejected, hold_released
  
  // Filters (optional)
  offerIds: text("offer_ids").array(), // Filter by specific offers (null = all)
  publisherIds: text("publisher_ids").array(), // Filter by specific publishers (null = all)
  
  // Request configuration
  method: text("method").notNull().default("POST"), // POST, PUT
  headers: text("headers"), // JSON string of custom headers
  
  // Status
  isActive: boolean("is_active").default(true),
  lastTriggeredAt: timestamp("last_triggered_at"),
  lastError: text("last_error"),
  failedAttempts: integer("failed_attempts").default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWebhookEndpointSchema = createInsertSchema(webhookEndpoints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastTriggeredAt: true,
  lastError: true,
  failedAttempts: true,
});

export type InsertWebhookEndpoint = z.infer<typeof insertWebhookEndpointSchema>;
export type WebhookEndpoint = typeof webhookEndpoints.$inferSelect;

// ============================================
// WEBHOOK LOGS
// Log of webhook delivery attempts
// ============================================
export const webhookLogs = pgTable("webhook_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  webhookEndpointId: varchar("webhook_endpoint_id").notNull().references(() => webhookEndpoints.id),
  advertiserId: varchar("advertiser_id").notNull().references(() => users.id),
  
  // Event details
  eventType: text("event_type").notNull(),
  payload: text("payload").notNull(), // JSON
  
  // Delivery status
  status: text("status").notNull().default("pending"), // pending, success, failed
  statusCode: integer("status_code"),
  response: text("response"),
  
  // Retry info
  attemptNumber: integer("attempt_number").default(1),
  nextRetryAt: timestamp("next_retry_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWebhookLogSchema = createInsertSchema(webhookLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;
export type WebhookLog = typeof webhookLogs.$inferSelect;

// ============================================
// CUSTOM DOMAINS
// Domain verification and management for advertisers
// ============================================
export const customDomains = pgTable("custom_domains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  advertiserId: varchar("advertiser_id").notNull().references(() => users.id),
  
  // Domain info
  domain: text("domain").notNull().unique(),
  
  // Verification
  verificationToken: text("verification_token").notNull(),
  verificationMethod: text("verification_method").notNull().default("cname"), // cname, txt
  isVerified: boolean("is_verified").default(false),
  verifiedAt: timestamp("verified_at"),
  
  // SSL status
  sslStatus: text("ssl_status").default("pending"), // pending, provisioning, active, failed
  sslExpiresAt: timestamp("ssl_expires_at"),
  
  // SSL Certificate (Let's Encrypt) - deprecated, now using Cloudflare
  sslCertificate: text("ssl_certificate"), // PEM encoded certificate
  sslPrivateKey: text("ssl_private_key"), // PEM encoded private key (encrypted)
  sslChain: text("ssl_chain"), // PEM encoded certificate chain
  
  // Cloudflare SSL for SaaS
  cloudflareHostnameId: text("cloudflare_hostname_id"), // Cloudflare custom hostname ID
  cloudflareStatus: text("cloudflare_status"), // pending, pending_validation, active, deleted, etc.
  cloudflareSslStatus: text("cloudflare_ssl_status"), // pending_validation, pending_deployment, active
  dnsTarget: text("dns_target"), // CNAME target for customers (configured in platform settings)
  lastSyncedAt: timestamp("last_synced_at"), // Last time we synced with Cloudflare API
  
  // Usage
  isPrimary: boolean("is_primary").default(false),
  isActive: boolean("is_active").default(true),
  
  // Error tracking
  lastError: text("last_error"),
  cloudflareError: text("cloudflare_error"), // Cloudflare-specific error message
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCustomDomainSchema = createInsertSchema(customDomains).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  verifiedAt: true,
  sslExpiresAt: true,
});

export type InsertCustomDomain = z.infer<typeof insertCustomDomainSchema>;
export type CustomDomain = typeof customDomains.$inferSelect;

// ============================================
// ACME ACCOUNTS (Let's Encrypt)
// ============================================
export const acmeAccounts = pgTable("acme_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  email: text("email").notNull(),
  privateKey: text("private_key").notNull(), // PEM encoded (encrypted)
  accountUrl: text("account_url"), // ACME account URL after registration
  
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AcmeAccount = typeof acmeAccounts.$inferSelect;

// ============================================
// ACME CHALLENGES (HTTP-01 or DNS-01)
// ============================================
export const acmeChallenges = pgTable("acme_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  domainId: varchar("domain_id").notNull().references(() => customDomains.id),
  
  token: text("token").notNull(),
  keyAuthorization: text("key_authorization").notNull(),
  
  challengeType: text("challenge_type").notNull().default("http-01"), // http-01, dns-01
  status: text("status").notNull().default("pending"), // pending, processing, valid, invalid
  
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AcmeChallenge = typeof acmeChallenges.$inferSelect;

// ============================================
// SUBSCRIPTION PLANS
// ============================================
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  name: text("name").notNull(), // Starter, Professional, Enterprise
  monthlyPrice: numeric("monthly_price", { precision: 10, scale: 2 }).notNull(),
  yearlyPrice: numeric("yearly_price", { precision: 10, scale: 2 }).notNull(),
  
  // Limits
  maxPartners: integer("max_partners"), // null = unlimited
  maxOffers: integer("max_offers"), // null = unlimited
  
  // Feature flags
  hasAntifraud: boolean("has_antifraud").default(false),
  hasNews: boolean("has_news").default(false),
  hasPostbacks: boolean("has_postbacks").default(false),
  hasTeam: boolean("has_team").default(false),
  hasWebhooks: boolean("has_webhooks").default(false),
  hasCustomDomain: boolean("has_custom_domain").default(false),
  hasApiAccess: boolean("has_api_access").default(false),
  
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  
  // Legacy columns (for backwards compatibility)
  price: numeric("price", { precision: 10, scale: 2 }),
  discountPercent: integer("discount_percent"),
  features: text("features").array(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
});

export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;

// ============================================
// ADVERTISER SUBSCRIPTIONS
// ============================================
export const advertiserSubscriptions = pgTable("advertiser_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  advertiserId: varchar("advertiser_id").notNull().references(() => users.id),
  planId: varchar("plan_id").references(() => subscriptionPlans.id), // null during trial
  
  billingCycle: text("billing_cycle").notNull().default("monthly"), // monthly, yearly
  status: text("status").notNull().default("trial"), // trial, active, cancelled, expired, past_due, pending_payment
  
  // Trial period
  trialEndsAt: timestamp("trial_ends_at"),
  
  // Subscription period
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  
  // Last payment info
  lastPaymentId: varchar("last_payment_id"),
  lastPaymentAt: timestamp("last_payment_at"),
  
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAdvertiserSubscriptionSchema = createInsertSchema(advertiserSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAdvertiserSubscription = z.infer<typeof insertAdvertiserSubscriptionSchema>;
export type AdvertiserSubscription = typeof advertiserSubscriptions.$inferSelect;

// ============================================
// SUBSCRIPTION PAYMENTS (Crypto)
// ============================================
export const subscriptionPayments = pgTable("subscription_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  advertiserId: varchar("advertiser_id").notNull().references(() => users.id),
  subscriptionId: varchar("subscription_id").references(() => advertiserSubscriptions.id),
  planId: varchar("plan_id").references(() => subscriptionPlans.id),
  
  // Payment details
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"), // USD equivalent
  cryptoCurrency: text("crypto_currency").notNull(), // BTC, USDT_TRC20, ETH, USDT_ERC20
  cryptoAmount: numeric("crypto_amount", { precision: 18, scale: 8 }), // amount in crypto
  cryptoAddress: text("crypto_address").notNull(), // destination wallet
  
  // Transaction verification
  txHash: text("tx_hash"), // blockchain transaction hash
  txVerified: boolean("tx_verified").default(false),
  txVerifiedAt: timestamp("tx_verified_at"),
  
  // Status
  status: text("status").notNull().default("pending"), // pending, verifying, confirmed, failed, expired
  
  billingCycle: text("billing_cycle").notNull().default("monthly"), // monthly, yearly
  
  // Period this payment covers
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  
  expiresAt: timestamp("expires_at"), // payment window expires
  
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSubscriptionPaymentSchema = createInsertSchema(subscriptionPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubscriptionPayment = z.infer<typeof insertSubscriptionPaymentSchema>;
export type SubscriptionPayment = typeof subscriptionPayments.$inferSelect;

// ============================================
// INCOMING POSTBACK CONFIGS (Advertiser's parameter mapping)
// Configures how incoming postbacks are parsed
// ============================================
export const clickIdStorageEnum = pgEnum("click_id_storage", ["click_id", "sub1", "sub2", "sub3", "sub4", "sub5", "sub6", "sub7", "sub8", "sub9", "sub10"]);

export const incomingPostbackConfigs = pgTable("incoming_postback_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advertiserId: varchar("advertiser_id").notNull().references(() => users.id),
  offerId: varchar("offer_id").references(() => offers.id),
  
  label: text("label").notNull().default("Default"),
  
  clickIdParam: text("click_id_param").notNull().default("click_id"),
  statusParam: text("status_param").notNull().default("status"),
  payoutParam: text("payout_param").notNull().default("payout"),
  currencyParam: text("currency_param"),
  
  storeClickIdIn: clickIdStorageEnum("store_click_id_in").notNull().default("click_id"),
  
  statusMappings: text("status_mappings").default('{"lead":"lead","sale":"sale","reg":"lead","dep":"sale","install":"install","rebill":"sale","approved":"sale","rejected":"rejected"}'),
  
  isActive: boolean("is_active").notNull().default(true),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertIncomingPostbackConfigSchema = createInsertSchema(incomingPostbackConfigs).omit({
  id: true,
  createdAt: true,
});

export type InsertIncomingPostbackConfig = z.infer<typeof insertIncomingPostbackConfigSchema>;
export type IncomingPostbackConfig = typeof incomingPostbackConfigs.$inferSelect;

// ============================================
// PUBLISHER POSTBACK ENDPOINTS (Outgoing to publisher's tracker)
// Where to send conversions when they happen
// ============================================
export const publisherTrackerTypeEnum = pgEnum("publisher_tracker_type", ["keitaro", "binom", "custom"]);

export const publisherPostbackEndpoints = pgTable("publisher_postback_endpoints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  publisherId: varchar("publisher_id").notNull().references(() => users.id),
  offerId: varchar("offer_id").references(() => offers.id),
  
  label: text("label").notNull().default("Default"),
  trackerType: publisherTrackerTypeEnum("tracker_type").notNull().default("custom"),
  
  baseUrl: text("base_url").notNull(),
  httpMethod: text("http_method").notNull().default("GET"),
  
  clickIdParam: text("click_id_param").notNull().default("subid"),
  statusParam: text("status_param").notNull().default("status"),
  payoutParam: text("payout_param").notNull().default("payout"),
  
  statusMappings: text("status_mappings").default('{"lead":"lead","sale":"sale","install":"install","rejected":"rejected"}'),
  
  customHeaders: text("custom_headers"),
  
  statusFilter: text("status_filter").default('["lead","sale","install"]'),
  
  retryLimit: integer("retry_limit").notNull().default(5),
  
  isActive: boolean("is_active").notNull().default(true),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPublisherPostbackEndpointSchema = createInsertSchema(publisherPostbackEndpoints).omit({
  id: true,
  createdAt: true,
});

export type InsertPublisherPostbackEndpoint = z.infer<typeof insertPublisherPostbackEndpointSchema>;
export type PublisherPostbackEndpoint = typeof publisherPostbackEndpoints.$inferSelect;
