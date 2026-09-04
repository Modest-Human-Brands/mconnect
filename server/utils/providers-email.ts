import { loadConfig } from 'c12'
import { HTTPError } from 'nitro/h3'
import nodemailer from 'nodemailer'

import MailComposer from 'nodemailer/lib/mail-composer'
import { ImapFlow } from 'imapflow'

interface DispatchEmailPayload {
  to: string
  subject: string
  text: string
  html: string
  displayName?: string
  attachments?: { filename: string; content: Buffer<ArrayBuffer>; contentType: string }[]
}

let cachedEmailConfig: any = null

async function getEmailInfrastructure(orgSlug: string) {
  if (cachedEmailConfig) return cachedEmailConfig

  const { config } = await loadConfig({
    configFile: `../config/organizations/${orgSlug}.yaml`,
  })

  const emailSettings = config?.emailConfig
  if (!emailSettings?.activeProvider) {
    throw new HTTPError({ statusCode: 400, message: 'Email configuration or activeProvider targeting rules are missing from the profile.' })
  }

  cachedEmailConfig = emailSettings
  return cachedEmailConfig
}

async function appendToSentFolder(mailOptions: any, settings: { host: string; port?: number; auth: { user: string; pass: string }; imapHost?: string; imapPort?: number }) {
  try {
    const imapHost = settings.imapHost || settings.host.replace(/^smtp\./i, 'imap.')
    const imapPort = Number(settings.imapPort || 993)

    const composer = new MailComposer(mailOptions)
    const messageBuffer = await composer.compile().build()

    const client = new ImapFlow({
      host: imapHost,
      port: imapPort,
      secure: true,
      auth: {
        user: settings.auth.user,
        pass: settings.auth.pass,
      },
      logger: false,
    })

    await client.connect()
    try {
      const mailboxes = await client.list()
      const sentMailbox = mailboxes.find((m) => m.specialUse === '\\Sent') || mailboxes.find((m) => /^sent/i.test(m.path) || /inbox\.sent/i.test(m.path))

      const targetFolder = sentMailbox ? sentMailbox.path : 'Sent'
      await client.append(targetFolder, messageBuffer, ['\\Seen'])
    } finally {
      await client.logout()
    }
  } catch (error) {
    console.error('[IMAP SYNC ERROR] Failed to save copy to Sent folder:', error)
  }
}

const emailProviderAdapters: Record<string, (payload: DispatchEmailPayload & { settings: any; defaults: any }) => Promise<{ messageId: string }>> = {
  smtp: async (payload) => {
    if (!payload.settings?.host || !payload.settings?.auth) {
      throw new HTTPError({ statusCode: 400, message: 'Connection parameters for email provider SMTP are incomplete.' })
    }

    const transporter = nodemailer.createTransport({
      host: payload.settings.host,
      port: Number(payload.settings.port || 465),
      secure: payload.settings.secure ?? payload.settings.port === 465,
      auth: {
        user: payload.settings.auth.user,
        pass: payload.settings.auth.pass,
      },
    })
    const fromName = payload.defaults?.fromName
    const fromEmail = payload.defaults?.fromEmail

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      attachments: payload.attachments,
    }

    const info = await transporter.sendMail(mailOptions)
    appendToSentFolder(mailOptions, payload.settings).catch(() => {})

    return { messageId: info.messageId }
  },
}

export default async function (payload: DispatchEmailPayload, orgSlug: string) {
  const emailConfigProfile = await getEmailInfrastructure(orgSlug)
  const activeProviderName = emailConfigProfile.activeProvider

  const adapterRunner = emailProviderAdapters[activeProviderName]
  if (!adapterRunner) {
    throw new HTTPError({ statusCode: 400, message: `The target email execution adapter "${activeProviderName}" is unrecognized or unmapped.` })
  }

  const providerSettings = emailConfigProfile.providers?.[activeProviderName]
  const defaults = emailConfigProfile.defaults

  const result = await adapterRunner({
    ...payload,
    settings: providerSettings,
    defaults,
  })

  return {
    providerMessageId: result.messageId,
    activeProviderName,
  }
}
