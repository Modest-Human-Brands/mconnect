import { loadConfig } from 'c12'
import { ofetch } from 'ofetch'

let cachedSMSConfig: any = null

async function getSMSInfrastructure() {
  if (cachedSMSConfig) return cachedSMSConfig

  const { config } = await loadConfig({
    configFile: '../config/messaging.config.yaml',
  })

  const smsSettings = config?.smsConfig
  if (!smsSettings?.activeProvider) {
    throw new Error('SMS configuration or activeProvider targeting rules are missing from the profile.')
  }

  cachedSMSConfig = smsSettings
  return cachedSMSConfig
}

interface ProviderPayload {
  to: string
  text: string
  settings: Record<string, any>
}

const smsProviderAdapters: Record<string, (payload: ProviderPayload) => Promise<{ providerMessageId: string }>> = {
  fast2sms: async ({ to, text, settings }) => {
    if (!settings?.apiKey) throw new Error('Fast2SMS apiKey configuration missing.')

    const response = await ofetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: settings.apiKey,
        'Content-Type': 'application/json',
      },
      body: {
        route: settings.route,
        message: text,
        language: 'english',
        flash: 0,
        numbers: to.replace(/\D/g, ''),
      },
    })

    if (!response.return) {
      throw new Error(`Fast2SMS delivery exception: ${response.message || 'Unknown Execution Error'}`)
    }
    return { providerMessageId: response.request_id || `fast2sms-${Date.now()}` }
  },

  vobiz: async ({ to, text, settings }) => {
    if (!settings?.authId || !settings?.authToken || !settings?.channelId) {
      throw new Error('Vobiz authentication fields are incomplete.')
    }

    const response = await ofetch('https://api.vobiz.ai/v1/messaging/send', {
      method: 'POST',
      headers: {
        'X-Auth-ID': settings.authId,
        'X-Auth-Token': settings.authToken,
        'Content-Type': 'application/json',
      },
      body: {
        channel_id: settings.channelId,
        to: to.startsWith('+') ? to : `+${to}`,
        type: 'text',
        text: { body: text },
      },
    })

    return { providerMessageId: response.message_id || `vobiz-${Date.now()}` }
  },

  mockGateway: async ({ to, text }) => {
    console.log(`📡 [Mock Gateway Dispatch] Sent to ${to}: "${text}"`)
    return { providerMessageId: `mock-${Date.now()}` }
  },
}

/**
 * Global SMS Dispatch Driver Engine
 * Standardizes inputs and executes the active configuration provider
 */
export async function dispatchSMS(to: string, text: string) {
  const smsConfigProfile = await getSMSInfrastructure()
  const activeProviderName = smsConfigProfile.activeProvider

  const adapterRunner = smsProviderAdapters[activeProviderName]
  if (!adapterRunner) {
    throw new Error(`The target SMS execution adapter "${activeProviderName}" is unrecognized or unmapped.`)
  }

  const providerSettings = smsConfigProfile.providers?.[activeProviderName]

  const result = await adapterRunner({
    to,
    text,
    settings: providerSettings,
  })

  return {
    providerMessageId: result.providerMessageId,
    activeProviderName,
  }
}
