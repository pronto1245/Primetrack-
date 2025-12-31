import { storage } from "../storage";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
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

async function runPostbackTests() {
  console.log("\n🧪 Running Postback Tests...\n");

  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : "http://localhost:5000";

  let testClickId: string | null = null;
  let testOfferId: string | null = null;
  let testPublisherId: string | null = null;

  await test("1. Find existing click for testing", async () => {
    const clicksReport = await storage.getClicksReport({}, undefined, 1, 1);
    if (!clicksReport.clicks || clicksReport.clicks.length === 0) {
      throw new Error("No clicks found. Create a test click first.");
    }
    testClickId = clicksReport.clicks[0].clickId;
    testOfferId = clicksReport.clicks[0].offerId;
    testPublisherId = clicksReport.clicks[0].publisherId;
    console.log(`   Using click_id: ${testClickId}`);
  });

  await test("2. Test inbound postback - missing click_id", async () => {
    const res = await fetch(`${baseUrl}/api/postback?status=lead`);
    const data = await res.json();
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    if (!data.error?.includes("click_id")) throw new Error("Expected click_id error");
  });

  await test("3. Test inbound postback - invalid click_id", async () => {
    const res = await fetch(`${baseUrl}/api/postback?click_id=invalid123&status=lead`);
    const data = await res.json();
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    if (!data.error?.includes("not found")) throw new Error("Expected 'not found' error");
  });

  if (testClickId) {
    await test("4. Test inbound postback - valid lead", async () => {
      const res = await fetch(`${baseUrl}/api/postback?click_id=${testClickId}&status=lead&payout=10.50`);
      const data = await res.json();
      if (!res.ok) throw new Error(`Failed: ${JSON.stringify(data)}`);
      if (!data.success) throw new Error("Expected success=true");
      if (!data.conversionId) throw new Error("Expected conversionId");
      console.log(`   Created conversion: ${data.conversionId}`);
    });

    await test("5. Test status mapping - 'reg' accepted (creates conversion)", async () => {
      const res = await fetch(`${baseUrl}/api/postback?click_id=${testClickId}&status=reg`);
      const data = await res.json();
      if (!res.ok) throw new Error(`Failed: ${JSON.stringify(data)}`);
      if (!data.success) throw new Error("Expected success=true");
      if (!data.conversionId) throw new Error("Expected conversionId");
    });

    await test("6. Test status mapping - 'dep' accepted (creates conversion)", async () => {
      const res = await fetch(`${baseUrl}/api/postback?click_id=${testClickId}&status=dep&payout=100`);
      const data = await res.json();
      if (!res.ok) throw new Error(`Failed: ${JSON.stringify(data)}`);
      if (!data.success) throw new Error("Expected success=true");
      if (!data.conversionId) throw new Error("Expected conversionId");
    });

    await test("7. Test alternative param names - subid", async () => {
      const res = await fetch(`${baseUrl}/api/postback?subid=${testClickId}&status=lead`);
      const data = await res.json();
      if (!res.ok) throw new Error(`Failed: ${JSON.stringify(data)}`);
      if (!data.success) throw new Error("Expected success=true");
    });

    await test("8. Test alternative param names - clickid", async () => {
      const res = await fetch(`${baseUrl}/api/postback?clickid=${testClickId}&event=sale`);
      const data = await res.json();
      if (!res.ok) throw new Error(`Failed: ${JSON.stringify(data)}`);
      if (!data.success) throw new Error("Expected success=true");
    });

    await test("9. Test rejected status", async () => {
      const res = await fetch(`${baseUrl}/api/postback?click_id=${testClickId}&status=rejected`);
      const data = await res.json();
      if (!res.ok) throw new Error(`Failed: ${JSON.stringify(data)}`);
      if (data.status !== "rejected") throw new Error(`Expected 'rejected', got '${data.status}'`);
    });

    await test("10. Test response contains offer/publisher IDs", async () => {
      const res = await fetch(`${baseUrl}/api/postback?click_id=${testClickId}&status=lead`);
      const data = await res.json();
      if (!res.ok) throw new Error(`Failed: ${JSON.stringify(data)}`);
      if (!data.offerId) throw new Error("Expected offerId in response");
      if (!data.publisherId) throw new Error("Expected publisherId in response");
      if (data.offerId !== testOfferId) throw new Error(`offerId mismatch: expected ${testOfferId}, got ${data.offerId}`);
    });
  }

  await test("11. Test postback logs created", async () => {
    const logs = await storage.getPostbackLogs({ limit: 5 });
    if (!logs || logs.length === 0) throw new Error("No postback logs found");
    const inboundLogs = logs.filter(l => l.direction === "inbound");
    if (inboundLogs.length === 0) throw new Error("No inbound logs found");
    console.log(`   Found ${inboundLogs.length} inbound logs`);
  });

  console.log("\n📊 Test Summary:");
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`   Passed: ${passed}/${results.length}`);
  console.log(`   Failed: ${failed}/${results.length}`);

  if (failed > 0) {
    console.log("\n❌ Failed tests:");
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
  }

  return { passed, failed, total: results.length };
}

runPostbackTests()
  .then(({ passed, failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch(err => {
    console.error("Test runner error:", err);
    process.exit(1);
  });
