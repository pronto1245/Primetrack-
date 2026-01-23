import { db } from "../db";
import { users, offers, offerLandings, clicks, conversions, publisherAdvertisers } from "../shared/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

const ADVERTISER_ID = "18aa2cda-f743-41e8-a36b-9867b16f5a46";

const START_DATE = new Date("2025-12-17T00:00:00Z");
const END_DATE = new Date("2026-01-18T23:59:59Z");

const OFFERS_CONFIG = [
  {
    name: "Leon",
    geo: "PT",
    partnerPayout: 90,
    internalCost: 110,
    clicks: 10873,
    leads: 4023,
    sales: 447,
  },
  {
    name: "Twin",
    geo: "FR",
    partnerPayout: 140,
    internalCost: 160,
    clicks: 22877,
    leads: 7321,
    sales: 719,
  },
  {
    name: "Spinania | Slot | FB",
    geo: "ES",
    partnerPayout: 170,
    internalCost: 190,
    clicks: 22877,
    leads: 7321,
    sales: 719,
  },
  {
    name: "Hitnspin | Slot | FB",
    geo: "DE",
    partnerPayout: 230,
    internalCost: 280,
    clicks: 18500,
    leads: 5800,
    sales: 620,
  },
  {
    name: "Vulkan | Slot | FB",
    geo: "PL",
    partnerPayout: 125,
    internalCost: 160,
    clicks: 15200,
    leads: 4900,
    sales: 510,
  },
];

const PUBLISHERS = [
  { username: "web043", email: "web043@primetrack.io" },
  { username: "web279", email: "web279@primetrack.io" },
];

const ANDROID_UAS = [
  "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; Redmi Note 12 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; OnePlus 10 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; Samsung Galaxy A54) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
];

const IOS_UAS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
];

const PT_CITIES = ["Lisbon", "Porto", "Braga", "Coimbra", "Funchal", "Faro", "Aveiro", "Setubal"];
const FR_CITIES = ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg", "Bordeaux"];
const ES_CITIES = ["Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Malaga", "Murcia", "Bilbao"];
const DE_CITIES = ["Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart", "Dusseldorf", "Leipzig"];
const PL_CITIES = ["Warsaw", "Krakow", "Lodz", "Wroclaw", "Poznan", "Gdansk", "Szczecin", "Lublin"];

const PT_ISPS = ["NOS", "MEO", "Vodafone PT", "NOWO", "Altice Portugal"];
const FR_ISPS = ["Orange", "SFR", "Bouygues Telecom", "Free Mobile", "Iliad"];
const ES_ISPS = ["Movistar", "Vodafone ES", "Orange ES", "MasMovil", "Yoigo"];
const DE_ISPS = ["Deutsche Telekom", "Vodafone DE", "O2 Germany", "1&1", "Congstar"];
const PL_ISPS = ["Orange PL", "T-Mobile PL", "Plus", "Play", "Netia"];

function generateUniqueIP(index: number, geo: string): string {
  if (geo === "PT") {
    const base = 85 + (index % 10);
    const b = 240 + (index % 15);
    const c = Math.floor(index / 1000) % 256;
    const d = index % 256;
    return `${base}.${b}.${c}.${d}`;
  } else if (geo === "ES") {
    const base = 83 + (index % 10);
    const b = 32 + (index % 64);
    const c = Math.floor(index / 1000) % 256;
    const d = index % 256;
    return `${base}.${b}.${c}.${d}`;
  } else if (geo === "DE") {
    const base = 91 + (index % 10);
    const b = 64 + (index % 64);
    const c = Math.floor(index / 1000) % 256;
    const d = index % 256;
    return `${base}.${b}.${c}.${d}`;
  } else if (geo === "PL") {
    const base = 78 + (index % 10);
    const b = 96 + (index % 64);
    const c = Math.floor(index / 1000) % 256;
    const d = index % 256;
    return `${base}.${b}.${c}.${d}`;
  } else {
    const base = 176 + (index % 10);
    const b = 128 + (index % 64);
    const c = Math.floor(index / 1000) % 256;
    const d = index % 256;
    return `${base}.${b}.${c}.${d}`;
  }
}

