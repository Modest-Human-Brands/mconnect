import { loadConfig } from 'c12'
import { ofetch } from 'ofetch'

interface DispatchVoiceBridgePayload {
  legANumber: string
  legBNumber: string
  recordCall: boolean
  contactId?: string
  userId?: string
}

interface InboundResponsePayload {
  targetAgentPhone: string
  holdMusic: string
}

interface BridgeResponsePayload {
  legBNumber: string
  recordCall: boolean
  contactId?: string
  userId?: string
}

interface CompiledResponseOutput {
  body: string
  contentType: string
}

let cachedVoiceConfig: any = null

async function getVoiceInfrastructure() {
  if (cachedVoiceConfig) return cachedVoiceConfig

  const { config } = await loadConfig({
    configFile: '../config/messaging.config.yaml',
  })

  const voiceSettings = config?.voiceConfig
  if (!voiceSettings?.activeProvider) {
    throw new Error('Voice configuration or activeProvider targeting rules are missing from the profile.')
  }

  cachedVoiceConfig = voiceSettings
  return cachedVoiceConfig
}

const outboundAdapters: Record<string, (payload: DispatchVoiceBridgePayload & { settings: any }) => Promise<{ callUuid: string }>> = {
  vobiz: async (payload) => {
    if (!payload.settings?.authId || !payload.settings?.authToken) {
      throw new Error('[Voice Driver Error]: Vobiz settings are missing required authId or authToken parameters.')
    }

    const answerUrl = `${payload.settings.callbackBaseUrl}/api/connect/call/phone/bridge-callback?contactId=${payload.contactId || ''}&userId=${payload.userId || ''}&recordCall=${payload.recordCall}`

    try {
      const response = await ofetch<{ call_uuid: string }>(`/api/v1/Account/${payload.settings.authId}/Call`, {
        baseURL: 'https://api.vobiz.ai',
        method: 'POST',
        headers: {
          'X-Auth-ID': payload.settings.authId,
          'X-Auth-Token': payload.settings.authToken,
          'Content-Type': 'application/json',
        },
        body: {
          from: payload.settings.fromNumber,
          to: payload.legANumber,
          answer_url: answerUrl,
          answer_method: 'POST',
        },
      })

      return { callUuid: response.call_uuid }
    } catch (error: any) {
      console.error('❌ [Voice Driver: VOBIZ] Outbound call initiation failed execution:', error)
      throw new Error(`Vobiz make-call service failure: ${error.message}`)
    }
  },
  twilio: async (payload) => {
    console.log(`📞 [Voice Driver: TWILIO] Triggering REST API call flow connection`)
    return { callUuid: `twilio-sid-${Date.now()}` }
  },
}

const inboundAdapters: Record<string, (payload: InboundResponsePayload) => CompiledResponseOutput> = {
  vobiz: (payload) => {
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
      `  <Dial dialMusic="${payload.holdMusic}" timeout="20" action="/webhook/voice/fallback">`,
      `    <Number>${payload.targetAgentPhone}</Number>`,
      '    <User>sip:agent_desktop@phone.vobiz.com</User>',
      '  </Dial>',
      '</Response>',
    ].join('\n')

    return { body: xml, contentType: 'application/xml' }
  },
  twilio: (payload) => {
    const txml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
      `  <Dial timeout="20" action="/webhook/voice/fallback">`,
      `    <Number>${payload.targetAgentPhone}</Number>`,
      '  </Dial>',
      '</Response>',
    ].join('\n')

    return { body: txml, contentType: 'application/xml' }
  },
}

const bridgeAdapters: Record<string, (payload: { legBNumber: string; recordCall: boolean; callbackBaseUrl: string; callerId: string; contactId?: string; userId?: string }) => CompiledResponseOutput> =
  {
    vobiz: (payload) => {
      const xml = `
    <?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Stream keepCallAlive="true" bidirectional="false" contentType="audio/x-l16;rate=16000">${payload.callbackBaseUrl}/api/connect/call/phone/stream?callUuid=${payload.contactId || ''}</Stream>
    
    <Dial callerId="${payload.callerId}" action="${payload.callbackBaseUrl}/api/connect/call/phone/status?direction=outbound&amp;contactId=${payload.contactId || ''}&amp;userId=${payload.userId || ''}">
        <Number>${payload.legBNumber}</Number>
    </Dial>
</Response>`

      return { body: xml, contentType: 'application/xml' }
    },
    twilio: (payload) => {
      const txml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<Response>',
        `  <Dial callerId="${payload.callerId}" action="${payload.callbackBaseUrl}/api/connect/call/phone/status?direction=outbound&amp;contactId=${payload.contactId || ''}&amp;userId=${payload.userId || ''}">`,
        `    <Number>${payload.legBNumber}</Number>`,
        '  </Dial>',
        '</Response>',
      ].join('\n')

      return { body: txml, contentType: 'application/xml' }
    },
  }

export default async function (payload: DispatchVoiceBridgePayload) {
  const voiceConfigProfile = await getVoiceInfrastructure()
  const activeProviderName = voiceConfigProfile.activeProvider

  const adapterRunner = outboundAdapters[activeProviderName]
  if (!adapterRunner) {
    throw new Error(`The target voice outbound adapter "${activeProviderName}" is unrecognized.`)
  }

  const result = await adapterRunner({
    ...payload,
    settings: voiceConfigProfile.providers?.[activeProviderName],
  })

  return {
    callUuid: result.callUuid,
    activeProviderName,
  }
}

export async function compileInboundResponse(payload: InboundResponsePayload) {
  const voiceConfigProfile = await getVoiceInfrastructure()
  const activeProviderName = voiceConfigProfile.activeProvider

  const adapterCompiler = inboundAdapters[activeProviderName]
  if (!adapterCompiler) {
    throw new Error(`The target voice inbound compiler "${activeProviderName}" is unrecognized.`)
  }

  return adapterCompiler(payload)
}

export async function compileBridgeResponse(payload: BridgeResponsePayload) {
  const voiceConfigProfile = await getVoiceInfrastructure()
  const activeProviderName = voiceConfigProfile.activeProvider
  const providerSettings = voiceConfigProfile.providers?.[activeProviderName]

  const callbackBaseUrl = providerSettings?.callbackBaseUrl
  const callerId = providerSettings?.fromNumber

  const adapterCompiler = bridgeAdapters[activeProviderName]
  if (!adapterCompiler) {
    throw new Error(`The target voice bridge compiler "${activeProviderName}" is unrecognized.`)
  }

  return adapterCompiler({
    ...payload,
    callbackBaseUrl,
    callerId,
  })
}
