import { loadConfig } from 'c12'
import { ofetch } from 'ofetch'

let cachedWhatsAppConfig: any = null

async function getWhatsAppInfrastructure() {
  if (cachedWhatsAppConfig) return cachedWhatsAppConfig

  const { config } = await loadConfig({
    configFile: '../config/messaging.config.yaml',
  })

  const waSettings = config?.whatsappConfig
  if (!waSettings?.activeProvider) {
    throw new Error('WhatsApp configuration or activeProvider targeting rules are missing from the profile.')
  }

  cachedWhatsAppConfig = waSettings
  return cachedWhatsAppConfig
}

export interface WhatsAppPayload {
  to: string
  type?: 'text' | 'template'
  text?: string
  templateId?: string
  templateLanguage?: string
  templateComponents?: any[]
  settings?: Record<string, any>
}

const whatsAppProviderAdapters: Record<string, (payload: WhatsAppPayload) => Promise<{ providerMessageId: string }>> = {
  meta: async (payload) => {
    if (!payload.settings?.accessToken || !payload.settings?.phoneNumberId) {
      throw new Error('Meta WhatsApp Cloud API configuration is missing (accessToken or phoneNumberId).')
    }

    const body: any = {
      messaging_product: 'whatsapp',
      to: payload.to,
      type: payload.type || 'text',
    }

    if (body.type === 'text') {
      body.text = { body: payload.text }
    } else if (body.type === 'template') {
      body.template = {
        name: payload.templateId,
        language: { code: payload.templateLanguage || 'en_US' },
        components: payload.templateComponents || [],
      }
    }

    const response = await ofetch(`https://graph.facebook.com/v17.0/${payload.settings.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${payload.settings.accessToken}`,
        'Content-Type': 'application/json',
      },
      body,
    })

    return { providerMessageId: response.messages?.[0]?.id || `meta-wa-${Date.now()}` }
  },
  twilio: async (payload) => {
    if (!payload.settings?.accountSid || !payload.settings?.authToken || !payload.settings?.from) {
      throw new Error('Twilio authentication fields are incomplete.')
    }

    const encodedAuth = Buffer.from(`${payload.settings.accountSid}:${payload.settings.authToken}`).toString('base64')
    const formattedTo = payload.to.startsWith('+') ? payload.to : `+${payload.to}`
    const formattedFrom = payload.settings.from.startsWith('+') ? payload.settings.from : `+${payload.settings.from}`

    const params = new URLSearchParams()
    params.append('Contact', `whatsapp:${formattedTo}`)
    params.append('User', `whatsapp:${formattedFrom}`)

    if (payload.text) {
      params.append('Body', payload.text)
    } else if (payload.templateId) {
      throw new Error('Template handling for Twilio needs to be mapped based on your specific Twilio configuration (e.g. Content API).')
    }

    const response = await ofetch(`https://api.twilio.com/2010-04-01/Accounts/${payload.settings.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encodedAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    return { providerMessageId: response.sid || `twilio-wa-${Date.now()}` }
  },
  vobiz: async (payload) => {
    if (!payload.settings?.authId || !payload.settings?.authToken || !payload.settings?.channelId) {
      throw new Error('Vobiz authentication fields are incomplete.')
    }

    const response = await ofetch('/messaging/send', {
      baseURL: 'https://api.vobiz.ai/v1',
      method: 'POST',
      headers: {
        'X-Auth-ID': payload.settings.authId,
        'X-Auth-Token': payload.settings.authToken,
        'Content-Type': 'application/json',
      },
      body: {
        channel_id: payload.settings.channelId,
        to: payload.to.startsWith('+') ? payload.to : `+${payload.to}`,
        type: payload.type || 'text',
        text: payload.type === 'text' ? { body: payload.text } : undefined,
        template:
          payload.type === 'template'
            ? {
                id: payload.templateId,
                parameters: payload.templateComponents,
              }
            : undefined,
      },
    })

    return { providerMessageId: response.message_id || `vobiz-wa-${Date.now()}` }
  },
  openwa: async (payload) => {
    if (!payload.settings?.baseUrl) {
      throw new Error('Open-WA requires a baseUrl pointing to your running Open-WA HTTP service.')
    }

    // Open-WA relies on standard WhatsApp IDs ending in @c.us for individuals
    const cleanNumber = payload.to.replace(/\D/g, '')
    const chatId = cleanNumber.includes('@c.us') ? cleanNumber : `${cleanNumber}@c.us`

    if (payload.type === 'template') {
      throw new Error('Open-WA does not support official Meta Templates. It operates as a standard WhatsApp Web client.')
    }

    const response = await ofetch('/sendText', {
      baseURL: payload.settings.baseUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // If you secure your open-wa endpoint with an API key (e.g. standard wa-automate-express setup)
        ...(payload.settings.apiKey && { api_key: payload.settings.apiKey }),
      },
      body: {
        args: {
          to: chatId,
          content: payload.text,
        },
      },
    })

    return { providerMessageId: response?.id || `openwa-${Date.now()}` }
  },
}

export default async function (payload: Omit<WhatsAppPayload, 'settings'>) {
  const waConfigProfile = await getWhatsAppInfrastructure()
  const activeProviderName = waConfigProfile.activeProvider

  const adapterRunner = whatsAppProviderAdapters[activeProviderName]
  if (!adapterRunner) {
    throw new Error(`The target WhatsApp execution adapter "${activeProviderName}" is unrecognized or unmapped.`)
  }

  const providerSettings = waConfigProfile.providers?.[activeProviderName]

  const result = await adapterRunner({
    ...payload,
    settings: providerSettings,
  })

  return {
    providerMessageId: result.providerMessageId,
    activeProviderName,
  }
}
