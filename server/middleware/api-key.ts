import { createHash, timingSafeEqual } from 'node:crypto'
import { defineEventHandler, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'

// Routes that cannot send an x-api-key, each protected another way or public by design.
const PUBLIC_ROUTES = [
  /^\/api\/health$/,
  /^\/api\/track\//, // opened by email recipients' mail clients
  /^\/api\/interaction\/phone\/status$/, // LiveKit webhook, verified by its signed Authorization header
  /^\/api\/email\/accounts\/oauth\/[^/]+\/callback$/, // provider redirect, verified by a one-time state
  /^\/api\/interaction\/(sms|whatsapp)\/template\/preview$/, // WebSocket: browsers cannot set headers on it
]

const digest = (value: string) => createHash('sha256').update(value).digest()

export default defineEventHandler((event) => {
  const { pathname } = new URL(event.req.url)

  if (!pathname.startsWith('/api/') || event.req.method === 'OPTIONS') return
  if (PUBLIC_ROUTES.some((route) => route.test(pathname))) return

  const expected = useRuntimeConfig().private.apiKey as string
  if (!expected) {
    // Fail closed: an unset key must never mean "no protection".
    throw new HTTPError({ statusCode: 503, statusMessage: 'API key is not configured on this server.' })
  }

  const provided = event.req.headers.get('x-api-key')
  if (!provided || !timingSafeEqual(digest(provided), digest(expected))) {
    throw new HTTPError({ statusCode: 401, statusMessage: 'A valid x-api-key header is required.' })
  }
})
