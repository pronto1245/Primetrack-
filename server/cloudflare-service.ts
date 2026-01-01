import { storage } from "./storage";
import { decrypt, hasSecret } from "./services/encryption";

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

interface CloudflareSettings {
  zoneId: string;
  apiToken: string;
  cnameTarget: string;
  fallbackOrigin: string;
  accountId?: string;
  workerName?: string;
  workerEnvironment?: string;
}

interface CloudflareCustomHostname {
  id: string;
  hostname: string;
  status: string;
  ssl: {
    status: string;
    method: string;
    type: string;
    validation_records?: Array<{
      txt_name?: string;
      txt_value?: string;
      http_url?: string;
      http_body?: string;
    }>;
  };
  custom_origin_server?: string;
  ownership_verification?: {
    type: string;
    name: string;
    value: string;
  };
  created_at: string;
}

interface WorkerDomain {
  id: string;
  hostname: string;
  service: string;
  zone_id: string;
  zone_name: string;
  environment: string;
}

interface CloudflareApiResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<{ code: number; message: string }>;
  result: T;
}

// ==================== SETTINGS ====================

async function getCloudflareSettings(): Promise<CloudflareSettings | null> {
  const settings = await storage.getPlatformSettings();
  if (!settings) return null;
  
  const { 
    cloudflareZoneId, 
    cloudflareApiToken, 
    cloudflareCnameTarget, 
    cloudflareFallbackOrigin,
    cloudflareAccountId,
    cloudflareWorkerName,
    cloudflareWorkerEnvironment,
  } = settings;
  
  if (!cloudflareZoneId || !cloudflareApiToken || !cloudflareFallbackOrigin) {
    return null;
  }
  
  let decryptedToken = cloudflareApiToken;
  if (hasSecret(cloudflareApiToken)) {
    const decrypted = decrypt(cloudflareApiToken);
    if (decrypted && decrypted.length > 0) {
      decryptedToken = decrypted;
    } else {
      console.error("[Cloudflare] Failed to decrypt API token");
      return null;
    }
  }
  
  return {
    zoneId: cloudflareZoneId,
    apiToken: decryptedToken,
    cnameTarget: cloudflareCnameTarget || `customers.${cloudflareFallbackOrigin.replace('tracking.', '')}`,
    fallbackOrigin: cloudflareFallbackOrigin,
    accountId: cloudflareAccountId || undefined,
    workerName: cloudflareWorkerName || undefined,
    workerEnvironment: cloudflareWorkerEnvironment || undefined,
  };
}

// ==================== API HELPERS ====================

async function zoneRequest<T>(method: string, endpoint: string, body?: object): Promise<CloudflareApiResponse<T>> {
  const settings = await getCloudflareSettings();
  if (!settings) throw new Error("Cloudflare not configured");
  
  const url = `${CLOUDFLARE_API_BASE}/zones/${settings.zoneId}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${settings.apiToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data = await response.json() as CloudflareApiResponse<T>;
  if (!data.success) {
    throw new Error(`Cloudflare: ${data.errors.map(e => e.message).join(", ")}`);
  }
  return data;
}

async function accountRequest<T>(method: string, endpoint: string, body?: object): Promise<CloudflareApiResponse<T>> {
  const settings = await getCloudflareSettings();
  if (!settings) throw new Error("Cloudflare not configured");
  if (!settings.accountId) throw new Error("Cloudflare Account ID not set");
  
  const url = `${CLOUDFLARE_API_BASE}/accounts/${settings.accountId}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${settings.apiToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data = await response.json() as CloudflareApiResponse<T>;
  if (!data.success) {
    throw new Error(`Cloudflare: ${data.errors.map(e => e.message).join(", ")}`);
  }
  return data;
}

function isNotFoundError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("not_found") || msg.includes("10007") || msg.includes("not found");
}

// ==================== CUSTOM HOSTNAMES (SSL) ====================

export async function isCloudflareConfigured(): Promise<boolean> {
  return (await getCloudflareSettings()) !== null;
}

