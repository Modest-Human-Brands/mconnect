import { loadConfig } from 'c12'
import nodemailer from 'nodemailer'

let cachedEmailConfig: any = null

async function getEmailInfrastructure(orgSlug: string) {
  if (cachedEmailConfig) return cachedEmailConfig

  const { config } = await loadConfig({
    configFile: `../config/organizations/${orgSlug}.yaml`,
  })

  const emailSettings = config?.emailConfig
  if (!emailSettings?.activeProvider) {
    throw new Error('Email configuration or activeProvider targeting rules are missing from the profile.')
  }

  cachedEmailConfig = emailSettings
  return cachedEmailConfig
}

interface DispatchEmailPayload {
  to: string
  subject: string
  text: string
  html: string
  displayName?: string
  attachments?: { filename: string; content: Buffer<ArrayBuffer>; contentType: string }[]
}

const emailProviderAdapters: Record<string, (payload: DispatchEmailPayload & { settings: any; defaults: any }) => Promise<{ messageId: string }>> = {
  smtp: async (payload) => {
    if (!payload.settings?.host || !payload.settings?.auth) {
      throw new Error(`Connection parameters for email provider Hostinger are incomplete.`)
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
    const fromName = payload.displayName || payload.defaults?.fromName
    const fromEmail = payload.settings?.auth?.user || payload.defaults?.fallbackFromEmail

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      attachments: payload.attachments,
    })

    return { messageId: info.messageId }
  },
  hostinger: async (payload) => {
    if (!payload.settings?.host || !payload.settings?.auth) {
      throw new Error(`Connection parameters for email provider Hostinger are incomplete.`)
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

    const fromName = payload.displayName || payload.defaults?.fromName
    const fromEmail = payload.settings?.auth?.user || payload.defaults?.fallbackFromEmail

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      attachments: payload.attachments,
    })

    return { messageId: info.messageId }
  },
  gmail: async (payload) => {
    if (!payload.settings?.host || !payload.settings?.auth) {
      throw new Error(`Connection parameters for email provider Hostinger are incomplete.`)
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

    const fromName = payload.displayName || payload.defaults?.fromName
    const fromEmail = payload.settings?.auth?.user || payload.defaults?.fallbackFromEmail

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      attachments: payload.attachments,
    })

    return { messageId: info.messageId }
  },

  resendApi: async (payload) => {
    console.log(`📡 Sending via HTTP API driver to ${payload.to} using token ${payload.settings?.apiKey}`)
    return { messageId: `resend-api-${Date.now()}` }
  },
}

export default async function (payload: DispatchEmailPayload, orgSlug: string) {
  const emailConfigProfile = await getEmailInfrastructure(orgSlug)
  const activeProviderName = emailConfigProfile.activeProvider

  const adapterRunner = emailProviderAdapters[activeProviderName]
  if (!adapterRunner) {
    throw new Error(`The target email execution adapter "${activeProviderName}" is unrecognized or unmapped.`)
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
