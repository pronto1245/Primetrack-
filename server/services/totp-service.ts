import { authenticator } from "otplib";
import QRCode from "qrcode";
import { storage } from "../storage";
import { encrypt, decrypt } from "./encryption";

async function getAppName(): Promise<string> {
  try {
    const settings = await storage.getPlatformSettings();
    return settings?.platformName || "PrimeTrack";
  } catch {
    return "PrimeTrack";
  }
}

export const totpService = {
  async generateSecret(userId: string): Promise<{ secret: string; qrCode: string; otpAuthUrl: string }> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const secret = authenticator.generateSecret();
    const appName = await getAppName();
    const otpAuthUrl = authenticator.keyuri(user.email, appName, secret);
    const qrCode = await QRCode.toDataURL(otpAuthUrl);

    return { secret, qrCode, otpAuthUrl };
  },

  async enableTwoFactor(userId: string, secret: string, token: string): Promise<boolean> {
    const isValid = authenticator.verify({ token, secret });
    if (!isValid) {
      return false;
    }

    const encryptedSecret = encrypt(secret);
    await storage.updateUser(userId, {
      twoFactorEnabled: true,
      twoFactorSecret: encryptedSecret,
      twoFactorSetupCompleted: true,
    });

    return true;
  },

  async disableTwoFactor(userId: string, token: string): Promise<boolean> {
    const user = await storage.getUser(userId);
    if (!user || !user.twoFactorSecret) {
      return false;
    }

    const secret = decrypt(user.twoFactorSecret);
    const isValid = authenticator.verify({ token, secret });
    if (!isValid) {
      return false;
    }

    await storage.updateUser(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });

    return true;
  },

  async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await storage.getUser(userId);
    if (!user || !user.twoFactorSecret) {
      return false;
    }

    const secret = decrypt(user.twoFactorSecret);
    return authenticator.verify({ token, secret });
  },

  isTwoFactorEnabled(user: { twoFactorEnabled?: boolean | null }): boolean {
    return user.twoFactorEnabled === true;
  },
};
