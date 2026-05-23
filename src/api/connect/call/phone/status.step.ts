import { http, type Handlers, type StepConfig } from 'motia'
import { z } from 'zod'
import notion from '../../../../utils/notion'

const notionDbId = JSON.parse(import.meta.env.NOTION_DB_ID)

const querySchema = z.object({
  contactId: z.string().optional(),
  userId: z.string().optional(),
  direction: z.string().optional(),
})

const bodySchema = z.object({
  event: z.string(),
  callUuid: z.string(),
  from: z.string(),
  to: z.string(),
  duration: z.number().optional(),
  recordingUrl: z.string().optional(),
})

export const config = {
  name: 'VoiceStatusTelemetryTracker',
  description: 'Asynchronously tracks real-time call lifecycles and records call metadata/recordings to the CRM',
  flows: ['voice-routing-flow'],
  triggers: [
    http('POST', '/api/connect/call/phone/status', {
      queryParams: querySchema,
      bodySchema,
    }),
  ],
  enqueues: [],
} as const satisfies StepConfig

export const handler: Handlers<typeof config> = async ({ request }) => {
  const { direction, contactId, userId } = request.queryParams as z.infer<typeof querySchema>
  const { event, callUuid, from, to, duration, recordingUrl } = request.body as z.infer<typeof bodySchema>

  console.log('\n******\n')
  console.log('\n status route \n')
  console.log('\n******\n')

  try {
    console.log(`[Voice Telemetry]: Call ${callUuid} transitioned to state: [${event.toUpperCase()}]`)

    if (event.toLowerCase() === 'hangup') {
      let matchedContactId: string | null = contactId || null
      const matchedUserId: string | null = userId || null
      const callDirection = direction?.toLowerCase() === 'outbound' ? 'outbound' : 'inbound'

      if (!matchedContactId && callDirection === 'inbound') {
        const contactLookup = await notion.databases.query({
          data_source_id: notionDbId.contact,
          filter: {
            property: 'Phone',
            phone_number: { equals: from },
          },
        })
        matchedContactId = contactLookup.results[0]?.id || null
      }

      let loggingSummary = `[Voice Call Summary]\n`
      loggingSummary += `Call Tracking UUID: ${callUuid}\n`
      loggingSummary += `Direction: ${callDirection === 'outbound' ? 'Outbound CRM Call' : 'Inbound Hotline Dial'}\n`
      loggingSummary += `From Connected Port: ${from}\n`
      loggingSummary += `To Connected Port: ${to}\n`
      loggingSummary += `Duration: ${duration || 0} seconds\n`

      if (recordingUrl) {
        loggingSummary += `Audio Archive URL: ${recordingUrl}`
      }

      await notion.pages.create({
        parent: { data_source_id: notionDbId.interaction },
        properties: {
          'Interaction ID': { title: [{ text: { content: `voice-cdr-${callUuid}` } }] },
          Channel: { select: { name: 'voice' } },
          Direction: { select: { name: callDirection } },
          Timestamp: { date: { start: new Date().toISOString() } },
          Summary: {
            rich_text: [{ text: { content: loggingSummary } }],
          },
          ...(recordingUrl && {
            'Recording URL': { url: recordingUrl },
          }),
          ...(matchedContactId && { Contact: { relation: [{ id: matchedContactId }] } }),
          ...(matchedUserId && { User: { relation: [{ id: matchedUserId }] } }),
        },
      })

      console.log(`[Voice Telemetry]: Call ${callUuid} successfully logged to CRM ledger.`)
    }

    return {
      status: 200,
      body: { success: true },
    }
  } catch (error: any) {
    console.error('❌ [Voice Telemetry Tracking Error]:', error)
    return {
      status: 500,
      body: { error: 'Failed to ingest background voice state change metrics', details: error.message },
    }
  }
}
