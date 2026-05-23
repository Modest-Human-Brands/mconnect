import { defineEventHandler, HTTPError, readBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import type { NotionDB } from '~/server/types'
import notion from '~/server/utils/notion'
import dispatchVoice from '~/server/utils/voice-providers'

const bodySchema = z.object({
  contactId: z.string(),
  userId: z.string(),
  recordCall: z.boolean(),
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { contactId, userId, recordCall } = body as z.infer<typeof bodySchema>

    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as unknown as NotionDB

    console.log('\n******\n')
    console.log('\n send route \n')
    console.log('\n******\n')

    const clientPage = (await notion.pages.retrieve({ page_id: contactId })) as any
    const agentPage = (await notion.pages.retrieve({ page_id: userId })) as any

    const legBNumber = clientPage?.properties?.Phone?.phone_number || clientPage?.properties?.Phone?.phone
    const legANumber = agentPage?.properties?.Phone?.phone_number || agentPage?.properties?.Phone?.phone

    if (!legANumber || !legBNumber) {
      throw new Error('Could not resolve phone numbers from the specified Client or Agent records.')
    }

    const dispatchResult = await dispatchVoice({
      legANumber,
      legBNumber,
      recordCall,
      contactId: contactId,
      userId: userId,
    })

    let loggingSummary = `[Outbound Voice Bridge Initiated]\n`
    loggingSummary += `Call Tracking UUID: ${dispatchResult.callUuid}\n`
    loggingSummary += `Provider: ${dispatchResult.activeProviderName}\n`
    loggingSummary += `Leg A (Agent/Originator): ${legANumber}\n`
    loggingSummary += `Leg B (Client/Destination): ${legBNumber}\n`
    loggingSummary += `Recording Flag Toggled: ${recordCall ? 'Active' : 'Disabled'}`

    await notion.pages.create({
      parent: { data_source_id: notionDbId.interaction },
      properties: {
        'Interaction ID': { title: [{ text: { content: `voice-bridge-${dispatchResult.callUuid}` } }] },
        Channel: { select: { name: 'voice' } },
        Direction: { select: { name: 'outbound' } },
        Timestamp: { date: { start: new Date().toISOString() } },
        Summary: {
          rich_text: [{ text: { content: loggingSummary } }],
        },
        ...(contactId && { Contact: { relation: [{ id: contactId }] } }),
        ...(userId && { User: { relation: [{ id: userId }] } }),
      },
    })

    event.res.status = 200
    return {
      status: 'bridging_initiated',
      provider: dispatchResult.activeProviderName,
      callUuid: dispatchResult.callUuid,
    }
  } catch (error: any) {
    console.error('API connect/call/phone/send POST', error)

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
