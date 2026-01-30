import { storage } from "./storage";
import { decrypt, hasSecret } from "./services/encryption";
import { HttpClient, ExternalApiError } from "./lib/http-client";

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

interface CloudflareSettings {
  zoneId: string;
  apiToken: string;
  cnameTarget: string;
  fallbackOrigin: string;
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
  
  const { cloudflareZoneId, cloudflareApiToken, cloudflareCnameTarget, cloudflareFallbackOrigin } = settings;
  
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
  
  const client = new HttpClient("Cloudflare", {
    baseUrl: `${CLOUDFLARE_API_BASE}/zones/${settings.zoneId}`,
    timeout: 15000,
    retries: 2,
    headers: {
      "Authorization": `Bearer ${settings.apiToken}`,
    },
  });
  
  try {
    const data = await client.request<CloudflareApiResponse<T>>(endpoint, {
      method: method as "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
      body,
    });
    
    if (!data.success) {
      const errorMsg = data.errors.map(e => e.message).join(", ");
      throw new Error(`Cloudflare API error: ${errorMsg}`);
    }
    
    return data;
  } catch (error) {
    if (error instanceof ExternalApiError) {
      throw new Error(`Cloudflare API error: ${error.message}`);
    }
    throw error;
  }
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
    
    if (existing) {
      console.log(`[Cloudflare] Hostname ${hostname} already exists (id: ${existing.id}), updating origin to ${settings.fallbackOrigin}`);
      cfHostname = await updateCustomHostnameOrigin(existing.id);
    } else {
      console.log(`[Cloudflare] Creating new hostname ${hostname} with origin ${settings.fallbackOrigin}`);
      cfHostname = await createCustomHostname(hostname);
    }
    
    await storage.updateCustomDomain(domainId, {
      cloudflareHostnameId: cfHostname.id,
      cloudflareStatus: cfHostname.status,
      cloudflareSslStatus: cfHostname.ssl.status,
      dnsTarget: settings.cnameTarget,
      lastSyncedAt: new Date(),
      cloudflareError: null,
    });
    
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

export async function deprovisionDomain(domainId: string): Promise<void> {
  const domain = await storage.getCustomDomain(domainId);
  if (!domain?.cloudflareHostnameId) {
    return;
  }
  
  try {
    await deleteCustomHostname(domain.cloudflareHostnameId);
  } catch (error) {
    console.error(`Failed to delete Cloudflare hostname: ${error}`);
  }
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
      
      await storage.updateCustomDomain(domainId, {
        cloudflareStatus: updated.status,
        cloudflareSslStatus: updated.ssl.status,
        dnsTarget: settings.cnameTarget,
        lastSyncedAt: new Date(),
        cloudflareError: null,
      });
      
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
  if (settings?.cnameTarget) {
    return settings.cnameTarget;
  }
  
  // Fallback: read directly from platform_settings even if Cloudflare API isn't configured
  const platformSettings = await storage.getPlatformSettings();
  if (platformSettings?.cloudflareCnameTarget) {
    return platformSettings.cloudflareCnameTarget;
  }
  if (platformSettings?.cloudflareFallbackOrigin) {
    return `customers.${platformSettings.cloudflareFallbackOrigin.replace('tracking.', '')}`;
  }
  
  // Final fallback from environment
  return process.env.PLATFORM_CNAME_TARGET || null;
}

export const cloudflareService = {
  isCloudflareConfigured,
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
};