async function isWorkerConfigured(): Promise<boolean> {
  const settings = await getCloudflareSettings();
  return !!(settings?.accountId && settings?.workerName);
}

export async function setFallbackOrigin(origin: string): Promise<void> {
  await zoneRequest("PUT", "/custom_hostnames/fallback_origin", { origin });
}

export async function getFallbackOrigin(): Promise<string | null> {
  try {
    const response = await zoneRequest<{ origin: string }>("GET", "/custom_hostnames/fallback_origin");
    return response.result?.origin || null;
  } catch {
    return null;
  }
}

export async function createCustomHostname(hostname: string): Promise<CloudflareCustomHostname> {
  const settings = await getCloudflareSettings();
  if (!settings) throw new Error("Cloudflare not configured");
  
  const response = await zoneRequest<CloudflareCustomHostname>("POST", "/custom_hostnames", {
    hostname,
    ssl: { method: "http", type: "dv", settings: { http2: "on", min_tls_version: "1.2" } },
    custom_origin_server: settings.fallbackOrigin,
    custom_origin_sni_value: settings.fallbackOrigin,
  });
  return response.result;
}

export async function getCustomHostname(hostnameId: string): Promise<CloudflareCustomHostname> {
  const response = await zoneRequest<CloudflareCustomHostname>("GET", `/custom_hostnames/${hostnameId}`);
  return response.result;
}

export async function deleteCustomHostname(hostnameId: string): Promise<void> {
  try {
    await zoneRequest("DELETE", `/custom_hostnames/${hostnameId}`);
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
  }
}

export async function updateCustomHostnameOrigin(hostnameId: string): Promise<CloudflareCustomHostname> {
  const settings = await getCloudflareSettings();
  if (!settings) throw new Error("Cloudflare not configured");
  
  const response = await zoneRequest<CloudflareCustomHostname>("PATCH", `/custom_hostnames/${hostnameId}`, {
    custom_origin_server: settings.fallbackOrigin,
    custom_origin_sni_value: settings.fallbackOrigin,
  });
  return response.result;
}

export async function findCustomHostnameByName(hostname: string): Promise<CloudflareCustomHostname | null> {
  try {
    const response = await zoneRequest<CloudflareCustomHostname[]>("GET", `/custom_hostnames?hostname=${encodeURIComponent(hostname)}`);
    return response.result?.[0] || null;
  } catch {
    return null;
  }
}

export async function listCustomHostnames(): Promise<CloudflareCustomHostname[]> {
  const response = await zoneRequest<CloudflareCustomHostname[]>("GET", "/custom_hostnames?per_page=50");
  return response.result || [];
}

// ==================== WORKER DOMAINS ====================

async function createWorkerBinding(hostname: string): Promise<string> {
  const settings = await getCloudflareSettings();
  if (!settings?.accountId || !settings?.workerName) {
    throw new Error("Worker settings not configured");
  }
  
  const response = await accountRequest<{ id: string }>("PUT", "/workers/domains", {
    hostname,
    service: settings.workerName,
    environment: settings.workerEnvironment || "production",
    zone_id: settings.zoneId,
  });
  return response.result.id;
}

async function deleteWorkerBinding(bindingId: string): Promise<void> {
  try {
    await accountRequest("DELETE", `/workers/domains/${bindingId}`);
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
  }
}

async function findWorkerBindingByHostname(hostname: string): Promise<string | null> {
  const settings = await getCloudflareSettings();
  if (!settings?.accountId) return null;
  
  try {
    const response = await accountRequest<WorkerDomain[]>("GET", `/workers/domains`);
    const binding = response.result?.find(d => d.hostname === hostname);
    return binding?.id || null;
  } catch {
    return null;
  }
}

// ==================== SYNC STATUS ====================

