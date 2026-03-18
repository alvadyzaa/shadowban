import { createLog, replayCompactForensicResult } from '../_lib/forensic.js';
import { fetchFiaDeepScanWithCloudflareBrowser } from '../_lib/fia-browser.js';
import { fetchIndependentDeepScan } from '../_lib/forensic-fallback.js';
import { streamForensicAudit } from '../_lib/forensic.js';
import { DEFAULT_CACHE_TTL_SECONDS, getCachedJson, normalizeUsername, setCachedJson } from '../_lib/cache.js';
import { consumeDeepScanRateLimit } from '../_lib/rate-limit.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const username = normalizeUsername(url.searchParams.get('username'));
  const engine = url.searchParams.get('engine')?.trim();

  if (!username) {
    return new Response(JSON.stringify({ error: 'Username is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  };
  const preferredEngine =
    engine === 'fallback' ? 'fallback' : context.env?.BROWSER ? 'reference' : 'fallback';
  const cacheKey = { username, engine: preferredEngine, v: 'compact-v5' };

  const sendEvent = async (data) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      // Ignore writes after the stream closes.
    }
  };

  const runAudit = async () => {
    try {
      const cached = await getCachedJson('forensic', cacheKey);

      if (cached.hit && cached.data?.forensic) {
        await replayCompactForensicResult({
          username,
          forensic: cached.data.forensic,
          sendEvent,
        });
        return;
      }

      const rateLimitState = await consumeDeepScanRateLimit(context.request, context.env, username);

      if (!rateLimitState.allowed) {
        await sendEvent({
          type: 'log',
          entry: createLog(
            '🛑',
            `Batas deep scan per IP hari ini sudah habis. Coba lagi setelah ${rateLimitState.resetAt}.`,
            'error',
          ),
        });
        await sendEvent({
          type: 'result',
          forensic: {
            threads: [],
            ghostBanVerified: false,
            totalChecked: 0,
            totalVisible: 0,
            searchBanPassed: false,
            searchSuggestionPassed: false,
            replyDeboostingPassed: false,
            scanSource: 'rate-limit',
          },
        });
        await sendEvent({ type: 'done' });
        return;
      }

      const captured = {
        logs: [],
        threads: [],
        forensic: null,
      };

      await streamForensicAudit({
        username,
        sendEvent: async (data) => {
          if (data.type === 'log' && data.entry) {
            captured.logs.push(data.entry);
          }

          if (data.type === 'thread' && data.thread) {
            captured.threads.push(data.thread);
          }

          if (data.type === 'result' && data.forensic) {
            captured.forensic = data.forensic;
          }

          await sendEvent(data);
        },
        fetchDeepScan: async (targetUsername) => {
          if (preferredEngine === 'reference' && context.env?.BROWSER) {
            try {
              return await fetchFiaDeepScanWithCloudflareBrowser(targetUsername, context.env.BROWSER);
            } catch {
              return fetchIndependentDeepScan(targetUsername);
            }
          }

          return fetchIndependentDeepScan(targetUsername);
        },
      });

      if (captured.forensic) {
        await setCachedJson(
          'forensic',
          cacheKey,
          {
            logs: captured.logs,
            threads: captured.threads,
            forensic: captured.forensic,
            cachedAt: new Date().toISOString(),
          },
          DEFAULT_CACHE_TTL_SECONDS,
        );
      }
    } finally {
      try {
        await writer.close();
      } catch {
        // Ignore close failures.
      }
    }
  };

  context.waitUntil(runAudit());

  return new Response(readable, { headers });
}
