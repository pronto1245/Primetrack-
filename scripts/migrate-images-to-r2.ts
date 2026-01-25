import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const R2_ENDPOINT = process.env.R2_ENDPOINT || "https://f0a36ec75b07cdaa35a7e6ab015cf770.r2.cloudflarestorage.com";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "primetrack-uploads";
const R2_PUBLIC_URL = "https://pub-a0f25c897d8747eaa5408dc0e1dc8401.r2.dev";

const REPLIT_BASE_URL = "https://primetrack.replit.app";

const images = [
  // Offer logos from production database
  { name: "бьтб (17)", id: "6f2fcd01-3639-4f51-82fc-796d22acae7a" },
  { name: "567 (18)", id: "072591ff-9a46-4b3f-92fa-9749cc98ac54" },
  { name: "888 (20)", id: "0de53204-c091-4612-8c0e-94f9e18d4e52" },
  { name: "BruceBet Slots (21)", id: "51ac0213-e584-4796-9b59-fc9f01c798f2" },
  { name: "Gloria KZ FB (23)", id: "6f9db073-e130-466b-be16-d1906b1df40e" },
  { name: "Sportaza CZ (24)", id: "a245c172-f041-470e-b306-25c9130db2f0" },
  { name: "Bettilt FB TR (25)", id: "4c2fcf05-e87e-4651-a531-d5ef25410ed6" },
  { name: "4RaBet FB IN (26)", id: "e763c815-e6fe-457a-abc7-586c0ee2939d" },
  { name: "VegasSlot FB TR (27)", id: "a043b56a-27d9-4826-b9e8-9008b4644634" },
  { name: "Huhubet FB TR (28)", id: "c6c299d0-ec80-4e8f-b8be-23fc170546f3" },
  { name: "Betcool FB TR (29)", id: "638f17bd-9b4f-4c87-98f9-a89a2512be57" },
  { name: "1 WIN Slot FB (30)", id: "c3337f6f-f076-4c86-8b1c-e48d18ac76f6" },
  { name: "Spincity Slot FB (31)", id: "a823b644-aa6b-4fef-bf6a-44a0805a8427" },
  { name: "MrBet Slot FB (32)", id: "68edf734-c116-43ef-b107-31107e169e09" },
  { name: "BruceBet Slot FB (33)", id: "68c9d431-59f4-4cb7-a642-a9084d01e802" },
  { name: "XON Bet Slot FB (34)", id: "762e186b-0a44-4410-8245-bcb1771d4a9b" },
  { name: "Leon Slot FB (35)", id: "cd5a4501-f893-4dba-b837-463c9743b2ad" },
  { name: "Leon Slot FB (36)", id: "e9ce374e-e372-489f-a0da-7c3f930d5e2d" },
  { name: "Twin Slot FB (37)", id: "69c30371-242a-4342-a790-c857d7ee76f1" },
  { name: "Slott Slot FB (38)", id: "5325f941-fc18-44d8-8d5f-c4b987a1b128" },
  { name: "t (39)", id: "28e59281-08fb-44fa-8609-8fd30bd0bb77" },
  { name: "Vavada Slot FB (40)", id: "979edc4a-d479-4493-a17b-4cf42ffaf79d" },
  { name: "7Slots Slot FB (41)", id: "393047e1-68ee-4933-86bc-1b7f11a7e782" },
  { name: "Booi Slot FB (42)", id: "f52ddb57-aa41-4a2a-b1d8-d4867b012132" },
  { name: "Vegas Slot FB (43)", id: "26b2e074-fca5-4dc8-ba35-732459309482" },
  { name: "Playfortuna Slot FB (44)", id: "8287eabf-4dae-4785-8379-2ab2d4e417e6" },
  { name: "Amonbet Stot FB (45)", id: "12ee303e-3eaa-442a-aee4-8323fefd3b2c" },
  { name: "LuckyWave Stot FB (46)", id: "40df1c85-75b1-4751-813e-5ea8ebe37324" },
  { name: "SlotLair Stot FB (47)", id: "8c3c88c2-d121-4223-b514-cad17581631a" },
  { name: "Beef Stot FB (48)", id: "4554966c-32d6-435b-be29-6ff7f61b0142" },
  { name: "Martin Stot FB (49)", id: "7e5449a2-f402-41a0-b0c8-039a75c5ab75" },
  { name: "Bets10 Stot FB (50)", id: "774d20b9-5026-4c88-8ff0-d24ab6ff5cf3" },
  { name: "Flagman Stot FB (51)", id: "65547d65-6f2c-4557-b63c-52287ccdabf7" },
  { name: "Starda Stot FB (52)", id: "58e201e0-aaba-4632-9a9e-2fd7b7a8242b" },
  { name: "Irwin Stot FB (53)", id: "86f388d1-362e-4b15-8d84-b1f0a6e66970" },
  { name: "Gizbo Stot FB (54)", id: "f7376637-21da-4075-b8d4-0087a6f64c9b" },
  { name: "Awintura Stot FB (55)", id: "158cea30-cd6c-45a1-9d97-a6b68668e7a8" },
  { name: "HitNSpin Stot FB (56)", id: "6d7c3a69-327f-4f17-9ca1-663a88cabde2" },
  { name: "Vulkan.bet Stot FB (57)", id: "2084caac-ab79-4a68-92be-efee31227a88" },
  { name: "Izzi Slot FB (58)", id: "2fe8f6ed-0624-4694-856c-15b5f2002b35" },
  { name: "Verdecasino Stot FB (59)", id: "612d0b54-98fc-4d57-872a-4e12624339d3" },
  { name: "Slotoro Slot FB (60)", id: "511a56a8-d3bc-4c72-a707-db39865756cf" },
  { name: "VulkanSpiele Slot FB (61)", id: "07a28bc1-d01b-421d-8f20-a57a777a12eb" },
  { name: "Corgibet FB PWA (62)", id: "c497f0b6-6f65-403f-ae70-18c30dd46974" },
  { name: "Slotuna FB PWA (63)", id: "974a99c6-fc57-4dc4-89d2-26e0c55f0a92" },
  { name: "Lex Stot FB (64)", id: "f2b30bb7-4cce-4693-a48e-9009f8e421b5" },
  { name: "Monro Stot FB (65)", id: "7b41919b-309d-4cdb-93b8-d7388f3bfc42" },
  { name: "Melbet FB PWA (66)", id: "5a7f6a5c-9922-4acd-a9af-4fe17debe948" },
  { name: "Legzo Stot FB (67)", id: "675a5dab-1ac2-4bd4-b31d-352b418f9dc0" },
  { name: "1GO Stot FB (68)", id: "d3df8c85-bb78-45b4-b960-54f91d5fdbab" },
  // Platform logo
  { name: "Platform-Logo", id: "7146f475-e12c-44ec-8d5d-04c29796e0fc" },
];

