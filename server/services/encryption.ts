import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const masterKey = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!masterKey) {
    throw new Error("ENCRYPTION_KEY or SESSION_SECRET environment variable is required for encryption");
  }
  return crypto.scryptSync(masterKey, "primetrack-salt", 32);
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return "";
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(":")) return "";
  
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(":");
    
    if (parts.length !== 3) return "";
    
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    console.error("[Encryption] Decrypt error:", error);
    return "";
  }
}

export function maskSecret(secret: string | null | undefined): string {
  if (!secret) return "";
  if (secret.length <= 8) return "****";
  return secret.substring(0, 4) + "****" + secret.substring(secret.length - 4);
}

export function hasSecret(encryptedValue: string | null | undefined): boolean {
  return Boolean(encryptedValue && encryptedValue.includes(":"));
}
