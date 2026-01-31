interface CacheEntry<T> {
  data: T;
  expires: number;
}

const CACHE_TTL = 60000; // 60 seconds
const NEGATIVE_CACHE_TTL = 10000; // 10 seconds for missing entries

const MISSING_MARKER = Symbol('MISSING');
type CacheValue<T> = T | typeof MISSING_MARKER;

class OfferCache {
  private offers = new Map<string, CacheEntry<CacheValue<any>>>();
  private landings = new Map<string, CacheEntry<CacheValue<any[]>>>();
  private publisherOffers = new Map<string, CacheEntry<CacheValue<any>>>();

  getOffer(offerId: string): { found: boolean; data: any | null } | null {
    const entry = this.offers.get(offerId);
    if (entry && entry.expires > Date.now()) {
      if (entry.data === MISSING_MARKER) {
        return { found: true, data: null }; // Negative cache hit
      }
      return { found: true, data: entry.data };
    }
    this.offers.delete(offerId);
    return null; // Cache miss
  }

  setOffer(offerId: string, data: any | null): void {
    if (data === null) {
      this.offers.set(offerId, { data: MISSING_MARKER, expires: Date.now() + NEGATIVE_CACHE_TTL });
    } else {
      this.offers.set(offerId, { data, expires: Date.now() + CACHE_TTL });
    }
  }

  getLandings(offerId: string): { found: boolean; data: any[] } | null {
    const entry = this.landings.get(offerId);
    if (entry && entry.expires > Date.now()) {
      if (entry.data === MISSING_MARKER) {
        return { found: true, data: [] }; // Negative cache hit
      }
      return { found: true, data: entry.data as any[] };
    }
    this.landings.delete(offerId);
    return null; // Cache miss
  }

  setLandings(offerId: string, data: any[]): void {
    // Only cache non-empty landings (don't negative cache empty landings as they may be temporary)
    if (data && data.length > 0) {
      this.landings.set(offerId, { data, expires: Date.now() + CACHE_TTL });
    }
    // Don't negative cache empty landings - always re-fetch
  }

  getPublisherOffer(offerId: string, publisherId: string): { found: boolean; data: any | null } | null {
    const key = `${offerId}:${publisherId}`;
    const entry = this.publisherOffers.get(key);
    if (entry && entry.expires > Date.now()) {
      if (entry.data === MISSING_MARKER) {
        return { found: true, data: null }; // Negative cache hit
      }
      return { found: true, data: entry.data };
    }
    this.publisherOffers.delete(key);
    return null; // Cache miss
  }

  setPublisherOffer(offerId: string, publisherId: string, data: any | null): void {
    const key = `${offerId}:${publisherId}`;
    if (data === null) {
      this.publisherOffers.set(key, { data: MISSING_MARKER, expires: Date.now() + NEGATIVE_CACHE_TTL });
    } else {
      this.publisherOffers.set(key, { data, expires: Date.now() + CACHE_TTL });
    }
  }

  invalidateOffer(offerId: string): void {
    this.offers.delete(offerId);
    this.landings.delete(offerId);
    const keysToDelete = Array.from(this.publisherOffers.keys()).filter(k => k.startsWith(offerId + ":"));
    keysToDelete.forEach(key => this.publisherOffers.delete(key));
  }

  clear(): void {
    this.offers.clear();
    this.landings.clear();
    this.publisherOffers.clear();
  }
}

export const offerCache = new OfferCache();
