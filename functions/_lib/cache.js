const CACHE_TTL_SECONDS = 600;

function getMemoryCacheStore() {
  if (!globalThis.__shadowRuntimeCache) {
    globalThis.__shadowRuntimeCache = new Map();
  }

  return globalThis.__shadowRuntimeCache;
}

function toSortedEntries(keyParts) {
  return Object.entries(keyParts)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => [key, String(value)]);
}

function buildMemoryKey(namespace, keyParts) {
  const query = new URLSearchParams(toSortedEntries(keyParts));
  return `${namespace}?${query.toString()}`;
}

function buildCacheRequest(namespace, keyParts) {
  const query = new URLSearchParams(toSortedEntries(keyParts));
  return new Request(`https://shadow-cache.local/${namespace}?${query.toString()}`, {
    method: 'GET',
  });
}

function getCacheApi() {
  if (typeof caches === 'undefined' || !caches.default) {
    return null;
  }

  return caches.default;
}

export async function getCachedJson(namespace, keyParts) {
  const cacheApi = getCacheApi();
  const cacheRequest = buildCacheRequest(namespace, keyParts);

  if (cacheApi) {
    try {
      const cachedResponse = await cacheApi.match(cacheRequest);
      if (cachedResponse) {
        return {
          hit: true,
          data: await cachedResponse.json(),
        };
      }
    } catch {
      // Fall through to runtime memory cache.
    }
  }

  const memoryCache = getMemoryCacheStore();
  const memoryKey = buildMemoryKey(namespace, keyParts);
  const entry = memoryCache.get(memoryKey);

  if (!entry) {
    return { hit: false, data: null };
  }

  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(memoryKey);
    return { hit: false, data: null };
  }

  return {
    hit: true,
    data: entry.data,
  };
}

export async function setCachedJson(namespace, keyParts, data, ttlSeconds = CACHE_TTL_SECONDS) {
  const cacheApi = getCacheApi();
  const cacheRequest = buildCacheRequest(namespace, keyParts);
  const serialized = JSON.stringify(data);
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': `public, max-age=${ttlSeconds}`,
  };

  if (cacheApi) {
    try {
      await cacheApi.put(cacheRequest, new Response(serialized, { headers }));
    } catch {
      // Keep going and store in runtime memory instead.
    }
  }

  const memoryCache = getMemoryCacheStore();
  const memoryKey = buildMemoryKey(namespace, keyParts);

  memoryCache.set(memoryKey, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export function createCacheHeaders(status = 'MISS', ttlSeconds = CACHE_TTL_SECONDS) {
  return {
    'Content-Type': 'application/json',
    'X-Shadow-Cache': status,
    'Cache-Control': `public, max-age=${ttlSeconds}`,
  };
}

export function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();
}

export const DEFAULT_CACHE_TTL_SECONDS = CACHE_TTL_SECONDS;
