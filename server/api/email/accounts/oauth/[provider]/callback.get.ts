import { defineEventHandler, getQuery, getRouterParam, HTTPError, sendRedirect } from 'nitro/h3'
import { useStorage } from 'nitro/storage'

import { saveEmailAccount } from '#server/utils/email-accounts.ts'
import { exchangeCode, isOAuthProvider, oauthProviders } from '#server/utils/email-oauth.ts'

interface OAuthState {
  orgSlug: string
  provider: string
  redirect: string
  expiresAt: number
}

function withParam(url: string, key: string, value: string) {
  const base = 'http://placeholder'
  const parsed = new URL(url, base)
  parsed.searchParams.set(key, value)
  return url.startsWith('/') ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.toString()
}

export default defineEventHandler(async (event) => {
  const provider = getRouterParam(event, 'provider')
  if (!isOAuthProvider(provider)) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'provider must be google or microsoft' })
  }

  const { code, state, error, error_description } = getQuery<Record<string, string | undefined>>(event)

  // The state is single use: consume it before doing anything else.
  const storage = useStorage<OAuthState>('data')
  const stateKey = `email-oauth-state:${state}`
  const saved = state ? await storage.getItem(stateKey) : null
  if (state) await storage.removeItem(stateKey)

  if (!saved || saved.provider !== provider || saved.expiresAt < Date.now()) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'The connection request is invalid or has expired. Start again.' })
  }

  try {
    if (error || !code) {
      throw new HTTPError({ statusCode: 400, statusMessage: error_description || error || 'Authorization was cancelled.' })
    }

    const { tokens, address } = await exchangeCode(provider, code)
    const def = oauthProviders[provider]

    await saveEmailAccount(saved.orgSlug, {
      provider,
      address,
      imap: { host: def.imap.host, port: def.imap.port, user: address },
      smtp: { host: def.smtp.host, port: def.smtp.port, user: address },
      oauth: tokens,
      status: 'connected',
    })
  } catch (error_: any) {
    console.error('API email/accounts/oauth callback GET', error_)
    return sendRedirect(event, withParam(saved.redirect, 'emailError', error_?.statusMessage || 'Failed to connect the account.'), 302)
  }

  return sendRedirect(event, saved.redirect, 302)
})
