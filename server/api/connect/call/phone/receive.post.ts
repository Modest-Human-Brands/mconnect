import { defineEventHandler, HTTPError, readBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import { loadConfig } from 'c12'
import notion from '~/server/utils/notion'
import { compileInboundResponse } from '~/server/utils/voice-providers'
import type { NotionDB } from '~/server/types'

const bodySchema = z.object({
  orgId: z.string(),
  to: z.string(),
  callUuid: z.string(),
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { orgId, to, callUuid } = body as z.infer<typeof bodySchema>

    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as unknown as NotionDB

    console.log('\n******\n')
    console.log('\n receive route \n')
    console.log('\n******\n')

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

    event.res.headers.set('Content-Type', compilation.contentType)
    return compilation.body
  } catch (error: any) {
    console.error('API connect/call/phone/receive POST', error)

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
