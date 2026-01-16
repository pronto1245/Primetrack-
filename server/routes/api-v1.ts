import { Router } from "express";
import { storage } from "../storage";
import { requirePlatformApiKey, type PlatformApiRequest } from "../middleware/platform-api-key";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { db } from "../../db";
import { offers, users, clicks, conversions, payoutRequests, publisherOffers, publisherBalances } from "@shared/schema";

const router = Router();

router.get("/offers", requirePlatformApiKey(["offers:read"]), async (req: PlatformApiRequest, res) => {
  try {
    const { status, category } = req.query;
    
    let query = db.select().from(offers).$dynamic();
    
    if (status) {
      query = query.where(eq(offers.status, status as string));
    }
    
    const allOffers = await query.orderBy(desc(offers.createdAt));
    
    const result = allOffers.map(o => ({
      id: o.id,
      shortId: o.shortId,
      name: o.name,
      description: o.description,
      status: o.status,
      payoutModel: o.payoutModel,
      category: o.category,
      geo: o.geo,
      createdAt: o.createdAt,
    }));
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/offers/:id", requirePlatformApiKey(["offers:read"]), async (req: PlatformApiRequest, res) => {
  try {
    const offer = await storage.getOffer(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, error: "Offer not found" });
    }
    
    const landings = await storage.getOfferLandings(offer.id);
    
    res.json({ 
      success: true, 
      data: {
        ...offer,
        landings: landings.map(l => ({
          id: l.id,
          name: l.landingName,
          url: l.landingUrl,
          geo: l.geo,
          partnerPayout: l.partnerPayout,
          internalCost: l.internalCost,
        })),
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/partners", requirePlatformApiKey(["partners:read"]), async (req: PlatformApiRequest, res) => {
  try {
    const publishers = await storage.getUsersByRole("publisher");
    
    const result = publishers.map(p => ({
      id: p.id,
      shortId: p.shortId,
      username: p.username,
      email: p.email,
      status: p.status,
      createdAt: p.createdAt,
    }));
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/partners/:id", requirePlatformApiKey(["partners:read"]), async (req: PlatformApiRequest, res) => {
  try {
    const partner = await storage.getUser(req.params.id);
    if (!partner || partner.role !== "publisher") {
      return res.status(404).json({ success: false, error: "Partner not found" });
    }
    
    const [balance] = await db
      .select()
      .from(publisherBalances)
      .where(eq(publisherBalances.publisherId, partner.id))
      .limit(1);
    
    res.json({ 
      success: true, 
      data: {
        id: partner.id,
        shortId: partner.shortId,
        username: partner.username,
        email: partner.email,
        status: partner.status,
        balance: balance ? {
          available: balance.availableBalance,
          pending: balance.pendingBalance,
          hold: balance.holdBalance,
        } : null,
        createdAt: partner.createdAt,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/clicks", requirePlatformApiKey(["clicks:read"]), async (req: PlatformApiRequest, res) => {
  try {
    const { 
      offerId, 
      publisherId, 
      startDate, 
      endDate, 
      limit = "100", 
      offset = "0" 
    } = req.query;
    
    let conditions = [];
    
    if (offerId) {
      conditions.push(eq(clicks.offerId, offerId as string));
    }
    if (publisherId) {
      conditions.push(eq(clicks.publisherId, publisherId as string));
    }
    if (startDate) {
      conditions.push(gte(clicks.createdAt, new Date(startDate as string)));
    }
    if (endDate) {
      conditions.push(lte(clicks.createdAt, new Date(endDate as string)));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const clicksData = await db
      .select()
      .from(clicks)
      .where(whereClause)
      .orderBy(desc(clicks.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));
    
    const result = clicksData.map(c => ({
      id: c.id,
      clickId: c.clickId,
      offerId: c.offerId,
      publisherId: c.publisherId,
      landingId: c.landingId,
      ip: c.ip,
      geo: c.geo,
      city: c.city,
      userAgent: c.userAgent,
      sub1: c.sub1,
      sub2: c.sub2,
      sub3: c.sub3,
      sub4: c.sub4,
      sub5: c.sub5,
      createdAt: c.createdAt,
    }));
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/conversions", requirePlatformApiKey(["conversions:read"]), async (req: PlatformApiRequest, res) => {
  try {
    const { 
      offerId, 
      publisherId, 
      status,
      startDate, 
      endDate, 
      limit = "100", 
      offset = "0" 
    } = req.query;
    
    let conditions = [];
    
    if (offerId) {
      conditions.push(eq(conversions.offerId, offerId as string));
    }
    if (publisherId) {
      conditions.push(eq(conversions.publisherId, publisherId as string));
    }
    if (status) {
      conditions.push(eq(conversions.status, status as string));
    }
    if (startDate) {
      conditions.push(gte(conversions.createdAt, new Date(startDate as string)));
    }
    if (endDate) {
      conditions.push(lte(conversions.createdAt, new Date(endDate as string)));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const conversionsData = await db
      .select()
      .from(conversions)
      .where(whereClause)
      .orderBy(desc(conversions.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));
    
    const result = conversionsData.map(c => ({
      id: c.id,
      clickId: c.clickId,
      offerId: c.offerId,
      publisherId: c.publisherId,
      conversionType: c.conversionType,
      status: c.status,
      publisherPayout: c.publisherPayout,
      advertiserCost: c.advertiserCost,
      externalId: c.externalId,
      createdAt: c.createdAt,
      approvedAt: c.approvedAt,
    }));
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/conversions", requirePlatformApiKey(["conversions:write"]), async (req: PlatformApiRequest, res) => {
  try {
    const { clickId, type, status, payout, cost, externalId } = req.body;
    
    if (!clickId || !type) {
      return res.status(400).json({ 
        success: false, 
        error: "clickId and type are required" 
      });
    }
    
    const click = await storage.getClickByClickId(clickId);
    if (!click) {
      return res.status(404).json({ 
        success: false, 
        error: "Click not found" 
      });
    }
    
    const conversion = await storage.createConversion({
      clickId: click.id,
      offerId: click.offerId,
      publisherId: click.publisherId,
      conversionType: type,
      status: status || "pending",
      publisherPayout: payout?.toString() || "0",
      advertiserCost: cost?.toString() || "0",
      currency: "USD",
      externalId: externalId || null,
    });
    
    res.json({ success: true, data: conversion });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/payouts", requirePlatformApiKey(["payouts:read"]), async (req: PlatformApiRequest, res) => {
  try {
    const { publisherId, status, limit = "100", offset = "0" } = req.query;
    
    let conditions = [];
    
    if (publisherId) {
      conditions.push(eq(payoutRequests.publisherId, publisherId as string));
    }
    if (status) {
      conditions.push(eq(payoutRequests.status, status as string));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const payoutsData = await db
      .select()
      .from(payoutRequests)
      .where(whereClause)
      .orderBy(desc(payoutRequests.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));
    
    res.json({ success: true, data: payoutsData });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch("/payouts/:id", requirePlatformApiKey(["payouts:write"]), async (req: PlatformApiRequest, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ success: false, error: "status is required" });
    }
    
    const validStatuses = ["pending", "approved", "rejected", "processing", "completed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` 
      });
    }
    
    const payout = await storage.updatePayoutRequest(req.params.id, { status });
    if (!payout) {
      return res.status(404).json({ success: false, error: "Payout request not found" });
    }
    
    res.json({ success: true, data: payout });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/stats", requirePlatformApiKey(["clicks:read", "conversions:read"]), async (req: PlatformApiRequest, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let clickConditions = [];
    let conversionConditions = [];
    
    if (startDate) {
      clickConditions.push(gte(clicks.createdAt, new Date(startDate as string)));
      conversionConditions.push(gte(conversions.createdAt, new Date(startDate as string)));
    }
    if (endDate) {
      clickConditions.push(lte(clicks.createdAt, new Date(endDate as string)));
      conversionConditions.push(lte(conversions.createdAt, new Date(endDate as string)));
    }
    
    const clicksWhereClause = clickConditions.length > 0 ? and(...clickConditions) : undefined;
    const conversionsWhereClause = conversionConditions.length > 0 ? and(...conversionConditions) : undefined;
    
    const [clicksResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(clicks)
      .where(clicksWhereClause);
    
    const [conversionsResult] = await db
      .select({ 
        count: sql<number>`count(*)`,
        totalPayout: sql<number>`coalesce(sum(cast(${conversions.publisherPayout} as numeric)), 0)`,
        totalCost: sql<number>`coalesce(sum(cast(${conversions.advertiserCost} as numeric)), 0)`,
      })
      .from(conversions)
      .where(conversionsWhereClause);
    
    const [approvedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversions)
      .where(and(
        conversionsWhereClause,
        eq(conversions.status, "approved")
      ));
    
    res.json({ 
      success: true, 
      data: {
        clicks: clicksResult?.count || 0,
        conversions: conversionsResult?.count || 0,
        approvedConversions: approvedResult?.count || 0,
        totalPayout: conversionsResult?.totalPayout || 0,
        totalCost: conversionsResult?.totalCost || 0,
        cr: Number(clicksResult?.count) > 0 
          ? ((Number(conversionsResult?.count) || 0) / Number(clicksResult.count) * 100).toFixed(2) 
          : "0.00",
        ar: Number(conversionsResult?.count) > 0 
          ? ((Number(approvedResult?.count) || 0) / Number(conversionsResult.count) * 100).toFixed(2) 
          : "0.00",
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
