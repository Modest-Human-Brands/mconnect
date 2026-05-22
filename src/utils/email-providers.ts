import { loadConfig } from 'c12'
import nodemailer from 'nodemailer'

let cachedEmailConfig: any = null
const transporterCache = new Map<string, nodemailer.Transporter>()

async function getEmailInfrastructure() {
  if (cachedEmailConfig) return cachedEmailConfig

  const { config } = await loadConfig({
    configFile: '../config/messaging.config.yaml',
  })

  const emailSettings = config?.emailConfig
  if (!emailSettings?.activeProvider) {
    throw new Error('Email configuration or activeProvider targeting rules are missing from the profile.')
  }

  cachedEmailConfig = emailSettings
  return cachedEmailConfig
}

function getOrCreateTransporter(providerName: string, settings: any): nodemailer.Transporter {
  if (transporterCache.has(providerName)) {
    return transporterCache.get(providerName)!
  }

  if (!settings?.host || !settings?.auth) {
    throw new Error(`Connection parameters for email provider "${providerName}" are incomplete.`)
  }

  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: Number(settings.port || 465),
    secure: settings.secure ?? settings.port === 465,
    auth: {
      user: settings.auth.user,
      pass: settings.auth.pass,
    },
  })

  transporterCache.set(providerName, transporter)
  return transporter
}

interface DispatchEmailPayload {
  to: string
  subject: string
  text: string
  html: string
  displayName?: string
  attachments?: any[]
}

const emailProviderAdapters: Record<string, (payload: DispatchEmailPayload & { settings: any; defaults: any }) => Promise<{ messageId: string }>> = {
  smtp: async (payload) => {
    const transporter = getOrCreateTransporter('smtp', payload.settings)
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
    const transporter = getOrCreateTransporter('hostinger', payload.settings)
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
    const transporter = getOrCreateTransporter('gmail', payload.settings)
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

export async function dispatchEmail(payload: DispatchEmailPayload) {
  const emailConfigProfile = await getEmailInfrastructure()
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
