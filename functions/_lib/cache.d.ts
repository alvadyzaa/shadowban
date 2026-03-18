export declare function getCachedJson(
  namespace: string,
  keyParts: Record<string, string>,
): Promise<{ hit: boolean; data: any | null }>;

export declare function setCachedJson(
  namespace: string,
  keyParts: Record<string, string>,
  data: any,
  ttlSeconds?: number,
): Promise<void>;

export declare function createCacheHeaders(
  status?: string,
  ttlSeconds?: number,
): Record<string, string>;

export declare function normalizeUsername(value: unknown): string;

export declare const DEFAULT_CACHE_TTL_SECONDS: number;
