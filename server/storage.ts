import { 
  type User, type InsertUser, users,
  type Offer, type InsertOffer, offers,
  type OfferLanding, type InsertOfferLanding, offerLandings,
  type Click, type InsertClick, clicks,
  type Conversion, type InsertConversion, conversions,
  type PostbackLog, type InsertPostbackLog, postbackLogs,
  type AdvertiserSettings, type InsertAdvertiserSettings, advertiserSettings,
  type OfferAccessRequest, type InsertOfferAccessRequest, offerAccessRequests,
  type PublisherOfferAccess, type InsertPublisherOffer, publisherOffers,
  type PublisherAdvertiser, publisherAdvertisers,
  type OfferCapsStats, type InsertOfferCapsStats, offerCapsStats,
  type PaymentMethod, type InsertPaymentMethod, paymentMethods,
  type PublisherWallet, type InsertPublisherWallet, publisherWallets,
  type PayoutRequest, type InsertPayoutRequest, payoutRequests,
  type Payout, type InsertPayout, payouts,
  type PublisherBalance, type InsertPublisherBalance, publisherBalances,
  type OfferPostbackSetting, type InsertOfferPostbackSetting, offerPostbackSettings,
  type UserPostbackSetting, type InsertUserPostbackSetting, userPostbackSettings,
  type AntifraudRule, type InsertAntifraudRule, antifraudRules,
  type AntifraudLog, type InsertAntifraudLog, antifraudLogs,
  type AntifraudMetric, type InsertAntifraudMetric, antifraudMetrics,
  type PlatformSettings, type InsertPlatformSettings, platformSettings,
  type AdvertiserStaff, type InsertAdvertiserStaff, advertiserStaff,
  type Notification, type InsertNotification, notifications,
  type NewsPost, type InsertNewsPost, newsPosts,
  type NewsRead, newsReads,
  type WebhookEndpoint, type InsertWebhookEndpoint, webhookEndpoints,
  type WebhookLog, type InsertWebhookLog, webhookLogs,
  type CustomDomain, type InsertCustomDomain, customDomains,
  type AcmeAccount, acmeAccounts,
  type AcmeChallenge, acmeChallenges,
  type SubscriptionPlan, subscriptionPlans,
  type AdvertiserSubscription, type InsertAdvertiserSubscription, advertiserSubscriptions,
  type SubscriptionPayment, type InsertSubscriptionPayment, subscriptionPayments,
  type PasswordResetToken, passwordResetTokens
} from "@shared/schema";
import crypto from "crypto";
import { db } from "../db";
import { eq, and, desc, gte, lte, sql, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";
import { encrypt, decrypt, hasSecret } from "./services/encryption";

export interface AdvertiserStatsFilters {
  dateFrom?: Date;
  dateTo?: Date;
  offerIds?: string[];
  publisherIds?: string[];
  geo?: string[];
  status?: string[];
}

export interface AdvertiserStatsResult {
  totalClicks: number;
  totalLeads: number;
  totalSales: number;
  totalConversions: number;
  advertiserCost: number;
  publisherPayout: number;
  margin: number;
  roi: number;
  cr: number;
  epc: number;
  byOffer: Array<{
    offerId: string;
    offerName: string;
    clicks: number;
    leads: number;
    sales: number;
    advertiserCost: number;
    publisherPayout: number;
    margin: number;
    cr: number;
  }>;
  byPublisher: Array<{
    publisherId: string;
    publisherName: string;
    clicks: number;
    conversions: number;
    advertiserCost: number;
    publisherPayout: number;
    cr: number;
  }>;
  byDate: Array<{
    date: string;
    clicks: number;
    conversions: number;
    advertiserCost: number;
    publisherPayout: number;
  }>;
  byGeo: Array<{
    geo: string;
    clicks: number;
    conversions: number;
    advertiserCost: number;
  }>;
}

export interface PublisherStatsFilters {
  dateFrom?: Date;
  dateTo?: Date;
  offerIds?: string[];
  geo?: string[];
  status?: string[];
  advertiserId?: string;
}

export interface PublisherStatsResult {
  totalClicks: number;
  totalLeads: number;
  totalSales: number;
  totalConversions: number;
  totalPayout: number;
  holdPayout: number;
  approvedPayout: number;
  cr: number;
  epc: number;
  byOffer: Array<{
    offerId: string;
    offerName: string;
    clicks: number;
    leads: number;
    sales: number;
    payout: number;
    holdPayout: number;
    approvedPayout: number;
    cr: number;
    status: string;
  }>;
  byDate: Array<{
    date: string;
    clicks: number;
    conversions: number;
    payout: number;
  }>;
  byGeo: Array<{
    geo: string;
    clicks: number;
    conversions: number;
    payout: number;
  }>;
  byStatus: Array<{
    status: string;
    count: number;
    payout: number;
  }>;
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  getUserByReferralCode(referralCode: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserReferralCode(userId: string, referralCode: string): Promise<User | undefined>;
  updateUserProfile(userId: string, data: { email?: string; phone?: string; telegram?: string; logoUrl?: string; companyName?: string }): Promise<User | undefined>;
  updateUserPassword(userId: string, newPassword: string): Promise<User | undefined>;
  updateUser2FA(userId: string, enabled: boolean, secret?: string): Promise<User | undefined>;
  updateUserTelegramNotifications(userId: string, data: { telegramChatId?: string; telegramNotifyLeads?: boolean; telegramNotifySales?: boolean; telegramNotifyPayouts?: boolean; telegramNotifySystem?: boolean }): Promise<User | undefined>;
  generateApiToken(userId: string): Promise<string>;
  revokeApiToken(userId: string): Promise<void>;
  verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean>;
  getFirstAdmin(): Promise<User | undefined>;
  
  // Offers
  getOffer(id: string): Promise<Offer | undefined>;
  getOffersByAdvertiser(advertiserId: string, includeArchived?: boolean): Promise<Offer[]>;
  getArchivedOffersByAdvertiser(advertiserId: string): Promise<Offer[]>;
  getActiveOffers(): Promise<Offer[]>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  updateOffer(id: string, offer: Partial<InsertOffer>): Promise<Offer | undefined>;
  archiveOffer(id: string): Promise<Offer | undefined>;
  restoreOffer(id: string): Promise<Offer | undefined>;
  deleteOffer(id: string): Promise<void>;
  
  // Offer Landings
  getOfferLandings(offerId: string): Promise<OfferLanding[]>;
  createOfferLanding(landing: InsertOfferLanding): Promise<OfferLanding>;
  updateOfferLanding(id: string, data: Partial<InsertOfferLanding>): Promise<OfferLanding | undefined>;
  deleteOfferLandings(offerId: string): Promise<void>;
  deleteOfferLandingById(id: string): Promise<void>;
  
  // Clicks
  getClick(id: string): Promise<Click | undefined>;
  getClickByClickId(clickId: string): Promise<Click | undefined>;
  getClicksByOffer(offerId: string): Promise<Click[]>;
  getClicksByPublisher(publisherId: string): Promise<Click[]>;
  createClick(click: InsertClick): Promise<Click>;
  findClickByIpOfferPublisherToday(ip: string, offerId: string, publisherId: string): Promise<Click | undefined>;
  
  // Conversions
  getConversion(id: string): Promise<Conversion | undefined>;
  getConversionsByOffer(offerId: string): Promise<Conversion[]>;
  getConversionsByPublisher(publisherId: string): Promise<Conversion[]>;
  createConversion(conversion: InsertConversion): Promise<Conversion>;
  updateConversionStatus(id: string, status: string): Promise<Conversion | undefined>;
  
  // Postback Logs
  getPostbackLogsByConversion(conversionId: string): Promise<PostbackLog[]>;
  createPostbackLog(log: InsertPostbackLog): Promise<PostbackLog>;
  
  // Advertiser Settings
  getAdvertiserSettings(advertiserId: string): Promise<AdvertiserSettings | undefined>;
  createAdvertiserSettings(settings: InsertAdvertiserSettings): Promise<AdvertiserSettings>;
  updateAdvertiserSettings(advertiserId: string, settings: Partial<InsertAdvertiserSettings>): Promise<AdvertiserSettings | undefined>;
  
  // Crypto API Keys (encrypted)
  saveAdvertiserCryptoKeys(advertiserId: string, keys: {
    binanceApiKey?: string;
    binanceSecretKey?: string;
    bybitApiKey?: string;
    bybitSecretKey?: string;
    krakenApiKey?: string;
    krakenSecretKey?: string;
    coinbaseApiKey?: string;
    coinbaseSecretKey?: string;
    exmoApiKey?: string;
    exmoSecretKey?: string;
    mexcApiKey?: string;
    mexcSecretKey?: string;
    okxApiKey?: string;
    okxSecretKey?: string;
    okxPassphrase?: string;
  }): Promise<AdvertiserSettings>;
  getDecryptedCryptoKeys(advertiserId: string): Promise<{
    binanceApiKey: string | null;
    binanceSecretKey: string | null;
    bybitApiKey: string | null;
    bybitSecretKey: string | null;
    krakenApiKey: string | null;
    krakenSecretKey: string | null;
    coinbaseApiKey: string | null;
    coinbaseSecretKey: string | null;
    exmoApiKey: string | null;
    exmoSecretKey: string | null;
    mexcApiKey: string | null;
    mexcSecretKey: string | null;
    okxApiKey: string | null;
    okxSecretKey: string | null;
    okxPassphrase: string | null;
  } | null>;
  getCryptoKeysStatus(advertiserId: string): Promise<{
    hasBinance: boolean;
    hasBybit: boolean;
    hasKraken: boolean;
    hasCoinbase: boolean;
    hasExmo: boolean;
    hasMexc: boolean;
    hasOkx: boolean;
  }>;
  
  // Offer Access Requests
  getOfferAccessRequest(id: string): Promise<OfferAccessRequest | undefined>;
  getOfferAccessRequestByOfferAndPublisher(offerId: string, publisherId: string): Promise<OfferAccessRequest | undefined>;
  getAccessRequestsByAdvertiser(advertiserId: string): Promise<(OfferAccessRequest & { offer: Offer; publisher: User })[]>;
  getAccessRequestsByPublisher(publisherId: string): Promise<OfferAccessRequest[]>;
  createOfferAccessRequest(request: InsertOfferAccessRequest): Promise<OfferAccessRequest>;
  updateOfferAccessRequest(id: string, data: Partial<InsertOfferAccessRequest>): Promise<OfferAccessRequest | undefined>;
  
  // Publisher Offers (Approved Access)
  getPublisherOffer(offerId: string, publisherId: string): Promise<PublisherOfferAccess | undefined>;
  getPublisherOffersByPublisher(publisherId: string): Promise<PublisherOfferAccess[]>;
  getPublisherOffersByOffer(offerId: string): Promise<PublisherOfferAccess[]>;
  createPublisherOffer(publisherOffer: InsertPublisherOffer): Promise<PublisherOfferAccess>;
  deletePublisherOffer(offerId: string, publisherId: string): Promise<void>;
  hasPublisherAccessToOffer(offerId: string, publisherId: string): Promise<boolean>;
  
  // Publisher-Advertiser relationships
  getAdvertisersForPublisher(publisherId: string): Promise<(PublisherAdvertiser & { advertiser: User })[]>;
  getPublishersByAdvertiser(advertiserId: string): Promise<(PublisherAdvertiser & { publisher: User })[]>;
  addPublisherToAdvertiser(publisherId: string, advertiserId: string, status?: string): Promise<PublisherAdvertiser>;
  
  // Offer Caps Stats
  getOfferCapsStats(offerId: string, date: string): Promise<OfferCapsStats | undefined>;
  getOfferTotalConversions(offerId: string): Promise<number>;
  incrementOfferCapsStats(offerId: string): Promise<OfferCapsStats>;
  decrementOfferCapsStats(offerId: string, conversionDate?: Date): Promise<void>;
  checkOfferCaps(offerId: string): Promise<{ dailyCapReached: boolean; totalCapReached: boolean; offer: Offer | undefined }>;
  
  // Reports
  getClicksReport(filters: any, groupBy?: string, page?: number, limit?: number): Promise<{ clicks: Click[]; total: number; page: number; limit: number }>;
  getConversionsReport(filters: any, groupBy?: string, page?: number, limit?: number): Promise<{ conversions: any[]; total: number; page: number; limit: number }>;
  getGroupedReport(filters: any, groupBy: string, role: string): Promise<any>;
  
  // Payment Methods (Advertiser)
  getPaymentMethodsByAdvertiser(advertiserId: string): Promise<PaymentMethod[]>;
  getPaymentMethod(id: string): Promise<PaymentMethod | undefined>;
  createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: string, data: Partial<InsertPaymentMethod>): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: string): Promise<void>;
  
  // Publisher Wallets
  getPublisherWalletsByPublisher(publisherId: string, advertiserId: string): Promise<(PublisherWallet & { paymentMethod: PaymentMethod })[]>;
  getPublisherWallet(id: string): Promise<PublisherWallet | undefined>;
  createPublisherWallet(wallet: InsertPublisherWallet): Promise<PublisherWallet>;
  updatePublisherWallet(id: string, data: Partial<InsertPublisherWallet>): Promise<PublisherWallet | undefined>;
  deletePublisherWallet(id: string): Promise<void>;
  
  // Payout Requests
  getPayoutRequestsByPublisher(publisherId: string, advertiserId?: string): Promise<(PayoutRequest & { wallet: PublisherWallet; paymentMethod: PaymentMethod })[]>;
  getPayoutRequestsByAdvertiser(advertiserId: string): Promise<(PayoutRequest & { publisher: User; wallet: PublisherWallet; paymentMethod: PaymentMethod })[]>;
  getAllPayoutRequests(): Promise<(PayoutRequest & { publisherName?: string; advertiserName?: string })[]>;
  getPayoutRequest(id: string): Promise<PayoutRequest | undefined>;
  createPayoutRequest(request: InsertPayoutRequest): Promise<PayoutRequest>;
  updatePayoutRequest(id: string, data: Partial<InsertPayoutRequest>): Promise<PayoutRequest | undefined>;
  
  // Payouts
  getPayoutsByPublisher(publisherId: string, advertiserId?: string): Promise<(Payout & { paymentMethod: PaymentMethod })[]>;
  getPayoutsByAdvertiser(advertiserId: string): Promise<(Payout & { publisher: User; paymentMethod: PaymentMethod })[]>;
  createPayout(payout: InsertPayout): Promise<Payout>;
  createBulkPayouts(payouts: InsertPayout[]): Promise<Payout[]>;
  
  // Publisher Balances
  getPublisherBalance(publisherId: string, advertiserId: string): Promise<PublisherBalance | undefined>;
  getPublisherBalancesByAdvertiser(advertiserId: string): Promise<(PublisherBalance & { publisher: User })[]>;
  updatePublisherBalance(publisherId: string, advertiserId: string, data: Partial<InsertPublisherBalance>): Promise<PublisherBalance>;
  calculatePublisherBalance(publisherId: string, advertiserId: string): Promise<{ available: number; pending: number; hold: number; totalPaid: number }>;
  
  // Offer Postback Settings
  getOfferPostbackSetting(offerId: string): Promise<OfferPostbackSetting | undefined>;
  getOfferPostbackSettingsByAdvertiser(advertiserId: string): Promise<(OfferPostbackSetting & { offer: Offer })[]>;
  createOfferPostbackSetting(setting: InsertOfferPostbackSetting): Promise<OfferPostbackSetting>;
  updateOfferPostbackSetting(offerId: string, data: Partial<InsertOfferPostbackSetting>): Promise<OfferPostbackSetting | undefined>;
  deleteOfferPostbackSetting(offerId: string): Promise<void>;
  
  // Postback Logs Extended
  getPostbackLogs(filters: { advertiserId?: string; offerId?: string; publisherId?: string; status?: string; limit?: number }): Promise<PostbackLog[]>;
  updatePostbackLog(id: string, data: Partial<InsertPostbackLog>): Promise<PostbackLog | undefined>;
  
  // User Postback Settings (universal for all roles)
  getUserPostbackSettings(userId: string): Promise<UserPostbackSetting | undefined>;
  upsertUserPostbackSettings(userId: string, settings: Partial<InsertUserPostbackSetting>): Promise<UserPostbackSetting>;
  
  // Hold period processing
  processHoldConversions(): Promise<string[]>;
  
  // Platform Settings (Admin)
  getPlatformSettings(): Promise<PlatformSettings | undefined>;
  updatePlatformSettings(data: Partial<InsertPlatformSettings>): Promise<PlatformSettings>;
  
  // Advertiser Staff (Team)
  getAdvertiserStaff(advertiserId: string): Promise<AdvertiserStaff[]>;
  getAdvertiserStaffById(id: string): Promise<AdvertiserStaff | undefined>;
  getAdvertiserStaffByEmail(email: string, advertiserId: string): Promise<AdvertiserStaff | undefined>;
  createAdvertiserStaff(staff: InsertAdvertiserStaff): Promise<AdvertiserStaff>;
  updateAdvertiserStaff(id: string, data: Partial<InsertAdvertiserStaff>): Promise<AdvertiserStaff | undefined>;
  deleteAdvertiserStaff(id: string): Promise<void>;
  
  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: string, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  markNotificationRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;
  
  // News Posts
  createNewsPost(news: InsertNewsPost): Promise<NewsPost>;
  updateNewsPost(id: string, data: Partial<InsertNewsPost>): Promise<NewsPost | undefined>;
  deleteNewsPost(id: string): Promise<void>;
  getNewsPost(id: string): Promise<NewsPost | undefined>;
  getNewsFeed(userId: string, userRole: string, advertiserId?: string): Promise<NewsPost[]>;
  getPinnedNews(userId: string, userRole: string, advertiserId?: string): Promise<NewsPost[]>;
  
  // News Read Tracking
  getUnreadNewsCount(userId: string, userRole: string, advertiserId?: string): Promise<number>;
  markNewsAsRead(userId: string, newsIds: string[]): Promise<void>;
  
  // Subscription Plans
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  
  // Password Reset
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(token: string): Promise<void>;
  deleteExpiredPasswordResetTokens(): Promise<void>;
  deleteUserPasswordResetTokens(userId: string): Promise<void>;
  
  // User password update
  updateUserPassword(userId: string, newPassword: string): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async getFirstAdmin(): Promise<User | undefined> {
    const [admin] = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
    return admin;
  }

  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, referralCode));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db.insert(users).values({
      ...insertUser,
      password: hashedPassword,
    }).returning();
    return user;
  }

  async updateUserReferralCode(userId: string, referralCode: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ referralCode })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserProfile(userId: string, data: { email?: string; phone?: string; telegram?: string; logoUrl?: string; companyName?: string }): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserPassword(userId: string, newPassword: string): Promise<User | undefined> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const [user] = await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUser2FA(userId: string, enabled: boolean, secret?: string): Promise<User | undefined> {
    const updateData: any = { twoFactorEnabled: enabled };
    if (secret !== undefined) {
      updateData.twoFactorSecret = secret ? encrypt(secret) : null;
    }
    const [user] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserTelegramNotifications(userId: string, data: { telegramChatId?: string; telegramNotifyLeads?: boolean; telegramNotifySales?: boolean; telegramNotifyPayouts?: boolean; telegramNotifySystem?: boolean }): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async generateApiToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    await db.update(users)
      .set({ apiToken: token, apiTokenCreatedAt: new Date() })
      .where(eq(users.id, userId));
    return token;
  }

  async revokeApiToken(userId: string): Promise<void> {
    await db.update(users)
      .set({ apiToken: null, apiTokenCreatedAt: null })
      .where(eq(users.id, userId));
  }

  async updateUser(userId: string, data: Partial<{
    telegramChatId: string | null;
    telegramLinkCode: string | null;
    telegramLinkExpires: Date | null;
    twoFactorEnabled: boolean;
    twoFactorSecret: string | null;
  }>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserByTelegramLinkCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users)
      .where(eq(users.telegramLinkCode, code));
    return user;
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // Offers
  async getOffer(id: string): Promise<Offer | undefined> {
    const [offer] = await db.select().from(offers).where(eq(offers.id, id));
    return offer;
  }

  async getOffersByAdvertiser(advertiserId: string, includeArchived: boolean = false): Promise<Offer[]> {
    if (includeArchived) {
      return db.select().from(offers)
        .where(eq(offers.advertiserId, advertiserId))
        .orderBy(desc(offers.createdAt));
    }
    return db.select().from(offers)
      .where(and(eq(offers.advertiserId, advertiserId), eq(offers.archived, false)))
      .orderBy(desc(offers.createdAt));
  }

  async getArchivedOffersByAdvertiser(advertiserId: string): Promise<Offer[]> {
    return db.select().from(offers)
      .where(and(eq(offers.advertiserId, advertiserId), eq(offers.archived, true)))
      .orderBy(desc(offers.archivedAt));
  }

  async getActiveOffers(): Promise<Offer[]> {
    return db.select().from(offers)
      .where(and(eq(offers.status, "active"), eq(offers.archived, false)))
      .orderBy(desc(offers.createdAt));
  }

  async createOffer(insertOffer: InsertOffer): Promise<Offer> {
    const [offer] = await db.insert(offers).values(insertOffer).returning();
    return offer;
  }

  async updateOffer(id: string, data: Partial<InsertOffer>): Promise<Offer | undefined> {
    const [offer] = await db.update(offers)
      .set(data)
      .where(eq(offers.id, id))
      .returning();
    return offer;
  }

  async archiveOffer(id: string): Promise<Offer | undefined> {
    // Archive the offer - publisher access is automatically blocked 
    // because getActiveOffers and hasPublisherAccessToOffer check archived flag
    const [offer] = await db.update(offers)
      .set({ archived: true, archivedAt: new Date() })
      .where(eq(offers.id, id))
      .returning();
    
    return offer;
  }

  async restoreOffer(id: string): Promise<Offer | undefined> {
    // Restore the offer from archive
    const [offer] = await db.update(offers)
      .set({ archived: false, archivedAt: null })
      .where(eq(offers.id, id))
      .returning();
    
    return offer;
  }

  async deleteOffer(id: string): Promise<void> {
    // Delete related data first (order matters due to foreign keys)
    // First delete conversions (they reference clicks which reference offers)
    const offerClicks = await db.select({ id: clicks.id }).from(clicks).where(eq(clicks.offerId, id));
    const clickIds = offerClicks.map(c => c.id);
    if (clickIds.length > 0) {
      await db.delete(conversions).where(inArray(conversions.clickId, clickIds));
    }
    // Delete clicks
    await db.delete(clicks).where(eq(clicks.offerId, id));
    // Delete other related data
    await db.delete(offerAccessRequests).where(eq(offerAccessRequests.offerId, id));
    await db.delete(offerLandings).where(eq(offerLandings.offerId, id));
    await db.delete(publisherOffers).where(eq(publisherOffers.offerId, id));
    await db.delete(offerPostbackSettings).where(eq(offerPostbackSettings.offerId, id));
    await db.delete(offerCapsStats).where(eq(offerCapsStats.offerId, id));
    // Delete the offer
    await db.delete(offers).where(eq(offers.id, id));
  }

  // Offer Landings
  async getOfferLandings(offerId: string): Promise<OfferLanding[]> {
    return db.select().from(offerLandings).where(eq(offerLandings.offerId, offerId));
  }

  async createOfferLanding(landing: InsertOfferLanding): Promise<OfferLanding> {
    const [result] = await db.insert(offerLandings).values(landing).returning();
    return result;
  }

  async deleteOfferLandings(offerId: string): Promise<void> {
    await db.delete(offerLandings).where(eq(offerLandings.offerId, offerId));
  }

  async updateOfferLanding(id: string, data: Partial<InsertOfferLanding>): Promise<OfferLanding | undefined> {
    const [landing] = await db.update(offerLandings)
      .set(data)
      .where(eq(offerLandings.id, id))
      .returning();
    return landing;
  }

  async deleteOfferLandingById(id: string): Promise<void> {
    await db.delete(offerLandings).where(eq(offerLandings.id, id));
  }

  // Clicks
  async getClick(id: string): Promise<Click | undefined> {
    const [click] = await db.select().from(clicks).where(eq(clicks.id, id));
    return click;
  }

  async getClickByClickId(clickId: string): Promise<Click | undefined> {
    const [click] = await db.select().from(clicks).where(eq(clicks.clickId, clickId));
    return click;
  }

  async getClicksByOffer(offerId: string): Promise<Click[]> {
    return db.select().from(clicks)
      .where(eq(clicks.offerId, offerId))
      .orderBy(desc(clicks.createdAt));
  }

  async getClicksByPublisher(publisherId: string): Promise<Click[]> {
    return db.select().from(clicks)
      .where(eq(clicks.publisherId, publisherId))
      .orderBy(desc(clicks.createdAt));
  }

  async createClick(insertClick: InsertClick): Promise<Click> {
    const [click] = await db.insert(clicks).values(insertClick).returning();
    return click;
  }

  async findClickByIpOfferPublisherToday(ip: string, offerId: string, publisherId: string): Promise<Click | undefined> {
    // Check if there's ANY click from this IP for this offer+publisher (no date limit)
    const [click] = await db.select().from(clicks)
      .where(and(
        eq(clicks.ip, ip),
        eq(clicks.offerId, offerId),
        eq(clicks.publisherId, publisherId)
      ))
      .limit(1);
    
    return click;
  }

  // Conversions
  async getConversion(id: string): Promise<Conversion | undefined> {
    const [conversion] = await db.select().from(conversions).where(eq(conversions.id, id));
    return conversion;
  }

  async getConversionsByOffer(offerId: string): Promise<Conversion[]> {
    return db.select().from(conversions)
      .where(eq(conversions.offerId, offerId))
      .orderBy(desc(conversions.createdAt));
  }

  async getConversionsByPublisher(publisherId: string): Promise<Conversion[]> {
    return db.select().from(conversions)
      .where(eq(conversions.publisherId, publisherId))
      .orderBy(desc(conversions.createdAt));
  }

  async createConversion(insertConversion: InsertConversion): Promise<Conversion> {
    const [conversion] = await db.insert(conversions).values(insertConversion).returning();
    return conversion;
  }

  async updateConversionStatus(id: string, status: string): Promise<Conversion | undefined> {
    const updateData: any = { status };
    
    // Set appropriate timestamp based on status
    if (status === "approved") {
      updateData.approvedAt = new Date();
    } else if (status === "rejected") {
      updateData.rejectedAt = new Date();
    }
    
    const [conversion] = await db.update(conversions)
      .set(updateData)
      .where(eq(conversions.id, id))
      .returning();
    return conversion;
  }

  // Postback Logs
  async getPostbackLogsByConversion(conversionId: string): Promise<PostbackLog[]> {
    return db.select().from(postbackLogs)
      .where(eq(postbackLogs.conversionId, conversionId))
      .orderBy(desc(postbackLogs.createdAt));
  }

  async createPostbackLog(log: InsertPostbackLog): Promise<PostbackLog> {
    const [result] = await db.insert(postbackLogs).values(log).returning();
    return result;
  }

  // Advertiser Settings
  async getAdvertiserSettings(advertiserId: string): Promise<AdvertiserSettings | undefined> {
    const [settings] = await db.select().from(advertiserSettings)
      .where(eq(advertiserSettings.advertiserId, advertiserId));
    return settings;
  }

  async createAdvertiserSettings(settings: InsertAdvertiserSettings): Promise<AdvertiserSettings> {
    const [result] = await db.insert(advertiserSettings).values(settings).returning();
    return result;
  }

  async updateAdvertiserSettings(advertiserId: string, data: Partial<InsertAdvertiserSettings>): Promise<AdvertiserSettings | undefined> {
    // Encrypt sensitive fields if provided
    const encryptedData = { ...data };
    if (data.smtpPassword) {
      encryptedData.smtpPassword = encrypt(data.smtpPassword);
    }
    if (data.telegramBotToken) {
      encryptedData.telegramBotToken = encrypt(data.telegramBotToken);
    }
    
    const [result] = await db.update(advertiserSettings)
      .set(encryptedData)
      .where(eq(advertiserSettings.advertiserId, advertiserId))
      .returning();
    return result;
  }

  async saveAdvertiserCryptoKeys(advertiserId: string, keys: {
    binanceApiKey?: string;
    binanceSecretKey?: string;
    bybitApiKey?: string;
    bybitSecretKey?: string;
    krakenApiKey?: string;
    krakenSecretKey?: string;
    coinbaseApiKey?: string;
    coinbaseSecretKey?: string;
    exmoApiKey?: string;
    exmoSecretKey?: string;
    mexcApiKey?: string;
    mexcSecretKey?: string;
    okxApiKey?: string;
    okxSecretKey?: string;
    okxPassphrase?: string;
  }): Promise<AdvertiserSettings> {
    const encryptedData: Partial<InsertAdvertiserSettings> = {};
    
    const keyFields = [
      'binanceApiKey', 'binanceSecretKey', 'bybitApiKey', 'bybitSecretKey',
      'krakenApiKey', 'krakenSecretKey', 'coinbaseApiKey', 'coinbaseSecretKey',
      'exmoApiKey', 'exmoSecretKey', 'mexcApiKey', 'mexcSecretKey',
      'okxApiKey', 'okxSecretKey', 'okxPassphrase'
    ] as const;
    
    for (const field of keyFields) {
      if ((keys as any)[field] !== undefined) {
        (encryptedData as any)[field] = (keys as any)[field] ? encrypt((keys as any)[field]) : null;
      }
    }

    let settings = await this.getAdvertiserSettings(advertiserId);
    if (!settings) {
      settings = await this.createAdvertiserSettings({ advertiserId, ...encryptedData });
    } else {
      settings = await this.updateAdvertiserSettings(advertiserId, encryptedData) || settings;
    }
    return settings;
  }

  async getDecryptedCryptoKeys(advertiserId: string): Promise<{
    binanceApiKey: string | null;
    binanceSecretKey: string | null;
    bybitApiKey: string | null;
    bybitSecretKey: string | null;
    krakenApiKey: string | null;
    krakenSecretKey: string | null;
    coinbaseApiKey: string | null;
    coinbaseSecretKey: string | null;
    exmoApiKey: string | null;
    exmoSecretKey: string | null;
    mexcApiKey: string | null;
    mexcSecretKey: string | null;
    okxApiKey: string | null;
    okxSecretKey: string | null;
    okxPassphrase: string | null;
  } | null> {
    const settings = await this.getAdvertiserSettings(advertiserId);
    if (!settings) return null;

    return {
      binanceApiKey: settings.binanceApiKey ? decrypt(settings.binanceApiKey) : null,
      binanceSecretKey: settings.binanceSecretKey ? decrypt(settings.binanceSecretKey) : null,
      bybitApiKey: settings.bybitApiKey ? decrypt(settings.bybitApiKey) : null,
      bybitSecretKey: settings.bybitSecretKey ? decrypt(settings.bybitSecretKey) : null,
      krakenApiKey: settings.krakenApiKey ? decrypt(settings.krakenApiKey) : null,
      krakenSecretKey: settings.krakenSecretKey ? decrypt(settings.krakenSecretKey) : null,
      coinbaseApiKey: settings.coinbaseApiKey ? decrypt(settings.coinbaseApiKey) : null,
      coinbaseSecretKey: settings.coinbaseSecretKey ? decrypt(settings.coinbaseSecretKey) : null,
      exmoApiKey: settings.exmoApiKey ? decrypt(settings.exmoApiKey) : null,
      exmoSecretKey: settings.exmoSecretKey ? decrypt(settings.exmoSecretKey) : null,
      mexcApiKey: settings.mexcApiKey ? decrypt(settings.mexcApiKey) : null,
      mexcSecretKey: settings.mexcSecretKey ? decrypt(settings.mexcSecretKey) : null,
      okxApiKey: settings.okxApiKey ? decrypt(settings.okxApiKey) : null,
      okxSecretKey: settings.okxSecretKey ? decrypt(settings.okxSecretKey) : null,
      okxPassphrase: settings.okxPassphrase ? decrypt(settings.okxPassphrase) : null,
    };
  }

  async getCryptoKeysStatus(advertiserId: string): Promise<{
    hasBinance: boolean;
    hasBybit: boolean;
    hasKraken: boolean;
    hasCoinbase: boolean;
    hasExmo: boolean;
    hasMexc: boolean;
    hasOkx: boolean;
  }> {
    const settings = await this.getAdvertiserSettings(advertiserId);
    if (!settings) return { 
      hasBinance: false, hasBybit: false, hasKraken: false, 
      hasCoinbase: false, hasExmo: false, hasMexc: false, hasOkx: false 
    };

    return {
      hasBinance: hasSecret(settings.binanceApiKey) && hasSecret(settings.binanceSecretKey),
      hasBybit: hasSecret(settings.bybitApiKey) && hasSecret(settings.bybitSecretKey),
      hasKraken: hasSecret(settings.krakenApiKey) && hasSecret(settings.krakenSecretKey),
      hasCoinbase: hasSecret(settings.coinbaseApiKey) && hasSecret(settings.coinbaseSecretKey),
      hasExmo: hasSecret(settings.exmoApiKey) && hasSecret(settings.exmoSecretKey),
      hasMexc: hasSecret(settings.mexcApiKey) && hasSecret(settings.mexcSecretKey),
      hasOkx: hasSecret(settings.okxApiKey) && hasSecret(settings.okxSecretKey) && hasSecret(settings.okxPassphrase),
    };
  }

  // Offer Access Requests
  async getOfferAccessRequest(id: string): Promise<OfferAccessRequest | undefined> {
    const [request] = await db.select().from(offerAccessRequests)
      .where(eq(offerAccessRequests.id, id));
    return request;
  }

  async getOfferAccessRequestByOfferAndPublisher(offerId: string, publisherId: string): Promise<OfferAccessRequest | undefined> {
    const [request] = await db.select().from(offerAccessRequests)
      .where(and(
        eq(offerAccessRequests.offerId, offerId),
        eq(offerAccessRequests.publisherId, publisherId)
      ));
    return request;
  }

  async getAccessRequestsByAdvertiser(advertiserId: string): Promise<(OfferAccessRequest & { offer: Offer; publisher: User })[]> {
    const results = await db.select()
      .from(offerAccessRequests)
      .innerJoin(offers, eq(offerAccessRequests.offerId, offers.id))
      .innerJoin(users, eq(offerAccessRequests.publisherId, users.id))
      .where(eq(offers.advertiserId, advertiserId))
      .orderBy(desc(offerAccessRequests.createdAt));
    
    return results.map(r => ({
      ...r.offer_access_requests,
      offer: r.offers,
      publisher: r.users
    }));
  }

  async getAccessRequestsByPublisher(publisherId: string): Promise<OfferAccessRequest[]> {
    return db.select().from(offerAccessRequests)
      .where(eq(offerAccessRequests.publisherId, publisherId))
      .orderBy(desc(offerAccessRequests.createdAt));
  }

  async createOfferAccessRequest(request: InsertOfferAccessRequest): Promise<OfferAccessRequest> {
    const [result] = await db.insert(offerAccessRequests).values(request).returning();
    return result;
  }

  async updateOfferAccessRequest(id: string, data: Partial<InsertOfferAccessRequest>): Promise<OfferAccessRequest | undefined> {
    const [result] = await db.update(offerAccessRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(offerAccessRequests.id, id))
      .returning();
    return result;
  }

  // Publisher Offers (Approved Access)
  async getPublisherOffer(offerId: string, publisherId: string): Promise<PublisherOfferAccess | undefined> {
    const [result] = await db.select().from(publisherOffers)
      .where(and(
        eq(publisherOffers.offerId, offerId),
        eq(publisherOffers.publisherId, publisherId)
      ));
    return result;
  }

  async getPublisherOffersByPublisher(publisherId: string): Promise<PublisherOfferAccess[]> {
    return db.select().from(publisherOffers)
      .where(eq(publisherOffers.publisherId, publisherId));
  }

  async getPublisherOffersByOffer(offerId: string): Promise<PublisherOfferAccess[]> {
    return db.select().from(publisherOffers)
      .where(eq(publisherOffers.offerId, offerId));
  }

  async createPublisherOffer(data: InsertPublisherOffer): Promise<PublisherOfferAccess> {
    const [result] = await db.insert(publisherOffers).values(data).returning();
    return result;
  }

  async deletePublisherOffer(offerId: string, publisherId: string): Promise<void> {
    await db.delete(publisherOffers)
      .where(and(
        eq(publisherOffers.offerId, offerId),
        eq(publisherOffers.publisherId, publisherId)
      ));
  }

  async hasPublisherAccessToOffer(offerId: string, publisherId: string): Promise<boolean> {
    // First check if offer exists and is not archived
    const offer = await this.getOffer(offerId);
    if (!offer || offer.archived) {
      return false;
    }
    
    const access = await this.getPublisherOffer(offerId, publisherId);
    return !!access;
  }

  // Publisher-Advertiser relationships
  async getAdvertisersForPublisher(publisherId: string): Promise<(PublisherAdvertiser & { advertiser: User })[]> {
    // Return all relationships, not just active - UI shows status
    const relations = await db.select()
      .from(publisherAdvertisers)
      .where(eq(publisherAdvertisers.publisherId, publisherId));
    
    const result: (PublisherAdvertiser & { advertiser: User })[] = [];
    for (const rel of relations) {
      const advertiser = await this.getUser(rel.advertiserId);
      if (advertiser) {
        result.push({ ...rel, advertiser });
      }
    }
    return result;
  }
  
  async getPublishersByAdvertiser(advertiserId: string): Promise<(PublisherAdvertiser & { publisher: User })[]> {
    const relations = await db.select()
      .from(publisherAdvertisers)
      .where(and(
        eq(publisherAdvertisers.advertiserId, advertiserId),
        eq(publisherAdvertisers.status, "active")
      ));
    
    const result: (PublisherAdvertiser & { publisher: User })[] = [];
    for (const rel of relations) {
      const publisher = await this.getUser(rel.publisherId);
      if (publisher) {
        result.push({ ...rel, publisher });
      }
    }
    return result;
  }

  async addPublisherToAdvertiser(publisherId: string, advertiserId: string, status: string = "pending"): Promise<PublisherAdvertiser> {
    const existing = await db.select()
      .from(publisherAdvertisers)
      .where(and(
        eq(publisherAdvertisers.publisherId, publisherId),
        eq(publisherAdvertisers.advertiserId, advertiserId)
      ));
    
    if (existing.length > 0) {
      return existing[0];
    }
    
    const [relation] = await db.insert(publisherAdvertisers).values({
      publisherId,
      advertiserId,
      status
    }).returning();
    return relation;
  }

  // Advanced Advertiser Statistics with Filters
  async getAdvertiserStats(advertiserId: string, filters: AdvertiserStatsFilters = {}): Promise<AdvertiserStatsResult> {
    const advertiserOffers = await this.getOffersByAdvertiser(advertiserId);
    const offerIds = advertiserOffers.map(o => o.id);
    
    if (offerIds.length === 0) {
      return {
        totalClicks: 0, totalLeads: 0, totalSales: 0, totalConversions: 0,
        advertiserCost: 0, publisherPayout: 0, margin: 0, roi: 0, cr: 0, epc: 0,
        byOffer: [], byPublisher: [], byDate: [], byGeo: []
      };
    }

    // Filter offer IDs if specified
    const targetOfferIds = filters.offerIds?.length 
      ? offerIds.filter(id => filters.offerIds!.includes(id))
      : offerIds;

    // Get all clicks for these offers
    let allClicks: Click[] = [];
    for (const offerId of targetOfferIds) {
      const offerClicks = await db.select().from(clicks)
        .where(eq(clicks.offerId, offerId));
      allClicks = allClicks.concat(offerClicks);
    }

    // Apply filters
    if (filters.dateFrom) {
      allClicks = allClicks.filter(c => new Date(c.createdAt) >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      allClicks = allClicks.filter(c => new Date(c.createdAt) <= filters.dateTo!);
    }
    if (filters.publisherIds?.length) {
      allClicks = allClicks.filter(c => filters.publisherIds!.includes(c.publisherId));
    }
    if (filters.geo?.length) {
      allClicks = allClicks.filter(c => c.geo && filters.geo!.includes(c.geo));
    }

    // Get conversions
    let allConversions: Conversion[] = [];
    for (const offerId of targetOfferIds) {
      const offerConvs = await db.select().from(conversions)
        .where(eq(conversions.offerId, offerId));
      allConversions = allConversions.concat(offerConvs);
    }

    // Filter conversions by date and status
    if (filters.dateFrom) {
      allConversions = allConversions.filter(c => new Date(c.createdAt) >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      allConversions = allConversions.filter(c => new Date(c.createdAt) <= filters.dateTo!);
    }
    if (filters.status?.length) {
      allConversions = allConversions.filter(c => filters.status!.includes(c.status));
    }
    if (filters.publisherIds?.length) {
      allConversions = allConversions.filter(c => filters.publisherIds!.includes(c.publisherId));
    }

    // Calculate totals
    const totalClicks = allClicks.length;
    const totalLeads = allConversions.filter(c => c.conversionType === 'lead').length;
    const totalSales = allConversions.filter(c => c.conversionType === 'sale').length;
    const totalConversions = allConversions.length;
    const advertiserCost = allConversions.reduce((sum, c) => sum + parseFloat(c.advertiserCost), 0);
    const publisherPayout = allConversions.reduce((sum, c) => sum + parseFloat(c.publisherPayout), 0);
    const margin = advertiserCost - publisherPayout;
    const roi = publisherPayout > 0 ? ((margin / publisherPayout) * 100) : 0;
    const cr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    const epc = totalClicks > 0 ? advertiserCost / totalClicks : 0;

    // Group by offer
    const byOffer = await Promise.all(targetOfferIds.map(async (offerId) => {
      const offer = advertiserOffers.find(o => o.id === offerId)!;
      const offerClicks = allClicks.filter(c => c.offerId === offerId);
      const offerConvs = allConversions.filter(c => c.offerId === offerId);
      const offerAdvCost = offerConvs.reduce((sum, c) => sum + parseFloat(c.advertiserCost), 0);
      const offerPubPayout = offerConvs.reduce((sum, c) => sum + parseFloat(c.publisherPayout), 0);
      return {
        offerId,
        offerName: offer.name,
        clicks: offerClicks.length,
        leads: offerConvs.filter(c => c.conversionType === 'lead').length,
        sales: offerConvs.filter(c => c.conversionType === 'sale').length,
        advertiserCost: offerAdvCost,
        publisherPayout: offerPubPayout,
        margin: offerAdvCost - offerPubPayout,
        cr: offerClicks.length > 0 ? (offerConvs.length / offerClicks.length) * 100 : 0
      };
    }));

    // Group by publisher
    const publisherMap = new Map<string, { clicks: number; conversions: number; advertiserCost: number; publisherPayout: number }>();
    allClicks.forEach(c => {
      const existing = publisherMap.get(c.publisherId) || { clicks: 0, conversions: 0, advertiserCost: 0, publisherPayout: 0 };
      existing.clicks++;
      publisherMap.set(c.publisherId, existing);
    });
    allConversions.forEach(c => {
      const existing = publisherMap.get(c.publisherId) || { clicks: 0, conversions: 0, advertiserCost: 0, publisherPayout: 0 };
      existing.conversions++;
      existing.advertiserCost += parseFloat(c.advertiserCost);
      existing.publisherPayout += parseFloat(c.publisherPayout);
      publisherMap.set(c.publisherId, existing);
    });

    const byPublisher = await Promise.all(
      Array.from(publisherMap.entries()).map(async ([publisherId, stats]) => {
        const publisher = await this.getUser(publisherId);
        return {
          publisherId,
          publisherName: publisher?.username || 'Unknown',
          clicks: stats.clicks,
          conversions: stats.conversions,
          advertiserCost: stats.advertiserCost,
          publisherPayout: stats.publisherPayout,
          cr: stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0
        };
      })
    );

    // Group by date
    const dateMap = new Map<string, { clicks: number; conversions: number; advertiserCost: number; publisherPayout: number }>();
    allClicks.forEach(c => {
      const date = new Date(c.createdAt).toISOString().split('T')[0];
      const existing = dateMap.get(date) || { clicks: 0, conversions: 0, advertiserCost: 0, publisherPayout: 0 };
      existing.clicks++;
      dateMap.set(date, existing);
    });
    allConversions.forEach(c => {
      const date = new Date(c.createdAt).toISOString().split('T')[0];
      const existing = dateMap.get(date) || { clicks: 0, conversions: 0, advertiserCost: 0, publisherPayout: 0 };
      existing.conversions++;
      existing.advertiserCost += parseFloat(c.advertiserCost);
      existing.publisherPayout += parseFloat(c.publisherPayout);
      dateMap.set(date, existing);
    });

    const byDate = Array.from(dateMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Group by GEO
    const geoMap = new Map<string, { clicks: number; conversions: number; advertiserCost: number }>();
    allClicks.forEach(c => {
      const geo = c.geo || 'Unknown';
      const existing = geoMap.get(geo) || { clicks: 0, conversions: 0, advertiserCost: 0 };
      existing.clicks++;
      geoMap.set(geo, existing);
    });

    const byGeo = Array.from(geoMap.entries())
      .map(([geo, stats]) => ({ geo, ...stats }))
      .sort((a, b) => b.clicks - a.clicks);

    return {
      totalClicks, totalLeads, totalSales, totalConversions,
      advertiserCost, publisherPayout, margin, roi, cr, epc,
      byOffer, byPublisher, byDate, byGeo
    };
  }

  // Get all publishers for advertiser (those who have clicks/conversions on their offers)
  async getPublishersForAdvertiser(advertiserId: string): Promise<User[]> {
    const advertiserOffers = await this.getOffersByAdvertiser(advertiserId);
    const publisherIds = new Set<string>();
    
    for (const offer of advertiserOffers) {
      const offerClicks = await this.getClicksByOffer(offer.id);
      offerClicks.forEach(c => publisherIds.add(c.publisherId));
    }
    
    const publishers: User[] = [];
    for (const id of Array.from(publisherIds)) {
      const user = await this.getUser(id);
      if (user) publishers.push(user);
    }
    return publishers;
  }

  // Get conversions for advertiser with filters
  async getConversionsForAdvertiser(advertiserId: string, filters: AdvertiserStatsFilters = {}): Promise<(Conversion & { click: Click; offer: Offer; publisher: User })[]> {
    const advertiserOffers = await this.getOffersByAdvertiser(advertiserId);
    const offerIds = filters.offerIds?.length 
      ? advertiserOffers.filter(o => filters.offerIds!.includes(o.id)).map(o => o.id)
      : advertiserOffers.map(o => o.id);

    let result: (Conversion & { click: Click; offer: Offer; publisher: User })[] = [];
    
    for (const offerId of offerIds) {
      let offerConvs = await db.select().from(conversions)
        .where(eq(conversions.offerId, offerId))
        .orderBy(desc(conversions.createdAt));
      
      // Apply filters
      if (filters.dateFrom) {
        offerConvs = offerConvs.filter(c => new Date(c.createdAt) >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        offerConvs = offerConvs.filter(c => new Date(c.createdAt) <= filters.dateTo!);
      }
      if (filters.status?.length) {
        offerConvs = offerConvs.filter(c => filters.status!.includes(c.status));
      }
      if (filters.publisherIds?.length) {
        offerConvs = offerConvs.filter(c => filters.publisherIds!.includes(c.publisherId));
      }

      for (const conv of offerConvs) {
        const click = await this.getClick(conv.clickId);
        const offer = advertiserOffers.find(o => o.id === conv.offerId);
        const publisher = await this.getUser(conv.publisherId);
        
        if (click && offer && publisher) {
          // GEO filter from click
          if (filters.geo?.length && click.geo && !filters.geo.includes(click.geo)) {
            continue;
          }
          result.push({ ...conv, click, offer, publisher });
        }
      }
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Get clicks for advertiser with filters
  async getClicksForAdvertiser(advertiserId: string, filters: AdvertiserStatsFilters = {}): Promise<(Click & { offer: Offer; publisher: User })[]> {
    const advertiserOffers = await this.getOffersByAdvertiser(advertiserId);
    const offerIds = filters.offerIds?.length 
      ? advertiserOffers.filter(o => filters.offerIds!.includes(o.id)).map(o => o.id)
      : advertiserOffers.map(o => o.id);

    let result: (Click & { offer: Offer; publisher: User })[] = [];
    
    for (const offerId of offerIds) {
      let offerClicks = await db.select().from(clicks)
        .where(eq(clicks.offerId, offerId))
        .orderBy(desc(clicks.createdAt));
      
      // Apply filters
      if (filters.dateFrom) {
        offerClicks = offerClicks.filter(c => new Date(c.createdAt) >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        offerClicks = offerClicks.filter(c => new Date(c.createdAt) <= filters.dateTo!);
      }
      if (filters.publisherIds?.length) {
        offerClicks = offerClicks.filter(c => filters.publisherIds!.includes(c.publisherId));
      }
      if (filters.geo?.length) {
        offerClicks = offerClicks.filter(c => c.geo && filters.geo!.includes(c.geo));
      }

      for (const click of offerClicks) {
        const offer = advertiserOffers.find(o => o.id === click.offerId);
        const publisher = await this.getUser(click.publisherId);
        
        if (offer && publisher) {
          result.push({ ...click, offer, publisher });
        }
      }
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Publisher Statistics (NO advertiser_cost, NO antifraud data)
  async getPublisherStats(publisherId: string, filters: PublisherStatsFilters = {}): Promise<PublisherStatsResult> {
    // Get all clicks for this publisher
    let allClicks = await db.select().from(clicks)
      .where(eq(clicks.publisherId, publisherId));

    // Filter by advertiser if specified
    if (filters.advertiserId) {
      const advertiserOffers = await this.getOffersByAdvertiser(filters.advertiserId);
      const advertiserOfferIds = advertiserOffers.map(o => o.id);
      allClicks = allClicks.filter(c => advertiserOfferIds.includes(c.offerId));
    }

    // Filter by offers if specified
    if (filters.offerIds?.length) {
      allClicks = allClicks.filter(c => filters.offerIds!.includes(c.offerId));
    }
    if (filters.dateFrom) {
      allClicks = allClicks.filter(c => new Date(c.createdAt) >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      allClicks = allClicks.filter(c => new Date(c.createdAt) <= filters.dateTo!);
    }
    if (filters.geo?.length) {
      allClicks = allClicks.filter(c => c.geo && filters.geo!.includes(c.geo));
    }

    // Get conversions for this publisher
    let allConversions = await db.select().from(conversions)
      .where(eq(conversions.publisherId, publisherId));

    // Filter by advertiser if specified
    if (filters.advertiserId) {
      const advertiserOffers = await this.getOffersByAdvertiser(filters.advertiserId);
      const advertiserOfferIds = advertiserOffers.map(o => o.id);
      allConversions = allConversions.filter(c => advertiserOfferIds.includes(c.offerId));
    }

    if (filters.offerIds?.length) {
      allConversions = allConversions.filter(c => filters.offerIds!.includes(c.offerId));
    }
    if (filters.dateFrom) {
      allConversions = allConversions.filter(c => new Date(c.createdAt) >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      allConversions = allConversions.filter(c => new Date(c.createdAt) <= filters.dateTo!);
    }
    if (filters.status?.length) {
      allConversions = allConversions.filter(c => filters.status!.includes(c.status));
    }

    // Calculate totals
    const totalClicks = allClicks.length;
    const totalLeads = allConversions.filter(c => c.conversionType === 'lead').length;
    const totalSales = allConversions.filter(c => c.conversionType === 'sale').length;
    const totalConversions = allConversions.length;
    const totalPayout = allConversions.reduce((sum, c) => sum + parseFloat(c.publisherPayout), 0);
    const holdPayout = allConversions.filter(c => c.status === 'hold' || c.status === 'pending')
      .reduce((sum, c) => sum + parseFloat(c.publisherPayout), 0);
    const approvedPayout = allConversions.filter(c => c.status === 'approved')
      .reduce((sum, c) => sum + parseFloat(c.publisherPayout), 0);
    const cr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    const epc = totalClicks > 0 ? totalPayout / totalClicks : 0;

    // Group by offer
    const offerIds = Array.from(new Set(allClicks.map(c => c.offerId)));
    const byOffer = await Promise.all(offerIds.map(async (offerId) => {
      const offer = await this.getOffer(offerId);
      const offerClicks = allClicks.filter(c => c.offerId === offerId);
      const offerConvs = allConversions.filter(c => c.offerId === offerId);
      const offerPayout = offerConvs.reduce((sum, c) => sum + parseFloat(c.publisherPayout), 0);
      const offerHoldPayout = offerConvs.filter(c => c.status === 'hold' || c.status === 'pending')
        .reduce((sum, c) => sum + parseFloat(c.publisherPayout), 0);
      const offerApprovedPayout = offerConvs.filter(c => c.status === 'approved')
        .reduce((sum, c) => sum + parseFloat(c.publisherPayout), 0);
      return {
        offerId,
        offerName: offer?.name || 'Unknown',
        clicks: offerClicks.length,
        leads: offerConvs.filter(c => c.conversionType === 'lead').length,
        sales: offerConvs.filter(c => c.conversionType === 'sale').length,
        payout: offerPayout,
        holdPayout: offerHoldPayout,
        approvedPayout: offerApprovedPayout,
        cr: offerClicks.length > 0 ? (offerConvs.length / offerClicks.length) * 100 : 0,
        status: offer?.status || 'unknown'
      };
    }));

    // Group by date
    const dateMap = new Map<string, { clicks: number; conversions: number; payout: number }>();
    allClicks.forEach(c => {
      const date = new Date(c.createdAt).toISOString().split('T')[0];
      const existing = dateMap.get(date) || { clicks: 0, conversions: 0, payout: 0 };
      existing.clicks++;
      dateMap.set(date, existing);
    });
    allConversions.forEach(c => {
      const date = new Date(c.createdAt).toISOString().split('T')[0];
      const existing = dateMap.get(date) || { clicks: 0, conversions: 0, payout: 0 };
      existing.conversions++;
      existing.payout += parseFloat(c.publisherPayout);
      dateMap.set(date, existing);
    });
    const byDate = Array.from(dateMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Group by GEO
    const geoMap = new Map<string, { clicks: number; conversions: number; payout: number }>();
    allClicks.forEach(c => {
      const geo = c.geo || 'Unknown';
      const existing = geoMap.get(geo) || { clicks: 0, conversions: 0, payout: 0 };
      existing.clicks++;
      geoMap.set(geo, existing);
    });
    allConversions.forEach(c => {
      const click = allClicks.find(cl => cl.id === c.clickId);
      const geo = click?.geo || 'Unknown';
      const existing = geoMap.get(geo) || { clicks: 0, conversions: 0, payout: 0 };
      existing.conversions++;
      existing.payout += parseFloat(c.publisherPayout);
      geoMap.set(geo, existing);
    });
    const byGeo = Array.from(geoMap.entries())
      .map(([geo, stats]) => ({ geo, ...stats }))
      .sort((a, b) => b.clicks - a.clicks);

    // Group by status
    const statusMap = new Map<string, { count: number; payout: number }>();
    allConversions.forEach(c => {
      const existing = statusMap.get(c.status) || { count: 0, payout: 0 };
      existing.count++;
      existing.payout += parseFloat(c.publisherPayout);
      statusMap.set(c.status, existing);
    });
    const byStatus = Array.from(statusMap.entries())
      .map(([status, stats]) => ({ status, ...stats }));

    return {
      totalClicks, totalLeads, totalSales, totalConversions,
      totalPayout, holdPayout, approvedPayout, cr, epc,
      byOffer, byDate, byGeo, byStatus
    };
  }

  // Get conversions for publisher (NO advertiser_cost, NO antifraud)
  async getConversionsForPublisher(publisherId: string, filters: PublisherStatsFilters = {}): Promise<Array<{
    id: string;
    clickId: string;
    offerId: string;
    offerName: string;
    conversionType: string;
    payout: number;
    status: string;
    createdAt: Date;
    geo: string | null;
    sub1: string | null;
    sub2: string | null;
    sub3: string | null;
  }>> {
    let allConversions = await db.select().from(conversions)
      .where(eq(conversions.publisherId, publisherId))
      .orderBy(desc(conversions.createdAt));

    if (filters.offerIds?.length) {
      allConversions = allConversions.filter(c => filters.offerIds!.includes(c.offerId));
    }
    if (filters.dateFrom) {
      allConversions = allConversions.filter(c => new Date(c.createdAt) >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      allConversions = allConversions.filter(c => new Date(c.createdAt) <= filters.dateTo!);
    }
    if (filters.status?.length) {
      allConversions = allConversions.filter(c => filters.status!.includes(c.status));
    }

    const result = await Promise.all(allConversions.map(async (conv) => {
      const offer = await this.getOffer(conv.offerId);
      const click = await this.getClick(conv.clickId);
      return {
        id: conv.id,
        clickId: conv.clickId,
        offerId: conv.offerId,
        offerName: offer?.name || 'Unknown',
        conversionType: conv.conversionType,
        payout: parseFloat(conv.publisherPayout),
        status: conv.status,
        createdAt: conv.createdAt,
        geo: click?.geo || null,
        sub1: click?.sub1 || null,
        sub2: click?.sub2 || null,
        sub3: click?.sub3 || null,
      };
    }));

    return result;
  }

  // Get clicks for publisher (NO antifraud data)
  async getClicksForPublisher(publisherId: string, filters: PublisherStatsFilters = {}): Promise<Array<{
    id: string;
    clickId: string;
    offerId: string;
    offerName: string;
    geo: string | null;
    sub1: string | null;
    sub2: string | null;
    sub3: string | null;
    createdAt: Date;
  }>> {
    let allClicks = await db.select().from(clicks)
      .where(eq(clicks.publisherId, publisherId))
      .orderBy(desc(clicks.createdAt));

    if (filters.offerIds?.length) {
      allClicks = allClicks.filter(c => filters.offerIds!.includes(c.offerId));
    }
    if (filters.dateFrom) {
      allClicks = allClicks.filter(c => new Date(c.createdAt) >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      allClicks = allClicks.filter(c => new Date(c.createdAt) <= filters.dateTo!);
    }
    if (filters.geo?.length) {
      allClicks = allClicks.filter(c => c.geo && filters.geo!.includes(c.geo));
    }

    const result = await Promise.all(allClicks.map(async (click) => {
      const offer = await this.getOffer(click.offerId);
      return {
        id: click.id,
        clickId: click.clickId,
        offerId: click.offerId,
        offerName: offer?.name || 'Unknown',
        geo: click.geo,
        sub1: click.sub1,
        sub2: click.sub2,
        sub3: click.sub3,
        createdAt: click.createdAt,
      };
    }));

    return result;
  }

  // Get offers for publisher (ones they have access to)
  async getOffersForPublisher(publisherId: string, advertiserId?: string): Promise<Array<{ id: string; name: string }>> {
    const publisherOfferAccess = await this.getPublisherOffersByPublisher(publisherId);
    const result: Array<{ id: string; name: string }> = [];
    for (const po of publisherOfferAccess) {
      const offer = await this.getOffer(po.offerId);
      if (offer) {
        if (advertiserId && offer.advertiserId !== advertiserId) {
          continue;
        }
        result.push({ id: offer.id, name: offer.name });
      }
    }
    return result;
  }

  // Offer Caps Stats
  async getOfferCapsStats(offerId: string, date: string): Promise<OfferCapsStats | undefined> {
    const [stats] = await db.select().from(offerCapsStats)
      .where(and(
        eq(offerCapsStats.offerId, offerId),
        eq(offerCapsStats.date, date)
      ));
    return stats;
  }

  async getOfferTotalConversions(offerId: string): Promise<number> {
    const allStats = await db.select().from(offerCapsStats)
      .where(eq(offerCapsStats.offerId, offerId));
    return allStats.reduce((sum, s) => sum + s.dailyConversions, 0);
  }

  async incrementOfferCapsStats(offerId: string): Promise<OfferCapsStats> {
    const today = new Date().toISOString().split('T')[0];
    
    // Atomic UPSERT - only track daily_conversions, total is computed via SUM
    const result = await db.execute(sql`
      INSERT INTO offer_caps_stats (id, offer_id, date, daily_conversions, total_conversions)
      VALUES (gen_random_uuid(), ${offerId}, ${today}, 1, 0)
      ON CONFLICT (offer_id, date) 
      DO UPDATE SET daily_conversions = offer_caps_stats.daily_conversions + 1
      RETURNING *
    `);
    
    const rows = result.rows as OfferCapsStats[];
    return rows[0];
  }

  async decrementOfferCapsStats(offerId: string, conversionDate?: Date): Promise<void> {
    // Target the correct date (conversion date or today as fallback)
    const targetDate = conversionDate 
      ? conversionDate.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    
    // Atomic decrement for the specific date
    await db.execute(sql`
      UPDATE offer_caps_stats 
      SET daily_conversions = GREATEST(daily_conversions - 1, 0),
          total_conversions = GREATEST(total_conversions - 1, 0)
      WHERE offer_id = ${offerId} AND date = ${targetDate}
    `);
  }

  async checkOfferCaps(offerId: string): Promise<{ dailyCapReached: boolean; totalCapReached: boolean; offer: Offer | undefined }> {
    const offer = await this.getOffer(offerId);
    if (!offer) {
      return { dailyCapReached: false, totalCapReached: false, offer: undefined };
    }

    const today = new Date().toISOString().split('T')[0];
    const todayStats = await this.getOfferCapsStats(offerId, today);
    
    // Calculate total via SQL SUM for accuracy
    const totalResult = await db.execute(sql`
      SELECT COALESCE(SUM(daily_conversions), 0) as total 
      FROM offer_caps_stats 
      WHERE offer_id = ${offerId}
    `);
    const totalConversions = parseInt((totalResult.rows[0] as any)?.total || '0', 10);

    const dailyConversions = todayStats?.dailyConversions || 0;
    
    const dailyCapReached = offer.dailyCap !== null && dailyConversions >= offer.dailyCap;
    const totalCapReached = offer.totalCap !== null && totalConversions >= offer.totalCap;

    return { dailyCapReached, totalCapReached, offer };
  }

  // ============================================
  // ADVERTISER PARTNER MANAGEMENT
  // ============================================
  
  async getPublisherAdvertiserRelations(advertiserId: string, statusFilter?: string): Promise<(PublisherAdvertiser & { publisher: User })[]> {
    let query = db.select().from(publisherAdvertisers)
      .where(eq(publisherAdvertisers.advertiserId, advertiserId));
    
    const relations = await query.orderBy(desc(publisherAdvertisers.createdAt));
    
    const result: (PublisherAdvertiser & { publisher: User })[] = [];
    for (const rel of relations) {
      if (statusFilter && rel.status !== statusFilter) continue;
      const publisher = await this.getUser(rel.publisherId);
      if (publisher) {
        result.push({ ...rel, publisher });
      }
    }
    return result;
  }

  async getPublisherAdvertiserRelation(publisherId: string, advertiserId: string): Promise<PublisherAdvertiser | undefined> {
    const [relation] = await db.select().from(publisherAdvertisers)
      .where(and(
        eq(publisherAdvertisers.publisherId, publisherId),
        eq(publisherAdvertisers.advertiserId, advertiserId)
      ));
    return relation;
  }

  async updatePublisherAdvertiserStatus(relationId: string, status: string): Promise<PublisherAdvertiser | undefined> {
    const [updated] = await db.update(publisherAdvertisers)
      .set({ status })
      .where(eq(publisherAdvertisers.id, relationId))
      .returning();
    return updated;
  }

  async createPublisherAdvertiserRelation(publisherId: string, advertiserId: string, status: string = "pending"): Promise<PublisherAdvertiser> {
    const [relation] = await db.insert(publisherAdvertisers)
      .values({ publisherId, advertiserId, status })
      .returning();
    return relation;
  }

  async getAdvertiserReferralCode(advertiserId: string): Promise<string | null> {
    const user = await this.getUser(advertiserId);
    return user?.referralCode || null;
  }

  async setAdvertiserReferralCode(advertiserId: string, referralCode: string): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ referralCode })
      .where(eq(users.id, advertiserId))
      .returning();
    return updated;
  }

  async getPublisherStatsForAdvertiser(publisherId: string, advertiserId: string): Promise<{ clicks: number; conversions: number; payout: number }> {
    const advertiserOffers = await this.getOffersByAdvertiser(advertiserId);
    const offerIds = advertiserOffers.map(o => o.id);
    
    let totalClicks = 0;
    let totalConversions = 0;
    let totalPayout = 0;
    
    for (const offerId of offerIds) {
      const offerClicks = await db.select().from(clicks)
        .where(and(eq(clicks.offerId, offerId), eq(clicks.publisherId, publisherId)));
      totalClicks += offerClicks.length;
      
      const offerConvs = await db.select().from(conversions)
        .where(and(eq(conversions.offerId, offerId), eq(conversions.publisherId, publisherId)));
      totalConversions += offerConvs.length;
      totalPayout += offerConvs.reduce((sum, c) => sum + parseFloat(c.publisherPayout), 0);
    }
    
    return { clicks: totalClicks, conversions: totalConversions, payout: totalPayout };
  }

  async getPublisherOfferAccess(publisherId: string, offerId: string): Promise<PublisherOfferAccess | undefined> {
    const [access] = await db.select().from(publisherOffers)
      .where(and(eq(publisherOffers.publisherId, publisherId), eq(publisherOffers.offerId, offerId)));
    return access;
  }

  async getPublisherOfferStats(publisherId: string, offerId: string): Promise<{ clicks: number; conversions: number; revenue: number }> {
    const offerClicks = await db.select().from(clicks)
      .where(and(eq(clicks.offerId, offerId), eq(clicks.publisherId, publisherId)));
    
    const offerConvs = await db.select().from(conversions)
      .where(and(eq(conversions.offerId, offerId), eq(conversions.publisherId, publisherId)));
    
    const revenue = offerConvs.reduce((sum, c) => sum + parseFloat(c.advertiserCost || "0"), 0);
    
    return { 
      clicks: offerClicks.length, 
      conversions: offerConvs.length, 
      revenue 
    };
  }

  async updatePublisherOfferAccess(publisherId: string, offerId: string, status: string): Promise<PublisherOfferAccess | null> {
    if (status === "approved") {
      // Check if already exists
      const existing = await this.getPublisherOfferAccess(publisherId, offerId);
      if (existing) {
        return existing;
      }
      // Create new access
      const [created] = await db.insert(publisherOffers).values({
        publisherId,
        offerId
      }).returning();
      return created;
    } else if (status === "revoked" || status === "rejected") {
      // Remove access
      await db.delete(publisherOffers)
        .where(and(eq(publisherOffers.publisherId, publisherId), eq(publisherOffers.offerId, offerId)));
      return null;
    }
    return null;
  }

  // ============================================
  // ADMIN USER MANAGEMENT
  // ============================================

  async getAllUsers(filters?: { role?: string; status?: string; search?: string }): Promise<User[]> {
    let query = db.select().from(users);
    
    const conditions: any[] = [];
    
    if (filters?.role) {
      conditions.push(eq(users.role, filters.role));
    }
    if (filters?.status) {
      conditions.push(eq(users.status, filters.status));
    }
    
    let result: User[];
    if (conditions.length > 0) {
      result = await query.where(and(...conditions)).orderBy(desc(users.createdAt));
    } else {
      result = await query.orderBy(desc(users.createdAt));
    }
    
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(u => 
        u.username.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search)
      );
    }
    
    return result;
  }

  async updateUserStatus(userId: string, status: string): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ status })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async getAllPublishersWithAdvertiser(): Promise<(User & { advertiserId?: string; advertiserName?: string })[]> {
    const publishers = await db.select().from(users).where(eq(users.role, "publisher"));
    
    const result: (User & { advertiserId?: string; advertiserName?: string })[] = [];
    for (const pub of publishers) {
      const relations = await db.select().from(publisherAdvertisers)
        .where(eq(publisherAdvertisers.publisherId, pub.id));
      
      if (relations.length > 0) {
        const advertiser = await this.getUser(relations[0].advertiserId);
        result.push({
          ...pub,
          advertiserId: relations[0].advertiserId,
          advertiserName: advertiser?.username
        });
      } else {
        result.push(pub);
      }
    }
    
    return result;
  }

  async getAdminStats(): Promise<{
    totalAdvertisers: number;
    pendingAdvertisers: number;
    totalPublishers: number;
    totalOffers: number;
    totalClicks: number;
    totalConversions: number;
  }> {
    const allUsers = await db.select().from(users);
    const advertisers = allUsers.filter(u => u.role === "advertiser");
    const publishers = allUsers.filter(u => u.role === "publisher");
    
    const allOffers = await db.select().from(offers);
    const allClicks = await db.select().from(clicks);
    const allConversions = await db.select().from(conversions);
    
    return {
      totalAdvertisers: advertisers.length,
      pendingAdvertisers: advertisers.filter(a => a.status === "pending").length,
      totalPublishers: publishers.length,
      totalOffers: allOffers.length,
      totalClicks: allClicks.length,
      totalConversions: allConversions.length
    };
  }

  // ============================================
  // REPORTS - Centralized statistics (primary source of truth)
  // ============================================
  
  async getClicksReport(filters: any, groupBy?: string, page: number = 1, limit: number = 50): Promise<{ clicks: any[]; total: number; page: number; limit: number }> {
    const conditions: any[] = [];
    
    if (filters.publisherId) conditions.push(eq(clicks.publisherId, filters.publisherId));
    if (filters.offerId) conditions.push(eq(clicks.offerId, filters.offerId));
    if (filters.offerIds?.length) conditions.push(inArray(clicks.offerId, filters.offerIds));
    if (filters.dateFrom) conditions.push(gte(clicks.createdAt, filters.dateFrom));
    if (filters.dateTo) conditions.push(lte(clicks.createdAt, filters.dateTo));
    if (filters.geo) conditions.push(eq(clicks.geo, filters.geo));
    if (filters.device) conditions.push(eq(clicks.device, filters.device));
    if (filters.os) conditions.push(eq(clicks.os, filters.os));
    if (filters.browser) conditions.push(eq(clicks.browser, filters.browser));
    if (filters.isUnique !== undefined) conditions.push(eq(clicks.isUnique, filters.isUnique));
    if (filters.isGeoMatch !== undefined) conditions.push(eq(clicks.isGeoMatch, filters.isGeoMatch));
    if (filters.isBot !== undefined) conditions.push(eq(clicks.isBot, filters.isBot));
    if (filters.sub1) conditions.push(eq(clicks.sub1, filters.sub1));
    if (filters.sub2) conditions.push(eq(clicks.sub2, filters.sub2));
    if (filters.sub3) conditions.push(eq(clicks.sub3, filters.sub3));
    if (filters.sub4) conditions.push(eq(clicks.sub4, filters.sub4));
    if (filters.sub5) conditions.push(eq(clicks.sub5, filters.sub5));
    
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
    
    const allClicksRaw = whereCondition 
      ? await db.select().from(clicks).where(whereCondition).orderBy(desc(clicks.createdAt))
      : await db.select().from(clicks).orderBy(desc(clicks.createdAt));
    
    const total = allClicksRaw.length;
    const offset = (page - 1) * limit;
    const paginatedClicks = allClicksRaw.slice(offset, offset + limit);
    
    // Enrich with publisher names
    const publisherIds = Array.from(new Set(paginatedClicks.map(c => c.publisherId)));
    const publishersData = publisherIds.length > 0 
      ? await db.select({ id: users.id, username: users.username }).from(users).where(inArray(users.id, publisherIds))
      : [];
    const publisherMap = new Map(publishersData.map(p => [p.id, p.username]));
    
    const enrichedClicks = paginatedClicks.map(click => ({
      ...click,
      publisherName: publisherMap.get(click.publisherId) || click.publisherId
    }));
    
    return { clicks: enrichedClicks, total, page, limit };
  }

  async getConversionsReport(filters: any, groupBy?: string, page: number = 1, limit: number = 50): Promise<{ conversions: any[]; total: number; page: number; limit: number }> {
    const conditions: any[] = [];
    
    if (filters.publisherId) conditions.push(eq(conversions.publisherId, filters.publisherId));
    if (filters.offerId) conditions.push(eq(conversions.offerId, filters.offerId));
    if (filters.offerIds?.length) conditions.push(inArray(conversions.offerId, filters.offerIds));
    if (filters.dateFrom) conditions.push(gte(conversions.createdAt, filters.dateFrom));
    if (filters.dateTo) conditions.push(lte(conversions.createdAt, filters.dateTo));
    if (filters.status) conditions.push(eq(conversions.status, filters.status));
    if (filters.conversionType) conditions.push(eq(conversions.conversionType, filters.conversionType));
    
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
    
    const allConversions = whereCondition 
      ? await db.select({
          id: conversions.id,
          clickId: conversions.clickId,
          offerId: conversions.offerId,
          publisherId: conversions.publisherId,
          conversionType: conversions.conversionType,
          advertiserCost: conversions.advertiserCost,
          publisherPayout: conversions.publisherPayout,
          transactionSum: conversions.transactionSum,
          currency: conversions.currency,
          status: conversions.status,
          holdUntil: conversions.holdUntil,
          externalId: conversions.externalId,
          createdAt: conversions.createdAt,
          sub1: clicks.sub1,
          sub2: clicks.sub2,
          sub3: clicks.sub3,
          sub4: clicks.sub4,
          sub5: clicks.sub5,
          geo: clicks.geo,
        }).from(conversions).leftJoin(clicks, eq(conversions.clickId, clicks.id)).where(whereCondition).orderBy(desc(conversions.createdAt))
      : await db.select({
          id: conversions.id,
          clickId: conversions.clickId,
          offerId: conversions.offerId,
          publisherId: conversions.publisherId,
          conversionType: conversions.conversionType,
          advertiserCost: conversions.advertiserCost,
          publisherPayout: conversions.publisherPayout,
          transactionSum: conversions.transactionSum,
          currency: conversions.currency,
          status: conversions.status,
          holdUntil: conversions.holdUntil,
          externalId: conversions.externalId,
          createdAt: conversions.createdAt,
          sub1: clicks.sub1,
          sub2: clicks.sub2,
          sub3: clicks.sub3,
          sub4: clicks.sub4,
          sub5: clicks.sub5,
          geo: clicks.geo,
        }).from(conversions).leftJoin(clicks, eq(conversions.clickId, clicks.id)).orderBy(desc(conversions.createdAt));
    
    const total = allConversions.length;
    const offset = (page - 1) * limit;
    const paginatedConversions = allConversions.slice(offset, offset + limit);
    
    // Enrich with publisher names
    const publisherIds = Array.from(new Set(paginatedConversions.map(c => c.publisherId)));
    const publishersData = publisherIds.length > 0 
      ? await db.select({ id: users.id, username: users.username }).from(users).where(inArray(users.id, publisherIds))
      : [];
    const publisherMap = new Map(publishersData.map(p => [p.id, p.username]));
    
    const enrichedConversions = paginatedConversions.map(conv => ({
      ...conv,
      publisherName: publisherMap.get(conv.publisherId) || conv.publisherId
    }));
    
    return { conversions: enrichedConversions, total, page, limit };
  }

  async getGroupedReport(filters: any, groupBy: string, role: string): Promise<any> {
    // Get all clicks and conversions matching filters
    const clickConditions: any[] = [];
    const convConditions: any[] = [];
    
    if (filters.publisherId) {
      clickConditions.push(eq(clicks.publisherId, filters.publisherId));
      convConditions.push(eq(conversions.publisherId, filters.publisherId));
    }
    if (filters.offerId) {
      clickConditions.push(eq(clicks.offerId, filters.offerId));
      convConditions.push(eq(conversions.offerId, filters.offerId));
    }
    if (filters.offerIds?.length) {
      clickConditions.push(inArray(clicks.offerId, filters.offerIds));
      convConditions.push(inArray(conversions.offerId, filters.offerIds));
    }
    if (filters.dateFrom) {
      clickConditions.push(gte(clicks.createdAt, filters.dateFrom));
      convConditions.push(gte(conversions.createdAt, filters.dateFrom));
    }
    if (filters.dateTo) {
      clickConditions.push(lte(clicks.createdAt, filters.dateTo));
      convConditions.push(lte(conversions.createdAt, filters.dateTo));
    }
    
    const clickWhere = clickConditions.length > 0 ? and(...clickConditions) : undefined;
    const convWhere = convConditions.length > 0 ? and(...convConditions) : undefined;
    
    const allClicks = clickWhere 
      ? await db.select().from(clicks).where(clickWhere)
      : await db.select().from(clicks);
    
    const allConversions = convWhere 
      ? await db.select().from(conversions).where(convWhere)
      : await db.select().from(conversions);
    
    // Group data
    const grouped: Record<string, { 
      clicks: number; 
      uniqueClicks: number;
      leads: number; 
      sales: number; 
      conversions: number;
      payout: number;
      cost: number;
      cr: number;
    }> = {};
    
    for (const click of allClicks) {
      let key: string;
      switch (groupBy) {
        case "date":
          key = click.createdAt.toISOString().split("T")[0];
          break;
        case "geo":
          key = click.geo || "unknown";
          break;
        case "publisher":
          key = click.publisherId;
          break;
        case "offer":
          key = click.offerId;
          break;
        case "device":
          key = click.device || "unknown";
          break;
        case "os":
          key = click.os || "unknown";
          break;
        case "browser":
          key = click.browser || "unknown";
          break;
        case "sub1":
          key = click.sub1 || "empty";
          break;
        case "sub2":
          key = click.sub2 || "empty";
          break;
        case "sub3":
          key = click.sub3 || "empty";
          break;
        case "sub4":
          key = click.sub4 || "empty";
          break;
        case "sub5":
          key = click.sub5 || "empty";
          break;
        default:
          key = click.createdAt.toISOString().split("T")[0];
      }
      
      if (!grouped[key]) {
        grouped[key] = { clicks: 0, uniqueClicks: 0, leads: 0, sales: 0, conversions: 0, payout: 0, cost: 0, cr: 0 };
      }
      grouped[key].clicks++;
      if (click.isUnique) grouped[key].uniqueClicks++;
    }
    
    for (const conv of allConversions) {
      let key: string;
      const click = allClicks.find(c => c.id === conv.clickId);
      
      switch (groupBy) {
        case "date":
          key = conv.createdAt.toISOString().split("T")[0];
          break;
        case "geo":
          key = click?.geo || "unknown";
          break;
        case "publisher":
          key = conv.publisherId;
          break;
        case "offer":
          key = conv.offerId;
          break;
        case "device":
          key = click?.device || "unknown";
          break;
        case "os":
          key = click?.os || "unknown";
          break;
        case "browser":
          key = click?.browser || "unknown";
          break;
        case "sub1":
          key = click?.sub1 || "empty";
          break;
        case "sub2":
          key = click?.sub2 || "empty";
          break;
        case "sub3":
          key = click?.sub3 || "empty";
          break;
        case "sub4":
          key = click?.sub4 || "empty";
          break;
        case "sub5":
          key = click?.sub5 || "empty";
          break;
        default:
          key = conv.createdAt.toISOString().split("T")[0];
      }
      
      if (!grouped[key]) {
        grouped[key] = { clicks: 0, uniqueClicks: 0, leads: 0, sales: 0, conversions: 0, payout: 0, cost: 0, cr: 0 };
      }
      
      grouped[key].conversions++;
      if (conv.conversionType === "lead") grouped[key].leads++;
      if (conv.conversionType === "sale") grouped[key].sales++;
      grouped[key].payout += parseFloat(conv.publisherPayout);
      if (role !== "publisher") {
        grouped[key].cost += parseFloat(conv.advertiserCost);
      }
    }
    
    // Calculate CR
    for (const key in grouped) {
      if (grouped[key].clicks > 0) {
        grouped[key].cr = (grouped[key].conversions / grouped[key].clicks) * 100;
      }
    }
    
    // Convert to array and sort
    const result = Object.entries(grouped).map(([key, data]) => ({
      groupKey: key,
      groupBy: groupBy,
      ...data
    })).sort((a, b) => {
      if (groupBy === "date") return b.groupKey.localeCompare(a.groupKey);
      return b.clicks - a.clicks;
    });
    
    return { data: result, groupBy };
  }
  
  // ============================================
  // PAYMENT METHODS (Advertiser)
  // ============================================
  async getPaymentMethodsByAdvertiser(advertiserId: string): Promise<PaymentMethod[]> {
    return db.select().from(paymentMethods).where(eq(paymentMethods.advertiserId, advertiserId)).orderBy(desc(paymentMethods.createdAt));
  }
  
  async getPaymentMethod(id: string): Promise<PaymentMethod | undefined> {
    const [method] = await db.select().from(paymentMethods).where(eq(paymentMethods.id, id));
    return method;
  }
  
  async createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod> {
    const [created] = await db.insert(paymentMethods).values(method).returning();
    return created;
  }
  
  async updatePaymentMethod(id: string, data: Partial<InsertPaymentMethod>): Promise<PaymentMethod | undefined> {
    const [updated] = await db.update(paymentMethods).set(data).where(eq(paymentMethods.id, id)).returning();
    return updated;
  }
  
  async deletePaymentMethod(id: string): Promise<void> {
    await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
  }
  
  // ============================================
  // PUBLISHER WALLETS
  // ============================================
  async getPublisherWalletsByPublisher(publisherId: string, advertiserId: string): Promise<(PublisherWallet & { paymentMethod: PaymentMethod })[]> {
    const wallets = await db.select().from(publisherWallets).where(and(
      eq(publisherWallets.publisherId, publisherId),
      eq(publisherWallets.advertiserId, advertiserId)
    )).orderBy(desc(publisherWallets.createdAt));
    
    const result = [];
    for (const wallet of wallets) {
      const method = await this.getPaymentMethod(wallet.paymentMethodId);
      if (method) {
        result.push({ ...wallet, paymentMethod: method });
      }
    }
    return result;
  }
  
  async getPublisherWallet(id: string): Promise<PublisherWallet | undefined> {
    const [wallet] = await db.select().from(publisherWallets).where(eq(publisherWallets.id, id));
    return wallet;
  }
  
  async createPublisherWallet(wallet: InsertPublisherWallet): Promise<PublisherWallet> {
    const [created] = await db.insert(publisherWallets).values(wallet).returning();
    return created;
  }
  
  async updatePublisherWallet(id: string, data: Partial<InsertPublisherWallet>): Promise<PublisherWallet | undefined> {
    const [updated] = await db.update(publisherWallets).set(data).where(eq(publisherWallets.id, id)).returning();
    return updated;
  }
  
  async deletePublisherWallet(id: string): Promise<void> {
    await db.delete(publisherWallets).where(eq(publisherWallets.id, id));
  }
  
  // ============================================
  // PAYOUT REQUESTS
  // ============================================
  async getPayoutRequestsByPublisher(publisherId: string, advertiserId?: string): Promise<(PayoutRequest & { wallet: PublisherWallet; paymentMethod: PaymentMethod })[]> {
    let query = db.select().from(payoutRequests).where(eq(payoutRequests.publisherId, publisherId));
    
    if (advertiserId) {
      query = db.select().from(payoutRequests).where(and(
        eq(payoutRequests.publisherId, publisherId),
        eq(payoutRequests.advertiserId, advertiserId)
      ));
    }
    
    const requests = await query.orderBy(desc(payoutRequests.createdAt));
    
    const result = [];
    for (const req of requests) {
      const wallet = await this.getPublisherWallet(req.walletId);
      const method = await this.getPaymentMethod(req.paymentMethodId);
      if (wallet && method) {
        result.push({ ...req, wallet, paymentMethod: method });
      }
    }
    return result;
  }
  
  async getPayoutRequestsByAdvertiser(advertiserId: string): Promise<(PayoutRequest & { publisher: User; wallet: PublisherWallet; paymentMethod: PaymentMethod })[]> {
    const requests = await db.select().from(payoutRequests)
      .where(eq(payoutRequests.advertiserId, advertiserId))
      .orderBy(desc(payoutRequests.createdAt));
    
    const result = [];
    for (const req of requests) {
      const publisher = await this.getUser(req.publisherId);
      const wallet = await this.getPublisherWallet(req.walletId);
      const method = await this.getPaymentMethod(req.paymentMethodId);
      if (publisher && wallet && method) {
        result.push({ ...req, publisher, wallet, paymentMethod: method });
      }
    }
    return result;
  }
  
  async getAllPayoutRequests(): Promise<(PayoutRequest & { publisherName?: string; advertiserName?: string })[]> {
    const requests = await db.select().from(payoutRequests).orderBy(desc(payoutRequests.createdAt)).limit(100);
    
    const result = [];
    for (const req of requests) {
      const publisher = await this.getUser(req.publisherId);
      const advertiser = await this.getUser(req.advertiserId);
      result.push({ 
        ...req, 
        publisherName: publisher?.username,
        advertiserName: advertiser?.username 
      });
    }
    return result;
  }

  async getPayoutRequest(id: string): Promise<PayoutRequest | undefined> {
    const [request] = await db.select().from(payoutRequests).where(eq(payoutRequests.id, id));
    return request;
  }
  
  async createPayoutRequest(request: InsertPayoutRequest): Promise<PayoutRequest> {
    const [created] = await db.insert(payoutRequests).values(request).returning();
    return created;
  }
  
  async updatePayoutRequest(id: string, data: Partial<InsertPayoutRequest>): Promise<PayoutRequest | undefined> {
    const [updated] = await db.update(payoutRequests).set({ ...data, updatedAt: new Date() }).where(eq(payoutRequests.id, id)).returning();
    return updated;
  }
  
  // ============================================
  // PAYOUTS
  // ============================================
  async getPayoutsByPublisher(publisherId: string, advertiserId?: string): Promise<(Payout & { paymentMethod: PaymentMethod })[]> {
    let query = db.select().from(payouts).where(eq(payouts.publisherId, publisherId));
    
    if (advertiserId) {
      query = db.select().from(payouts).where(and(
        eq(payouts.publisherId, publisherId),
        eq(payouts.advertiserId, advertiserId)
      ));
    }
    
    const payoutsList = await query.orderBy(desc(payouts.createdAt));
    
    const result = [];
    for (const payout of payoutsList) {
      const method = await this.getPaymentMethod(payout.paymentMethodId);
      if (method) {
        result.push({ ...payout, paymentMethod: method });
      }
    }
    return result;
  }
  
  async getPayoutsByAdvertiser(advertiserId: string): Promise<(Payout & { publisher: User; paymentMethod: PaymentMethod })[]> {
    const payoutsList = await db.select().from(payouts)
      .where(eq(payouts.advertiserId, advertiserId))
      .orderBy(desc(payouts.createdAt));
    
    const result = [];
    for (const payout of payoutsList) {
      const publisher = await this.getUser(payout.publisherId);
      const method = await this.getPaymentMethod(payout.paymentMethodId);
      if (publisher && method) {
        result.push({ ...payout, publisher, paymentMethod: method });
      }
    }
    return result;
  }
  
  async createPayout(payout: InsertPayout): Promise<Payout> {
    const [created] = await db.insert(payouts).values(payout).returning();
    return created;
  }
  
  async createBulkPayouts(payoutsList: InsertPayout[]): Promise<Payout[]> {
    if (payoutsList.length === 0) return [];
    const created = await db.insert(payouts).values(payoutsList).returning();
    return created;
  }
  
  // ============================================
  // PUBLISHER BALANCES
  // ============================================
  async getPublisherBalance(publisherId: string, advertiserId: string): Promise<PublisherBalance | undefined> {
    const [balance] = await db.select().from(publisherBalances).where(and(
      eq(publisherBalances.publisherId, publisherId),
      eq(publisherBalances.advertiserId, advertiserId)
    ));
    return balance;
  }
  
  async getPublisherBalancesByAdvertiser(advertiserId: string): Promise<(PublisherBalance & { publisher: User })[]> {
    const balances = await db.select().from(publisherBalances)
      .where(eq(publisherBalances.advertiserId, advertiserId));
    
    const result = [];
    for (const balance of balances) {
      const publisher = await this.getUser(balance.publisherId);
      if (publisher) {
        result.push({ ...balance, publisher });
      }
    }
    return result;
  }
  
  async updatePublisherBalance(publisherId: string, advertiserId: string, data: Partial<InsertPublisherBalance>): Promise<PublisherBalance> {
    const existing = await this.getPublisherBalance(publisherId, advertiserId);
    
    if (existing) {
      const [updated] = await db.update(publisherBalances)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(publisherBalances.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(publisherBalances).values({
        publisherId,
        advertiserId,
        ...data
      }).returning();
      return created;
    }
  }
  
  async calculatePublisherBalance(publisherId: string, advertiserId: string): Promise<{ available: number; pending: number; hold: number; totalPaid: number }> {
    // Get all approved conversions for this publisher from this advertiser's offers
    const publisherConversions = await db.select()
      .from(conversions)
      .innerJoin(offers, eq(conversions.offerId, offers.id))
      .where(and(
        eq(conversions.publisherId, publisherId),
        eq(offers.advertiserId, advertiserId)
      ));
    
    let available = 0;
    let pending = 0;
    let hold = 0;
    
    for (const { conversions: conv } of publisherConversions) {
      const amount = parseFloat(conv.publisherPayout);
      switch (conv.status) {
        case "approved":
          available += amount;
          break;
        case "pending":
          pending += amount;
          break;
        case "hold":
          hold += amount;
          break;
      }
    }
    
    // Get total paid from payouts
    const paidPayouts = await db.select()
      .from(payouts)
      .where(and(
        eq(payouts.publisherId, publisherId),
        eq(payouts.advertiserId, advertiserId),
        eq(payouts.status, "completed")
      ));
    
    const totalPaid = paidPayouts.reduce((sum, p) => sum + parseFloat(p.netAmount), 0);
    
    // Available = earned approved - already paid
    available = available - totalPaid;
    
    return { available: Math.max(0, available), pending, hold, totalPaid };
  }
  
  // Offer Postback Settings
  async getOfferPostbackSetting(offerId: string): Promise<OfferPostbackSetting | undefined> {
    const [setting] = await db.select().from(offerPostbackSettings).where(eq(offerPostbackSettings.offerId, offerId));
    return setting;
  }
  
  async getOfferPostbackSettingsByAdvertiser(advertiserId: string): Promise<(OfferPostbackSetting & { offer: Offer })[]> {
    const settings = await db.select().from(offerPostbackSettings)
      .where(eq(offerPostbackSettings.advertiserId, advertiserId));
    
    const result = [];
    for (const setting of settings) {
      const offer = await this.getOffer(setting.offerId);
      if (offer) {
        result.push({ ...setting, offer });
      }
    }
    return result;
  }
  
  async createOfferPostbackSetting(setting: InsertOfferPostbackSetting): Promise<OfferPostbackSetting> {
    const [created] = await db.insert(offerPostbackSettings).values(setting).returning();
    return created;
  }
  
  async updateOfferPostbackSetting(offerId: string, data: Partial<InsertOfferPostbackSetting>): Promise<OfferPostbackSetting | undefined> {
    const [updated] = await db.update(offerPostbackSettings)
      .set(data)
      .where(eq(offerPostbackSettings.offerId, offerId))
      .returning();
    return updated;
  }
  
  async deleteOfferPostbackSetting(offerId: string): Promise<void> {
    await db.delete(offerPostbackSettings).where(eq(offerPostbackSettings.offerId, offerId));
  }
  
  // Extended Postback Logs
  async getPostbackLogs(filters: { advertiserId?: string; offerId?: string; publisherId?: string; status?: string; limit?: number }): Promise<PostbackLog[]> {
    let conditions = [];
    
    // Note: postbackLogs table has conversionId reference, we need to join to filter
    const logs = await db.select().from(postbackLogs)
      .orderBy(desc(postbackLogs.createdAt))
      .limit(filters.limit || 100);
    
    return logs;
  }
  
  async updatePostbackLog(id: string, data: Partial<InsertPostbackLog>): Promise<PostbackLog | undefined> {
    const [updated] = await db.update(postbackLogs)
      .set(data)
      .where(eq(postbackLogs.id, id))
      .returning();
    return updated;
  }
  
  // User Postback Settings (universal for all roles)
  async getUserPostbackSettings(userId: string): Promise<UserPostbackSetting | undefined> {
    const [settings] = await db.select().from(userPostbackSettings)
      .where(eq(userPostbackSettings.userId, userId));
    return settings;
  }
  
  async upsertUserPostbackSettings(userId: string, settings: Partial<InsertUserPostbackSetting>): Promise<UserPostbackSetting> {
    const existing = await this.getUserPostbackSettings(userId);
    
    if (existing) {
      const [updated] = await db.update(userPostbackSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(userPostbackSettings.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userPostbackSettings)
        .values({ userId, ...settings })
        .returning();
      return created;
    }
  }
  
  // Process hold conversions - move from hold to approved when holdUntil has passed
  // Returns the list of conversion IDs that were processed
  async processHoldConversions(): Promise<string[]> {
    const now = new Date();
    const result = await db.update(conversions)
      .set({ status: "approved", approvedAt: now })
      .where(and(
        eq(conversions.status, "hold"),
        lte(conversions.holdUntil, now)
      ))
      .returning();
    return result.map(c => c.id);
  }

  // ============================================
  // ANTI-FRAUD RULES
  // ============================================
  async getAntifraudRules(advertiserId?: string): Promise<AntifraudRule[]> {
    if (advertiserId) {
      // Get global rules + advertiser-specific rules
      return db.select().from(antifraudRules)
        .where(sql`(${antifraudRules.scope} = 'global' OR ${antifraudRules.advertiserId} = ${advertiserId})`)
        .orderBy(antifraudRules.priority);
    }
    // Admin: get all rules
    return db.select().from(antifraudRules).orderBy(antifraudRules.priority);
  }

  async getAntifraudRule(id: string): Promise<AntifraudRule | undefined> {
    const [rule] = await db.select().from(antifraudRules).where(eq(antifraudRules.id, id));
    return rule;
  }

  async createAntifraudRule(rule: InsertAntifraudRule): Promise<AntifraudRule> {
    const [created] = await db.insert(antifraudRules).values(rule).returning();
    return created;
  }

  async updateAntifraudRule(id: string, data: Partial<InsertAntifraudRule>): Promise<AntifraudRule | undefined> {
    const [updated] = await db.update(antifraudRules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(antifraudRules.id, id))
      .returning();
    return updated;
  }

  async deleteAntifraudRule(id: string): Promise<boolean> {
    const result = await db.delete(antifraudRules).where(eq(antifraudRules.id, id));
    return true;
  }

  // ============================================
  // ANTI-FRAUD LOGS
  // ============================================
  async createAntifraudLog(log: InsertAntifraudLog): Promise<AntifraudLog> {
    const [created] = await db.insert(antifraudLogs).values(log).returning();
    return created;
  }

  async getAntifraudLogs(filters: {
    advertiserId?: string;
    offerId?: string;
    publisherId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    action?: string;
    limit?: number;
  }): Promise<AntifraudLog[]> {
    let query = db.select().from(antifraudLogs);
    
    const conditions: any[] = [];
    
    if (filters.advertiserId) {
      conditions.push(eq(antifraudLogs.advertiserId, filters.advertiserId));
    }
    if (filters.offerId) {
      conditions.push(eq(antifraudLogs.offerId, filters.offerId));
    }
    if (filters.publisherId) {
      conditions.push(eq(antifraudLogs.publisherId, filters.publisherId));
    }
    if (filters.action) {
      conditions.push(eq(antifraudLogs.action, filters.action));
    }
    if (filters.dateFrom) {
      conditions.push(gte(antifraudLogs.createdAt, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(antifraudLogs.createdAt, filters.dateTo));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const result = await query.orderBy(desc(antifraudLogs.createdAt)).limit(filters.limit || 1000);
    return result;
  }

  async getSuspiciousClicks(filters: {
    advertiserId?: string;
    offerId?: string;
    publisherId?: string;
    limit?: number;
  }): Promise<Click[]> {
    // SECURITY: Require either advertiserId or offerId to prevent cross-tenant leakage
    if (!filters.advertiserId && !filters.offerId) {
      return []; // No tenant scope = no data
    }
    
    const conditions: any[] = [eq(clicks.isSuspicious, true)];
    
    if (filters.advertiserId) {
      // Get offer IDs for this advertiser
      const advertiserOffers = await db.select({ id: offers.id }).from(offers).where(eq(offers.advertiserId, filters.advertiserId));
      const offerIds = advertiserOffers.map(o => o.id);
      if (offerIds.length > 0) {
        conditions.push(inArray(clicks.offerId, offerIds));
      } else {
        return []; // No offers for this advertiser
      }
    }
    if (filters.offerId) {
      // Validate offerId belongs to advertiserId if both provided
      if (filters.advertiserId) {
        const offerExists = await db.select({ id: offers.id }).from(offers)
          .where(and(eq(offers.id, filters.offerId), eq(offers.advertiserId, filters.advertiserId)))
          .limit(1);
        if (offerExists.length === 0) {
          return []; // Offer doesn't belong to this advertiser
        }
      }
      conditions.push(eq(clicks.offerId, filters.offerId));
    }
    if (filters.publisherId) {
      conditions.push(eq(clicks.publisherId, filters.publisherId));
    }
    
    const result = await db.select().from(clicks)
      .where(and(...conditions))
      .orderBy(desc(clicks.createdAt))
      .limit(filters.limit || 100);
    
    return result;
  }

  // ============================================
  // ANTI-FRAUD METRICS
  // ============================================
  async getAntifraudMetrics(filters: {
    advertiserId?: string;
    offerId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<AntifraudMetric[]> {
    const conditions: any[] = [];
    
    if (filters.advertiserId) {
      conditions.push(eq(antifraudMetrics.advertiserId, filters.advertiserId));
    }
    if (filters.offerId) {
      conditions.push(eq(antifraudMetrics.offerId, filters.offerId));
    }
    if (filters.dateFrom) {
      conditions.push(gte(antifraudMetrics.date, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(antifraudMetrics.date, filters.dateTo));
    }
    
    let query = db.select().from(antifraudMetrics);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return query.orderBy(desc(antifraudMetrics.date));
  }

  async upsertAntifraudMetric(data: InsertAntifraudMetric): Promise<AntifraudMetric> {
    // Try to find existing metric for same date/advertiser/offer
    const dateStart = new Date(data.date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(data.date);
    dateEnd.setHours(23, 59, 59, 999);
    
    const conditions: any[] = [
      gte(antifraudMetrics.date, dateStart),
      lte(antifraudMetrics.date, dateEnd)
    ];
    
    if (data.advertiserId) {
      conditions.push(eq(antifraudMetrics.advertiserId, data.advertiserId));
    } else {
      conditions.push(sql`${antifraudMetrics.advertiserId} IS NULL`);
    }
    
    if (data.offerId) {
      conditions.push(eq(antifraudMetrics.offerId, data.offerId));
    } else {
      conditions.push(sql`${antifraudMetrics.offerId} IS NULL`);
    }
    
    const [existing] = await db.select().from(antifraudMetrics).where(and(...conditions));
    
    if (existing) {
      const [updated] = await db.update(antifraudMetrics)
        .set({
          totalClicks: (existing.totalClicks || 0) + (data.totalClicks || 0),
          blockedClicks: (existing.blockedClicks || 0) + (data.blockedClicks || 0),
          flaggedClicks: (existing.flaggedClicks || 0) + (data.flaggedClicks || 0),
          proxyVpnCount: (existing.proxyVpnCount || 0) + (data.proxyVpnCount || 0),
          botCount: (existing.botCount || 0) + (data.botCount || 0),
          datacenterCount: (existing.datacenterCount || 0) + (data.datacenterCount || 0),
          lowRiskCount: (existing.lowRiskCount || 0) + (data.lowRiskCount || 0),
          mediumRiskCount: (existing.mediumRiskCount || 0) + (data.mediumRiskCount || 0),
          highRiskCount: (existing.highRiskCount || 0) + (data.highRiskCount || 0),
        })
        .where(eq(antifraudMetrics.id, existing.id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(antifraudMetrics).values(data).returning();
    return created;
  }

  async getAntifraudSummary(advertiserId?: string): Promise<{
    totalClicks: number;
    blockedClicks: number;
    flaggedClicks: number;
    blockRate: number;
    avgFraudScore: number;
    byType: { type: string; count: number }[];
  }> {
    // Get metrics for last 30 days
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);
    
    const metrics = await this.getAntifraudMetrics({ advertiserId, dateFrom });
    
    let totalClicks = 0;
    let blockedClicks = 0;
    let flaggedClicks = 0;
    let proxyVpnCount = 0;
    let botCount = 0;
    let datacenterCount = 0;
    
    for (const m of metrics) {
      totalClicks += m.totalClicks || 0;
      blockedClicks += m.blockedClicks || 0;
      flaggedClicks += m.flaggedClicks || 0;
      proxyVpnCount += m.proxyVpnCount || 0;
      botCount += m.botCount || 0;
      datacenterCount += m.datacenterCount || 0;
    }
    
    return {
      totalClicks,
      blockedClicks,
      flaggedClicks,
      blockRate: totalClicks > 0 ? (blockedClicks / totalClicks) * 100 : 0,
      avgFraudScore: 0, // Would need to calculate from logs
      byType: [
        { type: "Proxy/VPN", count: proxyVpnCount },
        { type: "Bot", count: botCount },
        { type: "Datacenter", count: datacenterCount }
      ]
    };
  }

  // Platform Settings (Admin)
  async getPlatformSettings(): Promise<PlatformSettings | undefined> {
    const [settings] = await db.select().from(platformSettings).limit(1);
    return settings;
  }

  async updatePlatformSettings(data: Partial<InsertPlatformSettings>): Promise<PlatformSettings> {
    const existing = await this.getPlatformSettings();
    
    // Encrypt sensitive fields if provided
    const encryptedData = { ...data };
    if (data.defaultTelegramBotToken) {
      encryptedData.defaultTelegramBotToken = encrypt(data.defaultTelegramBotToken);
    }
    if (data.stripeSecretKey) {
      encryptedData.stripeSecretKey = encrypt(data.stripeSecretKey);
    }
    
    if (existing) {
      const [updated] = await db.update(platformSettings)
        .set({ ...encryptedData, updatedAt: new Date() })
        .where(eq(platformSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(platformSettings)
        .values(encryptedData)
        .returning();
      return created;
    }
  }

  // Advertiser Staff (Team)
  async getAdvertiserStaff(advertiserId: string): Promise<AdvertiserStaff[]> {
    return db.select().from(advertiserStaff)
      .where(eq(advertiserStaff.advertiserId, advertiserId))
      .orderBy(desc(advertiserStaff.createdAt));
  }

  async getAdvertiserStaffById(id: string): Promise<AdvertiserStaff | undefined> {
    const [staff] = await db.select().from(advertiserStaff).where(eq(advertiserStaff.id, id));
    return staff;
  }

  async getAdvertiserStaffByEmail(email: string, advertiserId: string): Promise<AdvertiserStaff | undefined> {
    const [staff] = await db.select().from(advertiserStaff)
      .where(and(eq(advertiserStaff.email, email), eq(advertiserStaff.advertiserId, advertiserId)));
    return staff;
  }

  async createAdvertiserStaff(data: InsertAdvertiserStaff): Promise<AdvertiserStaff> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const [staff] = await db.insert(advertiserStaff)
      .values({ ...data, password: hashedPassword })
      .returning();
    return staff;
  }

  async updateAdvertiserStaff(id: string, data: Partial<InsertAdvertiserStaff>): Promise<AdvertiserStaff | undefined> {
    const updateData = { ...data };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }
    const [staff] = await db.update(advertiserStaff)
      .set(updateData)
      .where(eq(advertiserStaff.id, id))
      .returning();
    return staff;
  }

  async deleteAdvertiserStaff(id: string): Promise<void> {
    await db.delete(advertiserStaff).where(eq(advertiserStaff.id, id));
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async getNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.recipientId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(
        eq(notifications.recipientId, userId),
        eq(notifications.isRead, false)
      ));
    return result[0]?.count || 0;
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    const [updated] = await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return updated;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(notifications.recipientId, userId),
        eq(notifications.isRead, false)
      ));
  }

  // ============================================
  // NEWS POSTS
  // ============================================
  async createNewsPost(news: InsertNewsPost): Promise<NewsPost> {
    const [created] = await db.insert(newsPosts).values(news).returning();
    return created;
  }

  async updateNewsPost(id: string, data: Partial<InsertNewsPost>): Promise<NewsPost | undefined> {
    const [updated] = await db.update(newsPosts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(newsPosts.id, id))
      .returning();
    return updated;
  }

  async deleteNewsPost(id: string): Promise<void> {
    await db.delete(newsPosts).where(eq(newsPosts.id, id));
  }

  async getNewsPost(id: string): Promise<NewsPost | undefined> {
    const [post] = await db.select().from(newsPosts).where(eq(newsPosts.id, id));
    return post;
  }

  async getNewsFeed(userId: string, userRole: string, advertiserId?: string): Promise<NewsPost[]> {
    // Get news based on user role and advertiser scope
    if (userRole === 'admin') {
      // Admin sees all news
      return db.select().from(newsPosts)
        .where(eq(newsPosts.isPublished, true))
        .orderBy(desc(newsPosts.isPinned), desc(newsPosts.publishedAt))
        .limit(50);
    }
    
    if (userRole === 'advertiser') {
      // Advertiser sees: admin news for all/advertisers + own news
      return db.select().from(newsPosts)
        .where(and(
          eq(newsPosts.isPublished, true),
          sql`(
            (${newsPosts.authorRole} = 'admin' AND ${newsPosts.targetAudience} IN ('all', 'advertisers'))
            OR ${newsPosts.authorId} = ${userId}
          )`
        ))
        .orderBy(desc(newsPosts.isPinned), desc(newsPosts.publishedAt))
        .limit(50);
    }
    
    if (userRole === 'publisher' && advertiserId) {
      // Publisher sees: admin news for all/publishers + advertiser news for this advertiser
      return db.select().from(newsPosts)
        .where(and(
          eq(newsPosts.isPublished, true),
          sql`(
            (${newsPosts.authorRole} = 'admin' AND ${newsPosts.targetAudience} IN ('all', 'publishers'))
            OR (${newsPosts.advertiserScopeId} = ${advertiserId})
          )`
        ))
        .orderBy(desc(newsPosts.isPinned), desc(newsPosts.publishedAt))
        .limit(50);
    }
    
    // Fallback: only admin public news
    return db.select().from(newsPosts)
      .where(and(
        eq(newsPosts.isPublished, true),
        eq(newsPosts.authorRole, 'admin'),
        eq(newsPosts.targetAudience, 'all')
      ))
      .orderBy(desc(newsPosts.isPinned), desc(newsPosts.publishedAt))
      .limit(50);
  }

  async getPinnedNews(userId: string, userRole: string, advertiserId?: string): Promise<NewsPost[]> {
    const allNews = await this.getNewsFeed(userId, userRole, advertiserId);
    return allNews.filter(n => n.isPinned);
  }

  async getUnreadNewsCount(userId: string, userRole: string, advertiserId?: string): Promise<number> {
    const allNews = await this.getNewsFeed(userId, userRole, advertiserId);
    if (allNews.length === 0) return 0;
    
    const newsIds = allNews.map(n => n.id);
    const readNews = await db.select({ newsId: newsReads.newsId })
      .from(newsReads)
      .where(and(
        eq(newsReads.userId, userId),
        inArray(newsReads.newsId, newsIds)
      ));
    
    const readIds = new Set(readNews.map(r => r.newsId));
    return newsIds.filter(id => !readIds.has(id)).length;
  }

  async markNewsAsRead(userId: string, newsIds: string[]): Promise<void> {
    if (newsIds.length === 0) return;
    
    const existing = await db.select({ newsId: newsReads.newsId })
      .from(newsReads)
      .where(and(
        eq(newsReads.userId, userId),
        inArray(newsReads.newsId, newsIds)
      ));
    
    const existingIds = new Set(existing.map(e => e.newsId));
    const newIds = newsIds.filter(id => !existingIds.has(id));
    
    if (newIds.length > 0) {
      await db.insert(newsReads).values(
        newIds.map(newsId => ({ userId, newsId }))
      );
    }
  }

  // ============================================
  // WEBHOOK ENDPOINTS
  // ============================================
  async getWebhookEndpointsByAdvertiser(advertiserId: string): Promise<WebhookEndpoint[]> {
    return db.select().from(webhookEndpoints)
      .where(eq(webhookEndpoints.advertiserId, advertiserId))
      .orderBy(desc(webhookEndpoints.createdAt));
  }

  async getWebhookEndpoint(id: string): Promise<WebhookEndpoint | undefined> {
    const [endpoint] = await db.select().from(webhookEndpoints).where(eq(webhookEndpoints.id, id));
    return endpoint;
  }

  async createWebhookEndpoint(endpoint: InsertWebhookEndpoint): Promise<WebhookEndpoint> {
    const [created] = await db.insert(webhookEndpoints).values(endpoint).returning();
    return created;
  }

  async updateWebhookEndpoint(id: string, data: Partial<WebhookEndpoint>): Promise<WebhookEndpoint | undefined> {
    const [updated] = await db.update(webhookEndpoints)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(webhookEndpoints.id, id))
      .returning();
    return updated;
  }

  async deleteWebhookEndpoint(id: string): Promise<void> {
    await db.delete(webhookLogs).where(eq(webhookLogs.webhookEndpointId, id));
    await db.delete(webhookEndpoints).where(eq(webhookEndpoints.id, id));
  }

  async createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog> {
    const [created] = await db.insert(webhookLogs).values(log).returning();
    return created;
  }

  async getWebhookLogs(webhookEndpointId: string, limit: number = 50): Promise<WebhookLog[]> {
    return db.select().from(webhookLogs)
      .where(eq(webhookLogs.webhookEndpointId, webhookEndpointId))
      .orderBy(desc(webhookLogs.createdAt))
      .limit(limit);
  }

  async getWebhookLogsByAdvertiser(advertiserId: string, limit: number = 100): Promise<WebhookLog[]> {
    return db.select().from(webhookLogs)
      .where(eq(webhookLogs.advertiserId, advertiserId))
      .orderBy(desc(webhookLogs.createdAt))
      .limit(limit);
  }

  // ============================================
  // CUSTOM DOMAINS
  // ============================================
  async getCustomDomainsByAdvertiser(advertiserId: string): Promise<CustomDomain[]> {
    return db.select().from(customDomains)
      .where(eq(customDomains.advertiserId, advertiserId))
      .orderBy(desc(customDomains.createdAt));
  }

  async getCustomDomain(id: string): Promise<CustomDomain | undefined> {
    const [domain] = await db.select().from(customDomains).where(eq(customDomains.id, id));
    return domain;
  }

  async getCustomDomainByDomain(domain: string): Promise<CustomDomain | undefined> {
    const [result] = await db.select().from(customDomains).where(eq(customDomains.domain, domain));
    return result;
  }

  async createCustomDomain(domain: InsertCustomDomain): Promise<CustomDomain> {
    const [created] = await db.insert(customDomains).values(domain).returning();
    return created;
  }

  async updateCustomDomain(id: string, data: Partial<CustomDomain>): Promise<CustomDomain | undefined> {
    const [updated] = await db.update(customDomains)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customDomains.id, id))
      .returning();
    return updated;
  }

  async deleteCustomDomain(id: string): Promise<void> {
    // Delete related acme challenges first (foreign key constraint)
    await db.delete(acmeChallenges).where(eq(acmeChallenges.domainId, id));
    await db.delete(customDomains).where(eq(customDomains.id, id));
  }

  async setPrimaryDomain(advertiserId: string, domainId: string): Promise<void> {
    await db.update(customDomains)
      .set({ isPrimary: false })
      .where(eq(customDomains.advertiserId, advertiserId));
    
    await db.update(customDomains)
      .set({ isPrimary: true })
      .where(eq(customDomains.id, domainId));
  }

  async getVerifiedDomains(): Promise<CustomDomain[]> {
    return db.select().from(customDomains)
      .where(and(eq(customDomains.isVerified, true), eq(customDomains.isActive, true)));
  }

  async getActiveTrackingDomain(advertiserId: string): Promise<string | null> {
    const domains = await db.select().from(customDomains)
      .where(and(
        eq(customDomains.advertiserId, advertiserId),
        eq(customDomains.isVerified, true),
        eq(customDomains.isActive, true),
        eq(customDomains.sslStatus, "ssl_active")
      ))
      .orderBy(desc(customDomains.isPrimary), desc(customDomains.createdAt))
      .limit(1);
    
    return domains[0]?.domain || null;
  }

  async getAcmeAccount(): Promise<AcmeAccount | undefined> {
    const [account] = await db.select().from(acmeAccounts)
      .where(eq(acmeAccounts.isActive, true))
      .orderBy(desc(acmeAccounts.createdAt))
      .limit(1);
    return account;
  }

  async createAcmeAccount(data: { email: string; privateKey: string; isActive: boolean }): Promise<AcmeAccount> {
    const [created] = await db.insert(acmeAccounts).values(data).returning();
    return created;
  }

  async createAcmeChallenge(data: { domainId: string; token: string; keyAuthorization: string; expiresAt: Date }): Promise<AcmeChallenge> {
    const [created] = await db.insert(acmeChallenges).values({
      ...data,
      challengeType: "http-01",
      status: "pending",
    }).returning();
    return created;
  }

  async getAcmeChallengeByToken(token: string): Promise<AcmeChallenge | undefined> {
    const [challenge] = await db.select().from(acmeChallenges)
      .where(eq(acmeChallenges.token, token));
    return challenge;
  }

  async deleteAcmeChallenge(token: string): Promise<void> {
    await db.delete(acmeChallenges).where(eq(acmeChallenges.token, token));
  }

  async deleteExpiredAcmeChallenges(): Promise<void> {
    await db.delete(acmeChallenges).where(lte(acmeChallenges.expiresAt, new Date()));
  }

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return db.select().from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.sortOrder);
  }

  async getSubscriptionPlanById(id: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan;
  }

  async seedSubscriptionPlans(): Promise<void> {
    const existing = await db.select().from(subscriptionPlans);
    if (existing.length > 0) {
      console.log('[seed] Subscription plans already exist, skipping');
      return;
    }

    console.log('[seed] Creating default subscription plans...');
    await db.insert(subscriptionPlans).values([
      {
        name: "Starter",
        monthlyPrice: "49.00",
        yearlyPrice: "499.80",
        maxPartners: 10,
        hasPostbacks: true,
        isActive: true,
        sortOrder: 1,
        price: "49.00",
        discountPercent: 15,
        features: ["До 10 партнёров", "Базовые постбеки", "Email поддержка"],
      },
      {
        name: "Professional",
        monthlyPrice: "99.00",
        yearlyPrice: "1009.80",
        maxPartners: 50,
        hasAntifraud: true,
        hasNews: true,
        hasPostbacks: true,
        hasTeam: true,
        isActive: true,
        sortOrder: 2,
        price: "99.00",
        discountPercent: 15,
        features: ["До 50 партнёров", "Антифрод аналитика", "Новости и уведомления", "Webhooks интеграции", "Командный доступ", "Приоритетная поддержка"],
      },
      {
        name: "Enterprise",
        monthlyPrice: "149.00",
        yearlyPrice: "1519.80",
        hasAntifraud: true,
        hasNews: true,
        hasPostbacks: true,
        hasTeam: true,
        hasWebhooks: true,
        hasCustomDomain: true,
        hasApiAccess: true,
        isActive: true,
        sortOrder: 3,
        price: "149.00",
        discountPercent: 15,
        features: ["Безлимитные партнёры", "Полный антифрод", "White-label брендинг", "Custom домены", "API доступ", "Персональный менеджер"],
      },
    ]);
    console.log('[seed] Created 3 subscription plans');
  }

  // ============================================
  // ADVERTISER SUBSCRIPTIONS
  // ============================================

  async getAdvertiserSubscription(advertiserId: string): Promise<AdvertiserSubscription | undefined> {
    const [sub] = await db.select().from(advertiserSubscriptions)
      .where(eq(advertiserSubscriptions.advertiserId, advertiserId));
    return sub;
  }

  async createAdvertiserSubscription(data: InsertAdvertiserSubscription): Promise<AdvertiserSubscription> {
    const [created] = await db.insert(advertiserSubscriptions).values(data).returning();
    return created;
  }

  async updateAdvertiserSubscription(id: string, data: Partial<InsertAdvertiserSubscription>): Promise<AdvertiserSubscription | undefined> {
    const [updated] = await db.update(advertiserSubscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(advertiserSubscriptions.id, id))
      .returning();
    return updated;
  }

  async createTrialSubscription(advertiserId: string): Promise<AdvertiserSubscription> {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30); // 30-day trial
    
    const [created] = await db.insert(advertiserSubscriptions).values({
      advertiserId,
      status: "trial",
      trialEndsAt,
      billingCycle: "monthly",
    }).returning();
    return created;
  }

  async getExpiredTrials(): Promise<AdvertiserSubscription[]> {
    return db.select().from(advertiserSubscriptions)
      .where(and(
        eq(advertiserSubscriptions.status, "trial"),
        lte(advertiserSubscriptions.trialEndsAt, new Date())
      ));
  }

  async getExpiredSubscriptions(): Promise<AdvertiserSubscription[]> {
    return db.select().from(advertiserSubscriptions)
      .where(and(
        eq(advertiserSubscriptions.status, "active"),
        lte(advertiserSubscriptions.currentPeriodEnd, new Date())
      ));
  }

  // ============================================
  // SUBSCRIPTION PAYMENTS
  // ============================================

  async createSubscriptionPayment(data: InsertSubscriptionPayment): Promise<SubscriptionPayment> {
    const [created] = await db.insert(subscriptionPayments).values(data).returning();
    return created;
  }

  async getSubscriptionPaymentById(id: string): Promise<SubscriptionPayment | undefined> {
    const [payment] = await db.select().from(subscriptionPayments).where(eq(subscriptionPayments.id, id));
    return payment;
  }

  async getSubscriptionPaymentByHash(txHash: string): Promise<SubscriptionPayment | undefined> {
    const [payment] = await db.select().from(subscriptionPayments).where(eq(subscriptionPayments.txHash, txHash));
    return payment;
  }

  async updateSubscriptionPayment(id: string, data: Partial<InsertSubscriptionPayment>): Promise<SubscriptionPayment | undefined> {
    const [updated] = await db.update(subscriptionPayments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptionPayments.id, id))
      .returning();
    return updated;
  }

  async getAdvertiserPayments(advertiserId: string): Promise<SubscriptionPayment[]> {
    return db.select().from(subscriptionPayments)
      .where(eq(subscriptionPayments.advertiserId, advertiserId))
      .orderBy(desc(subscriptionPayments.createdAt));
  }

  async getPendingPayments(): Promise<SubscriptionPayment[]> {
    return db.select().from(subscriptionPayments)
      .where(and(
        eq(subscriptionPayments.status, "pending"),
        gte(subscriptionPayments.expiresAt, new Date())
      ));
  }

  async expireOldPayments(): Promise<void> {
    await db.update(subscriptionPayments)
      .set({ status: "expired", updatedAt: new Date() })
      .where(and(
        eq(subscriptionPayments.status, "pending"),
        lte(subscriptionPayments.expiresAt, new Date())
      ));
  }

  // ============================================
  // PASSWORD RESET TOKENS
  // ============================================

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const [created] = await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt
    }).returning();
    return created;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db.select().from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken;
  }

  async markPasswordResetTokenUsed(token: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.token, token));
  }

  async deleteExpiredPasswordResetTokens(): Promise<void> {
    await db.delete(passwordResetTokens)
      .where(lte(passwordResetTokens.expiresAt, new Date()));
  }

  async deleteUserPasswordResetTokens(userId: string): Promise<void> {
    await db.delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));
  }
}

export const storage = new DatabaseStorage();
