import registerPhoneTemplate from '~/server/utils/template-registry-phone'

export interface StandardIncomingCallPayload {
  timeout: number
  legBNumber: string
  recordCall: boolean
  callbackBaseUrl: string
  callerId: string
  contactId?: string
  userId?: string
  companName: string
  holdMusic: string
  streamUrl: string
}

registerPhoneTemplate({
  id: 'standard-call',
  transformPayload: (data: StandardIncomingCallPayload) => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
<Speak>Welcome to ${data.companName}</Speak>
 <Play>${data.holdMusic}</Play>
<Dial timeout="30" action="${data.callbackBaseUrl}/api/connect/call/phone/status?direction=outbound&amp;contactId=${data.contactId || ''}&amp;userId=${data.userId || ''}">
${data.legBNumber}
</Dial>
<Stream bidirectional="true" audioTrack="inbound" streamTimeout="7200" keepCallAlive="true">
  ${data.streamUrl}
</Stream>
    <Speak>Sorry, no one is available. Please call back later.</Speak>
    <Hangup/>
</Response>`
  },
})

// Voice Message -> Welcome to RED CAT PICTURES
// Ringtone
// Recipent -> Cloudy Telephony -> Caller (Agent)
