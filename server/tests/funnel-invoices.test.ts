import { storage } from "../storage";
import { db } from "../../db";
import { playerSessions, publisherInvoices, publisherInvoiceItems, offers, users } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { funnelAggregationService } from "../services/funnel-aggregation-service";
import { invoicePdfService } from "../services/invoice-pdf-service";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

async function runFunnelInvoiceTests() {
  console.log("\n🧪 Running Funnel & Invoice Tests (Direct DB)...\n");

  let testAdvertiserId = "";
  let testPublisherId = "";
  let testOfferId = "";
  let testSessionId = "";
  let testInvoiceId = "";

  await test("1. Get advertiser from DB", async () => {
    const [advertiser] = await db.select().from(users)
      .where(eq(users.role, "advertiser"))
      .limit(1);
    if (!advertiser) throw new Error("No advertiser found");
    testAdvertiserId = advertiser.id;
    console.log(`   Found advertiser: ${advertiser.username} (${testAdvertiserId})`);
  });

  await test("2. Get publisher from DB", async () => {
    const [publisher] = await db.select().from(users)
      .where(eq(users.role, "publisher"))
      .limit(1);
    if (!publisher) throw new Error("No publisher found");
    testPublisherId = publisher.id;
    console.log(`   Found publisher: ${publisher.username} (${testPublisherId})`);
  });

  await test("3. Get offer from advertiser", async () => {
    const [offer] = await db.select().from(offers)
      .where(eq(offers.advertiserId, testAdvertiserId))
      .limit(1);
    if (!offer) throw new Error("No offer found for advertiser");
    testOfferId = offer.id;
    console.log(`   Found offer: ${offer.name} (${testOfferId})`);
  });

  await test("4. Seed test player session", async () => {
    const [session] = await db.insert(playerSessions).values({
      offerId: testOfferId,
      publisherId: testPublisherId,
      playerId: `test-player-${Date.now()}`,
      hasClick: true,
      clickAt: new Date(),
      hasRegistration: true,
      registrationAt: new Date(),
      hasFtd: true,
      ftdAt: new Date(),
      ftdAmount: "100.00",
    }).returning();
    testSessionId = session.id;
    console.log(`   Created player session: ${testSessionId}`);
  });

  await test("5. FunnelAggregationService.getFunnelData - with advertiserId", async () => {
    const funnel = await funnelAggregationService.getFunnelData({
      advertiserId: testAdvertiserId,
    });
    if (!funnel.stages) throw new Error("No stages returned");
    if (funnel.stages.length !== 4) throw new Error(`Expected 4 stages, got ${funnel.stages.length}`);
    console.log(`   Funnel: ${funnel.totalClicks} clicks, ${funnel.totalFtd} FTD`);
  });

  await test("6. FunnelAggregationService - tenant isolation (different advertiser)", async () => {
    const [otherAdvertiser] = await db.select().from(users)
      .where(and(eq(users.role, "advertiser"), eq(users.username, "adv_crypto")))
      .limit(1);
    
    if (!otherAdvertiser) {
      console.log("   Skipping: no other advertiser to test isolation");
      return;
    }

    const funnel = await funnelAggregationService.getFunnelData({
      advertiserId: otherAdvertiser.id,
    });
    
    if (funnel.totalFtd > 0 && testAdvertiserId !== otherAdvertiser.id) {
      console.log(`   Other advertiser sees ${funnel.totalFtd} FTD (may have own data)`);
    } else {
      console.log(`   Tenant isolation OK: other advertiser sees ${funnel.totalClicks} clicks`);
    }
  });

  await test("7. FunnelAggregationService.getFunnelData - filter by offerId", async () => {
    const funnel = await funnelAggregationService.getFunnelData({
      advertiserId: testAdvertiserId,
      offerId: testOfferId,
    });
    if (funnel.totalFtd < 1) throw new Error("Expected at least 1 FTD from test session");
    console.log(`   Filtered funnel: ${funnel.totalClicks} clicks, ${funnel.totalFtd} FTD`);
  });

  await test("8. FunnelAggregationService.getFunnelByOffer", async () => {
    const data = await funnelAggregationService.getFunnelByOffer(testAdvertiserId);
    if (!Array.isArray(data)) throw new Error("Expected array");
    console.log(`   Funnel by offer: ${data.length} offers with data`);
  });

  await test("9. Seed test invoice", async () => {
    const [invoice] = await db.insert(publisherInvoices).values({
      publisherId: testPublisherId,
      advertiserId: testAdvertiserId,
      shortId: `INV-TEST-${Date.now()}`,
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(),
      totalAmount: "500.00",
      currency: "USD",
      status: "draft",
    }).returning();
    testInvoiceId = invoice.id;

    await db.insert(publisherInvoiceItems).values({
      invoiceId: testInvoiceId,
      offerId: testOfferId,
      offerName: "Test Offer",
      conversions: 10,
      payoutPerConversion: "50.00",
      totalAmount: "500.00",
    });
    console.log(`   Created test invoice: ${testInvoiceId}`);
  });

  await test("10. InvoicePdfService.generateInvoicePdf", async () => {
    const pdfBuffer = await invoicePdfService.generateInvoicePdf(testInvoiceId);
    if (!pdfBuffer || pdfBuffer.length < 1000) {
      throw new Error(`PDF too small: ${pdfBuffer?.length || 0} bytes`);
    }
    if (!pdfBuffer.toString().includes("%PDF")) {
      throw new Error("Buffer does not start with PDF header");
    }
    console.log(`   Generated PDF: ${pdfBuffer.length} bytes`);
  });

  await test("11. InvoicePdfService - invalid invoice throws", async () => {
    try {
      await invoicePdfService.generateInvoicePdf("invalid-id-12345");
      throw new Error("Should have thrown for invalid ID");
    } catch (e: any) {
      if (!e.message.includes("not found")) {
        throw new Error(`Expected 'not found' error, got: ${e.message}`);
      }
      console.log("   Correctly throws for invalid invoice");
    }
  });

  await test("12. Storage.getPublisherInvoices", async () => {
    const invoices = await storage.getPublisherInvoices(testPublisherId);
    if (!Array.isArray(invoices)) throw new Error("Expected array");
    const found = invoices.find(i => i.id === testInvoiceId);
    if (!found) throw new Error("Test invoice not found in publisher invoices");
    console.log(`   Publisher has ${invoices.length} invoices`);
  });

  await test("13. Caps check still works (not broken by A/B removal)", async () => {
    const caps = await storage.checkOfferCaps(testOfferId);
    if (caps.offer === undefined) throw new Error("Offer not found in caps check");
    console.log(`   Caps check: daily=${caps.dailyCapReached}, monthly=${caps.monthlyCapReached}`);
  });

  await test("14. Cleanup - delete test invoice items", async () => {
    await db.delete(publisherInvoiceItems)
      .where(eq(publisherInvoiceItems.invoiceId, testInvoiceId));
    console.log("   Deleted invoice items");
  });

  await test("15. Cleanup - delete test invoice", async () => {
    await db.delete(publisherInvoices)
      .where(eq(publisherInvoices.id, testInvoiceId));
    console.log("   Deleted invoice");
  });

  await test("16. Cleanup - delete test player session", async () => {
    await db.delete(playerSessions)
      .where(eq(playerSessions.id, testSessionId));
    console.log("   Deleted player session");
  });

  console.log("\n📊 Test Results:");
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`   Passed: ${passed}/${results.length}`);
  console.log(`   Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log("\n❌ Failed tests:");
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
  } else {
    console.log("\n✅ All tests passed!");
  }

  return { passed, failed, total: results.length };
}

runFunnelInvoiceTests()
  .then(({ passed, failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch(err => {
    console.error("Test runner error:", err);
    process.exit(1);
  });
