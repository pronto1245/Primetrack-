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
  status: text("status").notNull().default("active"), // active, paused, blocked
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
  geo: text("geo"),
  referer: text("referer"),
  
  // Sub-IDs for partner tracking
  sub1: text("sub1"),
  sub2: text("sub2"),
  sub3: text("sub3"),
  sub4: text("sub4"),
  sub5: text("sub5"),
  
  // Anti-fraud data
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
  
  // White-label
  brandName: text("brand_name"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  customDomain: text("custom_domain"),
  hidePlatformBranding: boolean("hide_platform_branding").default(false),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAdvertiserSettingsSchema = createInsertSchema(advertiserSettings).omit({
  id: true,
  createdAt: true,
});

export type InsertAdvertiserSettings = z.infer<typeof insertAdvertiserSettingsSchema>;
export type AdvertiserSettings = typeof advertiserSettings.$inferSelect;
