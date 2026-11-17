import { createHash, timingSafeEqual } from 'node:crypto'
import { defineEventHandler, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'

import { assertOrgSlug } from '#server/utils/email-accounts.ts'

// Routes that cannot send an x-api-key, each protected another way or public by design.
const PUBLIC_ROUTES = [
  /^\/api\/health$/,
  /^\/api\/track\//, // opened by email recipients' mail clients
  /^\/api\/interaction\/phone\/status$/, // LiveKit webhook, verified by its signed Authorization header
  /^\/api\/email\/accounts\/oauth\/[^/]+\/callback$/, // provider redirect, verified by a one-time state
  /^\/api\/interaction\/(sms|whatsapp)\/template\/preview$/, // WebSocket: browsers cannot set headers on it
]

// Inbound provider webhooks: providers rarely send custom headers, so these also accept the webhook
// secret as a `?secret=` query parameter, and the organization as `?org=` (configure both in the provider's
// webhook URL). They are machine-to-machine, so there is no user to identify.
const WEBHOOK_ROUTES = [/^\/api\/interaction\/(sms|whatsapp)\/receive$/]

// Other machine-to-machine routes (the mail sync task): x-api-key and an organization, but no user.
const SYSTEM_ROUTES = [/^\/api\/interaction\/email\/receive$/]

const digest = (value: string) => createHash('sha256').update(value).digest()
const matches = (provided: string | null | undefined, expected: string) => !!provided && !!expected && timingSafeEqual(digest(provided), digest(expected))

export default defineEventHandler((event) => {
  const url = new URL(event.req.url)
  const { pathname } = url

  if (!pathname.startsWith('/api/') || event.req.method === 'OPTIONS') return
  if (PUBLIC_ROUTES.some((route) => route.test(pathname))) return

  const { apiKey, webhookSecret } = useRuntimeConfig().private as { apiKey: string; webhookSecret: string }
  const isWebhook = WEBHOOK_ROUTES.some((route) => route.test(pathname))
  const needsUser = !isWebhook && !SYSTEM_ROUTES.some((route) => route.test(pathname))

  if (!apiKey && !(isWebhook && webhookSecret)) {
    // Fail closed: an unset key must never mean "no protection".
    throw new HTTPError({ statusCode: 503, statusMessage: 'API key is not configured on this server.' })
  }

  const authenticated = matches(event.req.headers.get('x-api-key'), apiKey) || (isWebhook && matches(url.searchParams.get('secret'), webhookSecret))
  if (!authenticated) {
    throw new HTTPError({
      statusCode: 401,
      statusMessage: isWebhook ? 'A valid x-api-key header or ?secret= is required.' : 'A valid x-api-key header is required.',
    })
  }

  // Every protected request is scoped to an organization and, unless it is machine-to-machine, to a user.
  const orgSlug = event.req.headers.get('x-org-id') || (isWebhook ? url.searchParams.get('org') : null)
  if (!orgSlug) {
    throw new HTTPError({ statusCode: 400, statusMessage: isWebhook ? 'x-org-id header or ?org= is required' : 'x-org-id header is required' })
  }
  event.context.orgSlug = assertOrgSlug(orgSlug)

  if (needsUser) {
    const userId = event.req.headers.get('x-user-id')?.trim()
    if (!userId) throw new HTTPError({ statusCode: 400, statusMessage: 'x-user-id header is required' })
    event.context.userId = userId
  }
})
