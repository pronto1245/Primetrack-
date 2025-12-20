import { 
  type User, type InsertUser, users,
  type Offer, type InsertOffer, offers,
  type OfferLanding, type InsertOfferLanding, offerLandings,
  type Click, type InsertClick, clicks,
  type Conversion, type InsertConversion, conversions,
  type PostbackLog, type InsertPostbackLog, postbackLogs,
  type AdvertiserSettings, type InsertAdvertiserSettings, advertiserSettings,
  type OfferAccessRequest, type InsertOfferAccessRequest, offerAccessRequests,
  type PublisherOfferAccess, type InsertPublisherOffer, publisherOffers
} from "@shared/schema";
import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
  hasPublisherAccessToOffer(offerId: string, publisherId: string): Promise<boolean>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db.insert(users).values({
      ...insertUser,
      password: hashedPassword,
    }).returning();
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

  async hasPublisherAccessToOffer(offerId: string, publisherId: string): Promise<boolean> {
    const access = await this.getPublisherOffer(offerId, publisherId);
    return !!access;
  }
}

export const storage = new DatabaseStorage();