export async function syncDomainStatus(domainId: string): Promise<{ status: string; sslStatus: string; error?: string }> {
  const domain = await storage.getCustomDomain(domainId);
  if (!domain) throw new Error("Domain not found");
  if (!domain.cloudflareHostnameId) throw new Error("Domain not registered with Cloudflare");
  
  try {
    const cfHostname = await getCustomHostname(domain.cloudflareHostnameId);
    
    const updateData: Record<string, unknown> = {
      cloudflareStatus: cfHostname.status,
      cloudflareSslStatus: cfHostname.ssl.status,
      lastSyncedAt: new Date(),
      cloudflareError: null,
    };
    
    if (cfHostname.status === "active" && cfHostname.ssl.status === "active") {
      updateData.sslStatus = "ssl_active";
      updateData.isVerified = true;
      updateData.verifiedAt = new Date();
    }
    
    await storage.updateCustomDomain(domainId, updateData);
    return { status: cfHostname.status, sslStatus: cfHostname.ssl.status };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    await storage.updateCustomDomain(domainId, { cloudflareError: errorMsg, lastSyncedAt: new Date() });
    return { status: "error", sslStatus: "error", error: errorMsg };
  }
}

// ==================== PROVISION ====================

export async function provisionDomain(domainId: string, hostname: string): Promise<{ success: boolean; error?: string }> {
  const settings = await getCloudflareSettings();
  if (!settings) return { success: false, error: "Cloudflare not configured" };
  
  const existingDomain = await storage.getCustomDomain(domainId);
  let hostnameId: string | null = null;
  let bindingId: string | null = null;
  let isNewHostname = false;
  
  try {
    // Step 1: Set pending status
    await storage.updateCustomDomain(domainId, { provisionStatus: "ssl_pending", cloudflareError: null });
    
    // Step 2: Create or reuse hostname
    const existing = await findCustomHostnameByName(hostname);
    if (existing) {
      hostnameId = existing.id;
      await updateCustomHostnameOrigin(hostnameId);
    } else {
      const created = await createCustomHostname(hostname);
      hostnameId = created.id;
      isNewHostname = true;
    }
    
    // Step 3: Update DB with hostname
    await storage.updateCustomDomain(domainId, {
      cloudflareHostnameId: hostnameId,
      cloudflareStatus: "pending",
      cloudflareSslStatus: "pending",
      dnsTarget: settings.cnameTarget,
      provisionStatus: "ssl_active",
      lastSyncedAt: new Date(),
    });
    
    // Step 4: Create Worker binding if configured
    if (settings.accountId && settings.workerName) {
      await storage.updateCustomDomain(domainId, { provisionStatus: "worker_pending" });
      
      // Delete old binding if exists
      if (existingDomain?.cloudflareWorkerBindingId) {
        await deleteWorkerBinding(existingDomain.cloudflareWorkerBindingId);
      }
      
      bindingId = await createWorkerBinding(hostname);
      
      await storage.updateCustomDomain(domainId, {
        cloudflareWorkerBindingId: bindingId,
        provisionStatus: "active",
        cloudflareError: null,
      });
    } else {
      await storage.updateCustomDomain(domainId, { provisionStatus: "active" });
    }
    
    return { success: true };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    
    // Rollback: delete new hostname if Worker binding failed
    if (isNewHostname && hostnameId && !bindingId) {
      try { await deleteCustomHostname(hostnameId); } catch {}
      await storage.updateCustomDomain(domainId, {
        cloudflareHostnameId: null,
        cloudflareWorkerBindingId: null,
        cloudflareStatus: null,
        cloudflareSslStatus: null,
        provisionStatus: "worker_failed",
        cloudflareError: errorMsg,
      });
    } else if (hostnameId && !bindingId) {
      // Keep existing hostname, mark Worker failed
      await storage.updateCustomDomain(domainId, {
        cloudflareWorkerBindingId: null,
        provisionStatus: "worker_failed",
        cloudflareError: errorMsg,
      });
    } else {
      await storage.updateCustomDomain(domainId, {
        provisionStatus: "ssl_failed",
        cloudflareSslStatus: "failed",
        cloudflareError: errorMsg,
      });
    }
    
    return { success: false, error: errorMsg };
  }
}

// ==================== DEPROVISION ====================

