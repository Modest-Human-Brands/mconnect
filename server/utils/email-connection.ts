import nodemailer from 'nodemailer'
import { ImapFlow } from 'imapflow'

import type { EmailAccount, EmailServerSettings } from '#server/utils/email-accounts.ts'
import { getAccessToken } from '#server/utils/email-oauth.ts'

const CONNECT_TIMEOUT_MS = 15_000

type Credentials = { user: string; pass: string } | { user: string; accessToken: string }

async function credentialsFor(orgSlug: string, account: EmailAccount, server: EmailServerSettings): Promise<Credentials> {
  if (account.provider === 'imap') return { user: server.user, pass: server.pass ?? '' }
  return { user: account.address, accessToken: await getAccessToken(orgSlug, account) }
}

export function createImapClient(server: EmailServerSettings, auth: Credentials) {
  return new ImapFlow({
    host: server.host,
    port: server.port,
    secure: server.port === 993,
    auth,
    logger: false,
    connectionTimeout: CONNECT_TIMEOUT_MS,
    greetingTimeout: CONNECT_TIMEOUT_MS,
  })
}

export function createSmtpTransport(server: EmailServerSettings, auth: Credentials) {
  return nodemailer.createTransport({
    host: server.host,
    port: server.port,
    secure: server.port === 465,
    requireTLS: server.port !== 465,
    auth: 'accessToken' in auth ? { type: 'OAuth2', user: auth.user, accessToken: auth.accessToken } : auth,
    connectionTimeout: CONNECT_TIMEOUT_MS,
    greetingTimeout: CONNECT_TIMEOUT_MS,
    socketTimeout: CONNECT_TIMEOUT_MS * 2,
  })
}

export async function openImapClient(orgSlug: string, account: EmailAccount) {
  const client = createImapClient(account.imap, await credentialsFor(orgSlug, account, account.imap))
  // ImapFlow emits 'error' on dropped sockets; without a listener it would crash the process.
  client.on('error', (error) => console.error(`[IMAP ${account.address}]`, error.message))
  await client.connect()
  return client
}

export async function openSmtpTransport(orgSlug: string, account: EmailAccount) {
  return createSmtpTransport(account.smtp, await credentialsFor(orgSlug, account, account.smtp))
}

/** Checks both an IMAP login and an SMTP handshake. Throws an Error with a user-readable message. */
export async function verifyImapCredentials(imap: EmailServerSettings, smtp: EmailServerSettings) {
  const imapClient = createImapClient(imap, { user: imap.user, pass: imap.pass ?? '' })
  imapClient.on('error', () => {})
  try {
    await imapClient.connect()
  } catch (error: any) {
    throw new Error(`IMAP connection failed: ${describeError(error)}`)
  } finally {
    await imapClient.logout().catch(() => imapClient.close())
  }

  const transport = createSmtpTransport(smtp, { user: smtp.user, pass: smtp.pass ?? '' })
  try {
    await transport.verify()
  } catch (error: any) {
    throw new Error(`SMTP connection failed: ${describeError(error)}`)
  } finally {
    transport.close()
  }
}

function describeError(error: any) {
  // ImapFlow puts the server's text in responseText; nodemailer puts it in message / response.
  const reason: string = error?.responseText || error?.response || error?.message || 'unknown error'
  if (error?.authenticationFailed || error?.code === 'EAUTH') return `authentication rejected (${reason})`
  if (error?.code === 'ENOTFOUND') return `host "${error.hostname}" was not found`
  if (error?.code === 'ECONNREFUSED') return `connection refused by ${error.address}:${error.port}`
  if (error?.code === 'ETIMEDOUT' || error?.code === 'ESOCKET' || /timed? ?out/i.test(reason)) return `timed out. Check the host and port (${reason})`
  return reason
}

export async function findSentMailbox(client: ImapFlow) {
  const mailboxes = await client.list()
  return mailboxes.find((m) => m.specialUse === String.raw`\Sent`) || mailboxes.find((m) => /^sent/i.test(m.path) || /inbox\.sent/i.test(m.path))
}
