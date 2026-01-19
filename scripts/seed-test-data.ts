import { db } from "../db";
import { 
  users, offers, offerLandings, clicks, conversions, 
  publisherAdvertisers, publisherOffers, publisherBalances,
  advertiserSubscriptions, advertiserSettings
} from "../shared/schema";
import { sql, eq, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";

const TEST_ADVERTISER_EMAIL = "test_advertiser@primetrack.test";
const TEST_PUBLISHER_DOMAIN = "@primetrack.test";

const OFFERS_CONFIG = {
  leon: {
    name: "Leon Casino [TEST]",
    geo: "PT",
    partnerPayout: 90,
    internalCost: 110,
    clicks: 10873,
    registrations: 4023,
    deposits: 447,
    expectedInstareg: 37.0,
    expectedR2D: 11.1,
    expectedEPC: 3.70,
    expectedMargin: 8940,
  },
  twin: {
    name: "Twin Casino [TEST]",
    geo: "FR", 
    partnerPayout: 140,
    internalCost: 160,
    clicks: 22877,
    registrations: 7321,
    deposits: 719,
    expectedInstareg: 32.0,
    expectedR2D: 9.8,
    expectedEPC: 4.40,
    expectedMargin: 14380,
  }
};

const PUBLISHERS = [
  { username: "test_webmaster_alex", email: "alex@primetrack.test", telegram: "@alex_web" },
  { username: "test_traffic_pro", email: "traffic@primetrack.test", telegram: "@traffic_pro" },
  { username: "test_casino_expert", email: "casino@primetrack.test", telegram: "@casino_exp" },
  { username: "test_gambling_king", email: "gambling@primetrack.test", telegram: "@gamb_king" },
  { username: "test_affiliate_master", email: "affiliate@primetrack.test", telegram: "@aff_master" },
  { username: "test_push_traffic", email: "push@primetrack.test", telegram: "@push_traf" },
  { username: "test_media_buyer", email: "media@primetrack.test", telegram: "@media_buy" },
  { username: "test_bet_promoter", email: "bet@primetrack.test", telegram: "@bet_promo" },
  { username: "test_slots_hunter", email: "slots@primetrack.test", telegram: "@slots_hunt" },
  { username: "test_web_arbitrage", email: "arb@primetrack.test", telegram: "@web_arb" },
];

const TRAFFIC_DISTRIBUTION = [0.18, 0.15, 0.13, 0.12, 0.10, 0.09, 0.08, 0.06, 0.05, 0.04];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
];

const DEVICES = ["mobile", "desktop", "tablet"];
const BROWSERS = ["Chrome", "Safari", "Firefox", "Edge"];
const OS_LIST = ["Windows", "iOS", "Android", "MacOS"];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack: number): Date {
  const now = new Date();
  const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
}