const s3Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function downloadFromReplit(imageId: string): Promise<Buffer | null> {
  const url = `${REPLIT_BASE_URL}/objects/uploads/${imageId}`;
  console.log(`Downloading: ${url}`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed: ${response.status}`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`Error:`, error);
    return null;
  }
}

async function uploadToR2(imageId: string, buffer: Buffer, contentType: string = "image/png"): Promise<string | null> {
  const key = `uploads/${imageId}`;
  
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
    
    const publicUrl = `${R2_PUBLIC_URL}/${key}`;
    console.log(`Uploaded: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error(`Upload error:`, error);
    return null;
  }
}

async function migrateImages() {
  console.log(`Starting migration of ${images.length} images from Replit to R2...\n`);
  
  let success = 0;
  let failed = 0;
  const failedImages: string[] = [];
  
  for (const image of images) {
    console.log(`\n[${success + failed + 1}/${images.length}] ${image.name}`);
    
    const buffer = await downloadFromReplit(image.id);
    if (!buffer) {
      failed++;
      failedImages.push(image.name);
      continue;
    }
    
    const newUrl = await uploadToR2(image.id, buffer);
    if (newUrl) {
      success++;
    } else {
      failed++;
      failedImages.push(image.name);
    }
  }
  
  console.log("\n\n=== MIGRATION COMPLETE ===");
  console.log(`Success: ${success}/${images.length}`);
  console.log(`Failed: ${failed}/${images.length}`);
  
  if (failedImages.length > 0) {
    console.log("\nFailed images:");
    failedImages.forEach(name => console.log(`  - ${name}`));
  }
  
  if (success > 0) {
    console.log("\n\n=== SQL UPDATE FOR PRODUCTION DATABASE ===\n");
    console.log("-- Run this SQL in Neon console to update URLs:\n");
    console.log(`UPDATE offers SET logo_url = REPLACE(logo_url, '/objects/uploads/', '${R2_PUBLIC_URL}/uploads/') WHERE logo_url LIKE '/objects/uploads/%';`);
    console.log(`UPDATE platform_settings SET platform_logo_url = REPLACE(platform_logo_url, '/objects/uploads/', '${R2_PUBLIC_URL}/uploads/') WHERE platform_logo_url LIKE '/objects/uploads/%';`);
  }
}

migrateImages().catch(console.error);
