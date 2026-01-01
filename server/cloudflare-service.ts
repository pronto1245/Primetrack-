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

interface CloudflareApiResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<{ code: number; message: string }>;
  result: T;
}

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
  
  // Decrypt the API token if it's encrypted (contains ":" separator)
  let decryptedToken = cloudflareApiToken;
  if (hasSecret(cloudflareApiToken)) {
    const decrypted = decrypt(cloudflareApiToken);
    if (decrypted && decrypted.length > 0) {
      decryptedToken = decrypted;
    } else {
      console.error("[Cloudflare] Failed to decrypt API token - decryption returned empty");
      return null;
    }
  } else {
    console.log("[Cloudflare] Token not encrypted (legacy format), using as-is");
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

async function cloudflareRequest<T>(
  method: string,
  endpoint: string,
  body?: object
): Promise<CloudflareApiResponse<T>> {
  const settings = await getCloudflareSettings();
  if (!settings) {
    throw new Error("Cloudflare not configured. Please set Zone ID and API Token in Admin Settings.");
  }
  
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
    const errorMsg = data.errors.map(e => e.message).join(", ");
    throw new Error(`Cloudflare API error: ${errorMsg}`);
  }
  
  return data;
}

// Account-scoped API request for Workers Domains
async function cloudflareAccountRequest<T>(
  method: string,
  endpoint: string,
  body?: object
): Promise<CloudflareApiResponse<T>> {
  const settings = await getCloudflareSettings();
  if (!settings) {
    throw new Error("Cloudflare not configured");
  }
  if (!settings.accountId) {
    throw new Error("Cloudflare Account ID not configured. Please set it in Admin Settings.");
  }
  
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
    const errorMsg = data.errors.map(e => e.message).join(", ");
    throw new Error(`Cloudflare API error: ${errorMsg}`);
  }
  
  return data;
}

