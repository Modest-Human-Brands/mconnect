import { EgressClient, EncodedFileOutput, EncodedFileType, RoomServiceClient, SipClient, AccessToken } from 'livekit-server-sdk'
import { loadConfig } from 'c12'
import { HTTPError } from 'nitro/h3'

interface SipBridgePayload {
  contactId: string
  userId: string
  destinationPhone: string
  userPhone?: string
  webCall: boolean
  recordCall: boolean
}

interface ProvidersConfig {
  vobiz: {
    authId: string
    authToken: string
    fromNumber: string
    trunkId: string
  }
  twilio: {
    apiKey: string
    trunkId: string
  }
}

interface VoiceConfig {
  activeProvider: keyof ProvidersConfig
  defaultForwardingNumber: string
  holdMusic: string
  providers: ProvidersConfig
  sip: {
    host: string
    apiKey: string
    apiSecret: string
  }
}

let cachedVoiceConfig: VoiceConfig | null = null

async function getVoiceInfrastructure(orgSlug: string) {
  if (cachedVoiceConfig) return cachedVoiceConfig

  const { config } = await loadConfig({
    configFile: `../config/organizations/${orgSlug}.yaml`,
  })

  cachedVoiceConfig = config?.voiceConfig
  return cachedVoiceConfig
}

export async function initializeLiveKitSipBridge(payload: SipBridgePayload, orgSlug: string) {
  const voiceConfig = await getVoiceInfrastructure(orgSlug)
  const settings = voiceConfig?.sip

  if (!settings?.host || !settings?.apiKey || !settings?.apiSecret || !voiceConfig?.activeProvider) {
    throw new HTTPError({ statusCode: 400, message: '[Voice Utility Error]: LiveKit server host infrastructure configurations are incomplete.' })
  }

  const targetProvider = voiceConfig?.activeProvider
  const sipTrunkId = voiceConfig?.providers?.[targetProvider].trunkId

  if (!sipTrunkId) {
    throw new HTTPError({ statusCode: 400, message: '[Voice Utility Error]: No active Outbound SIP Trunk mapping found for vendor string: "${targetProvider}"' })
  }

  const roomName = `outbound-call_${payload.contactId}`

  try {
    const roomService = new RoomServiceClient(settings.host, settings.apiKey, settings.apiSecret)
    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 300,
      maxParticipants: 5,
    })
    console.log(`[LiveKit Media]: Centralized room instance allocated -> ${roomName}`)

    const sipClient = new SipClient(settings.host, settings.apiKey, settings.apiSecret)
    console.log(`[SIP Dial Engine]: Launching call leg to ${payload.destinationPhone} via ${targetProvider.toUpperCase()} (Trunk: ${sipTrunkId})`)

    const sipParticipant = await sipClient.createSipParticipant(sipTrunkId, payload.destinationPhone, roomName, {
      participantIdentity: `contact-${payload.contactId}`,
      participantName: 'Contact Leg',
    })
    console.log(`[SIP Dial Success]: Connected contact track safely to LiveKit space. Channel Reference: ${sipParticipant.sipCallId}`)

    let userAccessToken: string | undefined

    if (payload.webCall) {
      console.log(`[WebRTC Engine]: Generating Access Token for User browser session -> ${payload.userId}`)
      const at = new AccessToken(settings.apiKey, settings.apiSecret, {
        identity: `user-${payload.userId}`,
        name: 'User Leg',
      })

      at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true })
      userAccessToken = await at.toJwt()
    } else {
      if (!payload.userPhone) {
        throw new HTTPError({ statusCode: 400, message: '[Voice Utility Error]: User phone number is required for a SIP-to-SIP bridge.' })
      }
      console.log(`[SIP Dial Engine]: Launching secondary call leg to User ${payload.userPhone}`)
      await sipClient.createSipParticipant(sipTrunkId, payload.userPhone, roomName, {
        participantIdentity: `user-${payload.userId}`,
        participantName: 'User Leg',
      })
      console.log(`[SIP Dial Success]: Connected user track safely to LiveKit space.`)
    }

    if (payload.recordCall) {
      const egressClient = new EgressClient(settings.host, settings.apiKey, settings.apiSecret)
      const fileOutput = new EncodedFileOutput({
        fileType: EncodedFileType.MP4,
        filepath: `/recordings/call-${payload.contactId}-${Date.now()}.mp4`,
      })

      const egressInfo = await egressClient.startRoomCompositeEgress(roomName, fileOutput, { audioOnly: true })
      console.log(`[Egress Recording Engine]: Local file capture session active. Tracking Reference: ${egressInfo.egressId}`)
    }

    return {
      roomName: roomName,
      callUuid: sipParticipant.sipCallId,
      accessToken: userAccessToken,
    }
  } catch (mediaError: any) {
    console.error('❌ [Media Engine Exception]: Failed vendor-agnostic room bridge deployment sequence:', mediaError)
    throw new HTTPError({ statusCode: 400, message: 'Media engine routing failure: ${mediaError.message}' })
  }
}
