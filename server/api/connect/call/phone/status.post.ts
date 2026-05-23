import { defineEventHandler, readBody, getQuery, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import type { NotionDB } from '~/server/types'
import notion from '~/server/utils/notion'

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

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const body = await readBody(event)

    const { direction, contactId, userId } = query as z.infer<typeof querySchema>
    const { event: voiceEvent, callUuid, from, to, duration, recordingUrl } = body as z.infer<typeof bodySchema>

    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as unknown as NotionDB

    console.log('\n******\n')
    console.log('\n status route \n')
    console.log('\n******\n')

    console.log(`[Voice Telemetry]: Call ${callUuid} transitioned to state: [${voiceEvent.toUpperCase()}]`)

    if (voiceEvent.toLowerCase() === 'hangup') {
      let matchedContactId: string | null = contactId || null
      const matchedUserId: string | null = userId || null
      const callDirection = direction?.toLowerCase() === 'outbound' ? 'outbound' : 'inbound'

      if (!matchedContactId && callDirection === 'inbound') {
        const contactLookup = await notion.dataSources.query({
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

    event.res.status = 200
    return { success: true }
  } catch (error: any) {
    console.error('API connect/call/phone/status POST', error)

    const { code: errorCode } = error as { code?: string }

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Some Unknown Error Found',
    })
  }
})
