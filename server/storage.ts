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
  type OfferCapsStats, type InsertOfferCapsStats, offerCapsStats
} from "@shared/schema";
import { db } from "../db";
import { eq, and, desc, gte, lte, sql, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";

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
  getUserByReferralCode(referralCode: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserReferralCode(userId: string, referralCode: string): Promise<User | undefined>;
  verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean>;
  
  // Offers
  getOffer(id: string): Promise<Offer | undefined>;
  getOffersByAdvertiser(advertiserId: string): Promise<Offer[]>;
  getActiveOffers(): Promise<Offer[]>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  updateOffer(id: string, offer: Partial<InsertOffer>): Promise<Offer | undefined>;
  
  // Offer Landings
  getOfferLandings(offerId: string): Promise<OfferLanding[]>;
  createOfferLanding(landing: InsertOfferLanding): Promise<OfferLanding>;
  deleteOfferLandings(offerId: string): Promise<void>;
  
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
  addPublisherToAdvertiser(publisherId: string, advertiserId: string): Promise<PublisherAdvertiser>;
  
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

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // Offers
  async getOffer(id: string): Promise<Offer | undefined> {
    const [offer] = await db.select().from(offers).where(eq(offers.id, id));
    return offer;
  }

  async getOffersByAdvertiser(advertiserId: string): Promise<Offer[]> {
    return db.select().from(offers)
      .where(eq(offers.advertiserId, advertiserId))
      .orderBy(desc(offers.createdAt));
  }

  async getActiveOffers(): Promise<Offer[]> {
    return db.select().from(offers)
      .where(eq(offers.status, "active"))
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
    const [conversion] = await db.update(conversions)
      .set({ status })
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
    const [result] = await db.update(advertiserSettings)
      .set(data)
      .where(eq(advertiserSettings.advertiserId, advertiserId))
      .returning();
    return result;
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
    const access = await this.getPublisherOffer(offerId, publisherId);
    return !!access;
  }

  // Publisher-Advertiser relationships
  async getAdvertisersForPublisher(publisherId: string): Promise<(PublisherAdvertiser & { advertiser: User })[]> {
    const relations = await db.select()
      .from(publisherAdvertisers)
      .where(and(
        eq(publisherAdvertisers.publisherId, publisherId),
        eq(publisherAdvertisers.status, "active")
      ));
    
    const result: (PublisherAdvertiser & { advertiser: User })[] = [];
    for (const rel of relations) {
      const advertiser = await this.getUser(rel.advertiserId);
      if (advertiser) {
        result.push({ ...rel, advertiser });
      }
    }
    return result;
  }

  async addPublisherToAdvertiser(publisherId: string, advertiserId: string): Promise<PublisherAdvertiser> {
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
      status: "pending" // Рекламодатель должен одобрить партнёра
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
  
  async getClicksReport(filters: any, groupBy?: string, page: number = 1, limit: number = 50): Promise<{ clicks: Click[]; total: number; page: number; limit: number }> {
    let query = db.select().from(clicks);
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
    
    const allClicks = whereCondition 
      ? await db.select().from(clicks).where(whereCondition).orderBy(desc(clicks.createdAt))
      : await db.select().from(clicks).orderBy(desc(clicks.createdAt));
    
    const total = allClicks.length;
    const offset = (page - 1) * limit;
    const paginatedClicks = allClicks.slice(offset, offset + limit);
    
    return { clicks: paginatedClicks, total, page, limit };
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
    
    return { conversions: paginatedConversions, total, page, limit };
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
}

export const storage = new DatabaseStorage();
