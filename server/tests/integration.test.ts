import { db } from "../../db";
import { users, offers, playerSessions, publisherInvoices, publisherInvoiceItems } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];
const BASE_URL = process.env.TEST_URL || "http://localhost:5000";

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

async function runIntegrationTests() {
  console.log("\n🧪 Running Integration Tests...\n");

  const testPassword = "TestPass123!";
  let testAdvertiserId = "";
  let testPublisherId = "";
  let testOfferId = "";
  let testSessionId = "";
  let advertiserCookie = "";
  let publisherCookie = "";

  // Test 1: Get existing test users from DB
  await test("1. Get test advertiser from DB", async () => {
    const [advertiser] = await db.select().from(users)
      .where(eq(users.email, "advertiser@primetrack.io"))
      .limit(1);
    if (!advertiser) throw new Error("Advertiser not found");
    testAdvertiserId = advertiser.id;
    console.log(`   Advertiser: ${advertiser.username} (${testAdvertiserId})`);
  });

  await test("2. Get test publisher from DB", async () => {
    const [publisher] = await db.select().from(users)
      .where(eq(users.email, "publisher@primetrack.io"))
      .limit(1);
    if (!publisher) throw new Error("Publisher not found");
    testPublisherId = publisher.id;
    console.log(`   Publisher: ${publisher.username} (${testPublisherId})`);
  });

  await test("3. Get test offer", async () => {
    const [offer] = await db.select().from(offers)
      .where(eq(offers.advertiserId, testAdvertiserId))
      .limit(1);
    if (!offer) throw new Error("No offer found");
    testOfferId = offer.id;
    console.log(`   Offer: ${offer.name} (${testOfferId})`);
  });

  // Test 4: Create test player session for funnel
  await test("4. Create player session for funnel test", async () => {
    const [session] = await db.insert(playerSessions).values({
      offerId: testOfferId,
      publisherId: testPublisherId,
      playerId: `integration-test-${Date.now()}`,
      hasClick: true,
      clickAt: new Date(),
      hasRegistration: true,
      registrationAt: new Date(),
      hasFtd: true,
      ftdAt: new Date(),
      ftdAmount: "250.00",
    }).returning();
    testSessionId = session.id;
    console.log(`   Created session: ${testSessionId}`);
  });

  // Test 5: Health check endpoint
  await test("5. API health check", async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok && res.status !== 404) {
      throw new Error(`Health check failed: ${res.status}`);
    }
    console.log(`   Status: ${res.status}`);
  });

  // Test 6: Get offers requires auth (expected 401)
  await test("6. Offers endpoint requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/offers`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    console.log(`   Correctly requires auth: ${res.status}`);
  });

  // Test 7: Test funnel aggregation directly
  await test("7. Funnel aggregation service", async () => {
    const { funnelAggregationService } = await import("../services/funnel-aggregation-service");
    const funnel = await funnelAggregationService.getFunnelData({
      advertiserId: testAdvertiserId,
    });
    if (!funnel.stages || funnel.stages.length !== 4) {
      throw new Error(`Expected 4 stages, got ${funnel.stages?.length}`);
    }
    console.log(`   Clicks: ${funnel.totalClicks}, FTD: ${funnel.totalFtd}`);
  });

  // Test 8: Test tenant isolation with STRICT ASSERTION
  await test("8. Funnel tenant isolation (STRICT)", async () => {
    const { funnelAggregationService } = await import("../services/funnel-aggregation-service");
    
    const [otherAdv] = await db.select().from(users)
      .where(eq(users.email, "crypto@primetrack.io"))
      .limit(1);
    
    if (!otherAdv) {
      console.log("   Skipped: no other advertiser available");
      return;
    }

    // Get funnel for OUR advertiser - should see our test FTD
    const ourFunnel = await funnelAggregationService.getFunnelData({
      advertiserId: testAdvertiserId,
    });
    
    // Get funnel for OTHER advertiser - should NOT see our test FTD
    const otherFunnel = await funnelAggregationService.getFunnelData({
      advertiserId: otherAdv.id,
    });
    
    // STRICT ASSERTION: our advertiser must see the FTD we created
    if (ourFunnel.totalFtd < 1) {
      throw new Error(`Our advertiser should see at least 1 FTD, got ${ourFunnel.totalFtd}`);
    }
    
    // STRICT ASSERTION: other advertiser must NOT see our test data
    // We check specifically for our offerId
    const otherFunnelByOffer = await funnelAggregationService.getFunnelData({
      advertiserId: otherAdv.id,
      offerId: testOfferId,
    });
    
    if (otherFunnelByOffer.totalFtd > 0) {
      throw new Error(`SECURITY BREACH: Other advertiser sees ${otherFunnelByOffer.totalFtd} FTD for our offer!`);
    }
    
    console.log(`   ✓ Our advertiser: ${ourFunnel.totalFtd} FTD, Other sees our offer: ${otherFunnelByOffer.totalFtd} FTD`);
  });

  // Test 9: Test invoice creation
  let testInvoiceId = "";
  await test("9. Create test invoice", async () => {
    const [invoice] = await db.insert(publisherInvoices).values({
      publisherId: testPublisherId,
      advertiserId: testAdvertiserId,
      shortId: `INV-INT-${Date.now()}`,
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(),
      totalAmount: "750.00",
      currency: "USD",
      status: "draft",
    }).returning();
    testInvoiceId = invoice.id;

    await db.insert(publisherInvoiceItems).values({
      invoiceId: testInvoiceId,
      offerId: testOfferId,
      offerName: "Integration Test Offer",
      conversions: 15,
      payoutPerConversion: "50.00",
      totalAmount: "750.00",
    });
    console.log(`   Created invoice: ${testInvoiceId}`);
  });

  // Test 10: Get publisher invoices
  await test("10. Get publisher invoices via DB", async () => {
    const invoices = await db.select().from(publisherInvoices)
      .where(eq(publisherInvoices.publisherId, testPublisherId));
    const found = invoices.find(i => i.id === testInvoiceId);
    if (!found) throw new Error("Test invoice not found");
    console.log(`   Publisher has ${invoices.length} invoices`);
  });

  // Test 10b: Generate PDF for invoice
  await test("10b. Generate invoice PDF", async () => {
    const { invoicePdfService } = await import("../services/invoice-pdf-service");
    const pdfBuffer = await invoicePdfService.generateInvoicePdf(testInvoiceId);
    
    if (!pdfBuffer) throw new Error("PDF buffer is null");
    if (pdfBuffer.length < 1000) throw new Error(`PDF too small: ${pdfBuffer.length} bytes`);
    
    const header = pdfBuffer.slice(0, 5).toString();
    if (!header.includes("%PDF")) throw new Error(`Invalid PDF header: ${header}`);
    
    console.log(`   Generated PDF: ${pdfBuffer.length} bytes, header: ${header}`);
  });

  // Test 10c: PDF service throws for invalid invoice
  await test("10c. PDF service throws for invalid ID", async () => {
    const { invoicePdfService } = await import("../services/invoice-pdf-service");
    try {
      await invoicePdfService.generateInvoicePdf("non-existent-invoice-id");
      throw new Error("Should have thrown");
    } catch (e: any) {
      if (!e.message.includes("not found")) {
        throw new Error(`Expected 'not found' error, got: ${e.message}`);
      }
      console.log("   Correctly throws for invalid invoice");
    }
  });

  // Test 11: Caps check
  await test("11. Offer caps check", async () => {
    const { storage } = await import("../storage");
    const caps = await storage.checkOfferCaps(testOfferId);
    if (caps.offer === undefined) throw new Error("Offer not found");
    console.log(`   Daily cap reached: ${caps.dailyCapReached}, Monthly: ${caps.monthlyCapReached}`);
  });

  // Cleanup
  await test("12. Cleanup - delete invoice items", async () => {
    await db.delete(publisherInvoiceItems)
      .where(eq(publisherInvoiceItems.invoiceId, testInvoiceId));
    console.log("   Deleted invoice items");
  });

  await test("13. Cleanup - delete invoice", async () => {
    await db.delete(publisherInvoices)
      .where(eq(publisherInvoices.id, testInvoiceId));
    console.log("   Deleted invoice");
  });

  await test("14. Cleanup - delete player session", async () => {
    await db.delete(playerSessions)
      .where(eq(playerSessions.id, testSessionId));
    console.log("   Deleted player session");
  });

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 Test Results:");
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`   ✅ Passed: ${passed}/${results.length}`);
  console.log(`   ❌ Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log("\n❌ Failed tests:");
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
  } else {
    console.log("\n🎉 All tests passed!");
  }

  return { passed, failed, total: results.length };
}

runIntegrationTests()
  .then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch(err => {
    console.error("Test runner error:", err);
    process.exit(1);
  });
