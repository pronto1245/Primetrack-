import { aggregationService } from "../server/services/aggregation-service";

async function runBackfill() {
  console.log("Starting backfill for 2026-01-30 to 2026-02-01...");
  
  const result = await aggregationService.backfill("2026-01-30", "2026-02-01");
  
  console.log("Backfill completed:");
  console.log("- Processed dates:", result.processedDates);
  console.log("- Rows upserted:", result.rowsUpserted);
  
  if (result.errors.length > 0) {
    console.log("- Errors:", result.errors);
  }
  
  process.exit(0);
}

runBackfill().catch(err => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
