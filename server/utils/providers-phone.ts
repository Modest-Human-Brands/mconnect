import { EgressClient, EncodedFileOutput, EncodedFileType, RoomServiceClient, SipClient, AccessToken } from 'livekit-server-sdk'
import { loadConfig } from 'c12'

interface SipBridgePayload {
  contactId: string
  userId: string
  destinationPhone: string
  agentPhone?: string
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

async function getVoiceInfrastructure() {
  if (cachedVoiceConfig) return cachedVoiceConfig

  const { config } = await loadConfig({
    configFile: '../config/messaging.config.yaml',
  })

  cachedVoiceConfig = config?.voiceConfig
  return cachedVoiceConfig
}

export async function initializeLiveKitSipBridge(payload: SipBridgePayload) {
  const voiceConfig = await getVoiceInfrastructure()
  const settings = voiceConfig?.sip

  if (!settings?.host || !settings?.apiKey || !settings?.apiSecret || !voiceConfig?.activeProvider) {
    throw new Error('[Voice Utility Error]: LiveKit server host infrastructure configurations are incomplete.')
  }

  const targetProvider = voiceConfig?.activeProvider
  const sipTrunkId = voiceConfig?.providers?.[targetProvider].trunkId

  if (!sipTrunkId) {
    throw new Error(`[Voice Utility Error]: No active Outbound SIP Trunk mapping found for vendor string: "${targetProvider}"`)
  }

  const targetRoomName = `room-${payload.contactId}`
  const backupCallId = `call-${payload.contactId}-${Date.now()}`

  try {
    // 1. Create the Room
    const roomService = new RoomServiceClient(settings.host, settings.apiKey, settings.apiSecret)
    await roomService.createRoom({
      name: targetRoomName,
      emptyTimeout: 300,
      maxParticipants: 5,
    })
    console.log(`[LiveKit Media]: Centralized room instance allocated -> ${targetRoomName}`)

    // 2. Dial the Customer
    const sipClient = new SipClient(settings.host, settings.apiKey, settings.apiSecret)
    console.log(`[SIP Dial Engine]: Launching call leg to ${payload.destinationPhone} via ${targetProvider.toUpperCase()} (Trunk: ${sipTrunkId})`)

    const sipParticipant = await sipClient.createSipParticipant(sipTrunkId, payload.destinationPhone, targetRoomName, {
      participantIdentity: `customer-${payload.contactId}`,
      participantName: 'Customer Leg',
    })
    console.log(`[SIP Dial Success]: Connected customer track safely to LiveKit space. Channel Reference: ${sipParticipant.sipCallId}`)

    // 3. Connect the Agent (WebRTC vs SIP Bridge)
    let agentAccessToken: string | undefined

    if (payload.webCall) {
      console.log(`[WebRTC Engine]: Generating Access Token for Agent browser session -> ${payload.userId}`)
      const at = new AccessToken(settings.apiKey, settings.apiSecret, {
        identity: `agent-${payload.userId}`,
        name: 'Agent Leg',
      })
      // Grant permission to join this specific room and publish audio
      at.addGrant({ roomJoin: true, room: targetRoomName, canPublish: true, canSubscribe: true })
      agentAccessToken = await at.toJwt()
    } else {
      if (!payload.agentPhone) {
        throw new Error('[Voice Utility Error]: Agent phone number is required for a SIP-to-SIP bridge.')
      }
      console.log(`[SIP Dial Engine]: Launching secondary call leg to Agent ${payload.agentPhone}`)
      await sipClient.createSipParticipant(sipTrunkId, payload.agentPhone, targetRoomName, {
        participantIdentity: `agent-${payload.userId}`,
        participantName: 'Agent Leg',
      })
      console.log(`[SIP Dial Success]: Connected agent track safely to LiveKit space.`)
    }

    // 4. Start Recording (If Requested)
    if (payload.recordCall) {
      const egressClient = new EgressClient(settings.host, settings.apiKey, settings.apiSecret)
      const fileOutput = new EncodedFileOutput({
        fileType: EncodedFileType.MP4,
        filepath: `/recordings/call-${payload.contactId}-${Date.now()}.mp4`,
      })

      const egressInfo = await egressClient.startRoomCompositeEgress(targetRoomName, fileOutput, { audioOnly: true })
      console.log(`[Egress Recording Engine]: Local file capture session active. Tracking Reference: ${egressInfo.egressId}`)
    }

    // 5. Return payload for the Nitro endpoint
    return {
      roomName: targetRoomName,
      callUuid: sipParticipant.sipCallId || backupCallId,
      accessToken: agentAccessToken, // Will be undefined if webCall is false
    }
  } catch (mediaError: any) {
    console.error('❌ [Media Engine Exception]: Failed vendor-agnostic room bridge deployment sequence:', mediaError)
    throw new Error(`Media engine routing failure: ${mediaError.message}`)
  }
}
