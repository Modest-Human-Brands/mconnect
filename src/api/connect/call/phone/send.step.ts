import { http, type Handlers, type StepConfig } from 'motia'
import { z } from 'zod'
import dispatchVoice from '../../../../utils/voice-providers'
import notion from '../../../../utils/notion'

const notionDbId = JSON.parse(import.meta.env.NOTION_DB_ID)

const bodySchema = z.object({
  contactId: z.string(),
  userId: z.string(),
  recordCall: z.boolean(),
})

export const config = {
  name: 'VoiceOutboundSend',
  description: 'Programmatically initiates dual-leg outbound call bridging sequences through decoupled provider strategies and logs the audit trail to the CRM',
  flows: ['voice-routing-flow'],
  triggers: [
    http('POST', '/api/connect/call/phone/send', {
      bodySchema,
    }),
  ],
  enqueues: [],
} as const satisfies StepConfig

export const handler: Handlers<typeof config> = async ({ request }) => {
  const { contactId, userId, recordCall } = request.body as z.infer<typeof bodySchema>

  console.log('\n******\n')
  console.log('\n send route \n')
  console.log('\n******\n')

  try {
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

    return {
      status: 200,
      body: {
        status: 'bridging_initiated',
        provider: dispatchResult.activeProviderName,
        callUuid: dispatchResult.callUuid,
      },
    }
  } catch (error: any) {
    console.error('[Voice Bridge Gateway Failure]:', error)
    return {
      status: 500,
      body: {
        error: 'Failed to process internal phone link sequence request',
        details: error.message,
      },
    }
  }
}
