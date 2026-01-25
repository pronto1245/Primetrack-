import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "primetrack-uploads";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

export function isR2Configured(): boolean {
  return !!(R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    if (!isR2Configured()) {
      throw new Error("R2 storage is not configured");
    }
    s3Client = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT!,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
}

export async function uploadToR2(
  buffer: Buffer,
  contentType: string = "image/png"
): Promise<string> {
  const client = getS3Client();
  const objectId = randomUUID();
  const key = `uploads/${objectId}`;

  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${key}`;
  }
  return `/${key}`;
}

export async function getR2UploadUrl(): Promise<{ uploadUrl: string; publicUrl: string }> {
  const client = getS3Client();
  const objectId = randomUUID();
  const key = `uploads/${objectId}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
  const publicUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${key}` : `/${key}`;

  return { uploadUrl, publicUrl };
}

export async function checkR2ObjectExists(key: string): Promise<boolean> {
  try {
    const client = getS3Client();
    await client.send(new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }));
    return true;
  } catch {
    return false;
  }
}