function randomDate(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSub(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

async function main() {
  console.log("=== Добавление тестовых данных ===\n");

  const hashedPassword = await bcrypt.hash("test123", 10);

  console.log("1. Создаю партнёров...");
  const publisherIds: string[] = [];
  
  for (const pub of PUBLISHERS) {
    const existing = await db.select().from(users).where(eq(users.username, pub.username)).limit(1);
    if (existing.length > 0) {
      console.log(`   - ${pub.username} уже существует`);
      publisherIds.push(existing[0].id);
    } else {
      const [newUser] = await db.insert(users).values({
        username: pub.username,
        email: pub.email,
        password: hashedPassword,
        role: "publisher",
        status: "active",
      }).returning();
      console.log(`   + ${pub.username} создан`);
      publisherIds.push(newUser.id);
    }
  }

  console.log("\n2. Создаю связи publisher-advertiser...");
  for (const pubId of publisherIds) {
    const existing = await db.select().from(publisherAdvertisers)
      .where(and(eq(publisherAdvertisers.publisherId, pubId), eq(publisherAdvertisers.advertiserId, ADVERTISER_ID)))
      .limit(1);
    
    if (existing.length === 0) {
      await db.insert(publisherAdvertisers).values({
        publisherId: pubId,
        advertiserId: ADVERTISER_ID,
        status: "active",
      });
      console.log(`   + Связь создана`);
    }
  }

  console.log("\n3. Создаю офферы...");
  const offerData: { offerId: string; landingId: string; config: typeof OFFERS_CONFIG[0] }[] = [];

  for (const config of OFFERS_CONFIG) {
    const offerName = `${config.name} (${config.geo})`;
    
    const [newOffer] = await db.insert(offers).values({
      advertiserId: ADVERTISER_ID,
      name: offerName,
      description: `${config.name} - ${
        config.geo === "PT" ? "Португалия" : 
        config.geo === "FR" ? "Франция" : 
        config.geo === "ES" ? "Испания" : 
        config.geo === "DE" ? "Германия" : "Польша"
      }`,
      partnerPayout: String(config.partnerPayout),
      internalCost: String(config.internalCost),
      payoutModel: "CPA",
      currency: "USD",
      geo: [config.geo],
      category: "gambling",
      trafficSources: ["Facebook", "Google", "TikTok"],
      appTypes: ["PWA", "WebView"],
      status: "active",
      isTop: true,
    }).returning();

    console.log(`   + Оффер "${offerName}" создан (id: ${newOffer.id})`);

    const [landing] = await db.insert(offerLandings).values({
      offerId: newOffer.id,
      geo: config.geo,
      landingName: `${config.name} Main`,
      landingUrl: `https://${config.name.toLowerCase()}.com/?click_id={click_id}`,
      partnerPayout: String(config.partnerPayout),
      internalCost: String(config.internalCost),
      currency: "USD",
    }).returning();

    console.log(`   + Лендинг создан (id: ${landing.id})`);

    offerData.push({ offerId: newOffer.id, landingId: landing.id, config });
  }

  console.log("\n4. Генерирую клики и конверсии...");
  
  for (const { offerId, landingId, config } of offerData) {
    console.log(`\n   Оффер: ${config.name} (${config.geo})`);
    console.log(`   - Клики: ${config.clicks}`);
    console.log(`   - Лиды: ${config.leads}`);
    console.log(`   - Сейлы: ${config.sales}`);

    const cities = config.geo === "PT" ? PT_CITIES : 
                   config.geo === "FR" ? FR_CITIES : 
                   config.geo === "ES" ? ES_CITIES : 
                   config.geo === "DE" ? DE_CITIES : PL_CITIES;
    const isps = config.geo === "PT" ? PT_ISPS : 
                 config.geo === "FR" ? FR_ISPS : 
                 config.geo === "ES" ? ES_ISPS : 
                 config.geo === "DE" ? DE_ISPS : PL_ISPS;

    const clicksToCreate: any[] = [];
    const clickIds: { id: string; clickId: string; createdAt: Date; publisherId: string }[] = [];

    for (let i = 0; i < config.clicks; i++) {
      const clickId = uuidv4();
      const id = uuidv4();
      const publisherId = pick(publisherIds);
      const createdAt = randomDate(START_DATE, END_DATE);
      const isIos = Math.random() > 0.5;
      const ua = isIos ? pick(IOS_UAS) : pick(ANDROID_UAS);

      clicksToCreate.push({
        id,
        clickId,
        offerId,
        publisherId,
        landingId,
        ip: generateUniqueIP(i, config.geo),
        userAgent: ua,
        geo: config.geo,
        city: pick(cities),
        device: "mobile",
        os: isIos ? "iOS" : "Android",
        browser: isIos ? "Safari" : "Chrome",
        sub1: generateSub(),
        sub2: generateSub(),
        isUnique: true,
        isGeoMatch: true,
        isBot: false,
        isp: pick(isps),
        createdAt,
      });

      clickIds.push({ id, clickId, createdAt, publisherId });

      if (clicksToCreate.length >= 500) {
        await db.insert(clicks).values(clicksToCreate);
        clicksToCreate.length = 0;
        process.stdout.write(`\r   Клики: ${i + 1}/${config.clicks}`);
      }
    }

    if (clicksToCreate.length > 0) {
      await db.insert(clicks).values(clicksToCreate);
    }
    console.log(`\r   Клики: ${config.clicks}/${config.clicks} - готово`);

    clickIds.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const conversionsToCreate: any[] = [];

    const leadIndices = new Set<number>();
    while (leadIndices.size < config.leads) {
      leadIndices.add(Math.floor(Math.random() * clickIds.length));
    }
    const leadArray = Array.from(leadIndices);

    const saleIndices = new Set<number>();
    const leadArrayCopy = [...leadArray];
    while (saleIndices.size < config.sales && leadArrayCopy.length > 0) {
      const idx = Math.floor(Math.random() * leadArrayCopy.length);
      saleIndices.add(leadArrayCopy[idx]);
      leadArrayCopy.splice(idx, 1);
    }

    for (const clickIndex of leadArray) {
      const click = clickIds[clickIndex];
      const isSale = saleIndices.has(clickIndex);
      
      const leadDate = new Date(click.createdAt.getTime() + Math.random() * 3600000);
      
      conversionsToCreate.push({
        clickId: click.id,
        offerId,
        publisherId: click.publisherId,
        conversionType: "lead",
        advertiserCost: "0",
        publisherPayout: "0",
        currency: "USD",
        status: "approved",
        createdAt: leadDate,
      });

      if (isSale) {
        const saleDate = new Date(leadDate.getTime() + Math.random() * 86400000);
        conversionsToCreate.push({
          clickId: click.id,
          offerId,
          publisherId: click.publisherId,
          conversionType: "sale",
          advertiserCost: String(config.internalCost),
          publisherPayout: String(config.partnerPayout),
          currency: "USD",
          status: "approved",
          createdAt: saleDate,
        });
      }

      if (conversionsToCreate.length >= 500) {
        await db.insert(conversions).values(conversionsToCreate);
        conversionsToCreate.length = 0;
      }
    }

    if (conversionsToCreate.length > 0) {
      await db.insert(conversions).values(conversionsToCreate);
    }

    console.log(`   Конверсии: ${config.leads} лидов + ${config.sales} сейлов - готово`);
  }

  console.log("\n=== Готово! ===");
  console.log("\nСводка:");
  console.log("- Офферы: Leon (PT), Twin (FR), Spinania | Slot | FB (ES), Hitnspin | Slot | FB (DE), Vulkan | Slot | FB (PL)");
  console.log("- Партнёры: web043, web279");
  console.log("- Период: 17.12.2025 - 18.01.2026");
  console.log("\nМетрики:");
  console.log("Leon (PT): 10,873 кликов, 4,023 лидов, 447 сейлов");
  console.log("Twin (FR): 22,877 кликов, 7,321 лидов, 719 сейлов");
  console.log("Spinania | Slot | FB (ES): 22,877 кликов, 7,321 лидов, 719 сейлов");
  console.log("Hitnspin | Slot | FB (DE): 18,500 кликов, 5,800 лидов, 620 сейлов");
  console.log("Vulkan | Slot | FB (PL): 15,200 кликов, 4,900 лидов, 510 сейлов");

  process.exit(0);
}

main().catch((err) => {
  console.error("Ошибка:", err);
  process.exit(1);
});
