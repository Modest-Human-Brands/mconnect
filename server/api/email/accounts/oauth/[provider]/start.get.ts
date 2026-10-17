import { randomBytes } from 'node:crypto'
import { defineEventHandler, getQuery, getRouterParam, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { useStorage } from 'nitro/storage'

import { buildConsentUrl, isOAuthProvider } from '#server/utils/email-oauth.ts'
import resolveOrgSlug from '#server/utils/resolve-org-slug.ts'

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000

/** Only same-app paths or URLs on the configured connect origin, so the callback cannot be used as an open redirect. */
function safeRedirect(redirect: unknown) {
  if (typeof redirect !== 'string' || !redirect) return '/'
  if (redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith('/\\')) return redirect
  try {
    const { connectUrl } = useRuntimeConfig().public
    if (new URL(redirect).origin === new URL(connectUrl).origin) return redirect
  } catch {
    // unparsable URL falls through to the rejection below
  }
  throw new HTTPError({ statusCode: 400, statusMessage: 'redirect must be a relative path or an URL on this app.' })
}

export default defineEventHandler(async (event) => {
  const provider = getRouterParam(event, 'provider')
  if (!isOAuthProvider(provider)) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'provider must be google or microsoft' })
  }

  const orgSlug = await resolveOrgSlug(event)
  const redirect = safeRedirect(getQuery(event).redirect)

  const state = randomBytes(24).toString('base64url')
  await useStorage('data').setItem(`email-oauth-state:${state}`, { orgSlug, provider, redirect, expiresAt: Date.now() + OAUTH_STATE_TTL_MS })

  return { url: buildConsentUrl(provider, state) }
})
