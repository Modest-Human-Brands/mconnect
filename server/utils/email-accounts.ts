import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { loadConfig } from 'c12'
import { parseYAML, stringifyYAML } from 'confbox'
import { HTTPError } from 'nitro/h3'

export type EmailProvider = 'google' | 'microsoft' | 'imap'

export interface EmailServerSettings {
  host: string
  port: number
  user: string
  pass?: string
}

export interface EmailOAuthTokens {
  accessToken: string
  refreshToken: string
  /** epoch milliseconds */
  expiresAt: number
}

/** Stored shape. Contains secrets, never return it from an API, use `toPublicAccount`. */
export interface EmailAccount {
  id: string
  provider: EmailProvider
  address: string
  fromName: string
  imap: EmailServerSettings
  smtp: EmailServerSettings
  oauth?: EmailOAuthTokens
  status: 'connected' | 'error'
  detail?: string
  createdAt: string
  updatedAt: string
}

export interface PublicEmailAccount {
  id: string
  provider: EmailProvider
  address: string
  status: 'connected' | 'error'
  detail?: string
}

const ACCOUNTS_DIR = '../config/organizations'

export function assertOrgSlug(orgSlug: string) {
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(orgSlug)) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'Invalid organization id.', message: 'Invalid organization id.' })
  }
  return orgSlug
}

function accountsFile(orgSlug: string) {
  return path.resolve(ACCOUNTS_DIR, `${assertOrgSlug(orgSlug)}.email-accounts.yaml`)
}

export function toPublicAccount(account: EmailAccount): PublicEmailAccount {
  return {
    id: account.id,
    provider: account.provider,
    address: account.address,
    status: account.status,
    ...(account.detail ? { detail: account.detail } : {}),
  }
}

async function readFileAccounts(orgSlug: string): Promise<EmailAccount[]> {
  try {
    const raw = await fs.readFile(accountsFile(orgSlug), 'utf8')
    const parsed = parseYAML<{ accounts?: EmailAccount[] }>(raw)
    return Array.isArray(parsed?.accounts) ? parsed.accounts : []
  } catch (error: any) {
    if (error?.code === 'ENOENT') return []
    throw error
  }
}

// Serialize read-modify-write cycles per organization so concurrent requests (e.g. a token refresh
// racing with a delete) cannot drop each other's changes.
const locks = new Map<string, Promise<unknown>>()

function withLock<T>(orgSlug: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(orgSlug) ?? Promise.resolve()
  const next = previous.then(task, task)
  locks.set(
    orgSlug,
    next.catch(() => {})
  )
  return next
}

async function mutate(orgSlug: string, change: (accounts: EmailAccount[]) => EmailAccount[]) {
  return withLock(orgSlug, async () => {
    const next = change(await readFileAccounts(orgSlug))
    const file = accountsFile(orgSlug)
    await fs.mkdir(path.dirname(file), { recursive: true })
    const tmp = `${file}.${process.pid}.tmp`
    await fs.writeFile(tmp, stringifyYAML({ accounts: next }), { encoding: 'utf8', mode: 0o600 })
    await fs.rename(tmp, file)
    return next
  })
}

/**
 * Pre-existing static mailbox (`emailConfig` in the organization YAML), exposed as a read-only
 * account so organizations that have not connected a mailbox yet keep working.
 */
async function legacyAccount(orgSlug: string): Promise<EmailAccount | undefined> {
  const { config } = await loadConfig({ configFile: `${ACCOUNTS_DIR}/${assertOrgSlug(orgSlug)}.yaml` })
  const emailConfig = config?.emailConfig
  const smtp = emailConfig?.providers?.[emailConfig?.activeProvider]
  if (!smtp?.host || !smtp?.auth?.user) return undefined

  const now = new Date(0).toISOString()
  return {
    id: 'legacy',
    provider: 'imap',
    address: emailConfig.defaults?.fromEmail || smtp.auth.user,
    fromName: emailConfig.defaults?.fromName || '',
    smtp: { host: smtp.host, port: Number(smtp.port || 465), user: smtp.auth.user, pass: smtp.auth.pass },
    imap: {
      host: smtp.imapHost || String(smtp.host).replace(/^smtp\./i, 'imap.'),
      port: Number(smtp.imapPort || 993),
      user: smtp.auth.user,
      pass: smtp.auth.pass,
    },
    status: 'connected',
    createdAt: now,
    updatedAt: now,
  }
}

export async function listEmailAccounts(orgSlug: string): Promise<EmailAccount[]> {
  const accounts = await readFileAccounts(orgSlug)
  if (accounts.length > 0) return accounts
  const legacy = await legacyAccount(orgSlug)
  return legacy ? [legacy] : []
}

/** The requested account, or the first connected one when no id is given. */
export async function resolveEmailAccount(orgSlug: string, accountId?: string): Promise<EmailAccount> {
  const accounts = await listEmailAccounts(orgSlug)
  const account = accountId ? accounts.find((a) => a.id === accountId) : accounts.find((a) => a.status === 'connected')

  if (!account) {
    throw new HTTPError({
      statusCode: accountId ? 404 : 400,
      statusMessage: accountId ? `Email account "${accountId}" not found.` : `No connected email account for ${orgSlug}.`,
    })
  }
  if (account.status !== 'connected') {
    throw new HTTPError({ statusCode: 400, statusMessage: `Email account "${account.address}" is not connected: ${account.detail || 'unknown error'}` })
  }
  return account
}

/** Insert, or replace the account already stored for the same provider and address (keeps its id). */
export async function saveEmailAccount(orgSlug: string, input: Omit<EmailAccount, 'id' | 'createdAt' | 'updatedAt' | 'fromName'> & { fromName?: string }) {
  const now = new Date().toISOString()
  let saved!: EmailAccount

  await mutate(orgSlug, (accounts) => {
    const existing = accounts.find((a) => a.provider === input.provider && a.address.toLowerCase() === input.address.toLowerCase())
    saved = {
      ...input,
      fromName: input.fromName ?? existing?.fromName ?? '',
      id: existing?.id ?? randomUUID(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    return [...accounts.filter((a) => a !== existing), saved]
  })

  return saved
}

export async function patchEmailAccount(orgSlug: string, id: string, patch: Partial<Pick<EmailAccount, 'oauth' | 'status' | 'detail'>>) {
  await mutate(orgSlug, (accounts) =>
    accounts.map((a) => {
      if (a.id !== id) return a
      const merged: Record<string, unknown> = { ...a, ...patch, updatedAt: new Date().toISOString() }
      for (const key of Object.keys(merged)) if (merged[key] === undefined) delete merged[key]
      return merged as unknown as EmailAccount
    })
  )
}

export async function deleteEmailAccount(orgSlug: string, id: string) {
  let found = false
  await mutate(orgSlug, (accounts) => {
    found = accounts.some((a) => a.id === id)
    return accounts.filter((a) => a.id !== id)
  })
  if (!found) {
    throw new HTTPError({ statusCode: 404, statusMessage: `Email account "${id}" not found.` })
  }
}

/** Every organization that has a YAML file, with or without connected accounts (legacy `emailConfig` included). */
export async function listOrgSlugs(): Promise<string[]> {
  try {
    const files = await fs.readdir(path.resolve(ACCOUNTS_DIR))
    const slugs = files.filter((f) => f.endsWith('.yaml')).map((f) => f.replace(/(\.email-accounts)?\.yaml$/, ''))
    return [...new Set(slugs)]
  } catch {
    return []
  }
}