// Create or update Worker Domain binding for custom hostname
async function ensureWorkerDomainBinding(
  hostname: string,
  existingBindingId?: string | null
): Promise<string> {
  const settings = await getCloudflareSettings();
  if (!settings?.accountId || !settings?.workerName) {
    throw new Error("Cloudflare Worker settings not configured. Please set Account ID and Worker Name in Admin Settings.");
  }
  
  const environment = settings.workerEnvironment || "production";
  
  // Delete existing binding if exists
  if (existingBindingId) {
    try {
      await cloudflareAccountRequest("DELETE", `/workers/domains/${existingBindingId}`);
      console.log(`[Cloudflare] Deleted existing worker binding: ${existingBindingId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Ignore "not found" errors
      if (!message.includes("not_found") && !message.includes("10007")) {
        console.warn(`[Cloudflare] Failed to delete existing binding: ${message}`);
      }
    }
  }
  
  // Create new binding
  const response = await cloudflareAccountRequest<{ id: string }>("PUT", "/workers/domains", {
    hostname,
    service: settings.workerName,
    environment,
    zone_id: settings.zoneId,
  });
  
  console.log(`[Cloudflare] Created worker domain binding for ${hostname}: ${response.result.id}`);
  return response.result.id;
}

// Delete Worker Domain binding
async function deleteWorkerDomainBinding(bindingId: string): Promise<void> {
  try {
    await cloudflareAccountRequest("DELETE", `/workers/domains/${bindingId}`);
    console.log(`[Cloudflare] Deleted worker domain binding: ${bindingId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Ignore "not found" errors
    if (!message.includes("not_found") && !message.includes("10007")) {
      console.warn(`[Cloudflare] Failed to delete worker binding: ${message}`);
    }
  }
}

// Check if Worker settings are configured
async function isWorkerConfigured(): Promise<boolean> {
  const settings = await getCloudflareSettings();
  return !!(settings?.accountId && settings?.workerName);
}

export async function isCloudflareConfigured(): Promise<boolean> {
  const settings = await getCloudflareSettings();
  return settings !== null;
}

export async function setFallbackOrigin(origin: string): Promise<void> {
  await cloudflareRequest("PUT", "/custom_hostnames/fallback_origin", {
    origin,
  });
}

export async function getFallbackOrigin(): Promise<string | null> {
  try {
    const response = await cloudflareRequest<{ origin: string }>(
      "GET",
      "/custom_hostnames/fallback_origin"
    );
    return response.result?.origin || null;
  } catch {
    return null;
  }
}

export async function createCustomHostname(
  hostname: string
): Promise<CloudflareCustomHostname> {
  const settings = await getCloudflareSettings();
  if (!settings) {
    throw new Error("Cloudflare not configured");
  }
  
  const response = await cloudflareRequest<CloudflareCustomHostname>(
    "POST",
    "/custom_hostnames",
    {
      hostname,
      ssl: {
        method: "http",
        type: "dv",
        settings: {
          http2: "on",
          min_tls_version: "1.2",
        },
      },
      custom_origin_server: settings.fallbackOrigin,
      custom_origin_sni_value: settings.fallbackOrigin,
    }
  );
  
  return response.result;
}

export async function getCustomHostname(
  hostnameId: string
): Promise<CloudflareCustomHostname> {
  const response = await cloudflareRequest<CloudflareCustomHostname>(
    "GET",
    `/custom_hostnames/${hostnameId}`
  );
  
  return response.result;
}

export async function deleteCustomHostname(hostnameId: string): Promise<void> {
  await cloudflareRequest("DELETE", `/custom_hostnames/${hostnameId}`);
}

export async function updateCustomHostnameOrigin(
  hostnameId: string
): Promise<CloudflareCustomHostname> {
  const settings = await getCloudflareSettings();
  if (!settings) {
    throw new Error("Cloudflare not configured");
  }
  
  const response = await cloudflareRequest<CloudflareCustomHostname>(
    "PATCH",
    `/custom_hostnames/${hostnameId}`,
    {
      custom_origin_server: settings.fallbackOrigin,
      custom_origin_sni_value: settings.fallbackOrigin,
    }
  );
  
  return response.result;
}

export async function listCustomHostnames(): Promise<CloudflareCustomHostname[]> {
  const response = await cloudflareRequest<CloudflareCustomHostname[]>(
    "GET",
    "/custom_hostnames?per_page=100"
  );
  
  return response.result;
}

export async function findCustomHostnameByName(
  hostname: string
): Promise<CloudflareCustomHostname | null> {
  try {
    const response = await cloudflareRequest<CloudflareCustomHostname[]>(
      "GET",
      `/custom_hostnames?hostname=${encodeURIComponent(hostname)}`
    );
    
    if (response.result && response.result.length > 0) {
      return response.result[0];
    }
    return null;
  } catch (error) {
    console.error(`[Cloudflare] Failed to find hostname ${hostname}:`, error);
    return null;
  }
}

export async function syncDomainStatus(domainId: string): Promise<{
  status: string;
  sslStatus: string;
  error?: string;
}> {
  const domain = await storage.getCustomDomain(domainId);
  if (!domain) {
    throw new Error("Domain not found");
  }
  
  if (!domain.cloudflareHostnameId) {
    throw new Error("Domain not registered with Cloudflare");
  }
  
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
    } else if (cfHostname.ssl.status === "pending_validation") {
      updateData.sslStatus = "pending";
    } else if (cfHostname.ssl.status === "pending_deployment") {
      updateData.sslStatus = "provisioning";
    }
    
    await storage.updateCustomDomain(domainId, updateData);
    
    return {
      status: cfHostname.status,
      sslStatus: cfHostname.ssl.status,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    
    await storage.updateCustomDomain(domainId, {
      cloudflareError: errorMsg,
      lastSyncedAt: new Date(),
    });
    
    return {
      status: "error",
      sslStatus: "error",
      error: errorMsg,
    };
  }
}

export async function provisionDomain(
  domainId: string,
  hostname: string
): Promise<{ success: boolean; error?: string }> {
  const settings = await getCloudflareSettings();
  if (!settings) {
    return { success: false, error: "Cloudflare not configured" };
  }
  
  try {
    // First check if hostname already exists in Cloudflare
    const existing = await findCustomHostnameByName(hostname);
    
    let cfHostname: { id: string; status: string; ssl: { status: string } };
    let isNewHostname = false;
    
    if (existing) {
      console.log(`[Cloudflare] Hostname ${hostname} already exists (id: ${existing.id}), updating origin to ${settings.fallbackOrigin}`);
      cfHostname = await updateCustomHostnameOrigin(existing.id);
    } else {
      console.log(`[Cloudflare] Creating new hostname ${hostname} with origin ${settings.fallbackOrigin}`);
      cfHostname = await createCustomHostname(hostname);
      isNewHostname = true;
    }
    
    // Get existing domain to check for worker binding
    const existingDomain = await storage.getCustomDomain(domainId);
    
    const updateData: Record<string, unknown> = {
      cloudflareHostnameId: cfHostname.id,
      cloudflareStatus: cfHostname.status,
      cloudflareSslStatus: cfHostname.ssl.status,
      dnsTarget: settings.cnameTarget,
      lastSyncedAt: new Date(),
      cloudflareError: null,
    };
    
    // Create Worker Domain binding if Worker settings are configured
    if (settings.accountId && settings.workerName) {
      try {
        const bindingId = await ensureWorkerDomainBinding(
          hostname,
          existingDomain?.cloudflareWorkerBindingId
        );
        updateData.cloudflareWorkerBindingId = bindingId;
        console.log(`[Cloudflare] Worker binding created for ${hostname}: ${bindingId}`);
      } catch (workerError) {
        const workerErrorMsg = workerError instanceof Error ? workerError.message : String(workerError);
        console.error(`[Cloudflare] Failed to create Worker binding: ${workerErrorMsg}`);
        
        // Rollback: delete the Custom Hostname if we just created it
        if (isNewHostname) {
          console.log(`[Cloudflare] Rolling back: deleting newly created hostname ${cfHostname.id}`);
          try {
            await deleteCustomHostname(cfHostname.id);
          } catch (rollbackError) {
            console.error(`[Cloudflare] Rollback failed: ${rollbackError}`);
          }
        }
        
        // Clear all Cloudflare data since provisioning failed
        await storage.updateCustomDomain(domainId, {
          cloudflareHostnameId: null,
          cloudflareWorkerBindingId: null,
          cloudflareStatus: null,
          cloudflareSslStatus: null,
          cloudflareError: `Worker binding failed: ${workerErrorMsg}`,
          lastSyncedAt: new Date(),
        });
        return { success: false, error: `Worker binding failed: ${workerErrorMsg}` };
      }
    } else {
      console.log(`[Cloudflare] Worker settings not configured, skipping Worker binding`);
    }
    
    await storage.updateCustomDomain(domainId, updateData);
    
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    
    await storage.updateCustomDomain(domainId, {
      cloudflareError: errorMsg,
      sslStatus: "ssl_failed",
    });
    
    return { success: false, error: errorMsg };
  }
}

export async function deprovisionDomain(domainId: string): Promise<{ success: boolean; error?: string }> {
  const domain = await storage.getCustomDomain(domainId);
  if (!domain) {
    return { success: false, error: "Domain not found" };
  }
  
  const errors: string[] = [];
  let workerDeleted = false;
  let hostnameDeleted = false;
  
  // Delete Worker Domain binding first
  if (domain.cloudflareWorkerBindingId) {
    try {
      await deleteWorkerDomainBinding(domain.cloudflareWorkerBindingId);
      workerDeleted = true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Failed to delete Worker binding: ${msg}`);
      errors.push(`Worker: ${msg}`);
    }
  } else {
    workerDeleted = true;
  }
  
  // Delete Custom Hostname
  if (domain.cloudflareHostnameId) {
    try {
      await deleteCustomHostname(domain.cloudflareHostnameId);
      hostnameDeleted = true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Failed to delete Cloudflare hostname: ${msg}`);
      errors.push(`Hostname: ${msg}`);
    }
  } else {
    hostnameDeleted = true;
  }
  
  // Only clear IDs that were successfully deleted
  const updateData: Record<string, unknown> = {};
  if (hostnameDeleted) {
    updateData.cloudflareHostnameId = null;
    updateData.cloudflareStatus = null;
    updateData.cloudflareSslStatus = null;
  }
  if (workerDeleted) {
    updateData.cloudflareWorkerBindingId = null;
  }
  if (errors.length > 0) {
    updateData.cloudflareError = errors.join("; ");
  }
  
  if (Object.keys(updateData).length > 0) {
    await storage.updateCustomDomain(domainId, updateData);
  }
  
  if (errors.length > 0) {
    return { success: false, error: errors.join("; ") };
  }
  return { success: true };
}

export async function reprovisionDomain(domainId: string): Promise<{ success: boolean; error?: string }> {
  const domain = await storage.getCustomDomain(domainId);
  if (!domain) {
    return { success: false, error: "Domain not found" };
  }
  
  const settings = await getCloudflareSettings();
  if (!settings) {
    return { success: false, error: "Cloudflare not configured" };
  }
  
  try {
    if (domain.cloudflareHostnameId) {
      console.log(`[Cloudflare] Updating origin for hostname ${domain.cloudflareHostnameId} to ${settings.fallbackOrigin}`);
      const updated = await updateCustomHostnameOrigin(domain.cloudflareHostnameId);
      
      const updateData: Record<string, unknown> = {
        cloudflareStatus: updated.status,
        cloudflareSslStatus: updated.ssl.status,
        dnsTarget: settings.cnameTarget,
        lastSyncedAt: new Date(),
        cloudflareError: null,
      };
      
      // Update Worker binding if configured
      if (settings.accountId && settings.workerName) {
        try {
          const bindingId = await ensureWorkerDomainBinding(
            domain.domain,
            domain.cloudflareWorkerBindingId
          );
          updateData.cloudflareWorkerBindingId = bindingId;
        } catch (workerError) {
          const workerErrorMsg = workerError instanceof Error ? workerError.message : String(workerError);
          console.error(`[Cloudflare] Failed to update Worker binding: ${workerErrorMsg}`);
          updateData.cloudflareWorkerBindingId = null;
          updateData.cloudflareError = `Worker binding failed: ${workerErrorMsg}`;
          await storage.updateCustomDomain(domainId, updateData);
          return { success: false, error: `Worker binding failed: ${workerErrorMsg}` };
        }
      }
      
      await storage.updateCustomDomain(domainId, updateData);
      
      return { success: true };
    } else {
      console.log(`[Cloudflare] No existing hostname, creating new for ${domain.domain}`);
      return await provisionDomain(domainId, domain.domain);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Cloudflare] Reprovision failed: ${errorMsg}`);
    
    await storage.updateCustomDomain(domainId, {
      cloudflareError: errorMsg,
      lastSyncedAt: new Date(),
    });
    
    return { success: false, error: errorMsg };
  }
}

export async function getCnameTarget(): Promise<string | null> {
  const settings = await getCloudflareSettings();
  return settings?.cnameTarget || null;
}

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
  ensureWorkerDomainBinding,
  deleteWorkerDomainBinding,
};
