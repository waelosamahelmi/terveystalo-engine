// ============================================================================
// SUUN TERVEYSTALO - Simple Data Cache
// Persists data across component remounts for instant navigation
// ============================================================================

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export const dataCache = {
  get<T>(key: string, ttl = DEFAULT_TTL): T | null {
    const entry = cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > ttl) {
      cache.delete(key);
      return null;
    }
    
    return entry.data;
  },

  set<T>(key: string, data: T): void {
    cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  },

  invalidate(key: string): void {
    cache.delete(key);
  },

  invalidateAll(): void {
    cache.clear();
  },

  // Check if key exists and is not expired
  has(key: string, ttl = DEFAULT_TTL): boolean {
    const entry = cache.get(key);
    if (!entry) return false;
    return Date.now() - entry.timestamp <= ttl;
  },
};

// Cache keys
export const CACHE_KEYS = {
  DASHBOARD_STATS: 'dashboard_stats',
  DASHBOARD_ANALYTICS: 'dashboard_analytics',
  DASHBOARD_INSIGHTS: 'dashboard_insights',
  DASHBOARD_CAMPAIGNS: 'dashboard_campaigns',
  DASHBOARD_BRANCHES: 'dashboard_branches',
  BRANCHES_LIST: 'branches_list',
  USERS_LIST: 'users_list',
  CAMPAIGNS_LIST: 'campaigns_list',
  SERVICES_LIST: 'services_list',
} as const;
