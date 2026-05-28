import { defineEventHandler, HTTPError, readValidatedBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import type { NotionDB } from '~/server/types'
import notion from '~/server/utils/notion'

import dispatchWhatsApp from '~/server/utils/providers-whatsapp'
import { templateRegistry } from '~/server/utils/template-registry-whatsapp'

import '~/templates/text/whatsapp'

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
      throw new HTTPError({ statusCode: 400, statusMessage: `Contact page '${body.contactId}' does not contain a valid Phone number.` })
    }

    const finalizedPayload: any = { to: recipientPhone }
    let summaryText = ''

    if (body.template === 'none') {
      finalizedPayload.type = 'text'
      finalizedPayload.text = body.text
      summaryText = body.text || ''
    } else {
      const templateDef = templateRegistry[body.template]
      if (!templateDef) {
        throw new HTTPError({ statusCode: 400, statusMessage: `WhatsApp template '${body.template}' is not registered.` })
      }

      const variables = 'variables' in body ? body.variables : {}

      const templateData = templateDef.transformPayload(variables)
      finalizedPayload.type = 'template'
      Object.assign(finalizedPayload, templateData) // Ensure transformPayload maps to templateId, templateLanguage, etc.

      summaryText = templateData.text || templateData.templateId || `Template compiled for: ${body.template}`
    }

    console.log({ finalizedPayload })
    const dispatchResult = await dispatchWhatsApp(finalizedPayload)

    const interactionPage = await notion.pages.create({
      parent: { data_source_id: notionDbId.interaction },
      properties: {
        'Interaction ID': { title: [{ text: { content: `outbound-whatsapp-${Date.now()}` } }] },
        Channel: { select: { name: 'whatsapp' } },
        Direction: { select: { name: 'outbound' } },
        Timestamp: { date: { start: new Date().toISOString() } },
        Summary: {
          rich_text: [{ text: { content: `[Gateway: ${dispatchResult.activeProviderName?.toUpperCase() || 'WABA'}] ${summaryText}` } }],
        },
        Contact: { relation: [{ id: body.contactId }] },
      },
    })

    return {
      success: true,
      interactionId: interactionPage.id,
      dispatchId: dispatchResult.providerMessageId,
    }
  } catch (error: any) {
    console.error('API connect/text/whatsapp/send POST', error)

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Failed to dispatch WhatsApp message.',
    })
  }
})
