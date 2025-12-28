import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// USERS
// ============================================
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  
  // 2FA Settings
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"), // encrypted TOTP secret
  
  // Telegram Notifications
  telegramChatId: text("telegram_chat_id"),
  telegramNotifyClicks: boolean("telegram_notify_clicks").default(false),
  telegramNotifyLeads: boolean("telegram_notify_leads").default(true),
  telegramNotifySales: boolean("telegram_notify_sales").default(true),
  telegramNotifyPayouts: boolean("telegram_notify_payouts").default(true),
  telegramNotifySystem: boolean("telegram_notify_system").default(true),
  
  // API Tokens (for publishers)
  apiToken: text("api_token"),
  apiTokenCreatedAt: timestamp("api_token_created_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
  
  // Caps/Limits
  dailyCap: integer("daily_cap"), // Daily conversions limit (null = unlimited)
  totalCap: integer("total_cap"), // Total conversions limit (null = unlimited)
  capReachedAction: text("cap_reached_action").notNull().default("block"), // block, redirect
  capRedirectUrl: text("cap_redirect_url"), // URL to redirect when cap reached
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  createdAt: true,
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
  
  // Sub-IDs for partner tracking
  sub1: text("sub1"),
  sub2: text("sub2"),
  sub3: text("sub3"),
  sub4: text("sub4"),
  sub5: text("sub5"),
  
  // Click quality flags
  isUnique: boolean("is_unique").default(true), // First click from this IP+offer+publisher today
  isGeoMatch: boolean("is_geo_match").default(true), // GEO matches offer allowed GEOs
  isBot: boolean("is_bot").default(false), // Detected as bot traffic
  
  // Anti-fraud data (visible only to advertiser/admin)
  fingerprint: text("fingerprint"),
  isProxy: boolean("is_proxy").default(false),
  isVpn: boolean("is_vpn").default(false),
  fraudScore: integer("fraud_score").default(0),
  
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
// Track all outgoing postbacks (after internal recording)
// ============================================
export const postbackLogs = pgTable("postback_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversionId: varchar("conversion_id").notNull().references(() => conversions.id),
  
  // Postback info
  url: text("url").notNull(),
  method: text("method").notNull().default("GET"),
  responseCode: integer("response_code"),
  responseBody: text("response_body"),
  
  // Status
  success: boolean("success").notNull().default(false),
  retryCount: integer("retry_count").notNull().default(0),
  
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
  platformName: text("platform_name").default("PrimeTrack"),
  platformLogoUrl: text("platform_logo_url"),
  platformFaviconUrl: text("platform_favicon_url"),
  supportEmail: text("support_email"),
  
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
  
  // Billing settings (for future Stripe integration)
  stripePublicKey: text("stripe_public_key"),
  stripeSecretKey: text("stripe_secret_key"), // encrypted
  
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
