/**
 * TinyFish as the backend of dsh's own `web_search` / `web_fetch` tools.
 *
 * `@deepseek-ai/dsh-tool-web` owns the model-facing tool names, schemas, prompt
 * guidance and output rendering; this plugin only registers providers on the
 * `ctx.web` seam, so the model sees exactly the shipped web tools while the
 * actual search and fetch calls go to TinyFish.
 *
 * Registered ids: `tinyfish` for both capabilities. Point the `web` row at them
 * (`searchProvider: tinyfish`, `fetchProvider: tinyfish`) or export
 * `DSH_WEB_SEARCH_PROVIDER=tinyfish` / `DSH_WEB_FETCH_PROVIDER=tinyfish`.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const name = 'web-tinyfish'
export const inject = ['web']

const DEFAULTS = {
  searchUrl: 'https://api.search.tinyfish.ai',
  fetchUrl: 'https://api.fetch.tinyfish.ai',
  keyFile: '',
  timeoutMs: 60_000,
}

function resolveKeyFile(config) {
  if (config.keyFile) return config.keyFile
  const home = process.env.DSH_HOME || join(process.env.HOME || '/root', '.dsh')
  return join(home, 'tinyfish.key')
}

function readKey(config) {
  try {
    return readFileSync(resolveKeyFile(config), 'utf8').trim()
  } catch {
    return ''
  }
}

function failure(code, message, cause) {
  return Object.assign(new Error(`tinyfish: ${message}`), { code, cause })
}

async function requestJson(url, init, signal, timeoutMs) {
  const timeout = AbortSignal.timeout(timeoutMs)
  const composite = signal ? AbortSignal.any([signal, timeout]) : timeout
  let response
  try {
    response = await fetch(url, { ...init, signal: composite })
  } catch (error) {
    if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
      throw failure('WEB_PROVIDER_TIMEOUT', `request timed out after ${timeoutMs}ms`, error)
    }
    throw failure('WEB_PROVIDER_FAILED', String(error?.message || error), error)
  }
  const text = await response.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch (error) {
    throw failure('WEB_PROVIDER_FAILED', `unparseable response (HTTP ${response.status})`, error)
  }
  if (!response.ok) {
    throw failure('WEB_PROVIDER_FAILED', describeFailure(response.status, data), undefined)
  }
  return data
}

function describeFailure(status, data) {
  const detail = data?.error?.message || data?.message || data?.detail || (Array.isArray(data?.errors) ? data.errors.join('; ') : '')
  if (status === 401 || status === 403) return `TinyFish rejected the API key (HTTP ${status})${detail ? `: ${detail}` : ''}`
  if (status === 429) return `TinyFish rate limit reached (HTTP 429)${detail ? `: ${detail}` : ''}`
  if (status >= 500) return `TinyFish is unavailable (HTTP ${status})${detail ? `: ${detail}` : ''}`
  return `TinyFish request failed (HTTP ${status})${detail ? `: ${detail}` : ''}`
}

export function apply(ctx, config = {}) {
  const settings = { ...DEFAULTS, ...config }
  const usable = () => readKey(settings) !== ''

  const searchProvider = {
    id: 'tinyfish',
    available: usable,
    ready: async () => usable(),
    async search(request, signal) {
      const key = readKey(settings)
      if (!key) throw failure('WEB_PROVIDER_UNAVAILABLE', `no TinyFish API key at ${resolveKeyFile(settings)}`)
      const url = new URL(settings.searchUrl)
      url.searchParams.set('query', request.query)
      const data = await requestJson(
        url,
        { headers: { 'X-API-Key': key, Accept: 'application/json' } },
        signal,
        settings.timeoutMs,
      )
      const results = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : []
      const sources = results
        .filter((item) => item && typeof item.url === 'string' && item.url)
        .map((item) => ({
          url: item.url,
          ...(item.title ? { title: item.title } : {}),
          ...(item.snippet ? { snippet: item.snippet } : {}),
          ...(item.date ? { publishedAt: item.date } : {}),
        }))
      return { sources, truncated: false }
    },
  }

  const fetchProvider = {
    id: 'tinyfish',
    available: usable,
    ready: async () => usable(),
    async fetch(request, signal) {
      const key = readKey(settings)
      if (!key) throw failure('WEB_PROVIDER_UNAVAILABLE', `no TinyFish API key at ${resolveKeyFile(settings)}`)
      const data = await requestJson(
        settings.fetchUrl,
        {
          method: 'POST',
          headers: { 'X-API-Key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ urls: [request.url] }),
        },
        signal,
        settings.timeoutMs,
      )
      const first = Array.isArray(data.results) ? data.results[0] : undefined
      if (!first) {
        const detail = Array.isArray(data.errors) ? data.errors.map((e) => e?.message || e?.code || String(e)).join('; ') : ''
        throw failure('WEB_FETCH_FAILED', detail || `TinyFish returned no content for ${request.url}`)
      }
      const content = typeof first.text === 'string' ? first.text : typeof first.description === 'string' ? first.description : ''
      if (!content.trim()) throw failure('WEB_FETCH_UNSUPPORTED', `TinyFish returned an empty body for ${request.url}`)
      return {
        url: typeof first.final_url === 'string' && first.final_url ? first.final_url : request.url,
        statusCode: 200,
        body: { kind: 'text', content },
        truncated: false,
      }
    },
  }

  ctx.effect(() => ctx.web.registerSearchProvider(searchProvider))
  ctx.effect(() => ctx.web.registerFetchProvider(fetchProvider))
}
