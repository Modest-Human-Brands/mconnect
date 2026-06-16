import { loadConfig } from 'c12'
import { ofetch } from 'ofetch'

let cachedSMSConfig: any = null

async function getSMSInfrastructure(orgSlug: string) {
  if (cachedSMSConfig) return cachedSMSConfig

  const { config } = await loadConfig({
    configFile: `../config/organization/${orgSlug}.yaml`,
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
  fast2sms: async (payload) => {
    if (!payload.settings?.apiKey) throw new Error('Fast2SMS apiKey configuration missing.')

    const response = await ofetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: payload.settings.apiKey,
        'Content-Type': 'application/json',
      },
      body: {
        route: payload.settings.route,
        message: payload.text,
        language: 'english',
        flash: 0,
        numbers: payload.to.replace(/\D/g, ''),
      },
    })

    if (!response.return) {
      throw new Error(`Fast2SMS delivery exception: ${response.message || 'Unknown Execution Error'}`)
    }
    return { providerMessageId: response.request_id || `fast2sms-${Date.now()}` }
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
        type: 'text',
        text: { body: payload.text },
      },
    })

    return { providerMessageId: response.message_id || `vobiz-${Date.now()}` }
  },
}

export default async function (to: string, text: string, orgSlug: string) {
  const smsConfigProfile = await getSMSInfrastructure(orgSlug)
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
