import { defineEventHandler, HTTPError, readValidatedBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import type { NotionDB } from '~/server/types'
import notion from '~/server/utils/notion'
import dispatchSMS from '~/server/utils/providers-sms'
import { templateRegistry } from '~/server/utils/template-registry-sms'

import '~/templates/text/sms'

const basePayload = z.object({ contactId: z.string() })

const rawContent = z.object({
  template: z.literal('none'),
  text: z.string().min(1),
  variables: z.undefined(),
})

const templatedContent = z.object({
  template: z.string().min(1),
  text: z.string().optional(),
  variables: z.record(z.any(), z.any()),
})

const bodySchema = z.union([basePayload.and(rawContent), basePayload.and(templatedContent)])

export default defineEventHandler(async (event) => {
  try {
    const body = await readValidatedBody(event, bodySchema)

    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as unknown as NotionDB

    const contactPage = (await notion.pages.retrieve({ page_id: body.contactId })) as any
    const recipientPhone = contactPage.properties?.Phone?.phone_number

    if (!recipientPhone) {
      event.res.status = 400
      return { error: `Contact page '${body.contactId}' does not contain a valid Phone number.` }
    }

    let finalizedText = body.text || ''

    if (body.template !== 'none') {
      const templateDef = templateRegistry[body.template]
      if (!templateDef) {
        event.res.status = 400
        return { error: `SMS template layout '${body.template}' is not registered.` }
      }

      const variables = 'variables' in body ? body.variables : {}
      const transformedProps = templateDef.transformPayload(variables)
      finalizedText = transformedProps.text || body.text || `Template compiled for: ${body.template}`
    }

    const dispatchResult = await dispatchSMS(recipientPhone, finalizedText)

    const interactionPage = await notion.pages.create({
      parent: { data_source_id: notionDbId.interaction },
      properties: {
        Id: { title: [{ text: { content: `outbound-sms-${Date.now()}` } }] },
        Channel: { select: { name: 'sms' } },
        Direction: { select: { name: 'outbound' } },
        Timestamp: { date: { start: new Date().toISOString() } },
        Summary: {
          rich_text: [{ text: { content: `[Gateway: ${dispatchResult.activeProviderName.toUpperCase()}] ${finalizedText}` } }],
        },
        Contact: { relation: [{ id: body.contactId }] },
      },
    })

    event.res.status = 200
    return {
      success: true,
      interactionId: interactionPage.id,
      dispatchId: dispatchResult.providerMessageId,
    }
  } catch (error: any) {
    console.error('API connect/text/sms/send POST', error)

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
