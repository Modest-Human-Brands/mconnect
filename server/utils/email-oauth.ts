import { HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { $fetch } from 'ofetch'

import { patchEmailAccount, type EmailAccount, type EmailOAuthTokens } from '#server/utils/email-accounts.ts'

export type OAuthProvider = 'google' | 'microsoft'

interface ProviderDefinition {
  authUrl: string
  tokenUrl: string
  scope: string
  extraAuthParams: Record<string, string>
  imap: { host: string; port: number }
  smtp: { host: string; port: number }
  credentials: () => { clientId: string; clientSecret: string }
  fetchAddress: (accessToken: string, idToken?: string) => Promise<string>
}

function credentialsFor(provider: OAuthProvider) {
  const config = useRuntimeConfig()
  const clientId = config.private[`${provider}ClientId`] as string
  const clientSecret = config.private[`${provider}ClientSecret`] as string
  if (!clientId || !clientSecret) {
    throw new HTTPError({ statusCode: 501, statusMessage: `${provider} OAuth is not configured on this server.` })
  }
  return { clientId, clientSecret }
}

export const oauthProviders: Record<OAuthProvider, ProviderDefinition> = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'https://mail.google.com/ openid email',
    // offline + consent guarantees a refresh token even when the user has connected before
    extraAuthParams: { access_type: 'offline', prompt: 'consent' },
    imap: { host: 'imap.gmail.com', port: 993 },
    smtp: { host: 'smtp.gmail.com', port: 465 },
    credentials: () => credentialsFor('google'),
    fetchAddress: async (accessToken) => {
      const info = await $fetch<{ email: string }>('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } })
      return info.email
    },
  },
  microsoft: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scope: 'https://outlook.office.com/IMAP.AccessAsUser.All https://outlook.office.com/SMTP.Send offline_access openid email',
    extraAuthParams: { prompt: 'select_account' },
    imap: { host: 'outlook.office365.com', port: 993 },
    smtp: { host: 'smtp.office365.com', port: 587 },
    credentials: () => credentialsFor('microsoft'),
    fetchAddress: async (_accessToken, idToken) => {
      // The ID token is received directly from the token endpoint over TLS, so decoding without verifying is safe here.
      const claims = idToken ? JSON.parse(Buffer.from(idToken.split('.')[1] ?? '', 'base64url').toString('utf8')) : {}
      const address = claims.email || claims.preferred_username
      if (!address) throw new HTTPError({ statusCode: 502, statusMessage: 'Microsoft did not return the mailbox address.' })
      return address
    },
  },
}

export function isOAuthProvider(value: string | undefined): value is OAuthProvider {
  return value === 'google' || value === 'microsoft'
}

export function oauthRedirectUri(provider: OAuthProvider) {
  const { connectUrl } = useRuntimeConfig().public
  return `${connectUrl.replace(/\/$/, '')}/api/email/accounts/oauth/${provider}/callback`
}

export function buildConsentUrl(provider: OAuthProvider, state: string) {
  const def = oauthProviders[provider]
  const params = new URLSearchParams({
    client_id: def.credentials().clientId,
    redirect_uri: oauthRedirectUri(provider),
    response_type: 'code',
    scope: def.scope,
    state,
    ...def.extraAuthParams,
  })
  return `${def.authUrl}?${params}`
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  id_token?: string
}

async function requestToken(provider: OAuthProvider, grant: Record<string, string>) {
  const def = oauthProviders[provider]
  const { clientId, clientSecret } = def.credentials()
  try {
    return await $fetch<TokenResponse>(def.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...grant }).toString(),
    })
  } catch (error: any) {
    const reason = error?.data?.error_description || error?.data?.error || error?.message
    throw new HTTPError({ statusCode: 400, statusMessage: `${provider} rejected the token request: ${reason}` })
  }
}

export async function exchangeCode(provider: OAuthProvider, code: string) {
  const token = await requestToken(provider, { grant_type: 'authorization_code', code, redirect_uri: oauthRedirectUri(provider) })
  if (!token.refresh_token) {
    throw new HTTPError({ statusCode: 400, statusMessage: `${provider} did not return a refresh token. Remove the app's access in your account settings and connect again.` })
  }
  const tokens: EmailOAuthTokens = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + token.expires_in * 1000,
  }
  const address = await oauthProviders[provider].fetchAddress(token.access_token, token.id_token)
  return { tokens, address }
}

/** Returns a valid access token, refreshing and persisting it when it is about to expire. */
export async function getAccessToken(orgSlug: string, account: EmailAccount): Promise<string> {
  const oauth = account.oauth
  if (!oauth || account.provider === 'imap') {
    throw new HTTPError({ statusCode: 400, statusMessage: `Account "${account.address}" does not use OAuth.` })
  }
  if (oauth.expiresAt - Date.now() > 60_000) return oauth.accessToken

  try {
    const token = await requestToken(account.provider, { grant_type: 'refresh_token', refresh_token: oauth.refreshToken })
    const refreshed: EmailOAuthTokens = {
      accessToken: token.access_token,
      // providers only sometimes rotate the refresh token
      refreshToken: token.refresh_token ?? oauth.refreshToken,
      expiresAt: Date.now() + token.expires_in * 1000,
    }
    await patchEmailAccount(orgSlug, account.id, { oauth: refreshed, status: 'connected', detail: undefined })
    account.oauth = refreshed
    return refreshed.accessToken
  } catch (error: any) {
    await patchEmailAccount(orgSlug, account.id, { status: 'error', detail: error?.statusMessage || 'Token refresh failed. Reconnect the account.' })
    throw error
  }
}