export async function deprovisionDomain(domainId: string): Promise<{ success: boolean; error?: string }> {
  const domain = await storage.getCustomDomain(domainId);
  if (!domain) return { success: false, error: "Domain not found" };
  
  const errors: string[] = [];
  
  // Step 1: Find and delete Worker binding
  let workerId = domain.cloudflareWorkerBindingId;
  if (!workerId) {
    workerId = await findWorkerBindingByHostname(domain.domain);
  }
  
  if (workerId) {
    try {
      await deleteWorkerBinding(workerId);
    } catch (error) {
      errors.push(`Worker: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Step 2: Delete hostname (only if Worker succeeded or didn't exist)
  if (errors.length === 0 && domain.cloudflareHostnameId) {
    try {
      await deleteCustomHostname(domain.cloudflareHostnameId);
    } catch (error) {
      if (!isNotFoundError(error)) {
        errors.push(`Hostname: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  
  // Step 3: Update DB
  if (errors.length === 0) {
    await storage.updateCustomDomain(domainId, {
      cloudflareHostnameId: null,
      cloudflareWorkerBindingId: null,
      cloudflareStatus: null,
      cloudflareSslStatus: null,
      provisionStatus: "pending",
      cloudflareError: null,
      lastSyncedAt: new Date(),
    });
    return { success: true };
  } else {
    await storage.updateCustomDomain(domainId, {
      cloudflareError: errors.join("; "),
      lastSyncedAt: new Date(),
    });
    return { success: false, error: errors.join("; ") };
  }
}

// ==================== REPROVISION ====================

export async function reprovisionDomain(domainId: string): Promise<{ success: boolean; error?: string }> {
  const domain = await storage.getCustomDomain(domainId);
  if (!domain) return { success: false, error: "Domain not found" };
  
  // If no hostname exists, do full provision
  if (!domain.cloudflareHostnameId) {
    return provisionDomain(domainId, domain.domain);
  }
  
  const settings = await getCloudflareSettings();
  if (!settings) return { success: false, error: "Cloudflare not configured" };
  
  try {
    await storage.updateCustomDomain(domainId, { provisionStatus: "ssl_pending", cloudflareError: null });
    
    const updated = await updateCustomHostnameOrigin(domain.cloudflareHostnameId);
    
    await storage.updateCustomDomain(domainId, {
      cloudflareStatus: updated.status,
      cloudflareSslStatus: updated.ssl.status,
      dnsTarget: settings.cnameTarget,
      provisionStatus: "ssl_active",
      lastSyncedAt: new Date(),
    });
    
    if (settings.accountId && settings.workerName) {
      await storage.updateCustomDomain(domainId, { provisionStatus: "worker_pending" });
      
      if (domain.cloudflareWorkerBindingId) {
        await deleteWorkerBinding(domain.cloudflareWorkerBindingId);
      }
      
      const bindingId = await createWorkerBinding(domain.domain);
      
      await storage.updateCustomDomain(domainId, {
        cloudflareWorkerBindingId: bindingId,
        provisionStatus: "active",
        cloudflareError: null,
      });
    } else {
      await storage.updateCustomDomain(domainId, { provisionStatus: "active" });
    }
    
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    await storage.updateCustomDomain(domainId, {
      cloudflareError: errorMsg,
      provisionStatus: "ssl_failed",
      lastSyncedAt: new Date(),
    });
    return { success: false, error: errorMsg };
  }
}

// ==================== UTILITIES ====================

export async function getCnameTarget(): Promise<string | null> {
  const settings = await getCloudflareSettings();
  return settings?.cnameTarget || null;
}

// ==================== EXPORTS ====================

export const cloudflareService = {
  isCloudflareConfigured,
  isWorkerConfigured,
  setFallbackOrigin,
  getFallbackOrigin,
  createCustomHostname,
  getCustomHostname,
  deleteCustomHostname,
  updateCustomHostnameOrigin,
  findCustomHostnameByName,
  listCustomHostnames,
  syncDomainStatus,
  provisionDomain,
  deprovisionDomain,
  reprovisionDomain,
  getCnameTarget,
  createWorkerBinding,
  deleteWorkerBinding,
};
