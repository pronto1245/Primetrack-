import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

// Read env vars at runtime, not module load time
function getR2Config() {
  return {
    endpoint: process.env.R2_ENDPOINT || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    bucketName: process.env.R2_BUCKET_NAME || "primetrack-uploads",
    publicUrl: process.env.R2_PUBLIC_URL || "",
  };
}

export function isR2Configured(): boolean {
  const config = getR2Config();
  return !!(config.endpoint && config.accessKeyId && config.secretAccessKey);
}

export function getR2PublicUrl(): string {
  return getR2Config().publicUrl;
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const config = getR2Config();
    if (!isR2Configured()) {
      throw new Error("R2 storage is not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
    }
    s3Client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return s3Client;
}

export async function uploadToR2(
  buffer: Buffer,
  contentType: string = "image/png"
): Promise<string> {
  const config = getR2Config();
  const client = getS3Client();
  const objectId = randomUUID();
  const key = `uploads/${objectId}`;

  await client.send(new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  if (config.publicUrl) {
    return `${config.publicUrl}/${key}`;
  }
  return `/${key}`;
}

export async function getR2UploadUrl(contentType?: string): Promise<{ uploadUrl: string; publicUrl: string }> {
  const config = getR2Config();
  const client = getS3Client();
  const objectId = randomUUID();
  const key = `uploads/${objectId}`;

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType || "application/octet-stream",
  });

  const uploadUrl = await getSignedUrl(client, command, { 
    expiresIn: 900,
    signableHeaders: new Set(["content-type"]),
  });
  const publicUrl = config.publicUrl ? `${config.publicUrl}/${key}` : `/${key}`;

  return { uploadUrl, publicUrl };
}

export async function checkR2ObjectExists(key: string): Promise<boolean> {
  try {
    const config = getR2Config();
    const client = getS3Client();
    await client.send(new HeadObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    }));
    return true;
  } catch {
    return false;
  }
}
