interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  startedAt: number;
}

const PENDING_TIMEOUT_MS = 30000;

class StatsCache {
  private cache = new Map<string, CacheEntry<any>>();
  private pending = new Map<string, PendingRequest<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }
  
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
    this.pending.clear();
  }
  
  private cleanup(): void {
    const now = Date.now();
    
    const cacheEntries = Array.from(this.cache.entries());
    for (const [key, entry] of cacheEntries) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
    
    const pendingEntries = Array.from(this.pending.entries());
    for (const [key, req] of pendingEntries) {
      if (now - req.startedAt > PENDING_TIMEOUT_MS) {
        this.pending.delete(key);
      }
    }
  }
  
  async getOrFetch<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const now = Date.now();
    
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.value as T;
    }
    
    const pendingReq = this.pending.get(key);
    if (pendingReq) {
      if (now - pendingReq.startedAt < PENDING_TIMEOUT_MS) {
        return pendingReq.promise as Promise<T>;
      }
      this.pending.delete(key);
    }
    
    const fetchPromise = fetcher()
      .then((result) => {
        this.cache.set(key, {
          value: result,
          expiresAt: Date.now() + ttlSeconds * 1000,
        });
        this.pending.delete(key);
        return result;
      })
      .catch((error) => {
        this.pending.delete(key);
        throw error;
      });
    
    this.pending.set(key, { promise: fetchPromise, startedAt: now });
    
    return fetchPromise;
  }
  
  invalidate(keyPrefix?: string): void {
    if (!keyPrefix) {
      this.cache.clear();
      return;
    }
    
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.startsWith(keyPrefix)) {
        this.cache.delete(key);
      }
    }
  }
  
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const statsCache = new StatsCache();

export function buildCacheKey(method: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${k}=${JSON.stringify(params[k])}`)
    .join("&");
  return `${method}:${sortedParams}`;
}

export const CACHE_TTL = {
  ADVERTISER_STATS: 60,
  PUBLISHER_STATS: 60,
  ADMIN_STATS: 120,
  PLATFORM_FINANCIAL: 120,
} as const;
