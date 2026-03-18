import { existsSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {
  createCacheHeaders,
  DEFAULT_CACHE_TTL_SECONDS,
  getCachedJson,
  normalizeUsername,
  setCachedJson,
} from './functions/_lib/cache.js'
import { fetchFiaDeepScanWithLocalBrowser } from './functions/_lib/fia-browser-local.js'
import { fetchIndependentDeepScan } from './functions/_lib/forensic-fallback.js'
import { consumeDeepScanRateLimit } from './functions/_lib/rate-limit.js'
import { replayCompactForensicResult, streamForensicAudit } from './functions/_lib/forensic.js'
import { runShadowCheck } from './functions/_lib/shadow.js'

const LOCAL_BROWSER_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
] as const

function findLocalBrowser() {
  return LOCAL_BROWSER_CANDIDATES.find((candidate) => existsSync(candidate))
}

function createLogEntry(icon: string, message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  return {
    timestamp: new Date().toTimeString().split(' ')[0],
    icon,
    message,
    type,
  }
}

async function readJsonBody(req: NodeJS.ReadableStream) {
  const chunks: Buffer[] = []

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  if (chunks.length === 0) {
    return {}
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function apiDevMiddleware(): Plugin {
  return {
    name: 'shadow-api-dev-middleware',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/shadow', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        try {
          const body = await readJsonBody(req)
          const username = normalizeUsername(body.username)

          if (!username) {
            throw new Error('Username is required')
          }

          const cacheKey = { username }
          const cached = await getCachedJson('shadow', cacheKey)

          if (cached.hit) {
            const headers = createCacheHeaders('HIT', DEFAULT_CACHE_TTL_SECONDS)
            Object.entries(headers).forEach(([key, value]) => res.setHeader(key, String(value)))
            res.end(JSON.stringify(cached.data))
            return
          }

          const result = await runShadowCheck(username)
          await setCachedJson('shadow', cacheKey, result, DEFAULT_CACHE_TTL_SECONDS)

          const headers = createCacheHeaders('MISS', DEFAULT_CACHE_TTL_SECONDS)
          Object.entries(headers).forEach(([key, value]) => res.setHeader(key, String(value)))
          res.end(JSON.stringify(result))
        } catch (error) {
          res.statusCode = error instanceof Error && error.message === 'Username is required' ? 400 : 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }))
        }
      })

      server.middlewares.use('/api/visitor', async (_req, res) => {
        try {
          const response = await fetch('https://api.counterapi.dev/v1/shadowcheck/hits/up')
          const data = await response.json()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(data))
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }))
        }
      })

      server.middlewares.use('/api/forensic', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        const requestUrl = new URL(req.url || '', 'http://127.0.0.1/api/forensic')
        const username = normalizeUsername(requestUrl.searchParams.get('username'))
        const engine = requestUrl.searchParams.get('engine')?.trim()
        const forceRefresh = ['1', 'true', 'yes'].includes(
          String(requestUrl.searchParams.get('refresh') || '').toLowerCase(),
        )

        if (!username) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Username is required' }))
          return
        }

        const executablePath = findLocalBrowser()
        const preferredEngine =
          engine === 'fallback' ? 'fallback' : executablePath ? 'reference' : 'fallback'
        const cacheKey = { username, engine: preferredEngine, v: 'compact-v6' }

        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.flushHeaders?.()

        const sendEvent = async (data: unknown) => {
          res.write(`data: ${JSON.stringify(data)}\n\n`)
        }

        try {
          const localRequest = new Request(`http://127.0.0.1/api/forensic?username=${encodeURIComponent(username)}`, {
            headers: {
              'x-forwarded-for': req.socket.remoteAddress || '127.0.0.1',
            },
          })
          const cached = forceRefresh ? { hit: false, data: null } : await getCachedJson('forensic', cacheKey)

          if (cached.hit && cached.data?.forensic) {
            await replayCompactForensicResult({
              username,
              forensic: cached.data.forensic,
              sendEvent,
            })
            return
          }

          const rateLimitState = await consumeDeepScanRateLimit(localRequest, undefined, username)

          if (!rateLimitState.allowed) {
            await sendEvent({
              type: 'log',
              entry: createLogEntry(
                '🛑',
                `Batas deep scan per IP hari ini sudah habis. Coba lagi setelah ${rateLimitState.resetAt}.`,
                'error',
              ),
            })
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
            })
            await sendEvent({ type: 'done' })
            return
          }

          const captured: {
            logs: unknown[]
            threads: unknown[]
            forensic: unknown | null
          } = {
            logs: [],
            threads: [],
            forensic: null,
          }

          await streamForensicAudit({
            username,
            sendEvent: async (data: unknown) => {
              const payload =
                data && typeof data === 'object'
                  ? (data as { type?: string; entry?: unknown; thread?: unknown; forensic?: unknown })
                  : null

              if (payload?.type === 'log' && payload.entry) {
                captured.logs.push(payload.entry)
              }

              if (payload?.type === 'thread' && payload.thread) {
                captured.threads.push(payload.thread)
              }

              if (payload?.type === 'result' && payload.forensic) {
                captured.forensic = payload.forensic
              }

              await sendEvent(data)
            },
            fetchDeepScan: async (targetUsername: string) => {
              if (preferredEngine === 'reference' && executablePath) {
                try {
                  return await fetchFiaDeepScanWithLocalBrowser(targetUsername, executablePath)
                } catch {
                  return fetchIndependentDeepScan(targetUsername)
                }
              }

              return fetchIndependentDeepScan(targetUsername)
            },
          })

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
            )
          }
        } finally {
          res.end()
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiDevMiddleware()],
})
