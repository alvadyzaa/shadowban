const DEEP_SCAN_DAILY_LIMIT = 10;
const RATE_LIMIT_NAMESPACE = 'forensic-ip-day';
const FALLBACK_TTL_SECONDS = 60 * 60 * 24 * 2;

function getRuntimeRateLimitStore() {
  if (!globalThis.__shadowRateLimits) {
    globalThis.__shadowRateLimits = new Map();
  }

  return globalThis.__shadowRateLimits;
}

function getCurrentUtcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getUtcResetIso(date = new Date()) {
  const reset = new Date(date);
  reset.setUTCHours(24, 0, 0, 0);
  return reset.toISOString();
}

function getExpirationTtlSeconds(date = new Date()) {
  const nextMidnight = new Date(date);
  nextMidnight.setUTCHours(24, 0, 0, 0);
  const secondsUntilMidnight = Math.max(60, Math.ceil((nextMidnight.getTime() - date.getTime()) / 1000));
  return Math.min(FALLBACK_TTL_SECONDS, secondsUntilMidnight + 60 * 60);
}

export function getClientIp(request) {
  const directIp = request.headers.get('cf-connecting-ip');
  if (directIp) {
    return directIp.trim();
  }

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return 'local-dev';
}

function normalizeScope(scope) {
  return String(scope || 'default')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
}

function buildRateLimitKey(ip, dayKey, scope) {
  return `${RATE_LIMIT_NAMESPACE}:${dayKey}:${ip}:${normalizeScope(scope)}`;
}

async function readFromKv(env, key) {
  if (!env?.RATE_LIMITS) {
    return null;
  }

  try {
    const raw = await env.RATE_LIMITS.get(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return {
      count: Number(parsed.count) || 0,
      resetAt: typeof parsed.resetAt === 'string' ? parsed.resetAt : null,
    };
  } catch {
    return null;
  }
}

async function writeToKv(env, key, value, ttlSeconds) {
  if (!env?.RATE_LIMITS) {
    return false;
  }

  try {
    await env.RATE_LIMITS.put(key, JSON.stringify(value), {
      expirationTtl: ttlSeconds,
    });
    return true;
  } catch {
    return false;
  }
}

function readFromMemory(key) {
  const store = getRuntimeRateLimitStore();
  const entry = store.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }

  return {
    count: entry.count,
    resetAt: entry.resetAt,
  };
}

function writeToMemory(key, value, ttlSeconds) {
  const store = getRuntimeRateLimitStore();
  store.set(key, {
    count: value.count,
    resetAt: value.resetAt,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

async function readCounter(env, key) {
  const kvValue = await readFromKv(env, key);
  if (kvValue) {
    return kvValue;
  }

  return readFromMemory(key);
}

async function writeCounter(env, key, value, ttlSeconds) {
  const kvWritten = await writeToKv(env, key, value, ttlSeconds);
  if (!kvWritten) {
    writeToMemory(key, value, ttlSeconds);
  }
}

export async function getDeepScanRateLimitState(request, env, scope = 'default') {
  const now = new Date();
  const ip = getClientIp(request);
  const dayKey = getCurrentUtcDayKey(now);
  const key = buildRateLimitKey(ip, dayKey, scope);
  const resetAt = getUtcResetIso(now);
  const record = await readCounter(env, key);
  const used = Math.max(0, record?.count || 0);
  const remaining = Math.max(0, DEEP_SCAN_DAILY_LIMIT - used);

  return {
    ip,
    key,
    used,
    remaining,
    limit: DEEP_SCAN_DAILY_LIMIT,
    resetAt: record?.resetAt || resetAt,
    allowed: used < DEEP_SCAN_DAILY_LIMIT,
  };
}

export async function consumeDeepScanRateLimit(request, env, scope = 'default') {
  const now = new Date();
  const ip = getClientIp(request);
  const dayKey = getCurrentUtcDayKey(now);
  const key = buildRateLimitKey(ip, dayKey, scope);
  const resetAt = getUtcResetIso(now);
  const ttlSeconds = getExpirationTtlSeconds(now);
  const current = await readCounter(env, key);
  const used = Math.max(0, current?.count || 0);

  if (used >= DEEP_SCAN_DAILY_LIMIT) {
    return {
      ip,
      key,
      used,
      remaining: 0,
      limit: DEEP_SCAN_DAILY_LIMIT,
      resetAt: current?.resetAt || resetAt,
      allowed: false,
    };
  }

  const nextCount = used + 1;
  await writeCounter(
    env,
    key,
    {
      count: nextCount,
      resetAt,
    },
    ttlSeconds,
  );

  return {
    ip,
    key,
    used: nextCount,
    remaining: Math.max(0, DEEP_SCAN_DAILY_LIMIT - nextCount),
    limit: DEEP_SCAN_DAILY_LIMIT,
    resetAt,
    allowed: true,
  };
}

export const DEFAULT_DEEP_SCAN_DAILY_LIMIT = DEEP_SCAN_DAILY_LIMIT;
