import { http, type Handlers, type StepConfig } from 'motia'
import { z } from 'zod'
import { loadConfig } from 'c12'
import notion from '../../../../utils/notion'
import { compileInboundResponse } from '../../../../utils/voice-providers'

const notionDbId = JSON.parse(import.meta.env.NOTION_DB_ID)

const bodySchema = z.object({
  orgId: z.string(),
  to: z.string(),
  callUuid: z.string(),
})

export const config = {
  name: 'VoiceInboundReceiveRoute',
  description: 'Dynamically routes inbound calls to the highest-priority sales agent with a completely decoupled layout strategy',
  flows: ['voice-routing-flow'],
  triggers: [
    http('POST', '/api/connect/call/phone/receive', {
      bodySchema,
    }),
  ],
  enqueues: [],
} as const satisfies StepConfig

export const handler: Handlers<typeof config> = async ({ request }) => {
  const { orgId, to, callUuid } = request.body as z.infer<typeof bodySchema>

  console.log('\n******\n')
  console.log('\n receive route \n')
  console.log('\n******\n')

  try {
    const { config: messagingConfig } = await loadConfig({
      configFile: '../config/messaging.config.yaml',
    })

    const voiceSettings = messagingConfig?.voiceConfig
    const defaultForwardingNumber = voiceSettings?.defaultForwardingNumber || '+910000000000'

    if (!orgId) {
      console.warn(`[Voice Engine]: No registered organization found matching dialed number: ${to}`)
    }

    const agentLookup = await notion.dataSources.query({
      data_source_id: notionDbId.user,
      filter: {
        and: [
          {
            property: 'Role',
            select: { equals: 'Sales' },
          },
          {
            property: 'Status',
            select: { equals: 'Filled' },
          },
          ...(orgId
            ? [
                {
                  property: 'Organization',
                  relation: { contains: orgId },
                },
              ]
            : []),
        ],
      },
      sorts: [
        {
          property: 'Prority',
          direction: 'ascending',
        },
      ],
    })

    const topAgentPage = agentLookup.results[0] as any

    const targetAgentPhone = topAgentPage?.properties?.Phone?.phone_number || topAgentPage?.properties?.Phone?.phone || defaultForwardingNumber

    console.log(`[Voice Engine]: Routing call ${callUuid} to Agent: ${topAgentPage?.properties?.Name?.title[0]?.text?.content || 'Fallback'} (${targetAgentPhone})`)

    const compilation = await compileInboundResponse({
      targetAgentPhone,
      holdMusic: voiceSettings?.holdMusic,
    })

    return {
      status: 200,
      headers: { 'Content-Type': compilation.contentType },
      body: compilation.body,
    }
  } catch (error: any) {
    console.error('[Voice Inbound Engine Error]:', error)

    return {
      status: 500,
      body: 'Internal Voice Server Configuration Error Execution Failure',
    }
  }
}
