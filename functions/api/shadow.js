import { runShadowCheck } from '../_lib/shadow.js';
import {
  createCacheHeaders,
  DEFAULT_CACHE_TTL_SECONDS,
  getCachedJson,
  normalizeUsername,
  setCachedJson,
} from '../_lib/cache.js';

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const username = normalizeUsername(body.username);

    if (!username) {
      throw new Error('Username is required');
    }

    const cacheKey = { username, v: 'reset-v3' };
    const cached = await getCachedJson('shadow', cacheKey);

    if (cached.hit) {
      return new Response(JSON.stringify(cached.data), {
        headers: createCacheHeaders('HIT', DEFAULT_CACHE_TTL_SECONDS),
      });
    }

    const result = await runShadowCheck(username);
    const shouldCache = result.exists === true && result.testsReliable !== false;

    if (shouldCache) {
      await setCachedJson('shadow', cacheKey, result, DEFAULT_CACHE_TTL_SECONDS);
    }

    return new Response(JSON.stringify(result), {
      headers: createCacheHeaders(shouldCache ? 'MISS' : 'SKIP', shouldCache ? DEFAULT_CACHE_TTL_SECONDS : 0),
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to check account visibility',
      }),
      {
        status: error.message === 'Username is required' ? 400 : 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