function generateClickId(): string {
  return `test_clk_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

function generateIP(geo: string): string {
  if (geo === "PT") {
    const ranges = [[85, 240], [188, 37], [194, 117], [213, 22]];
    const range = randomElement(ranges);
    return `${range[0]}.${range[1]}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  } else {
    const ranges = [[80, 12], [82, 64], [176, 128], [193, 251]];
    const range = randomElement(ranges);
    return `${range[0]}.${range[1]}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  }
}

const PT_CITIES = ["Lisbon", "Porto", "Braga", "Coimbra", "Faro", "Funchal", "Setúbal"];
const FR_CITIES = ["Paris", "Lyon", "Marseille", "Toulouse", "Nice", "Nantes", "Bordeaux"];

function distributeExact(total: number, ratios: number[]): number[] {
  const result = ratios.map(r => Math.floor(total * r));
  let remainder = total - result.reduce((a, b) => a + b, 0);
  
  for (let i = 0; remainder > 0; i = (i + 1) % result.length) {
    result[i]++;
    remainder--;
  }
  
  return result;
}


async function verifyMetrics(offerIds: Record<string, string>) {
  console.log("\n📊 Verifying metrics...\n");
  
  let allPassed = true;
  
  for (const [key, config] of Object.entries(OFFERS_CONFIG)) {
    const offerId = offerIds[key];
    if (!offerId) continue;
    
    const clickCount = await db.select({ count: sql<number>`COUNT(*)::int` })
      .from(clicks)
      .where(eq(clicks.offerId, offerId));
    
    const leadCount = await db.select({ count: sql<number>`COUNT(*)::int` })
      .from(conversions)
      .where(sql`offer_id = ${offerId} AND conversion_type = 'lead'`);
    
    const saleCount = await db.select({ count: sql<number>`COUNT(*)::int` })
      .from(conversions)
      .where(sql`offer_id = ${offerId} AND conversion_type = 'sale'`);
    
    const payoutSum = await db.select({ sum: sql<string>`COALESCE(SUM(CAST(payout AS NUMERIC)), 0)` })
      .from(conversions)
      .where(sql`offer_id = ${offerId} AND conversion_type = 'sale'`);
    
    const actualClicks = clickCount[0].count;
    const actualLeads = leadCount[0].count;
    const actualSales = saleCount[0].count;
    const actualPayout = parseFloat(payoutSum[0].sum);
    
    const actualInstareg = (actualLeads / actualClicks) * 100;
    const actualR2D = (actualSales / actualLeads) * 100;
    const actualEPC = actualPayout / actualClicks;
    const actualMargin = actualSales * (config.internalCost - config.partnerPayout);
    
    console.log(`  ${config.name} (${config.geo}):`);
    console.log(`    Clicks:    ${actualClicks} (expected: ${config.clicks}) ${actualClicks === config.clicks ? '✓' : '✗'}`);
    console.log(`    Leads:     ${actualLeads} (expected: ${config.registrations}) ${actualLeads === config.registrations ? '✓' : '✗'}`);
    console.log(`    Sales:     ${actualSales} (expected: ${config.deposits}) ${actualSales === config.deposits ? '✓' : '✗'}`);
    console.log(`    Instareg:  ${actualInstareg.toFixed(1)}% (expected: ~${config.expectedInstareg}%)`);
    console.log(`    R2D:       ${actualR2D.toFixed(1)}% (expected: ~${config.expectedR2D}%)`);
    console.log(`    EPC:       $${actualEPC.toFixed(2)} (expected: ~$${config.expectedEPC})`);
    console.log(`    Margin:    $${actualMargin.toFixed(0)} (expected: ~$${config.expectedMargin})`);
    
    if (actualClicks !== config.clicks || actualLeads !== config.registrations || actualSales !== config.deposits) {
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function getOrCreateUser(data: { username: string; email: string; password: string; role: string; telegram?: string; companyName?: string }) {
  const byEmail = await db.select().from(users).where(eq(users.email, data.email));
  if (byEmail.length > 0) return byEmail[0];
  
  const byUsername = await db.select().from(users).where(eq(users.username, data.username));
  if (byUsername.length > 0) return byUsername[0];
  
  const [created] = await db.insert(users).values({
    ...data,
    status: "active",
    twoFactorEnabled: false,
    twoFactorSetupCompleted: true,
  }).returning();
  return created;
}

async function getOrCreateOffer(advertiserId: string, name: string, config: typeof OFFERS_CONFIG.leon) {
  const existing = await db.select().from(offers).where(sql`name = ${name} AND advertiser_id = ${advertiserId}`);
  if (existing.length > 0) return existing[0];
  
  const [created] = await db.insert(offers).values({
    advertiserId,
    name,
    description: `Premium ${config.geo} gambling offer - TEST DATA`,
    geo: [config.geo],
    category: "gambling",
    trafficSources: ["Facebook", "Google", "TikTok", "PPC", "Push"],
    appTypes: ["PWA", "WebView"],
    partnerPayout: String(config.partnerPayout),
    internalCost: String(config.internalCost),
    payoutModel: "CPA",
    currency: "USD",
    status: "active",
    isTop: true,
    holdPeriodDays: 7,
  }).returning();
  return created;
}

async function getOrCreateLanding(offerId: string, geo: string, name: string, config: typeof OFFERS_CONFIG.leon) {
  const existing = await db.select().from(offerLandings).where(sql`offer_id = ${offerId} AND geo = ${geo}`);
  if (existing.length > 0) return existing[0];
  
  const [created] = await db.insert(offerLandings).values({
    offerId,
    geo,
    landingName: `${name} Main`,
    landingUrl: `https://${name.toLowerCase().replace(/[^a-z]/g, '')}.casino/lp1?click_id={click_id}`,
    partnerPayout: String(config.partnerPayout),
    internalCost: String(config.internalCost),
    currency: "USD",
  }).returning();
  return created;
}

