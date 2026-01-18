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
  type PasswordResetToken, passwordResetTokens,
  type IncomingPostbackConfig, type InsertIncomingPostbackConfig, incomingPostbackConfigs,
  type PublisherPostbackEndpoint, type InsertPublisherPostbackEndpoint, publisherPostbackEndpoints,
  type MigrationHistory, type InsertMigrationHistory, migrationHistory,
  type OfferLandingVariant, type InsertOfferLandingVariant, offerLandingVariants,
  type ExchangeApiKey, type InsertExchangeApiKey, exchangeApiKeys,
  type RoadmapItem, type InsertRoadmapItem, roadmapItems,
  type SupportConversation, type InsertSupportConversation, supportConversations,
  type SupportMessage, type InsertSupportMessage, supportMessages,
  type SplitTest, type InsertSplitTest, splitTests,
  type SplitTestItem, type InsertSplitTestItem, splitTestItems,
  type PlatformApiKey, type InsertPlatformApiKey, platformApiKeys,
  type PlatformApiKeyUsageLog, type InsertPlatformApiKeyUsageLog, platformApiKeyUsageLogs,
  type PlatformWebhook, type InsertPlatformWebhook, platformWebhooks,
  type PlatformWebhookLog, type InsertPlatformWebhookLog, platformWebhookLogs
} from "@shared/schema";
import crypto from "crypto";
import { db } from "../db";
import { eq, and, or, desc, gte, lte, sql, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";
import { encrypt, decrypt, hasSecret } from "./services/encryption";

/**
 * Centralized metrics calculation helper
 * Ensures consistent CR/AR/EPC calculations across all reports and stats
 * 
 * SIMPLIFIED LOGIC - based on publisherPayout field:
 * - Payable conversion = publisherPayout > 0
 * - CR% = (payableConversions / clicks) × 100
 * - AR% = (approvedPayableConversions / payableConversions) × 100
 * - EPC = totalPayout / clicks (sum of actual publisherPayout)
 * 
 * This works because orchestrator already sets correct payouts:
 * - CPA: lead=$0, sale=partnerPayout
 * - CPL: lead=partnerPayout, sale=$0
 */
export function calculateMetrics(data: {
  clicks: number;
  payableConversions: number;        // conversions with publisherPayout > 0
  approvedPayableConversions: number; // approved conversions with publisherPayout > 0
  totalPayout: number;               // sum of publisherPayout (actual earnings)
}): { cr: number; ar: number; epc: number } {
  const { clicks, payableConversions, approvedPayableConversions, totalPayout } = data;
  
  // CR (Conversion Rate) = payable conversions / clicks * 100
  const cr = clicks > 0 
    ? Math.round((payableConversions / clicks) * 100 * 100) / 100
    : 0;
  
  // AR (Approval Rate) = approved payable conversions / payable conversions * 100
  const ar = payableConversions > 0 
    ? Math.round((approvedPayableConversions / payableConversions) * 100 * 100) / 100
    : 0;
  
  // EPC (Earnings Per Click) = totalPayout / clicks
  const epc = clicks > 0 
    ? Math.round((totalPayout / clicks) * 100) / 100
    : 0;
  
  return { cr, ar, epc };
}

/**
 * Check if conversion is payable based on publisherPayout field
 * Simple and reliable - orchestrator already calculated correct payout
 */
export function isPayableConversion(publisherPayout: string | number): boolean {
  return parseFloat(String(publisherPayout || '0')) > 0;
}

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
  totalUniqueClicks: number;
  totalLeads: number;
  totalSales: number;
  totalConversions: number;
  approvedConversions: number;
  advertiserCost: number;
  publisherPayout: number;
  margin: number;
  roi: number;
  cr: number;
  ar: number;
  epc: number;
  byOffer: Array<{
    offerId: string;
    offerName: string;
    clicks: number;
    leads: number;
    sales: number;
    conversions: number;
    approvedConversions: number;
    advertiserCost: number;
    publisherPayout: number;
    margin: number;
    cr: number;
    ar: number;
    epc: number;
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
  totalUniqueClicks: number;
  totalLeads: number;
  totalSales: number;
  totalConversions: number;
  approvedConversions: number;
  totalPayout: number;
  holdPayout: number;
  approvedPayout: number;
  cr: number;
  ar: number;
  epc: number;
  byOffer: Array<{
    offerId: string;
    offerName: string;
    clicks: number;
    leads: number;
    sales: number;
    conversions: number;
    approvedConversions: number;
    payout: number;
    holdPayout: number;
    approvedPayout: number;
    cr: number;
    ar: number;
    epc: number;
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
  getUserByShortId(shortId: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  getUserByReferralCode(referralCode: string): Promise<User | undefined>;
  getUserByTelegramChatId(telegramChatId: string): Promise<User | undefined>;
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
  getOfferByShortId(shortId: number): Promise<Offer | undefined>;
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
  getOfferLanding(id: string): Promise<OfferLanding | undefined>;
  getOfferLandingByShortId(shortId: number): Promise<OfferLanding | undefined>;
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
  checkOfferCaps(offerId: string): Promise<{ dailyCapReached: boolean; monthlyCapReached: boolean; totalCapReached: boolean; offer: Offer | undefined }>;
  
  // Reports
  getClicksReport(filters: any, groupBy?: string, page?: number, limit?: number): Promise<{ clicks: Click[]; total: number; page: number; limit: number; allClicks?: Click[] }>;
  getConversionsReport(filters: any, groupBy?: string, page?: number, limit?: number): Promise<{ conversions: any[]; total: number; page: number; limit: number }>;
  getGroupedReport(filters: any, groupBy: string, role: string): Promise<any>;
  
  // Optimized Reports (SQL-based pagination and aggregation)
  getClicksReportOptimized(filters: any, page?: number, limit?: number): Promise<{
    clicks: any[];
    total: number;
    page: number;
    limit: number;
    summary: {
      clicks: number;
      uniqueClicks: number;
      conversions: number;
      approvedConversions: number;
      payableConversions: number;
      approvedPayableConversions: number;
      leads: number;
      sales: number;
      payout: number;
      advertiserCost: number;
      margin: number;
      roi: number;
      cr: number;
      ar: number;
      epc: number;
    };
  }>;
  
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
  getAdvertiserStaffByEmailOnly(email: string): Promise<AdvertiserStaff | undefined>;
  createAdvertiserStaff(staff: InsertAdvertiserStaff): Promise<AdvertiserStaff>;
  updateAdvertiserStaff(id: string, data: Partial<InsertAdvertiserStaff>): Promise<AdvertiserStaff | undefined>;
  deleteAdvertiserStaff(id: string): Promise<void>;
  
  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: string, limit?: number, advertiserScopeId?: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string, advertiserScopeId?: string): Promise<number>;
  markNotificationRead(id: string, userId: string): Promise<Notification | undefined>;
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
  
  // Incoming Postback Configs (Advertiser parameter mapping)
  getIncomingPostbackConfig(advertiserId: string, offerId?: string): Promise<IncomingPostbackConfig | undefined>;
  getIncomingPostbackConfigsByAdvertiser(advertiserId: string): Promise<IncomingPostbackConfig[]>;
  createIncomingPostbackConfig(config: InsertIncomingPostbackConfig): Promise<IncomingPostbackConfig>;
  updateIncomingPostbackConfig(id: string, data: Partial<InsertIncomingPostbackConfig>): Promise<IncomingPostbackConfig | undefined>;
  deleteIncomingPostbackConfig(id: string): Promise<void>;
  
  // Publisher Postback Endpoints (Outgoing to publisher's tracker)
  getPublisherPostbackEndpoint(id: string): Promise<PublisherPostbackEndpoint | undefined>;
  getPublisherPostbackEndpoints(publisherId: string, offerId?: string): Promise<PublisherPostbackEndpoint[]>;
  getActivePublisherPostbackEndpoints(publisherId: string, offerId?: string): Promise<PublisherPostbackEndpoint[]>;
  createPublisherPostbackEndpoint(endpoint: InsertPublisherPostbackEndpoint): Promise<PublisherPostbackEndpoint>;
  updatePublisherPostbackEndpoint(id: string, data: Partial<InsertPublisherPostbackEndpoint>): Promise<PublisherPostbackEndpoint | undefined>;
  deletePublisherPostbackEndpoint(id: string): Promise<void>;
  
  // Offer Performance Stats
  getOfferPerformanceByAdvertiser(advertiserId: string): Promise<{ offerId: string; clicks: number; conversions: number; cr: number; ar: number; epc: number }[]>;
  getOfferPerformanceByPublisher(publisherId: string): Promise<{ offerId: string; clicks: number; conversions: number; cr: number; ar: number; epc: number }[]>;
  
  // Custom Domains - Admin request workflow
  getAllDomainRequests(): Promise<(CustomDomain & { advertiser: User })[]>;
  submitDomainRequest(domainId: string): Promise<CustomDomain | undefined>;
  approveDomainRequest(domainId: string, adminNotes?: string): Promise<CustomDomain | undefined>;
  rejectDomainRequest(domainId: string, reason: string): Promise<CustomDomain | undefined>;
  activateDomain(domainId: string): Promise<CustomDomain | undefined>;
  
  // Whitelabel Settings
  getWhitelabelSettings(advertiserId: string): Promise<AdvertiserSettings | undefined>;
  updateWhitelabelSettings(advertiserId: string, data: {
    brandName?: string;
    logoUrl?: string;
    faviconUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    hidePlatformBranding?: boolean;
    customCss?: string;
    emailLogoUrl?: string;
    emailFooterText?: string;
  }): Promise<AdvertiserSettings | undefined>;
  
  // Migration History
  getMigrationsByAdvertiser(advertiserId: string): Promise<MigrationHistory[]>;
  createMigration(data: InsertMigrationHistory): Promise<MigrationHistory>;
  updateMigration(id: string, data: Partial<InsertMigrationHistory>): Promise<MigrationHistory | undefined>;
  getMigration(id: string): Promise<MigrationHistory | undefined>;
  
  // Exchange API Keys
  getExchangeApiKeys(advertiserId: string): Promise<ExchangeApiKey[]>;
  getExchangeApiKey(id: string): Promise<ExchangeApiKey | undefined>;
  getExchangeApiKeyByExchange(advertiserId: string, exchange: string): Promise<ExchangeApiKey | undefined>;
  createExchangeApiKey(data: {
    advertiserId: string;
    exchange: string;
    name: string;
    apiKey: string;
    apiSecret: string;
    passphrase?: string | null;
    isActive?: boolean;
  }): Promise<ExchangeApiKey>;
  updateExchangeApiKey(id: string, data: {
    name?: string;
    apiKey?: string;
    apiSecret?: string;
    passphrase?: string | null;
    isActive?: boolean;
  }): Promise<ExchangeApiKey | undefined>;
  deleteExchangeApiKey(id: string): Promise<void>;
  getExchangeApiKeysStatus(advertiserId: string): Promise<Record<string, boolean>>;
  
  // Support Conversations (Telegram поддержка)
  getSupportConversationByTelegramChatId(telegramChatId: string): Promise<SupportConversation | undefined>;
  getSupportConversation(id: string): Promise<SupportConversation | undefined>;
  getSupportConversations(status?: string): Promise<SupportConversation[]>;
  createSupportConversation(data: InsertSupportConversation): Promise<SupportConversation>;
  updateSupportConversation(id: string, data: Partial<InsertSupportConversation>): Promise<SupportConversation | undefined>;
  
  // Support Messages
  getSupportMessages(conversationId: string): Promise<SupportMessage[]>;
  createSupportMessage(data: InsertSupportMessage): Promise<SupportMessage>;
  
  // Split Tests (A/B тестирование для партнёров)
  getSplitTestsByPublisher(publisherId: string): Promise<SplitTest[]>;
  getSplitTest(id: string): Promise<SplitTest | undefined>;
  getSplitTestByShortCode(shortCode: string): Promise<SplitTest | undefined>;
  createSplitTest(data: InsertSplitTest): Promise<SplitTest>;
  updateSplitTest(id: string, data: Partial<InsertSplitTest>): Promise<SplitTest | undefined>;
  deleteSplitTest(id: string): Promise<void>;
  
  // Split Test Items
  getSplitTestItems(splitTestId: string): Promise<SplitTestItem[]>;
  createSplitTestItem(data: InsertSplitTestItem): Promise<SplitTestItem>;
  updateSplitTestItem(id: string, data: Partial<InsertSplitTestItem>): Promise<SplitTestItem | undefined>;
  deleteSplitTestItem(id: string): Promise<void>;
  deleteSplitTestItems(splitTestId: string): Promise<void>;
  
  // Platform API Keys
  getPlatformApiKeys(): Promise<PlatformApiKey[]>;
  getPlatformApiKey(id: string): Promise<PlatformApiKey | undefined>;
  getPlatformApiKeyByHash(keyHash: string): Promise<PlatformApiKey | undefined>;
  createPlatformApiKey(data: InsertPlatformApiKey): Promise<PlatformApiKey>;
  updatePlatformApiKey(id: string, data: Partial<PlatformApiKey>): Promise<PlatformApiKey | undefined>;
  revokePlatformApiKey(id: string): Promise<PlatformApiKey | undefined>;
  deletePlatformApiKey(id: string): Promise<void>;
  logPlatformApiKeyUsage(data: InsertPlatformApiKeyUsageLog): Promise<PlatformApiKeyUsageLog>;
  getPlatformApiKeyUsageLogs(apiKeyId: string, limit?: number): Promise<PlatformApiKeyUsageLog[]>;
  
  // Platform Webhooks
  getPlatformWebhooks(): Promise<PlatformWebhook[]>;
  getPlatformWebhook(id: string): Promise<PlatformWebhook | undefined>;
  createPlatformWebhook(data: InsertPlatformWebhook): Promise<PlatformWebhook>;
  updatePlatformWebhook(id: string, data: Partial<PlatformWebhook>): Promise<PlatformWebhook | undefined>;
  deletePlatformWebhook(id: string): Promise<void>;
  createPlatformWebhookLog(data: InsertPlatformWebhookLog): Promise<PlatformWebhookLog>;
  getPlatformWebhookLogs(webhookId: string, limit?: number): Promise<PlatformWebhookLog[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByShortId(shortId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.shortId, shortId));
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

  async getUserByTelegramChatId(telegramChatId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.telegramChatId, telegramChatId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    // Get next short_id from sequence
    const result = await db.execute(sql`SELECT nextval('users_short_id_seq')`) as any;
    const nextval = result.rows?.[0]?.nextval ?? result[0]?.nextval;
    const [user] = await db.insert(users).values({
      ...insertUser,
      password: hashedPassword,
      shortId: Number(nextval),
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
    twoFactorSetupCompleted: boolean;
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

  async getOfferByShortId(shortId: number): Promise<Offer | undefined> {
    const [offer] = await db.select().from(offers).where(eq(offers.shortId, shortId));
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
    // Get next short_id from sequence
    const result = await db.execute(sql`SELECT nextval('offers_short_id_seq')`) as any;
    const nextval = result.rows?.[0]?.nextval ?? result[0]?.nextval;
    const [offer] = await db.insert(offers).values({
      ...insertOffer,
      shortId: Number(nextval),
    }).returning();
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

  async getOfferLanding(id: string): Promise<OfferLanding | undefined> {
    const [landing] = await db.select().from(offerLandings).where(eq(offerLandings.id, id));
    return landing;
  }

  async getOfferLandingByShortId(shortId: number): Promise<OfferLanding | undefined> {
    const [landing] = await db.select().from(offerLandings).where(eq(offerLandings.shortId, shortId));
    return landing;
  }

  async createOfferLanding(landing: InsertOfferLanding): Promise<OfferLanding> {
    // Get next short_id from sequence
    const result = await db.execute(sql`SELECT nextval('landings_short_id_seq')`) as any;
    const nextval = result.rows?.[0]?.nextval ?? result[0]?.nextval;
    const [created] = await db.insert(offerLandings).values({
      ...landing,
      shortId: Number(nextval),
    }).returning();
    return created;
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
        totalClicks: 0, totalUniqueClicks: 0, totalLeads: 0, totalSales: 0, totalConversions: 0, approvedConversions: 0,
        advertiserCost: 0, publisherPayout: 0, margin: 0, roi: 0, cr: 0, ar: 0, epc: 0,
        byOffer: [], byPublisher: [], byDate: [], byGeo: []
      };
    }

    // Get landing payouts as fallback when offer.partnerPayout is NULL
    const allLandingPayouts = await db.select({
      offerId: offerLandings.offerId,
      partnerPayout: offerLandings.partnerPayout
    }).from(offerLandings).where(inArray(offerLandings.offerId, offerIds));
    
    // Build landing payout map (first landing per offer)
    const landingPayoutMap = new Map<string, number>();
    for (const lp of allLandingPayouts) {
      if (!landingPayoutMap.has(lp.offerId)) {
        landingPayoutMap.set(lp.offerId, parseFloat(lp.partnerPayout || '0'));
      }
    }
    
    // Build offer payout map: use offer.partnerPayout or fallback to first landing's payout (for display only)
    const offerPayoutMap = new Map(advertiserOffers.map(o => {
      const offerPayout = parseFloat(o.partnerPayout || '0');
      return [o.id, offerPayout > 0 ? offerPayout : (landingPayoutMap.get(o.id) || 0)];
    }));

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
    const totalUniqueClicks = allClicks.filter(c => c.isUnique).length;
    const totalLeads = allConversions.filter(c => c.conversionType === 'lead').length;
    const totalSales = allConversions.filter(c => c.conversionType === 'sale').length;
    const totalConversions = allConversions.length;
    const approvedConversions = allConversions.filter(c => c.status === 'approved').length;
    const advertiserCost = allConversions.reduce((sum, c) => sum + parseFloat(c.advertiserCost), 0);
    const publisherPayout = allConversions.reduce((sum, c) => sum + parseFloat(c.publisherPayout), 0);
    const margin = advertiserCost - publisherPayout;
    const roi = publisherPayout > 0 ? ((margin / publisherPayout) * 100) : 0;
    // Simplified: payable = publisherPayout > 0
    const payableConversions = allConversions.filter(c => isPayableConversion(c.publisherPayout)).length;
    const approvedPayableConversions = allConversions.filter(c => isPayableConversion(c.publisherPayout) && c.status === 'approved').length;
    const metrics = calculateMetrics({
      clicks: totalClicks,
      payableConversions,
      approvedPayableConversions,
      totalPayout: publisherPayout
    });
    const cr = metrics.cr;
    const ar = metrics.ar;
    const epc = metrics.epc;

    // Group by offer
    const byOffer = await Promise.all(targetOfferIds.map(async (offerId) => {
      const offer = advertiserOffers.find(o => o.id === offerId)!;
      const offerClicks = allClicks.filter(c => c.offerId === offerId);
      const offerConvs = allConversions.filter(c => c.offerId === offerId);
      const offerApprovedConvs = offerConvs.filter(c => c.status === 'approved').length;
      const offerAdvCost = offerConvs.reduce((sum, c) => sum + parseFloat(c.advertiserCost), 0);
      const offerPubPayout = offerConvs.reduce((sum, c) => sum + parseFloat(c.publisherPayout), 0);
      // Simplified: payable = publisherPayout > 0
      const offerPayable = offerConvs.filter(c => isPayableConversion(c.publisherPayout)).length;
      const offerApprovedPayable = offerConvs.filter(c => isPayableConversion(c.publisherPayout) && c.status === 'approved').length;
      const offerMetrics = calculateMetrics({
        clicks: offerClicks.length,
        payableConversions: offerPayable,
        approvedPayableConversions: offerApprovedPayable,
        totalPayout: offerPubPayout
      });
      return {
        offerId,
        offerName: offer.name,
        clicks: offerClicks.length,
        leads: offerConvs.filter(c => c.conversionType === 'lead').length,
        sales: offerConvs.filter(c => c.conversionType === 'sale').length,
        conversions: offerConvs.length,
        approvedConversions: offerApprovedConvs,
        advertiserCost: offerAdvCost,
        publisherPayout: offerPubPayout,
        margin: offerAdvCost - offerPubPayout,
        cr: offerMetrics.cr,
        ar: offerMetrics.ar,
        epc: offerMetrics.epc
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
      totalClicks, totalUniqueClicks, totalLeads, totalSales, totalConversions, approvedConversions,
      advertiserCost, publisherPayout, margin, roi, cr, ar, epc,
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

    // Get all unique offer IDs from BOTH clicks AND conversions for payout map
    const allOfferIds = Array.from(new Set([
      ...allClicks.map(c => c.offerId),
      ...allConversions.map(c => c.offerId)
    ]));
    
    // Note: Metrics now use actual publisherPayout from conversions, no need for offer payout maps

    // Calculate totals
    const totalClicks = allClicks.length;
    const totalUniqueClicks = allClicks.filter(c => c.isUnique).length;
    const totalLeads = allConversions.filter(c => c.conversionType === 'lead').length;
    const totalSales = allConversions.filter(c => c.conversionType === 'sale').length;
    const totalConversions = allConversions.length;
    const approvedConversions = allConversions.filter(c => c.status === 'approved').length;
    const totalPayout = allConversions.reduce((sum, c) => sum + parseFloat(c.publisherPayout), 0);
    const holdPayout = allConversions.filter(c => c.status === 'hold' || c.status === 'pending')
      .reduce((sum, c) => sum + parseFloat(c.publisherPayout), 0);
    const approvedPayout = allConversions.filter(c => c.status === 'approved')
      .reduce((sum, c) => sum + parseFloat(c.publisherPayout), 0);
    // Simplified: payable = publisherPayout > 0
    const payableConversions = allConversions.filter(c => isPayableConversion(c.publisherPayout)).length;
    const approvedPayableConversions = allConversions.filter(c => isPayableConversion(c.publisherPayout) && c.status === 'approved').length;
    const metrics = calculateMetrics({
      clicks: totalClicks,
      payableConversions,
      approvedPayableConversions,
      totalPayout
    });
    const cr = metrics.cr;
    const ar = metrics.ar;
    const epc = metrics.epc;

    // Group by offer
    const offerIds = Array.from(new Set(allClicks.map(c => c.offerId)));
    const byOffer = await Promise.all(offerIds.map(async (offerId) => {
      const offer = await this.getOffer(offerId);
      const offerClicks = allClicks.filter(c => c.offerId === offerId);
      const offerConvs = allConversions.filter(c => c.offerId === offerId);
      const offerApprovedConvs = offerConvs.filter(c => c.status === 'approved').length;
      const offerPayout = offerConvs.reduce((sum, c) => sum + parseFloat(c.publisherPayout), 0);
      const offerHoldPayout = offerConvs.filter(c => c.status === 'hold' || c.status === 'pending')
        .reduce((sum, c) => sum + parseFloat(c.publisherPayout), 0);
      const offerApprovedPayout = offerConvs.filter(c => c.status === 'approved')
        .reduce((sum, c) => sum + parseFloat(c.publisherPayout), 0);
      // Simplified: payable = publisherPayout > 0
      const offerPayable = offerConvs.filter(c => isPayableConversion(c.publisherPayout)).length;
      const offerApprovedPayable = offerConvs.filter(c => isPayableConversion(c.publisherPayout) && c.status === 'approved').length;
      const offerMetrics = calculateMetrics({
        clicks: offerClicks.length,
        payableConversions: offerPayable,
        approvedPayableConversions: offerApprovedPayable,
        totalPayout: offerPayout
      });
      return {
        offerId,
        offerName: offer?.name || 'Unknown',
        clicks: offerClicks.length,
        leads: offerConvs.filter(c => c.conversionType === 'lead').length,
        sales: offerConvs.filter(c => c.conversionType === 'sale').length,
        conversions: offerConvs.length,
        approvedConversions: offerApprovedConvs,
        payout: offerPayout,
        holdPayout: offerHoldPayout,
        approvedPayout: offerApprovedPayout,
        cr: offerMetrics.cr,
        ar: offerMetrics.ar,
        epc: offerMetrics.epc,
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
      totalClicks, totalUniqueClicks, totalLeads, totalSales, totalConversions, approvedConversions,
      totalPayout, holdPayout, approvedPayout, cr, ar, epc,
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
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const yearMonth = today.substring(0, 7); // YYYY-MM
    
    // Atomic UPSERT - track daily and monthly conversions
    const result = await db.execute(sql`
      INSERT INTO offer_caps_stats (id, offer_id, date, year_month, daily_conversions, monthly_conversions, total_conversions)
      VALUES (gen_random_uuid(), ${offerId}, ${today}, ${yearMonth}, 1, 1, 0)
      ON CONFLICT (offer_id, date) 
      DO UPDATE SET 
        daily_conversions = offer_caps_stats.daily_conversions + 1,
        monthly_conversions = offer_caps_stats.monthly_conversions + 1,
        year_month = ${yearMonth}
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

  async checkOfferCaps(offerId: string): Promise<{ dailyCapReached: boolean; monthlyCapReached: boolean; totalCapReached: boolean; offer: Offer | undefined }> {
    const offer = await this.getOffer(offerId);
    if (!offer) {
      return { dailyCapReached: false, monthlyCapReached: false, totalCapReached: false, offer: undefined };
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const yearMonth = today.substring(0, 7); // YYYY-MM
    
    const todayStats = await this.getOfferCapsStats(offerId, today);
    
    // Calculate monthly conversions for current month
    const monthlyResult = await db.execute(sql`
      SELECT COALESCE(SUM(daily_conversions), 0) as monthly_total 
      FROM offer_caps_stats 
      WHERE offer_id = ${offerId} AND year_month = ${yearMonth}
    `);
    const monthlyConversions = parseInt((monthlyResult.rows[0] as any)?.monthly_total || '0', 10);
    
    // Calculate total via SQL SUM for accuracy
    const totalResult = await db.execute(sql`
      SELECT COALESCE(SUM(daily_conversions), 0) as total 
      FROM offer_caps_stats 
      WHERE offer_id = ${offerId}
    `);
    const totalConversions = parseInt((totalResult.rows[0] as any)?.total || '0', 10);

    const dailyConversions = todayStats?.dailyConversions || 0;
    
    const dailyCapReached = offer.dailyCap !== null && dailyConversions >= offer.dailyCap;
    const monthlyCapReached = offer.monthlyCap !== null && monthlyConversions >= offer.monthlyCap;
    const totalCapReached = offer.totalCap !== null && totalConversions >= offer.totalCap;

    return { dailyCapReached, monthlyCapReached, totalCapReached, offer };
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
    totalUsers: number;
    totalAdvertisers: number;
    pendingAdvertisers: number;
    totalPublishers: number;
    totalOffers: number;
    totalClicks: number;
    totalConversions: number;
    recentUsers: Array<{
      id: string;
      username: string;
      role: string;
      status: string;
      createdAt: string;
    }>;
  }> {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    const advertisers = allUsers.filter(u => u.role === "advertiser");
    const publishers = allUsers.filter(u => u.role === "publisher");
    
    const allOffers = await db.select().from(offers);
    const allClicks = await db.select().from(clicks);
    const allConversions = await db.select().from(conversions);
    
    const recentUsers = allUsers.slice(0, 10).map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt.toISOString()
    }));
    
    return {
      totalUsers: allUsers.length,
      totalAdvertisers: advertisers.length,
      pendingAdvertisers: advertisers.filter(a => a.status === "pending").length,
      totalPublishers: publishers.length,
      totalOffers: allOffers.length,
      totalClicks: allClicks.length,
      totalConversions: allConversions.length,
      recentUsers
    };
  }

  // ============================================
  // REPORTS - Centralized statistics (primary source of truth)
  // ============================================
  
  async getClicksReport(filters: any, groupBy?: string, page: number = 1, limit: number = 50): Promise<{ clicks: any[]; total: number; page: number; limit: number; allClicks?: any[] }> {
    const conditions: any[] = [];
    
    // Handle free text search - filter by offer name
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchingOffers = await db.select({ id: offers.id }).from(offers)
        .where(sql`LOWER(${offers.name}) LIKE ${`%${searchLower}%`}`);
      const matchingOfferIds = matchingOffers.map(o => o.id);
      if (matchingOfferIds.length === 0) {
        return { clicks: [], total: 0, page, limit };
      }
      // Combine with existing offerIds filter if any
      if (filters.offerIds?.length) {
        const intersection = filters.offerIds.filter((id: string) => matchingOfferIds.includes(id));
        if (intersection.length === 0) {
          return { clicks: [], total: 0, page, limit };
        }
        conditions.push(inArray(clicks.offerId, intersection));
      } else {
        conditions.push(inArray(clicks.offerId, matchingOfferIds));
      }
    } else if (filters.offerIds?.length) {
      conditions.push(inArray(clicks.offerId, filters.offerIds));
    }
    
    if (filters.publisherId) conditions.push(eq(clicks.publisherId, filters.publisherId));
    if (filters.offerId) conditions.push(eq(clicks.offerId, filters.offerId));
    
    // Handle dateMode: "click" = filter by click date, "conversion" = filter by conversion date
    const dateMode = filters.dateMode || "click";
    
    if (dateMode === "conversion" && (filters.dateFrom || filters.dateTo)) {
      // Use EXISTS subquery for efficiency - avoid materializing clickIds
      const dateFromClause = filters.dateFrom 
        ? sql`AND ${conversions.createdAt} >= ${filters.dateFrom}` 
        : sql``;
      const dateToClause = filters.dateTo 
        ? sql`AND ${conversions.createdAt} <= ${filters.dateTo}` 
        : sql``;
      const publisherClause = filters.publisherId 
        ? sql`AND ${conversions.publisherId} = ${filters.publisherId}` 
        : sql``;
      const offerIdClause = filters.offerId 
        ? sql`AND ${conversions.offerId} = ${filters.offerId}` 
        : sql``;
      const offerIdsClause = filters.offerIds?.length 
        ? sql`AND ${conversions.offerId} IN (${sql.join(filters.offerIds.map((id: string) => sql`${id}`), sql`, `)})` 
        : sql``;
      
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${conversions} 
          WHERE ${conversions.clickId} = ${clicks.id}
          ${dateFromClause}
          ${dateToClause}
          ${publisherClause}
          ${offerIdClause}
          ${offerIdsClause}
        )`
      );
    } else {
      // Default: filter by click date
      if (filters.dateFrom) conditions.push(gte(clicks.createdAt, filters.dateFrom));
      if (filters.dateTo) conditions.push(lte(clicks.createdAt, filters.dateTo));
    }
    
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
    const offset = (page - 1) * limit;
    
    // OPTIMIZATION: Use SQL COUNT(*) instead of .length
    const countResult = whereCondition
      ? await db.select({ count: sql<number>`count(*)::int` }).from(clicks).where(whereCondition)
      : await db.select({ count: sql<number>`count(*)::int` }).from(clicks);
    const total = countResult[0]?.count || 0;
    
    // OPTIMIZATION: Use SQL OFFSET/LIMIT instead of .slice()
    const paginatedClicks = whereCondition 
      ? await db.select().from(clicks).where(whereCondition).orderBy(desc(clicks.createdAt)).limit(limit).offset(offset)
      : await db.select().from(clicks).orderBy(desc(clicks.createdAt)).limit(limit).offset(offset);
    
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
    
    // Note: allClicks is deprecated for performance reasons - use getClicksReportOptimized or streaming export
    return { clicks: enrichedClicks, total, page, limit };
  }

  /**
   * OPTIMIZED getClicksReportOptimized - SQL-based pagination and aggregation
   * Fixes:
   * 1. Uses SQL COUNT(*) instead of .length
   * 2. Uses SQL OFFSET/LIMIT instead of .slice()
   * 3. Loads conversions only for current page clickIds
   * 4. Uses single query for offers instead of N+1
   * 5. Calculates summary via SQL aggregation
   */
  async getClicksReportOptimized(filters: any, page: number = 1, limit: number = 50): Promise<{
    clicks: any[];
    total: number;
    page: number;
    limit: number;
    summary: {
      clicks: number;
      uniqueClicks: number;
      conversions: number;
      approvedConversions: number;
      payableConversions: number;
      approvedPayableConversions: number;
      leads: number;
      sales: number;
      payout: number;
      advertiserCost: number;
      margin: number;
      roi: number;
      cr: number;
      ar: number;
      epc: number;
    };
  }> {
    const conditions: any[] = [];
    
    // Handle free text search - filter by offer name
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchingOffers = await db.select({ id: offers.id }).from(offers)
        .where(sql`LOWER(${offers.name}) LIKE ${`%${searchLower}%`}`);
      const matchingOfferIds = matchingOffers.map(o => o.id);
      if (matchingOfferIds.length === 0) {
        return { 
          clicks: [], 
          total: 0, 
          page, 
          limit, 
          summary: { clicks: 0, uniqueClicks: 0, conversions: 0, approvedConversions: 0, payableConversions: 0, approvedPayableConversions: 0, leads: 0, sales: 0, payout: 0, advertiserCost: 0, margin: 0, roi: 0, cr: 0, ar: 0, epc: 0 }
        };
      }
      if (filters.offerIds?.length) {
        const intersection = filters.offerIds.filter((id: string) => matchingOfferIds.includes(id));
        if (intersection.length === 0) {
          return { 
            clicks: [], 
            total: 0, 
            page, 
            limit, 
            summary: { clicks: 0, uniqueClicks: 0, conversions: 0, approvedConversions: 0, payableConversions: 0, approvedPayableConversions: 0, leads: 0, sales: 0, payout: 0, advertiserCost: 0, margin: 0, roi: 0, cr: 0, ar: 0, epc: 0 }
        };
        }
        conditions.push(inArray(clicks.offerId, intersection));
      } else {
        conditions.push(inArray(clicks.offerId, matchingOfferIds));
      }
    } else if (filters.offerIds?.length) {
      conditions.push(inArray(clicks.offerId, filters.offerIds));
    }
    
    if (filters.publisherId) conditions.push(eq(clicks.publisherId, filters.publisherId));
    if (filters.offerId) conditions.push(eq(clicks.offerId, filters.offerId));
    
    // Handle dateMode for filtering
    const dateMode = filters.dateMode || "click";
    
    if (dateMode === "conversion" && (filters.dateFrom || filters.dateTo)) {
      // Use EXISTS subquery instead of materializing clickIds in memory
      // This keeps the filtering in SQL without loading potentially millions of IDs
      // Include ALL conversion-side filters (publisherId, offerIds, offerId) for correctness
      const dateFromClause = filters.dateFrom 
        ? sql`AND ${conversions.createdAt} >= ${filters.dateFrom}` 
        : sql``;
      const dateToClause = filters.dateTo 
        ? sql`AND ${conversions.createdAt} <= ${filters.dateTo}` 
        : sql``;
      const publisherClause = filters.publisherId 
        ? sql`AND ${conversions.publisherId} = ${filters.publisherId}` 
        : sql``;
      const offerIdClause = filters.offerId 
        ? sql`AND ${conversions.offerId} = ${filters.offerId}` 
        : sql``;
      // Also apply offerIds filter to conversions for data integrity (safe parameterized query)
      const offerIdsClause = filters.offerIds?.length 
        ? sql`AND ${conversions.offerId} IN (${sql.join(filters.offerIds.map((id: string) => sql`${id}`), sql`, `)})` 
        : sql``;
      
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${conversions} 
          WHERE ${conversions.clickId} = ${clicks.id}
          ${dateFromClause}
          ${dateToClause}
          ${publisherClause}
          ${offerIdClause}
          ${offerIdsClause}
        )`
      );
    } else {
      if (filters.dateFrom) conditions.push(gte(clicks.createdAt, filters.dateFrom));
      if (filters.dateTo) conditions.push(lte(clicks.createdAt, filters.dateTo));
    }
    
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
    
    // Step 1: Get total count via SQL COUNT (NOT .length)
    const countResult = whereCondition 
      ? await db.select({ count: sql<number>`count(*)::int` }).from(clicks).where(whereCondition)
      : await db.select({ count: sql<number>`count(*)::int` }).from(clicks);
    const total = countResult[0]?.count || 0;
    
    if (total === 0) {
      return { 
        clicks: [], 
        total: 0, 
        page, 
        limit, 
        summary: { clicks: 0, uniqueClicks: 0, conversions: 0, approvedConversions: 0, payableConversions: 0, approvedPayableConversions: 0, leads: 0, sales: 0, payout: 0, advertiserCost: 0, margin: 0, roi: 0, cr: 0, ar: 0, epc: 0 }
      };
    }
    
    // Step 2: Get paginated clicks via SQL OFFSET/LIMIT (NOT .slice)
    const offset = (page - 1) * limit;
    const paginatedClicks = whereCondition 
      ? await db.select().from(clicks).where(whereCondition).orderBy(desc(clicks.createdAt)).limit(limit).offset(offset)
      : await db.select().from(clicks).orderBy(desc(clicks.createdAt)).limit(limit).offset(offset);
    
    const clickIds = paginatedClicks.map(c => c.id);
    
    // Step 3: Get conversions ONLY for current page clickIds (NOT all conversions)
    // For dateMode=conversion, also filter by conversion date range and other conversion-side filters
    let pageConversions: any[] = [];
    if (clickIds.length > 0) {
      const convConditionsPage: any[] = [inArray(conversions.clickId, clickIds)];
      
      // For dateMode=conversion, apply ALL conversion-side filters for consistency
      if (dateMode === "conversion") {
        if (filters.dateFrom) convConditionsPage.push(gte(conversions.createdAt, filters.dateFrom));
        if (filters.dateTo) convConditionsPage.push(lte(conversions.createdAt, filters.dateTo));
        if (filters.publisherId) convConditionsPage.push(eq(conversions.publisherId, filters.publisherId));
        if (filters.offerId) convConditionsPage.push(eq(conversions.offerId, filters.offerId));
        if (filters.offerIds?.length) convConditionsPage.push(inArray(conversions.offerId, filters.offerIds));
      }
      
      const convWhereConditionPage = and(...convConditionsPage);
      pageConversions = await db.select().from(conversions).where(convWhereConditionPage);
    }
    
    // Step 4: Get offer data with single query (NOT N+1)
    const offerIds = Array.from(new Set(paginatedClicks.map(c => c.offerId)));
    const offersData = offerIds.length > 0 
      ? await db.select({ id: offers.id, name: offers.name, partnerPayout: offers.partnerPayout }).from(offers).where(inArray(offers.id, offerIds))
      : [];
    const offerMap = new Map(offersData.map(o => [o.id, o.name]));
    const offerPayoutMap = new Map(offersData.map(o => [o.id, parseFloat(o.partnerPayout || '0')]));
    
    // Get landing payouts as fallback
    const landingsData = offerIds.length > 0 
      ? await db.select({ offerId: offerLandings.offerId, partnerPayout: offerLandings.partnerPayout }).from(offerLandings).where(inArray(offerLandings.offerId, offerIds))
      : [];
    const landingPayoutMap = new Map<string, number>();
    landingsData.forEach(l => {
      if (!landingPayoutMap.has(l.offerId)) {
        landingPayoutMap.set(l.offerId, parseFloat(l.partnerPayout || '0'));
      }
    });
    
    // Merge payout maps
    offerIds.forEach(id => {
      const offerPayout = offerPayoutMap.get(id) || 0;
      if (offerPayout === 0) {
        offerPayoutMap.set(id, landingPayoutMap.get(id) || 0);
      }
    });
    
    // Get publisher names with single query
    const publisherIds = Array.from(new Set(paginatedClicks.map(c => c.publisherId)));
    const publishersData = publisherIds.length > 0 
      ? await db.select({ id: users.id, username: users.username }).from(users).where(inArray(users.id, publisherIds))
      : [];
    const publisherMap = new Map(publishersData.map(p => [p.id, p.username]));
    
    // Step 5: Build conversions map by clickId
    const conversionsByClickId = new Map<string, any[]>();
    pageConversions.forEach(conv => {
      if (!conversionsByClickId.has(conv.clickId)) {
        conversionsByClickId.set(conv.clickId, []);
      }
      conversionsByClickId.get(conv.clickId)!.push(conv);
    });
    
    // Enrich clicks with conversion data
    const enrichedClicks = paginatedClicks.map(click => {
      const clickConversions = conversionsByClickId.get(click.id) || [];
      const conversionCount = clickConversions.length;
      const approvedCount = clickConversions.filter(conv => conv.status === 'approved').length;
      const hasConversion = conversionCount > 0;
      const leads = clickConversions.filter(conv => conv.conversionType === 'lead').length;
      const sales = clickConversions.filter(conv => conv.conversionType === 'sale').length;
      const payout = clickConversions.reduce((sum, conv) => sum + parseFloat(conv.publisherPayout || '0'), 0);
      const cost = clickConversions.reduce((sum, conv) => sum + parseFloat(conv.advertiserCost || '0'), 0);
      const margin = cost - payout;
      const roi = cost > 0 ? ((margin / cost) * 100) : 0;
      const payableConversions = clickConversions.filter(conv => parseFloat(conv.publisherPayout || '0') > 0);
      const approvedPayable = payableConversions.filter(conv => conv.status === 'approved');
      const cr = payableConversions.length > 0 ? 100 : 0;
      const ar = payableConversions.length > 0 ? Math.round((approvedPayable.length / payableConversions.length) * 100 * 100) / 100 : 0;
      const epc = Math.round(payout * 100) / 100;
      
      return {
        ...click,
        offerName: offerMap.get(click.offerId) || click.offerId,
        publisherName: publisherMap.get(click.publisherId) || click.publisherId,
        isUnique: click.isUnique ?? true,
        hasConversion,
        clicks: 1,
        conversions: conversionCount,
        approvedConversions: approvedCount,
        payableConversions: payableConversions.length,
        approvedPayableConversions: approvedPayable.length,
        leads,
        sales,
        payout,
        advertiserCost: cost,
        margin,
        roi,
        cr,
        ar,
        epc,
      };
    });
    
    // Step 6: Calculate summary via SQL aggregation with JOIN (applies ALL click filters)
    const summaryResult = whereCondition 
      ? await db.select({
          totalClicks: sql<number>`count(*)::int`,
          uniqueClicks: sql<number>`count(*) FILTER (WHERE ${clicks.isUnique} = true)::int`
        }).from(clicks).where(whereCondition)
      : await db.select({
          totalClicks: sql<number>`count(*)::int`,
          uniqueClicks: sql<number>`count(*) FILTER (WHERE ${clicks.isUnique} = true)::int`
        }).from(clicks);
    
    // Get conversion summary using JOIN with clicks to apply ALL click filters
    let convSummary = { 
      totalConversions: 0, 
      approvedConversions: 0, 
      payableConversions: 0, 
      approvedPayableConversions: 0,
      leads: 0, 
      sales: 0, 
      totalPayout: 0, 
      totalCost: 0 
    };
    
    if (total > 0) {
      // Use JOIN to apply click filters to conversions - this is the correct approach
      // For dateMode=conversion, also apply date filter to conversions in the JOIN
      
      // Build JOIN condition with optional conversion date filter
      let joinCondition = eq(conversions.clickId, clicks.id);
      
      // For dateMode=conversion, add ALL conversion-side filters to JOIN for consistency
      if (dateMode === "conversion") {
        const joinConditions: any[] = [eq(conversions.clickId, clicks.id)];
        if (filters.dateFrom) joinConditions.push(gte(conversions.createdAt, filters.dateFrom));
        if (filters.dateTo) joinConditions.push(lte(conversions.createdAt, filters.dateTo));
        if (filters.publisherId) joinConditions.push(eq(conversions.publisherId, filters.publisherId));
        if (filters.offerId) joinConditions.push(eq(conversions.offerId, filters.offerId));
        if (filters.offerIds?.length) joinConditions.push(inArray(conversions.offerId, filters.offerIds));
        joinCondition = and(...joinConditions)!;
      }
      
      const convSummaryResult = whereCondition 
        ? await db.select({
            totalConversions: sql<number>`count(${conversions.id})::int`,
            approvedConversions: sql<number>`count(${conversions.id}) FILTER (WHERE ${conversions.status} = 'approved')::int`,
            payableConversions: sql<number>`count(${conversions.id}) FILTER (WHERE CAST(${conversions.publisherPayout} AS DECIMAL) > 0)::int`,
            approvedPayableConversions: sql<number>`count(${conversions.id}) FILTER (WHERE ${conversions.status} = 'approved' AND CAST(${conversions.publisherPayout} AS DECIMAL) > 0)::int`,
            leads: sql<number>`count(${conversions.id}) FILTER (WHERE ${conversions.conversionType} = 'lead')::int`,
            sales: sql<number>`count(${conversions.id}) FILTER (WHERE ${conversions.conversionType} = 'sale')::int`,
            totalPayout: sql<number>`COALESCE(SUM(CAST(${conversions.publisherPayout} AS DECIMAL)), 0)::numeric`,
            totalCost: sql<number>`COALESCE(SUM(CAST(${conversions.advertiserCost} AS DECIMAL)), 0)::numeric`
          }).from(clicks)
            .leftJoin(conversions, joinCondition)
            .where(whereCondition)
        : await db.select({
            totalConversions: sql<number>`count(${conversions.id})::int`,
            approvedConversions: sql<number>`count(${conversions.id}) FILTER (WHERE ${conversions.status} = 'approved')::int`,
            payableConversions: sql<number>`count(${conversions.id}) FILTER (WHERE CAST(${conversions.publisherPayout} AS DECIMAL) > 0)::int`,
            approvedPayableConversions: sql<number>`count(${conversions.id}) FILTER (WHERE ${conversions.status} = 'approved' AND CAST(${conversions.publisherPayout} AS DECIMAL) > 0)::int`,
            leads: sql<number>`count(${conversions.id}) FILTER (WHERE ${conversions.conversionType} = 'lead')::int`,
            sales: sql<number>`count(${conversions.id}) FILTER (WHERE ${conversions.conversionType} = 'sale')::int`,
            totalPayout: sql<number>`COALESCE(SUM(CAST(${conversions.publisherPayout} AS DECIMAL)), 0)::numeric`,
            totalCost: sql<number>`COALESCE(SUM(CAST(${conversions.advertiserCost} AS DECIMAL)), 0)::numeric`
          }).from(clicks)
            .leftJoin(conversions, joinCondition);
      
      if (convSummaryResult[0]) {
        convSummary = {
          totalConversions: convSummaryResult[0].totalConversions || 0,
          approvedConversions: convSummaryResult[0].approvedConversions || 0,
          payableConversions: convSummaryResult[0].payableConversions || 0,
          approvedPayableConversions: convSummaryResult[0].approvedPayableConversions || 0,
          leads: convSummaryResult[0].leads || 0,
          sales: convSummaryResult[0].sales || 0,
          totalPayout: Number(convSummaryResult[0].totalPayout) || 0,
          totalCost: Number(convSummaryResult[0].totalCost) || 0
        };
      }
    }
    
    const clicksCount = summaryResult[0]?.totalClicks || 0;
    const uniqueClicks = summaryResult[0]?.uniqueClicks || 0;
    const margin = convSummary.totalCost - convSummary.totalPayout;
    
    const summary = {
      clicks: clicksCount,
      uniqueClicks,
      conversions: convSummary.totalConversions,
      approvedConversions: convSummary.approvedConversions,
      payableConversions: convSummary.payableConversions,
      approvedPayableConversions: convSummary.approvedPayableConversions,
      leads: convSummary.leads,
      sales: convSummary.sales,
      payout: convSummary.totalPayout,
      advertiserCost: convSummary.totalCost,
      margin,
      roi: convSummary.totalCost > 0 ? ((margin / convSummary.totalCost) * 100) : 0,
      cr: clicksCount > 0 ? Math.round((convSummary.payableConversions / clicksCount) * 100 * 100) / 100 : 0,
      ar: convSummary.payableConversions > 0 ? Math.round((convSummary.approvedPayableConversions / convSummary.payableConversions) * 100 * 100) / 100 : 0,
      epc: clicksCount > 0 ? Math.round((convSummary.totalPayout / clicksCount) * 100) / 100 : 0
    };
    
    return { clicks: enrichedClicks, total, page, limit, summary };
  }

  async getConversionsReport(filters: any, groupBy?: string, page: number = 1, limit: number = 50): Promise<{ conversions: any[]; total: number; page: number; limit: number }> {
    const conditions: any[] = [];
    
    // Handle free text search - filter by offer name
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchingOffers = await db.select({ id: offers.id }).from(offers)
        .where(sql`LOWER(${offers.name}) LIKE ${`%${searchLower}%`}`);
      const matchingOfferIds = matchingOffers.map(o => o.id);
      if (matchingOfferIds.length === 0) {
        return { conversions: [], total: 0, page, limit };
      }
      // Combine with existing offerIds filter if any
      if (filters.offerIds?.length) {
        const intersection = filters.offerIds.filter((id: string) => matchingOfferIds.includes(id));
        if (intersection.length === 0) {
          return { conversions: [], total: 0, page, limit };
        }
        conditions.push(inArray(conversions.offerId, intersection));
      } else {
        conditions.push(inArray(conversions.offerId, matchingOfferIds));
      }
    } else if (filters.offerIds?.length) {
      conditions.push(inArray(conversions.offerId, filters.offerIds));
    }
    
    if (filters.publisherId) conditions.push(eq(conversions.publisherId, filters.publisherId));
    if (filters.offerId) conditions.push(eq(conversions.offerId, filters.offerId));
    if (filters.dateFrom) conditions.push(gte(conversions.createdAt, filters.dateFrom));
    if (filters.dateTo) conditions.push(lte(conversions.createdAt, filters.dateTo));
    if (filters.status) conditions.push(eq(conversions.status, filters.status));
    if (filters.conversionType) conditions.push(eq(conversions.conversionType, filters.conversionType));
    
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (page - 1) * limit;
    
    // OPTIMIZATION: Use SQL COUNT(*) instead of .length
    const countResult = whereCondition
      ? await db.select({ count: sql<number>`count(*)::int` }).from(conversions).where(whereCondition)
      : await db.select({ count: sql<number>`count(*)::int` }).from(conversions);
    const total = countResult[0]?.count || 0;
    
    // OPTIMIZATION: Use SQL OFFSET/LIMIT instead of .slice()
    const paginatedConversions = whereCondition 
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
          sub6: clicks.sub6,
          sub7: clicks.sub7,
          sub8: clicks.sub8,
          sub9: clicks.sub9,
          sub10: clicks.sub10,
          geo: clicks.geo,
        }).from(conversions).leftJoin(clicks, eq(conversions.clickId, clicks.id)).where(whereCondition).orderBy(desc(conversions.createdAt)).limit(limit).offset(offset)
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
          sub6: clicks.sub6,
          sub7: clicks.sub7,
          sub8: clicks.sub8,
          sub9: clicks.sub9,
          sub10: clicks.sub10,
          geo: clicks.geo,
        }).from(conversions).leftJoin(clicks, eq(conversions.clickId, clicks.id)).orderBy(desc(conversions.createdAt)).limit(limit).offset(offset);
    
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
    // OPTIMIZED: Use SQL GROUP BY instead of O(n²) in-memory processing
    
    // Handle free text search - filter by offer name
    let effectiveOfferIds = filters.offerIds || [];
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchingOffers = await db.select({ id: offers.id }).from(offers)
        .where(sql`LOWER(${offers.name}) LIKE ${`%${searchLower}%`}`);
      const matchingOfferIds = matchingOffers.map(o => o.id);
      if (matchingOfferIds.length === 0) {
        return { data: [], groupBy, summary: { clicks: 0, uniqueClicks: 0, leads: 0, sales: 0, conversions: 0, approvedConversions: 0, payout: 0, advertiserCost: 0, margin: 0, roi: 0, cr: 0, ar: 0, epc: 0 } };
      }
      if (effectiveOfferIds.length > 0) {
        effectiveOfferIds = effectiveOfferIds.filter((id: string) => matchingOfferIds.includes(id));
        if (effectiveOfferIds.length === 0) {
          return { data: [], groupBy, summary: { clicks: 0, uniqueClicks: 0, leads: 0, sales: 0, conversions: 0, approvedConversions: 0, payout: 0, advertiserCost: 0, margin: 0, roi: 0, cr: 0, ar: 0, epc: 0 } };
        }
      } else {
        effectiveOfferIds = matchingOfferIds;
      }
    }
    
    // Build WHERE conditions for clicks
    const clickConditions: any[] = [];
    if (filters.publisherId) clickConditions.push(eq(clicks.publisherId, filters.publisherId));
    if (filters.offerId) clickConditions.push(eq(clicks.offerId, filters.offerId));
    if (effectiveOfferIds.length > 0) clickConditions.push(inArray(clicks.offerId, effectiveOfferIds));
    if (filters.dateFrom) clickConditions.push(gte(clicks.createdAt, filters.dateFrom));
    if (filters.dateTo) clickConditions.push(lte(clicks.createdAt, filters.dateTo));
    
    const clickWhere = clickConditions.length > 0 ? and(...clickConditions) : undefined;
    
    // Determine SQL GROUP BY expression based on groupBy parameter
    // Use TO_CHAR for dates to ensure consistent YYYY-MM-DD string format
    const getClickGroupExpr = () => {
      switch (groupBy) {
        case "date": return sql`TO_CHAR(${clicks.createdAt}, 'YYYY-MM-DD')`;
        case "geo": return sql`COALESCE(${clicks.geo}, 'unknown')`;
        case "publisher": return clicks.publisherId;
        case "offer": return clicks.offerId;
        case "device": return sql`COALESCE(${clicks.device}, 'unknown')`;
        case "os": return sql`COALESCE(${clicks.os}, 'unknown')`;
        case "browser": return sql`COALESCE(${clicks.browser}, 'unknown')`;
        case "sub1": return sql`COALESCE(${clicks.sub1}, 'empty')`;
        case "sub2": return sql`COALESCE(${clicks.sub2}, 'empty')`;
        case "sub3": return sql`COALESCE(${clicks.sub3}, 'empty')`;
        case "sub4": return sql`COALESCE(${clicks.sub4}, 'empty')`;
        case "sub5": return sql`COALESCE(${clicks.sub5}, 'empty')`;
        default: return sql`TO_CHAR(${clicks.createdAt}, 'YYYY-MM-DD')`;
      }
    };
    
    // SQL GROUP BY for clicks - no in-memory loops
    const clickGroupExpr = getClickGroupExpr();
    const clickStats = clickWhere
      ? await db.select({
          groupKey: clickGroupExpr,
          clicks: sql<number>`count(*)::int`,
          uniqueClicks: sql<number>`count(*) FILTER (WHERE ${clicks.isUnique})::int`
        }).from(clicks).where(clickWhere).groupBy(clickGroupExpr)
      : await db.select({
          groupKey: clickGroupExpr,
          clicks: sql<number>`count(*)::int`,
          uniqueClicks: sql<number>`count(*) FILTER (WHERE ${clicks.isUnique})::int`
        }).from(clicks).groupBy(clickGroupExpr);
    
    // Build click stats map
    const clickStatsMap = new Map<string, { clicks: number; uniqueClicks: number }>();
    for (const row of clickStats) {
      const key = String(row.groupKey);
      clickStatsMap.set(key, { clicks: row.clicks || 0, uniqueClicks: row.uniqueClicks || 0 });
    }
    
    // For conversions, need to JOIN with clicks to get groupBy fields (geo, device, etc.)
    const convConditions: any[] = [];
    if (filters.publisherId) convConditions.push(eq(conversions.publisherId, filters.publisherId));
    if (filters.offerId) convConditions.push(eq(conversions.offerId, filters.offerId));
    if (effectiveOfferIds.length > 0) convConditions.push(inArray(conversions.offerId, effectiveOfferIds));
    if (filters.dateFrom) convConditions.push(gte(conversions.createdAt, filters.dateFrom));
    if (filters.dateTo) convConditions.push(lte(conversions.createdAt, filters.dateTo));
    
    const convWhere = convConditions.length > 0 ? and(...convConditions) : undefined;
    
    // Determine conversion GROUP BY expression (may need click data)
    // Use TO_CHAR for dates to ensure consistent YYYY-MM-DD string format
    const getConvGroupExpr = () => {
      switch (groupBy) {
        case "date": return sql`TO_CHAR(${conversions.createdAt}, 'YYYY-MM-DD')`;
        case "geo": return sql`COALESCE(${clicks.geo}, 'unknown')`;
        case "publisher": return conversions.publisherId;
        case "offer": return conversions.offerId;
        case "device": return sql`COALESCE(${clicks.device}, 'unknown')`;
        case "os": return sql`COALESCE(${clicks.os}, 'unknown')`;
        case "browser": return sql`COALESCE(${clicks.browser}, 'unknown')`;
        case "sub1": return sql`COALESCE(${clicks.sub1}, 'empty')`;
        case "sub2": return sql`COALESCE(${clicks.sub2}, 'empty')`;
        case "sub3": return sql`COALESCE(${clicks.sub3}, 'empty')`;
        case "sub4": return sql`COALESCE(${clicks.sub4}, 'empty')`;
        case "sub5": return sql`COALESCE(${clicks.sub5}, 'empty')`;
        default: return sql`TO_CHAR(${conversions.createdAt}, 'YYYY-MM-DD')`;
      }
    };
    
    // SQL GROUP BY for conversions with LEFT JOIN to clicks
    const convGroupExpr = getConvGroupExpr();
    const convStats = convWhere
      ? await db.select({
          groupKey: convGroupExpr,
          conversions: sql<number>`count(*)::int`,
          approvedConversions: sql<number>`count(*) FILTER (WHERE ${conversions.status} = 'approved')::int`,
          leads: sql<number>`count(*) FILTER (WHERE ${conversions.conversionType} = 'lead')::int`,
          sales: sql<number>`count(*) FILTER (WHERE ${conversions.conversionType} = 'sale')::int`,
          payout: sql<number>`COALESCE(sum(${conversions.publisherPayout}::numeric), 0)::float`,
          cost: sql<number>`COALESCE(sum(${conversions.advertiserCost}::numeric), 0)::float`,
          payableConversions: sql<number>`count(*) FILTER (WHERE ${conversions.publisherPayout}::numeric > 0)::int`,
          approvedPayableConversions: sql<number>`count(*) FILTER (WHERE ${conversions.status} = 'approved' AND ${conversions.publisherPayout}::numeric > 0)::int`
        }).from(conversions).leftJoin(clicks, eq(conversions.clickId, clicks.id)).where(convWhere).groupBy(convGroupExpr)
      : await db.select({
          groupKey: convGroupExpr,
          conversions: sql<number>`count(*)::int`,
          approvedConversions: sql<number>`count(*) FILTER (WHERE ${conversions.status} = 'approved')::int`,
          leads: sql<number>`count(*) FILTER (WHERE ${conversions.conversionType} = 'lead')::int`,
          sales: sql<number>`count(*) FILTER (WHERE ${conversions.conversionType} = 'sale')::int`,
          payout: sql<number>`COALESCE(sum(${conversions.publisherPayout}::numeric), 0)::float`,
          cost: sql<number>`COALESCE(sum(${conversions.advertiserCost}::numeric), 0)::float`,
          payableConversions: sql<number>`count(*) FILTER (WHERE ${conversions.publisherPayout}::numeric > 0)::int`,
          approvedPayableConversions: sql<number>`count(*) FILTER (WHERE ${conversions.status} = 'approved' AND ${conversions.publisherPayout}::numeric > 0)::int`
        }).from(conversions).leftJoin(clicks, eq(conversions.clickId, clicks.id)).groupBy(convGroupExpr);
    
    // Build conversion stats map for O(1) lookup instead of O(n²) find()
    const convStatsMap = new Map<string, typeof convStats[0]>();
    for (const row of convStats) {
      const key = String(row.groupKey);
      convStatsMap.set(key, row);
    }
    
    // Merge click stats and conversion stats
    const allKeys = new Set([...clickStatsMap.keys(), ...convStatsMap.keys()]);
    const grouped: any[] = [];
    
    for (const key of allKeys) {
      const clickData = clickStatsMap.get(key) || { clicks: 0, uniqueClicks: 0 };
      const convData = convStatsMap.get(key);
      
      const rowClicks = clickData.clicks;
      const rowPayout = convData?.payout || 0;
      const rowPayableConv = convData?.payableConversions || 0;
      const rowApprovedPayableConv = convData?.approvedPayableConversions || 0;
      
      const metrics = calculateMetrics({
        clicks: rowClicks,
        payableConversions: rowPayableConv,
        approvedPayableConversions: rowApprovedPayableConv,
        totalPayout: rowPayout
      });
      
      grouped.push({
        groupKey: key,
        groupBy,
        clicks: rowClicks,
        uniqueClicks: clickData.uniqueClicks,
        leads: convData?.leads || 0,
        sales: convData?.sales || 0,
        conversions: convData?.conversions || 0,
        approvedConversions: convData?.approvedConversions || 0,
        payout: rowPayout,
        payableConversions: rowPayableConv,
        approvedPayableConversions: rowApprovedPayableConv,
        cost: role !== "publisher" ? (convData?.cost || 0) : 0,
        cr: metrics.cr,
        ar: metrics.ar,
        epc: metrics.epc
      });
    }
    
    // Sort result
    grouped.sort((a, b) => {
      if (groupBy === "date") return b.groupKey.localeCompare(a.groupKey);
      return b.clicks - a.clicks;
    });
    
    // Calculate summary via SQL aggregation (not in-memory)
    const clickSummary = clickWhere
      ? await db.select({
          totalClicks: sql<number>`count(*)::int`,
          totalUniqueClicks: sql<number>`count(*) FILTER (WHERE ${clicks.isUnique})::int`
        }).from(clicks).where(clickWhere)
      : await db.select({
          totalClicks: sql<number>`count(*)::int`,
          totalUniqueClicks: sql<number>`count(*) FILTER (WHERE ${clicks.isUnique})::int`
        }).from(clicks);
    
    const convSummary = convWhere
      ? await db.select({
          totalConversions: sql<number>`count(*)::int`,
          totalApprovedConversions: sql<number>`count(*) FILTER (WHERE ${conversions.status} = 'approved')::int`,
          totalLeads: sql<number>`count(*) FILTER (WHERE ${conversions.conversionType} = 'lead')::int`,
          totalSales: sql<number>`count(*) FILTER (WHERE ${conversions.conversionType} = 'sale')::int`,
          totalPayout: sql<number>`COALESCE(sum(${conversions.publisherPayout}::numeric), 0)::float`,
          totalCost: sql<number>`COALESCE(sum(${conversions.advertiserCost}::numeric), 0)::float`,
          totalPayableConversions: sql<number>`count(*) FILTER (WHERE ${conversions.publisherPayout}::numeric > 0)::int`,
          totalApprovedPayableConversions: sql<number>`count(*) FILTER (WHERE ${conversions.status} = 'approved' AND ${conversions.publisherPayout}::numeric > 0)::int`
        }).from(conversions).where(convWhere)
      : await db.select({
          totalConversions: sql<number>`count(*)::int`,
          totalApprovedConversions: sql<number>`count(*) FILTER (WHERE ${conversions.status} = 'approved')::int`,
          totalLeads: sql<number>`count(*) FILTER (WHERE ${conversions.conversionType} = 'lead')::int`,
          totalSales: sql<number>`count(*) FILTER (WHERE ${conversions.conversionType} = 'sale')::int`,
          totalPayout: sql<number>`COALESCE(sum(${conversions.publisherPayout}::numeric), 0)::float`,
          totalCost: sql<number>`COALESCE(sum(${conversions.advertiserCost}::numeric), 0)::float`,
          totalPayableConversions: sql<number>`count(*) FILTER (WHERE ${conversions.publisherPayout}::numeric > 0)::int`,
          totalApprovedPayableConversions: sql<number>`count(*) FILTER (WHERE ${conversions.status} = 'approved' AND ${conversions.publisherPayout}::numeric > 0)::int`
        }).from(conversions);
    
    const totalClicks = clickSummary[0]?.totalClicks || 0;
    const totalUniqueClicks = clickSummary[0]?.totalUniqueClicks || 0;
    const totalPayout = convSummary[0]?.totalPayout || 0;
    const totalCost = role !== "publisher" ? (convSummary[0]?.totalCost || 0) : 0;
    const payableConversions = convSummary[0]?.totalPayableConversions || 0;
    const approvedPayableConversions = convSummary[0]?.totalApprovedPayableConversions || 0;
    
    const summaryMetrics = calculateMetrics({
      clicks: totalClicks,
      payableConversions,
      approvedPayableConversions,
      totalPayout
    });
    
    const summary = {
      clicks: totalClicks,
      uniqueClicks: totalUniqueClicks,
      leads: convSummary[0]?.totalLeads || 0,
      sales: convSummary[0]?.totalSales || 0,
      conversions: convSummary[0]?.totalConversions || 0,
      approvedConversions: convSummary[0]?.totalApprovedConversions || 0,
      payout: totalPayout,
      advertiserCost: totalCost,
      margin: totalCost - totalPayout,
      roi: totalPayout > 0 ? ((totalCost - totalPayout) / totalPayout * 100) : 0,
      cr: summaryMetrics.cr,
      ar: summaryMetrics.ar,
      epc: summaryMetrics.epc
    };
    
    return { data: grouped, groupBy, summary };
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
    // Get data directly from clicks table for last 30 days
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);
    
    const conditions: any[] = [gte(clicks.createdAt, dateFrom)];
    
    // If advertiserId provided, filter by their offers
    if (advertiserId) {
      const advertiserOffers = await db.select({ id: offers.id }).from(offers).where(eq(offers.advertiserId, advertiserId));
      const offerIds = advertiserOffers.map(o => o.id);
      if (offerIds.length === 0) {
        return {
          totalClicks: 0,
          blockedClicks: 0,
          flaggedClicks: 0,
          blockRate: 0,
          avgFraudScore: 0,
          byType: [
            { type: "Proxy/VPN", count: 0 },
            { type: "Bot", count: 0 },
            { type: "Datacenter", count: 0 }
          ]
        };
      }
      conditions.push(inArray(clicks.offerId, offerIds));
    }
    
    // Get aggregated stats from clicks
    const stats = await db.select({
      totalClicks: sql<number>`COUNT(*)::int`,
      blockedClicks: sql<number>`COUNT(*) FILTER (WHERE ${clicks.antifraudAction} = 'block' OR ${clicks.antifraudAction} = 'reject')::int`,
      flaggedClicks: sql<number>`COUNT(*) FILTER (WHERE ${clicks.isSuspicious} = true)::int`,
      proxyVpnCount: sql<number>`COUNT(*) FILTER (WHERE ${clicks.isProxy} = true OR ${clicks.isVpn} = true)::int`,
      botCount: sql<number>`COUNT(*) FILTER (WHERE ${clicks.isBot} = true)::int`,
      datacenterCount: sql<number>`COUNT(*) FILTER (WHERE ${clicks.isDatacenter} = true)::int`,
      avgFraudScore: sql<number>`COALESCE(AVG(${clicks.fraudScore}), 0)::float`,
    })
    .from(clicks)
    .where(and(...conditions));
    
    const result = stats[0] || { totalClicks: 0, blockedClicks: 0, flaggedClicks: 0, proxyVpnCount: 0, botCount: 0, datacenterCount: 0, avgFraudScore: 0 };
    
    return {
      totalClicks: result.totalClicks || 0,
      blockedClicks: result.blockedClicks || 0,
      flaggedClicks: result.flaggedClicks || 0,
      blockRate: result.totalClicks > 0 ? (result.blockedClicks / result.totalClicks) * 100 : 0,
      avgFraudScore: result.avgFraudScore || 0,
      byType: [
        { type: "Proxy/VPN", count: result.proxyVpnCount || 0 },
        { type: "Bot", count: result.botCount || 0 },
        { type: "Datacenter", count: result.datacenterCount || 0 }
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
    
    // Encrypt sensitive fields if provided and not already encrypted
    const encryptedData = { ...data };
    if (data.defaultTelegramBotToken && !hasSecret(data.defaultTelegramBotToken)) {
      encryptedData.defaultTelegramBotToken = encrypt(data.defaultTelegramBotToken);
    }
    if (data.stripeSecretKey && !hasSecret(data.stripeSecretKey)) {
      encryptedData.stripeSecretKey = encrypt(data.stripeSecretKey);
    }
    if (data.cloudflareApiToken && !hasSecret(data.cloudflareApiToken)) {
      encryptedData.cloudflareApiToken = encrypt(data.cloudflareApiToken);
    }
    if (data.ipinfoToken && !hasSecret(data.ipinfoToken)) {
      encryptedData.ipinfoToken = encrypt(data.ipinfoToken);
    }
    if (data.fingerprintjsApiKey && !hasSecret(data.fingerprintjsApiKey)) {
      encryptedData.fingerprintjsApiKey = encrypt(data.fingerprintjsApiKey);
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

  async getAdvertiserStaffByEmailOnly(email: string): Promise<AdvertiserStaff | undefined> {
    const [staff] = await db.select().from(advertiserStaff)
      .where(eq(advertiserStaff.email, email));
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

  async getNotifications(userId: string, limit: number = 50, advertiserScopeId?: string): Promise<Notification[]> {
    let whereClause;
    if (advertiserScopeId) {
      whereClause = or(
        eq(notifications.recipientId, userId),
        eq(notifications.advertiserScopeId, advertiserScopeId)
      );
    } else {
      whereClause = eq(notifications.recipientId, userId);
    }
    return db.select().from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(userId: string, advertiserScopeId?: string): Promise<number> {
    let whereClause;
    if (advertiserScopeId) {
      whereClause = and(
        or(
          eq(notifications.recipientId, userId),
          eq(notifications.advertiserScopeId, advertiserScopeId)
        ),
        eq(notifications.isRead, false)
      );
    } else {
      whereClause = and(
        eq(notifications.recipientId, userId),
        eq(notifications.isRead, false)
      );
    }
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(whereClause);
    return result[0]?.count || 0;
  }

  async markNotificationRead(id: string, userId: string): Promise<Notification | undefined> {
    const [updated] = await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(notifications.id, id),
        eq(notifications.recipientId, userId)
      ))
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

  async getAllNewsPosts(): Promise<NewsPost[]> {
    return db.select().from(newsPosts)
      .orderBy(desc(newsPosts.createdAt))
      .limit(100);
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

  // Domain Request Workflow (Admin)
  async getAllDomainRequests(): Promise<(CustomDomain & { advertiser: User })[]> {
    const results = await db
      .select({
        domain: customDomains,
        advertiser: users,
      })
      .from(customDomains)
      .innerJoin(users, eq(customDomains.advertiserId, users.id))
      .where(
        or(
          eq(customDomains.requestStatus, "admin_review"),
          eq(customDomains.requestStatus, "ns_configured"),
          eq(customDomains.requestStatus, "provisioning"),
          eq(customDomains.requestStatus, "pending")
        )
      )
      .orderBy(desc(customDomains.requestedAt));
    
    return results.map((r) => ({ ...r.domain, advertiser: r.advertiser }));
  }

  async submitDomainRequest(domainId: string): Promise<CustomDomain | undefined> {
    const [updated] = await db.update(customDomains)
      .set({
        requestStatus: "admin_review",
        requestedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(customDomains.id, domainId))
      .returning();
    return updated;
  }

  async approveDomainRequest(domainId: string, adminNotes?: string): Promise<CustomDomain | undefined> {
    const [updated] = await db.update(customDomains)
      .set({
        requestStatus: "provisioning",
        adminNotes: adminNotes || null,
        updatedAt: new Date(),
      })
      .where(eq(customDomains.id, domainId))
      .returning();
    return updated;
  }

  async rejectDomainRequest(domainId: string, reason: string): Promise<CustomDomain | undefined> {
    const [updated] = await db.update(customDomains)
      .set({
        requestStatus: "rejected",
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(customDomains.id, domainId))
      .returning();
    return updated;
  }

  async activateDomain(domainId: string): Promise<CustomDomain | undefined> {
    const [updated] = await db.update(customDomains)
      .set({
        requestStatus: "active",
        isVerified: true,
        isActive: true,
        verifiedAt: new Date(),
        activatedAt: new Date(),
        sslStatus: "ssl_active",
        updatedAt: new Date(),
      })
      .where(eq(customDomains.id, domainId))
      .returning();
    return updated;
  }

  // Whitelabel Settings
  async getWhitelabelSettings(advertiserId: string): Promise<AdvertiserSettings | undefined> {
    return this.getAdvertiserSettings(advertiserId);
  }

  async updateWhitelabelSettings(advertiserId: string, data: {
    brandName?: string;
    logoUrl?: string;
    faviconUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    hidePlatformBranding?: boolean;
    customCss?: string;
    emailLogoUrl?: string;
    emailFooterText?: string;
  }): Promise<AdvertiserSettings | undefined> {
    let settings = await this.getAdvertiserSettings(advertiserId);
    if (!settings) {
      settings = await this.createAdvertiserSettings({ advertiserId });
    }
    return this.updateAdvertiserSettings(advertiserId, data);
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
  // ADMIN SUBSCRIPTION MANAGEMENT
  // ============================================

  async getAllSubscriptionsForAdmin(filters?: { status?: string; planId?: string; search?: string }): Promise<Array<AdvertiserSubscription & { user: User; plan: SubscriptionPlan | null }>> {
    const conditions: any[] = [];
    
    if (filters?.status) {
      conditions.push(eq(advertiserSubscriptions.status, filters.status));
    }
    if (filters?.planId) {
      conditions.push(eq(advertiserSubscriptions.planId, filters.planId));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const subs = whereClause 
      ? await db.select().from(advertiserSubscriptions).where(whereClause).orderBy(desc(advertiserSubscriptions.updatedAt))
      : await db.select().from(advertiserSubscriptions).orderBy(desc(advertiserSubscriptions.updatedAt));
    
    const result = [];
    for (const sub of subs) {
      const user = await this.getUser(sub.advertiserId);
      if (!user) continue;
      
      // Apply search filter on user data
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        if (!user.email.toLowerCase().includes(searchLower) && 
            !user.username.toLowerCase().includes(searchLower)) {
          continue;
        }
      }
      
      const plan = sub.planId ? (await this.getSubscriptionPlanById(sub.planId) ?? null) : null;
      result.push({ ...sub, user, plan });
    }
    
    return result;
  }

  async getSubscriptionById(id: string): Promise<(AdvertiserSubscription & { user: User; plan: SubscriptionPlan | null }) | undefined> {
    const [sub] = await db.select().from(advertiserSubscriptions).where(eq(advertiserSubscriptions.id, id));
    if (!sub) return undefined;
    
    const user = await this.getUser(sub.advertiserId);
    if (!user) return undefined;
    
    const plan = sub.planId ? (await this.getSubscriptionPlanById(sub.planId) ?? null) : null;
    return { ...sub, user, plan };
  }

  async extendSubscription(id: string, newEndDate: Date, note?: string): Promise<AdvertiserSubscription | undefined> {
    // Get current subscription to check planId
    const [current] = await db.select().from(advertiserSubscriptions).where(eq(advertiserSubscriptions.id, id));
    
    let planIdToSet = current?.planId;
    
    // If no planId, set default plan (Starter or first available)
    if (!planIdToSet) {
      const starterPlan = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.name, "Starter")).limit(1);
      if (starterPlan.length > 0) {
        planIdToSet = starterPlan[0].id;
      } else {
        // Fallback to first available plan
        const anyPlan = await db.select().from(subscriptionPlans).limit(1);
        if (anyPlan.length > 0) {
          planIdToSet = anyPlan[0].id;
        }
      }
    }
    
    const updateData: Record<string, unknown> = { 
      currentPeriodEnd: newEndDate,
      status: "active",
      updatedAt: new Date()
    };
    
    // Only set planId if we have a valid one
    if (planIdToSet) {
      updateData.planId = planIdToSet;
    }
    
    const [updated] = await db.update(advertiserSubscriptions)
      .set(updateData)
      .where(eq(advertiserSubscriptions.id, id))
      .returning();
    return updated;
  }

  async grantSubscription(advertiserId: string, planId: string, periodEnd: Date): Promise<AdvertiserSubscription> {
    // Check if subscription exists
    const existing = await this.getAdvertiserSubscription(advertiserId);
    
    if (existing) {
      // Update existing subscription
      const [updated] = await db.update(advertiserSubscriptions)
        .set({
          planId,
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
          trialEndsAt: null,
          cancelledAt: null,
          updatedAt: new Date()
        })
        .where(eq(advertiserSubscriptions.id, existing.id))
        .returning();
      return updated;
    }
    
    // Create new subscription
    const [created] = await db.insert(advertiserSubscriptions).values({
      advertiserId,
      planId,
      status: "active",
      billingCycle: "monthly",
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
    }).returning();
    return created;
  }

  async changeSubscriptionPlan(id: string, planId: string): Promise<AdvertiserSubscription | undefined> {
    const [updated] = await db.update(advertiserSubscriptions)
      .set({ 
        planId,
        updatedAt: new Date()
      })
      .where(eq(advertiserSubscriptions.id, id))
      .returning();
    return updated;
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

  // ============================================
  // INCOMING POSTBACK CONFIGS (Advertiser parameter mapping)
  // ============================================

  async getIncomingPostbackConfig(advertiserId: string, offerId?: string): Promise<IncomingPostbackConfig | undefined> {
    if (offerId) {
      const [config] = await db.select().from(incomingPostbackConfigs)
        .where(and(
          eq(incomingPostbackConfigs.advertiserId, advertiserId),
          eq(incomingPostbackConfigs.offerId, offerId),
          eq(incomingPostbackConfigs.isActive, true)
        ));
      if (config) return config;
    }
    const [defaultConfig] = await db.select().from(incomingPostbackConfigs)
      .where(and(
        eq(incomingPostbackConfigs.advertiserId, advertiserId),
        sql`${incomingPostbackConfigs.offerId} IS NULL`,
        eq(incomingPostbackConfigs.isActive, true)
      ));
    return defaultConfig;
  }

  async getIncomingPostbackConfigsByAdvertiser(advertiserId: string): Promise<IncomingPostbackConfig[]> {
    return db.select().from(incomingPostbackConfigs)
      .where(eq(incomingPostbackConfigs.advertiserId, advertiserId))
      .orderBy(desc(incomingPostbackConfigs.createdAt));
  }

  async createIncomingPostbackConfig(config: InsertIncomingPostbackConfig): Promise<IncomingPostbackConfig> {
    const [created] = await db.insert(incomingPostbackConfigs).values(config).returning();
    return created;
  }

  async updateIncomingPostbackConfig(id: string, data: Partial<InsertIncomingPostbackConfig>): Promise<IncomingPostbackConfig | undefined> {
    const [updated] = await db.update(incomingPostbackConfigs)
      .set(data)
      .where(eq(incomingPostbackConfigs.id, id))
      .returning();
    return updated;
  }

  async deleteIncomingPostbackConfig(id: string): Promise<void> {
    await db.delete(incomingPostbackConfigs).where(eq(incomingPostbackConfigs.id, id));
  }

  // ============================================
  // PUBLISHER POSTBACK ENDPOINTS (Outgoing to publisher's tracker)
  // ============================================

  async getPublisherPostbackEndpoint(id: string): Promise<PublisherPostbackEndpoint | undefined> {
    const [endpoint] = await db.select().from(publisherPostbackEndpoints)
      .where(eq(publisherPostbackEndpoints.id, id));
    return endpoint;
  }

  async getPublisherPostbackEndpoints(publisherId: string, offerId?: string): Promise<PublisherPostbackEndpoint[]> {
    if (offerId) {
      return db.select().from(publisherPostbackEndpoints)
        .where(and(
          eq(publisherPostbackEndpoints.publisherId, publisherId),
          eq(publisherPostbackEndpoints.offerId, offerId)
        ))
        .orderBy(desc(publisherPostbackEndpoints.createdAt));
    }
    return db.select().from(publisherPostbackEndpoints)
      .where(eq(publisherPostbackEndpoints.publisherId, publisherId))
      .orderBy(desc(publisherPostbackEndpoints.createdAt));
  }

  async getActivePublisherPostbackEndpoints(publisherId: string, offerId?: string): Promise<PublisherPostbackEndpoint[]> {
    const conditions = [
      eq(publisherPostbackEndpoints.publisherId, publisherId),
      eq(publisherPostbackEndpoints.isActive, true)
    ];
    
    const globalEndpoints = await db.select().from(publisherPostbackEndpoints)
      .where(and(
        eq(publisherPostbackEndpoints.publisherId, publisherId),
        eq(publisherPostbackEndpoints.isActive, true),
        sql`${publisherPostbackEndpoints.offerId} IS NULL`
      ));
    
    if (offerId) {
      const offerEndpoints = await db.select().from(publisherPostbackEndpoints)
        .where(and(
          eq(publisherPostbackEndpoints.publisherId, publisherId),
          eq(publisherPostbackEndpoints.offerId, offerId),
          eq(publisherPostbackEndpoints.isActive, true)
        ));
      return [...offerEndpoints, ...globalEndpoints];
    }
    
    return globalEndpoints;
  }

  async createPublisherPostbackEndpoint(endpoint: InsertPublisherPostbackEndpoint): Promise<PublisherPostbackEndpoint> {
    const [created] = await db.insert(publisherPostbackEndpoints).values(endpoint).returning();
    return created;
  }

  async updatePublisherPostbackEndpoint(id: string, data: Partial<InsertPublisherPostbackEndpoint>): Promise<PublisherPostbackEndpoint | undefined> {
    const [updated] = await db.update(publisherPostbackEndpoints)
      .set(data)
      .where(eq(publisherPostbackEndpoints.id, id))
      .returning();
    return updated;
  }

  async deletePublisherPostbackEndpoint(id: string): Promise<void> {
    await db.delete(publisherPostbackEndpoints).where(eq(publisherPostbackEndpoints.id, id));
  }

  async initializeShortIds(): Promise<void> {
    console.log("[shortId] Initializing short ID sequences and backfilling data...");
    
    try {
      // Create sequences if they don't exist
      await db.execute(sql`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'users_short_id_seq') THEN
            CREATE SEQUENCE users_short_id_seq START WITH 1;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'offers_short_id_seq') THEN
            CREATE SEQUENCE offers_short_id_seq START WITH 1;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'landings_short_id_seq') THEN
            CREATE SEQUENCE landings_short_id_seq START WITH 1;
          END IF;
        END $$;
      `);

      // Backfill users with null shortId
      const usersWithoutShortId = await db.select({ id: users.id }).from(users).where(sql`short_id IS NULL`);
      for (const user of usersWithoutShortId) {
        const res = await db.execute(sql`SELECT nextval('users_short_id_seq')`) as any;
        const nextval = res.rows?.[0]?.nextval ?? res[0]?.nextval;
        await db.update(users).set({ shortId: Number(nextval) }).where(eq(users.id, user.id));
      }
      if (usersWithoutShortId.length > 0) {
        console.log(`[shortId] Backfilled ${usersWithoutShortId.length} users`);
      }

      // Backfill offers with null shortId
      const offersWithoutShortId = await db.select({ id: offers.id }).from(offers).where(sql`short_id IS NULL`);
      for (const offer of offersWithoutShortId) {
        const res = await db.execute(sql`SELECT nextval('offers_short_id_seq')`) as any;
        const nextval = res.rows?.[0]?.nextval ?? res[0]?.nextval;
        await db.update(offers).set({ shortId: Number(nextval) }).where(eq(offers.id, offer.id));
      }
      if (offersWithoutShortId.length > 0) {
        console.log(`[shortId] Backfilled ${offersWithoutShortId.length} offers`);
      }

      // Backfill landings with null shortId
      const landingsWithoutShortId = await db.select({ id: offerLandings.id }).from(offerLandings).where(sql`short_id IS NULL`);
      for (const landing of landingsWithoutShortId) {
        const res = await db.execute(sql`SELECT nextval('landings_short_id_seq')`) as any;
        const nextval = res.rows?.[0]?.nextval ?? res[0]?.nextval;
        await db.update(offerLandings).set({ shortId: Number(nextval) }).where(eq(offerLandings.id, landing.id));
      }
      if (landingsWithoutShortId.length > 0) {
        console.log(`[shortId] Backfilled ${landingsWithoutShortId.length} landings`);
      }

      // Sync sequences to max existing values
      await db.execute(sql`
        SELECT setval('users_short_id_seq', COALESCE((SELECT MAX(short_id) FROM users), 0) + 1, false);
        SELECT setval('offers_short_id_seq', COALESCE((SELECT MAX(short_id) FROM offers), 0) + 1, false);
        SELECT setval('landings_short_id_seq', COALESCE((SELECT MAX(short_id) FROM offer_landings), 0) + 1, false);
      `);

      console.log("[shortId] Short ID initialization complete");
    } catch (error) {
      console.error("[shortId] Error initializing short IDs:", error);
    }
  }

  async getOfferPerformanceByAdvertiser(advertiserId: string): Promise<{ offerId: string; clicks: number; conversions: number; cr: number; ar: number; epc: number }[]> {
    // Get offers with their partnerPayout
    const advertiserOffers = await db.select({ 
      id: offers.id,
      partnerPayout: offers.partnerPayout
    })
      .from(offers)
      .where(eq(offers.advertiserId, advertiserId));
    
    if (advertiserOffers.length === 0) {
      return [];
    }
    
    const offerIds = advertiserOffers.map(o => o.id);
    
    // Get landing payouts as fallback when offer.partnerPayout is NULL
    const landingPayouts = await db.select({
      offerId: offerLandings.offerId,
      partnerPayout: offerLandings.partnerPayout
    })
      .from(offerLandings)
      .where(inArray(offerLandings.offerId, offerIds));
    
    // Build payout map: use offer.partnerPayout or fallback to first landing's payout
    const landingPayoutMap = new Map<string, number>();
    for (const lp of landingPayouts) {
      if (!landingPayoutMap.has(lp.offerId)) {
        landingPayoutMap.set(lp.offerId, parseFloat(lp.partnerPayout || '0'));
      }
    }
    
    const payoutMap = new Map(advertiserOffers.map(o => {
      const offerPayout = parseFloat(o.partnerPayout || '0');
      return [o.id, offerPayout > 0 ? offerPayout : (landingPayoutMap.get(o.id) || 0)];
    }));
    
    const clickCounts = await db
      .select({
        offerId: clicks.offerId,
        count: sql<number>`count(*)::int`
      })
      .from(clicks)
      .where(inArray(clicks.offerId, offerIds))
      .groupBy(clicks.offerId);
    
    const conversionData = await db
      .select({
        offerId: conversions.offerId,
        count: sql<number>`count(*)::int`,
        approvedCount: sql<number>`count(*) FILTER (WHERE ${conversions.status} = 'approved')::int`,
        totalPayout: sql<number>`COALESCE(SUM(CAST(${conversions.publisherPayout} AS NUMERIC)), 0)::float`,
        payableCount: sql<number>`count(*) FILTER (WHERE CAST(${conversions.publisherPayout} AS NUMERIC) > 0)::int`,
        approvedPayableCount: sql<number>`count(*) FILTER (WHERE CAST(${conversions.publisherPayout} AS NUMERIC) > 0 AND ${conversions.status} = 'approved')::int`
      })
      .from(conversions)
      .where(inArray(conversions.offerId, offerIds))
      .groupBy(conversions.offerId);
    
    const clickMap = new Map(clickCounts.map(c => [c.offerId, c.count]));
    const convMap = new Map(conversionData.map(c => [c.offerId, { 
      count: c.count, 
      approved: c.approvedCount,
      totalPayout: c.totalPayout,
      payable: c.payableCount,
      approvedPayable: c.approvedPayableCount
    }]));
    
    const results = offerIds.map(offerId => {
      const clickCount = clickMap.get(offerId) || 0;
      const convData = convMap.get(offerId) || { count: 0, approved: 0, totalPayout: 0, payable: 0, approvedPayable: 0 };
      const metrics = calculateMetrics({
        clicks: clickCount,
        payableConversions: convData.payable,
        approvedPayableConversions: convData.approvedPayable,
        totalPayout: convData.totalPayout
      });
      return { 
        offerId, 
        clicks: clickCount, 
        conversions: convData.count, 
        ...metrics
      };
    });
    return results;
  }

  async getOfferPerformanceByPublisher(publisherId: string): Promise<{ offerId: string; clicks: number; conversions: number; cr: number; ar: number; epc: number }[]> {
    const clickCounts = await db
      .select({
        offerId: clicks.offerId,
        count: sql<number>`count(*)::int`
      })
      .from(clicks)
      .where(eq(clicks.publisherId, publisherId))
      .groupBy(clicks.offerId);
    
    if (clickCounts.length === 0) {
      return [];
    }
    
    const offerIds = clickCounts.map(c => c.offerId);
    
    // Get partnerPayout for each offer
    const offerPayouts = await db.select({
      id: offers.id,
      partnerPayout: offers.partnerPayout
    })
      .from(offers)
      .where(inArray(offers.id, offerIds));
    
    // Get landing payouts as fallback when offer.partnerPayout is NULL
    const landingPayouts = await db.select({
      offerId: offerLandings.offerId,
      partnerPayout: offerLandings.partnerPayout
    })
      .from(offerLandings)
      .where(inArray(offerLandings.offerId, offerIds));
    
    // Build landing payout map (first landing per offer)
    const landingPayoutMap = new Map<string, number>();
    for (const lp of landingPayouts) {
      if (!landingPayoutMap.has(lp.offerId)) {
        landingPayoutMap.set(lp.offerId, parseFloat(lp.partnerPayout || '0'));
      }
    }
    
    const payoutMap = new Map(offerPayouts.map(o => {
      const offerPayout = parseFloat(o.partnerPayout || '0');
      return [o.id, offerPayout > 0 ? offerPayout : (landingPayoutMap.get(o.id) || 0)];
    }));
    
    const conversionData = await db
      .select({
        offerId: conversions.offerId,
        count: sql<number>`count(*)::int`,
        approvedCount: sql<number>`count(*) FILTER (WHERE ${conversions.status} = 'approved')::int`,
        totalPayout: sql<number>`COALESCE(SUM(CAST(${conversions.publisherPayout} AS NUMERIC)), 0)::float`,
        payableCount: sql<number>`count(*) FILTER (WHERE CAST(${conversions.publisherPayout} AS NUMERIC) > 0)::int`,
        approvedPayableCount: sql<number>`count(*) FILTER (WHERE CAST(${conversions.publisherPayout} AS NUMERIC) > 0 AND ${conversions.status} = 'approved')::int`
      })
      .from(conversions)
      .where(and(
        eq(conversions.publisherId, publisherId),
        inArray(conversions.offerId, offerIds)
      ))
      .groupBy(conversions.offerId);
    
    const clickMap = new Map(clickCounts.map(c => [c.offerId, c.count]));
    const convMap = new Map(conversionData.map(c => [c.offerId, { 
      count: c.count, 
      approved: c.approvedCount,
      totalPayout: c.totalPayout,
      payable: c.payableCount,
      approvedPayable: c.approvedPayableCount
    }]));
    
    return offerIds.map(offerId => {
      const clickCount = clickMap.get(offerId) || 0;
      const convData = convMap.get(offerId) || { count: 0, approved: 0, totalPayout: 0, payable: 0, approvedPayable: 0 };
      const metrics = calculateMetrics({
        clicks: clickCount,
        payableConversions: convData.payable,
        approvedPayableConversions: convData.approvedPayable,
        totalPayout: convData.totalPayout
      });
      return { 
        offerId, 
        clicks: clickCount, 
        conversions: convData.count, 
        ...metrics
      };
    });
  }

  // Migration History
  async getMigrationsByAdvertiser(advertiserId: string): Promise<MigrationHistory[]> {
    return await db
      .select()
      .from(migrationHistory)
      .where(eq(migrationHistory.advertiserId, advertiserId))
      .orderBy(desc(migrationHistory.createdAt));
  }

  async createMigration(data: InsertMigrationHistory): Promise<MigrationHistory> {
    const [migration] = await db.insert(migrationHistory).values(data).returning();
    return migration;
  }

  async updateMigration(id: string, data: Partial<InsertMigrationHistory>): Promise<MigrationHistory | undefined> {
    const [migration] = await db
      .update(migrationHistory)
      .set(data)
      .where(eq(migrationHistory.id, id))
      .returning();
    return migration;
  }

  async getMigration(id: string): Promise<MigrationHistory | undefined> {
    const [migration] = await db
      .select()
      .from(migrationHistory)
      .where(eq(migrationHistory.id, id));
    return migration;
  }

  // Exchange API Keys
  async getExchangeApiKeys(advertiserId: string): Promise<ExchangeApiKey[]> {
    return await db
      .select()
      .from(exchangeApiKeys)
      .where(eq(exchangeApiKeys.advertiserId, advertiserId))
      .orderBy(desc(exchangeApiKeys.createdAt));
  }

  async getExchangeApiKey(id: string): Promise<ExchangeApiKey | undefined> {
    const [key] = await db
      .select()
      .from(exchangeApiKeys)
      .where(eq(exchangeApiKeys.id, id));
    return key;
  }

  async getExchangeApiKeyByExchange(advertiserId: string, exchange: string): Promise<ExchangeApiKey | undefined> {
    const [key] = await db
      .select()
      .from(exchangeApiKeys)
      .where(and(
        eq(exchangeApiKeys.advertiserId, advertiserId),
        eq(exchangeApiKeys.exchange, exchange)
      ));
    return key;
  }

  async createExchangeApiKey(data: {
    advertiserId: string;
    exchange: string;
    name: string;
    apiKey: string;
    apiSecret: string;
    passphrase?: string | null;
    isActive?: boolean;
  }): Promise<ExchangeApiKey> {
    const [key] = await db.insert(exchangeApiKeys).values({
      advertiserId: data.advertiserId,
      exchange: data.exchange,
      name: data.name,
      apiKeyEncrypted: encrypt(data.apiKey),
      apiSecretEncrypted: encrypt(data.apiSecret),
      passphraseEncrypted: data.passphrase ? encrypt(data.passphrase) : null,
      isActive: data.isActive ?? true,
    }).returning();
    return key;
  }

  async updateExchangeApiKey(id: string, data: {
    name?: string;
    apiKey?: string;
    apiSecret?: string;
    passphrase?: string | null;
    isActive?: boolean;
  }): Promise<ExchangeApiKey | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.apiKey) updateData.apiKeyEncrypted = encrypt(data.apiKey);
    if (data.apiSecret) updateData.apiSecretEncrypted = encrypt(data.apiSecret);
    if (data.passphrase !== undefined) {
      updateData.passphraseEncrypted = data.passphrase ? encrypt(data.passphrase) : null;
    }
    const [key] = await db
      .update(exchangeApiKeys)
      .set(updateData)
      .where(eq(exchangeApiKeys.id, id))
      .returning();
    return key;
  }

  async deleteExchangeApiKey(id: string): Promise<void> {
    await db.delete(exchangeApiKeys).where(eq(exchangeApiKeys.id, id));
  }

  async getExchangeApiKeysStatus(advertiserId: string): Promise<Record<string, boolean>> {
    const keys = await this.getExchangeApiKeys(advertiserId);
    const supportedExchanges = ['binance', 'bybit', 'kraken', 'coinbase', 'exmo', 'mexc', 'okx'];
    const status: Record<string, boolean> = {};
    for (const exchange of supportedExchanges) {
      status[exchange] = keys.some(k => k.exchange === exchange && k.isActive);
    }
    return status;
  }

  // ============================================
  // ROADMAP ITEMS
  // ============================================
  async getRoadmapItems(): Promise<RoadmapItem[]> {
    return await db
      .select()
      .from(roadmapItems)
      .orderBy(roadmapItems.quarter, roadmapItems.priority);
  }

  async getPublishedRoadmapItems(): Promise<RoadmapItem[]> {
    return await db
      .select()
      .from(roadmapItems)
      .where(eq(roadmapItems.isPublished, true))
      .orderBy(roadmapItems.quarter, roadmapItems.priority);
  }

  async getRoadmapItem(id: string): Promise<RoadmapItem | undefined> {
    const [item] = await db
      .select()
      .from(roadmapItems)
      .where(eq(roadmapItems.id, id));
    return item;
  }

  async createRoadmapItem(data: InsertRoadmapItem): Promise<RoadmapItem> {
    const [item] = await db.insert(roadmapItems).values(data).returning();
    return item;
  }

  async updateRoadmapItem(id: string, data: Partial<InsertRoadmapItem>): Promise<RoadmapItem | undefined> {
    const [item] = await db
      .update(roadmapItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(roadmapItems.id, id))
      .returning();
    return item;
  }

  async deleteRoadmapItem(id: string): Promise<void> {
    await db.delete(roadmapItems).where(eq(roadmapItems.id, id));
  }

  // ============================================
  // LANDING NEWS (public news for landing page)
  // ============================================
  async getLandingNews(): Promise<NewsPost[]> {
    return await db
      .select()
      .from(newsPosts)
      .where(and(
        eq(newsPosts.showOnLanding, true),
        eq(newsPosts.isPublished, true)
      ))
      .orderBy(desc(newsPosts.publishedAt))
      .limit(6);
  }

  async updateNewsPostLandingSettings(id: string, data: {
    showOnLanding?: boolean;
    icon?: string | null;
    shortDescription?: string | null;
  }): Promise<NewsPost | undefined> {
    const [post] = await db
      .update(newsPosts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(newsPosts.id, id))
      .returning();
    return post;
  }

  // ============================================
  // SUPPORT CONVERSATIONS (Telegram поддержка)
  // ============================================
  async getSupportConversationByTelegramChatId(telegramChatId: string): Promise<SupportConversation | undefined> {
    const [conv] = await db
      .select()
      .from(supportConversations)
      .where(eq(supportConversations.telegramChatId, telegramChatId));
    return conv;
  }

  async getSupportConversation(id: string): Promise<SupportConversation | undefined> {
    const [conv] = await db
      .select()
      .from(supportConversations)
      .where(eq(supportConversations.id, id));
    return conv;
  }

  async getSupportConversations(status?: string): Promise<SupportConversation[]> {
    if (status) {
      return await db
        .select()
        .from(supportConversations)
        .where(eq(supportConversations.status, status))
        .orderBy(desc(supportConversations.lastMessageAt));
    }
    return await db
      .select()
      .from(supportConversations)
      .orderBy(desc(supportConversations.lastMessageAt));
  }

  async createSupportConversation(data: InsertSupportConversation): Promise<SupportConversation> {
    const [conv] = await db.insert(supportConversations).values(data).returning();
    return conv;
  }

  async updateSupportConversation(id: string, data: Partial<InsertSupportConversation>): Promise<SupportConversation | undefined> {
    const [conv] = await db
      .update(supportConversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(supportConversations.id, id))
      .returning();
    return conv;
  }

  // ============================================
  // SUPPORT MESSAGES
  // ============================================
  async getSupportMessages(conversationId: string): Promise<SupportMessage[]> {
    return await db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.conversationId, conversationId))
      .orderBy(supportMessages.createdAt);
  }

  async createSupportMessage(data: InsertSupportMessage): Promise<SupportMessage> {
    const [msg] = await db.insert(supportMessages).values(data).returning();
    return msg;
  }

  // ============================================
  // SPLIT TESTS (A/B тестирование для партнёров)
  // ============================================
  async getSplitTestsByPublisher(publisherId: string): Promise<SplitTest[]> {
    return await db
      .select()
      .from(splitTests)
      .where(and(
        eq(splitTests.publisherId, publisherId),
        sql`${splitTests.status} != 'deleted'`
      ))
      .orderBy(desc(splitTests.createdAt));
  }

  async getSplitTest(id: string): Promise<SplitTest | undefined> {
    const [test] = await db
      .select()
      .from(splitTests)
      .where(eq(splitTests.id, id));
    return test;
  }

  async getSplitTestByShortCode(shortCode: string): Promise<SplitTest | undefined> {
    const [test] = await db
      .select()
      .from(splitTests)
      .where(eq(splitTests.shortCode, shortCode));
    return test;
  }

  async createSplitTest(data: InsertSplitTest): Promise<SplitTest> {
    const [test] = await db.insert(splitTests).values(data).returning();
    return test;
  }

  async updateSplitTest(id: string, data: Partial<InsertSplitTest>): Promise<SplitTest | undefined> {
    const [test] = await db
      .update(splitTests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(splitTests.id, id))
      .returning();
    return test;
  }

  async deleteSplitTest(id: string): Promise<void> {
    await db
      .update(splitTests)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(eq(splitTests.id, id));
  }

  // ============================================
  // SPLIT TEST ITEMS
  // ============================================
  async getSplitTestItems(splitTestId: string): Promise<SplitTestItem[]> {
    return await db
      .select()
      .from(splitTestItems)
      .where(eq(splitTestItems.splitTestId, splitTestId));
  }

  async createSplitTestItem(data: InsertSplitTestItem): Promise<SplitTestItem> {
    const [item] = await db.insert(splitTestItems).values(data).returning();
    return item;
  }

  async updateSplitTestItem(id: string, data: Partial<InsertSplitTestItem>): Promise<SplitTestItem | undefined> {
    const [item] = await db
      .update(splitTestItems)
      .set(data)
      .where(eq(splitTestItems.id, id))
      .returning();
    return item;
  }

  async deleteSplitTestItem(id: string): Promise<void> {
    await db.delete(splitTestItems).where(eq(splitTestItems.id, id));
  }

  async deleteSplitTestItems(splitTestId: string): Promise<void> {
    await db.delete(splitTestItems).where(eq(splitTestItems.splitTestId, splitTestId));
  }

  // ============================================
  // PLATFORM API KEYS
  // ============================================
  async getPlatformApiKeys(): Promise<PlatformApiKey[]> {
    return await db
      .select()
      .from(platformApiKeys)
      .orderBy(desc(platformApiKeys.createdAt));
  }

  async getPlatformApiKey(id: string): Promise<PlatformApiKey | undefined> {
    const [key] = await db
      .select()
      .from(platformApiKeys)
      .where(eq(platformApiKeys.id, id));
    return key;
  }

  async getPlatformApiKeyByHash(keyHash: string): Promise<PlatformApiKey | undefined> {
    const [key] = await db
      .select()
      .from(platformApiKeys)
      .where(eq(platformApiKeys.keyHash, keyHash));
    return key;
  }

  async createPlatformApiKey(data: InsertPlatformApiKey): Promise<PlatformApiKey> {
    const [key] = await db.insert(platformApiKeys).values(data).returning();
    return key;
  }

  async updatePlatformApiKey(id: string, data: Partial<PlatformApiKey>): Promise<PlatformApiKey | undefined> {
    const [key] = await db
      .update(platformApiKeys)
      .set(data)
      .where(eq(platformApiKeys.id, id))
      .returning();
    return key;
  }

  async revokePlatformApiKey(id: string): Promise<PlatformApiKey | undefined> {
    const [key] = await db
      .update(platformApiKeys)
      .set({ isActive: false, revokedAt: new Date() })
      .where(eq(platformApiKeys.id, id))
      .returning();
    return key;
  }

  async deletePlatformApiKey(id: string): Promise<void> {
    await db.delete(platformApiKeyUsageLogs).where(eq(platformApiKeyUsageLogs.apiKeyId, id));
    await db.delete(platformApiKeys).where(eq(platformApiKeys.id, id));
  }

  async logPlatformApiKeyUsage(data: InsertPlatformApiKeyUsageLog): Promise<PlatformApiKeyUsageLog> {
    const [log] = await db.insert(platformApiKeyUsageLogs).values(data).returning();
    return log;
  }

  async getPlatformApiKeyUsageLogs(apiKeyId: string, limit: number = 100): Promise<PlatformApiKeyUsageLog[]> {
    return await db
      .select()
      .from(platformApiKeyUsageLogs)
      .where(eq(platformApiKeyUsageLogs.apiKeyId, apiKeyId))
      .orderBy(desc(platformApiKeyUsageLogs.createdAt))
      .limit(limit);
  }

  // ============================================
  // PLATFORM WEBHOOKS
  // ============================================
  async getPlatformWebhooks(): Promise<PlatformWebhook[]> {
    return await db
      .select()
      .from(platformWebhooks)
      .orderBy(desc(platformWebhooks.createdAt));
  }

  async getPlatformWebhook(id: string): Promise<PlatformWebhook | undefined> {
    const [webhook] = await db
      .select()
      .from(platformWebhooks)
      .where(eq(platformWebhooks.id, id));
    return webhook;
  }

  async createPlatformWebhook(data: InsertPlatformWebhook): Promise<PlatformWebhook> {
    const [webhook] = await db.insert(platformWebhooks).values(data).returning();
    return webhook;
  }

  async updatePlatformWebhook(id: string, data: Partial<PlatformWebhook>): Promise<PlatformWebhook | undefined> {
    const [webhook] = await db
      .update(platformWebhooks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(platformWebhooks.id, id))
      .returning();
    return webhook;
  }

  async deletePlatformWebhook(id: string): Promise<void> {
    await db.delete(platformWebhookLogs).where(eq(platformWebhookLogs.webhookId, id));
    await db.delete(platformWebhooks).where(eq(platformWebhooks.id, id));
  }

  async createPlatformWebhookLog(data: InsertPlatformWebhookLog): Promise<PlatformWebhookLog> {
    const [log] = await db.insert(platformWebhookLogs).values(data).returning();
    return log;
  }

  async getPlatformWebhookLogs(webhookId: string, limit: number = 100): Promise<PlatformWebhookLog[]> {
    return await db
      .select()
      .from(platformWebhookLogs)
      .where(eq(platformWebhookLogs.webhookId, webhookId))
      .orderBy(desc(platformWebhookLogs.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
