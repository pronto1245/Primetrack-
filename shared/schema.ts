import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("publisher"),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const offers = pgTable("offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advertiserId: varchar("advertiser_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  logoUrl: text("logo_url"),
  
  // Pricing
  partnerPayout: numeric("partner_payout", { precision: 10, scale: 2 }).notNull(),
  internalCost: numeric("internal_cost", { precision: 10, scale: 2 }),
  payoutModel: text("payout_model").notNull().default("CPA"),
  currency: text("currency").notNull().default("USD"),
  
  // Targeting
  geo: text("geo").array().notNull(),
  category: text("category").notNull(),
  
  // Traffic Sources (Facebook, Google, TikTok, UAC, PPC, etc.)
  trafficSources: text("traffic_sources").array().notNull().default(sql`ARRAY[]::text[]`),
  
  // App Types (PWA, WebView, iOS, Android, etc.)
  appTypes: text("app_types").array().notNull().default(sql`ARRAY[]::text[]`),
  
  // KPI, Rules, Conditions
  kpi: text("kpi"),
  rules: text("rules"),
  conditions: text("conditions"),
  
  // Creative Links (Google/Yandex disk links)
  creativeLinks: text("creative_links").array().notNull().default(sql`ARRAY[]::text[]`),
  
  status: text("status").notNull().default("active"),
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

// Offer landings - each offer can have multiple landings with different geo/prices
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

export const clicks = pgTable("clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").notNull().references(() => offers.id),
  publisherId: varchar("publisher_id").notNull().references(() => users.id),
  clickId: varchar("click_id").notNull().unique(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  geo: text("geo"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertClickSchema = createInsertSchema(clicks).omit({
  id: true,
  createdAt: true,
});

export type InsertClick = z.infer<typeof insertClickSchema>;
export type Click = typeof clicks.$inferSelect;

export const conversions = pgTable("conversions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clickId: varchar("click_id").notNull().references(() => clicks.id),
  offerId: varchar("offer_id").notNull().references(() => offers.id),
  publisherId: varchar("publisher_id").notNull().references(() => users.id),
  payout: numeric("payout", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConversionSchema = createInsertSchema(conversions).omit({
  id: true,
  createdAt: true,
});

export type InsertConversion = z.infer<typeof insertConversionSchema>;
export type Conversion = typeof conversions.$inferSelect;