async function seed() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  PrimeTrack Test Data Seed Script (Additive)");
  console.log("═══════════════════════════════════════════════════════════════\n");
  
  const hashedPassword = await bcrypt.hash("test123", 10);
  
  console.log("👤 Getting or creating test advertiser...");
  const advertiser = await getOrCreateUser({
    username: "test_advertiser",
    email: TEST_ADVERTISER_EMAIL,
    password: hashedPassword,
    role: "advertiser",
    companyName: "TestCasino Partners [TEST]",
    telegram: "@test_adv",
  });
  
  const advId = advertiser.id;
  console.log(`  ✓ Advertiser: ${advId}\n`);
  
  console.log("👥 Getting or creating test publishers (10 вебов)...");
  const publisherIds: string[] = [];
  for (const pub of PUBLISHERS) {
    const publisher = await getOrCreateUser({
      username: pub.username,
      email: pub.email,
      password: hashedPassword,
      role: "publisher",
      telegram: pub.telegram,
    });
    publisherIds.push(publisher.id);
    console.log(`  ✓ ${pub.username}`);
  }
  
  console.log("\n🤝 Setting up publisher-advertiser relationships...");
  for (const pubId of publisherIds) {
    const existing = await db.select().from(publisherAdvertisers)
      .where(sql`publisher_id = ${pubId} AND advertiser_id = ${advId}`);
    if (existing.length === 0) {
      await db.insert(publisherAdvertisers).values({
        publisherId: pubId,
        advertiserId: advId,
        status: "active",
      });
    }
  }
  console.log(`  ✓ ${publisherIds.length} relationships ready\n`);
  
  console.log("📦 Getting or creating offers...");
  const offerIds: Record<string, string> = {};
  const landingIds: Record<string, string> = {};
  
  for (const [key, config] of Object.entries(OFFERS_CONFIG)) {
    const offer = await getOrCreateOffer(advId, config.name, config);
    offerIds[key] = offer.id;
    console.log(`  ✓ ${config.name} (${config.geo})`);
    
    const landing = await getOrCreateLanding(offer.id, config.geo, config.name, config);
    landingIds[key] = landing.id;
  }
  
  console.log("\n🔐 Setting up publisher access to offers...");
  for (const pubId of publisherIds) {
    for (const offerId of Object.values(offerIds)) {
      const existing = await db.select().from(publisherOffers)
        .where(sql`publisher_id = ${pubId} AND offer_id = ${offerId}`);
      if (existing.length === 0) {
        await db.insert(publisherOffers).values({
          publisherId: pubId,
          offerId: offerId,
        });
      }
    }
  }
  console.log(`  ✓ ${publisherIds.length} publishers have access\n`);
  
  console.log("📊 Generating clicks and conversions...");
  
  for (const [key, config] of Object.entries(OFFERS_CONFIG)) {
    const offerId = offerIds[key];
    const landingId = landingIds[key];
    
    const existingClicksResult = await db.select({ count: sql<number>`COUNT(*)::int` })
      .from(clicks).where(eq(clicks.offerId, offerId));
    const existingClicks = existingClicksResult[0].count;
    
    if (existingClicks >= config.clicks) {
      console.log(`\n  ${config.name} (${config.geo}): Already has ${existingClicks} clicks, skipping`);
      continue;
    }
    
    const clicksNeeded = config.clicks - existingClicks;
    const leadsNeeded = config.registrations;
    const salesNeeded = config.deposits;
    
    console.log(`\n  ${config.name} (${config.geo}):`);
    console.log(`    Existing: ${existingClicks} clicks`);
    console.log(`    Adding: ${clicksNeeded} clicks, ${leadsNeeded} leads, ${salesNeeded} sales`);
    
    const cities = config.geo === "PT" ? PT_CITIES : FR_CITIES;
    
    const clicksPerPub = distributeExact(clicksNeeded, TRAFFIC_DISTRIBUTION);
    const leadsPerPub = distributeExact(leadsNeeded, TRAFFIC_DISTRIBUTION);
    const salesPerPub = distributeExact(salesNeeded, TRAFFIC_DISTRIBUTION);
    
    let totalClicks = 0;
    let totalLeads = 0;
    let totalSales = 0;
    
    for (let pubIndex = 0; pubIndex < publisherIds.length; pubIndex++) {
      const pubId = publisherIds[pubIndex];
      const pubClicks = clicksPerPub[pubIndex];
      const pubLeads = leadsPerPub[pubIndex];
      const pubSales = salesPerPub[pubIndex];
      
      const clicksToInsert: any[] = [];
      
      for (let i = 0; i < pubClicks; i++) {
        const clickId = generateClickId();
        const clickDate = randomDate(30);
        
        clicksToInsert.push({
          clickId,
          offerId,
          publisherId: pubId,
          landingId,
          ip: generateIP(config.geo),
          userAgent: randomElement(USER_AGENTS),
          geo: config.geo,
          city: randomElement(cities),
          device: randomElement(DEVICES),
          os: randomElement(OS_LIST),
          browser: randomElement(BROWSERS),
          isUnique: Math.random() > 0.15,
          isGeoMatch: true,
          isBot: false,
          fraudScore: Math.floor(Math.random() * 20),
          sub1: `camp_${Math.floor(Math.random() * 100)}`,
          sub2: `ad_${Math.floor(Math.random() * 500)}`,
          createdAt: clickDate,
        });
      }
      
      const BATCH_SIZE = 500;
      for (let i = 0; i < clicksToInsert.length; i += BATCH_SIZE) {
        const batch = clicksToInsert.slice(i, i + BATCH_SIZE);
        await db.insert(clicks).values(batch);
      }
      totalClicks += pubClicks;
      
      const insertedClicks = await db.select({ id: clicks.id, createdAt: clicks.createdAt })
        .from(clicks)
        .where(sql`offer_id = ${offerId} AND publisher_id = ${pubId}`)
        .orderBy(clicks.createdAt)
        .limit(pubClicks);
      
      const conversionsToInsert: any[] = [];
      
      for (let i = 0; i < pubLeads; i++) {
        const click = insertedClicks[i];
        if (!click) continue;
        const convDate = new Date(click.createdAt!.getTime() + Math.random() * 3600000);
        conversionsToInsert.push({
          clickId: click.id,
          offerId,
          publisherId: pubId,
          conversionType: "lead",
          advertiserCost: "0",
          publisherPayout: "0",
          currency: "USD",
          status: "approved",
          approvedAt: convDate,
          createdAt: convDate,
        });
      }
      
      for (let i = 0; i < pubSales; i++) {
        const click = insertedClicks[i];
        if (!click) continue;
        const convDate = new Date(click.createdAt!.getTime() + Math.random() * 86400000 * 2);
        conversionsToInsert.push({
          clickId: click.id,
          offerId,
          publisherId: pubId,
          conversionType: "sale",
          advertiserCost: String(config.internalCost),
          publisherPayout: String(config.partnerPayout),
          currency: "USD",
          status: "approved",
          approvedAt: convDate,
          createdAt: convDate,
        });
      }
      
      for (let i = 0; i < conversionsToInsert.length; i += BATCH_SIZE) {
        const batch = conversionsToInsert.slice(i, i + BATCH_SIZE);
        await db.insert(conversions).values(batch);
      }
      
      totalLeads += pubLeads;
      totalSales += pubSales;
    }
    
    console.log(`    ✓ Created: ${totalClicks} clicks, ${totalLeads} leads, ${totalSales} sales`);
  }
  
  console.log("\n💰 Updating publisher balances...");
  for (const pubId of publisherIds) {
    const existing = await db.select().from(publisherBalances)
      .where(sql`publisher_id = ${pubId} AND advertiser_id = ${advId}`);
    
    if (existing.length === 0) {
      const pubConversions = await db.select({
        total: sql<string>`COALESCE(SUM(CAST(payout AS NUMERIC)), 0)`,
      }).from(conversions).where(sql`publisher_id = ${pubId} AND status = 'approved' AND CAST(payout AS NUMERIC) > 0`);
      
      const balance = parseFloat(pubConversions[0]?.total || "0");
      
      await db.insert(publisherBalances).values({
        publisherId: pubId,
        advertiserId: advId,
        availableBalance: String(balance * 0.7),
        pendingBalance: String(balance * 0.2),
        holdBalance: String(balance * 0.1),
        totalPaid: "0",
        currency: "USD",
      });
    }
  }
  console.log(`  ✓ Balances ready for ${publisherIds.length} publishers`);
  
  const verified = await verifyMetrics(offerIds);
  
  console.log("\n═══════════════════════════════════════════════════════════════");
  if (verified) {
    console.log("  ✅ SEED COMPLETED SUCCESSFULLY - ALL METRICS VERIFIED");
  } else {
    console.log("  ⚠️ SEED COMPLETED WITH WARNINGS - CHECK METRICS ABOVE");
  }
  console.log("═══════════════════════════════════════════════════════════════\n");
  
  process.exit(verified ? 0 : 1);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
