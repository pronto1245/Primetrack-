import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const R2_ENDPOINT = process.env.R2_ENDPOINT || "https://f0a36ec75b07cdaa35a7e6ab015cf770.r2.cloudflarestorage.com";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "primetrack-uploads";
const R2_PUBLIC_URL = "https://pub-a0f25c897d8747eaa5408dc0e1dc8401.r2.dev";

const REPLIT_BASE_URL = "https://primetrack.replit.app";

const images = [
  { name: "AmonBet", id: "f8b18351-4255-4c40-b8de-9a09a2b752b0" },
  { name: "Bets10", id: "e3f3741a-51bf-40f9-9dc7-601b34cd1b9a" },
  { name: "Corgibet", id: "2ad66585-2535-4b44-8a71-a59d3337602a" },
  { name: "Gloria", id: "c7d42893-c037-482e-9a44-5c085ef99439" },
  { name: "Jugabet", id: "9126fbf5-e176-46c4-8a40-d18596cf4b98" },
  { name: "Leon", id: "d358aab9-811c-4c34-b040-4bd2ee6f270f" },
  { name: "Maggico", id: "a348af82-8daa-4b67-99e0-9db2cb942a39" },
  { name: "MrBet", id: "ac511c56-2577-45c3-be1e-05cc5da57f6d" },
  { name: "Parimatch", id: "95205318-1506-4e6e-87e8-2a3bf5164fa8" },
  { name: "Pistolo-22", id: "44b8ae2b-5b34-47cb-981c-dd29371a64b8" },
  { name: "Pistolo-20", id: "9083b9f1-6d3a-4bc7-934d-6eeaca1a695f" },
  { name: "Sportaza", id: "eb2ac22f-b3e5-44ca-888c-031fe535f887" },
  { name: "Mobilebahis", id: "896152ba-4e1d-4d8e-a731-e3b2371814a0" },
  { name: "Platform-Logo", id: "7cbf8551-cb83-411f-bed4-9941b4f8316c" },
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
  console.log(`Downloading from: ${url}`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to download ${imageId}: ${response.status}`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`Error downloading ${imageId}:`, error);
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
    console.log(`Uploaded to R2: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error(`Error uploading ${imageId} to R2:`, error);
    return null;
  }
}

async function migrateImages() {
  console.log("Starting image migration from Replit to R2...\n");
  
  const results: { name: string; oldUrl: string; newUrl: string | null }[] = [];
  
  for (const image of images) {
    console.log(`\nProcessing: ${image.name}`);
    
    const buffer = await downloadFromReplit(image.id);
    if (!buffer) {
      results.push({
        name: image.name,
        oldUrl: `/objects/uploads/${image.id}`,
        newUrl: null,
      });
      continue;
    }
    
    const newUrl = await uploadToR2(image.id, buffer);
    results.push({
      name: image.name,
      oldUrl: `/objects/uploads/${image.id}`,
      newUrl,
    });
  }
  
  console.log("\n\n=== MIGRATION RESULTS ===\n");
  
  const successful = results.filter(r => r.newUrl);
  const failed = results.filter(r => !r.newUrl);
  
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log("\n--- SQL UPDATE STATEMENTS FOR KOYEB DATABASE ---\n");
    
    for (const result of successful) {
      if (result.name === "Platform-Logo") {
        console.log(`UPDATE platform_settings SET platform_logo_url = '${result.newUrl}';`);
      } else {
        console.log(`UPDATE offers SET logo_url = '${result.newUrl}' WHERE logo_url = '${result.oldUrl}';`);
      }
    }
  }
  
  if (failed.length > 0) {
    console.log("\n--- FAILED ---");
    for (const result of failed) {
      console.log(`${result.name}: ${result.oldUrl}`);
    }
  }
}

migrateImages().catch(console.error);
