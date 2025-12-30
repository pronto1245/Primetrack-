import acme from 'acme-client';
import crypto from 'crypto';
import { storage } from '../storage';

class AcmeService {
  private client: acme.Client | null = null;
  private isProduction = process.env.NODE_ENV === 'production';
  
  private async getClient(): Promise<acme.Client> {
    if (this.client) return this.client;
    
    const settings = await storage.getPlatformSettings();
    let accountKey: Buffer;
    
    const existingAccount = await storage.getAcmeAccount();
    
    if (existingAccount) {
      accountKey = Buffer.from(existingAccount.privateKey, 'utf-8');
    } else {
      accountKey = await acme.crypto.createPrivateKey();
      
      const email = settings?.supportEmail || 'admin@primetrack.pro';
      await storage.createAcmeAccount({
        email,
        privateKey: accountKey.toString('utf-8'),
        isActive: true,
      });
    }
    
    const directoryUrl = this.isProduction
      ? acme.directory.letsencrypt.production
      : acme.directory.letsencrypt.staging;
    
    this.client = new acme.Client({
      directoryUrl,
      accountKey,
    });
    
    try {
      const email = settings?.supportEmail || 'admin@primetrack.pro';
      await this.client.createAccount({
        termsOfServiceAgreed: true,
        contact: [`mailto:${email}`],
      });
    } catch (error: any) {
      if (!error.message?.includes('already registered')) {
        console.error('[ACME] Account creation failed:', error.message);
      }
    }
    
    return this.client;
  }
  
  async provisionCertificate(domainId: string): Promise<{ success: boolean; error?: string }> {
    const domain = await storage.getCustomDomain(domainId);
    if (!domain || !domain.isVerified) {
      return { success: false, error: 'Domain not found or not verified' };
    }
    
    console.log(`[ACME] Starting certificate provisioning for ${domain.domain}`);
    
    await storage.updateCustomDomain(domainId, {
      sslStatus: 'provisioning',
      lastError: null,
    });
    
    try {
      const client = await this.getClient();
      
      const [privateKey, csr] = await acme.crypto.createCsr({
        commonName: domain.domain,
      });
      
      const certificate = await client.auto({
        csr,
        email: (await storage.getPlatformSettings())?.supportEmail || 'admin@primetrack.pro',
        termsOfServiceAgreed: true,
        challengeCreateFn: async (authz, challenge, keyAuthorization) => {
          if (challenge.type !== 'http-01') {
            throw new Error('Only HTTP-01 challenge is supported');
          }
          
          await storage.createAcmeChallenge({
            domainId,
            token: challenge.token,
            keyAuthorization,
            expiresAt: new Date(Date.now() + 300000),
          });
          
          console.log(`[ACME] Challenge stored in DB for ${domain.domain}: ${challenge.token.substring(0, 10)}...`);
        },
        challengeRemoveFn: async (authz, challenge) => {
          await storage.deleteAcmeChallenge(challenge.token);
          console.log(`[ACME] Challenge removed from DB for ${domain.domain}`);
        },
      });
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);
      
      await storage.updateCustomDomain(domainId, {
        sslStatus: 'active',
        sslCertificate: certificate,
        sslPrivateKey: privateKey.toString(),
        sslExpiresAt: expiresAt,
        lastError: null,
      });
      
      console.log(`[ACME] Certificate issued for ${domain.domain}, expires ${expiresAt.toISOString()}`);
      
      return { success: true };
    } catch (error: any) {
      console.error(`[ACME] Certificate provisioning failed for ${domain.domain}:`, error.message);
      
      await storage.updateCustomDomain(domainId, {
        sslStatus: 'failed',
        lastError: error.message || 'Certificate provisioning failed',
      });
      
      return { success: false, error: error.message };
    }
  }
  
  async getChallengeResponse(token: string): Promise<string | null> {
    const challenge = await storage.getAcmeChallengeByToken(token);
    
    if (!challenge) return null;
    
    if (challenge.expiresAt && challenge.expiresAt < new Date()) {
      await storage.deleteAcmeChallenge(token);
      return null;
    }
    
    return challenge.keyAuthorization;
  }
  
  async cleanupExpiredChallenges(): Promise<void> {
    await storage.deleteExpiredAcmeChallenges();
  }
}

export const acmeService = new AcmeService();
