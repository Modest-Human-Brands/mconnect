import { defineEventHandler, HTTPError, readValidatedBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import type { NotionContact, NotionDB } from '~/server/types'
import notion from '~/server/utils/notion'

import dispatchWhatsApp, { type WhatsAppPayload } from '~/server/utils/providers-whatsapp'
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
    const notionDbId = JSON.parse(config.private.notionDbId) as NotionDB

    const contactPage = (await notion.pages.retrieve({ page_id: body.contactId })) as unknown as NotionContact
    const recipientPhone = contactPage.properties?.['Phone']?.phone_number

    if (!recipientPhone) {
      throw new HTTPError({ statusCode: 400, statusMessage: `Contact page '${body.contactId}' does not contain a valid Phone number.` })
    }

    const finalizedPayload: Omit<WhatsAppPayload, 'settings'> = { to: recipientPhone }
    let contentBody = ''
    let msgType = 'TEXT'

    if (body.template === 'none') {
      finalizedPayload.type = 'text'
      finalizedPayload.text = body.text
      contentBody = body.text || ''
    } else {
      const templateDef = templateRegistry[body.template]
      if (!templateDef) {
        throw new HTTPError({ statusCode: 400, statusMessage: `WhatsApp template '${body.template}' is not registered.` })
      }

      const variables = 'variables' in body ? body.variables : {}

      const templateData = templateDef.transformPayload(variables) as any
      finalizedPayload.type = 'template'
      Object.assign(finalizedPayload, templateData)

      contentBody = templateData.body || `Template compiled for: ${body.template}`
      if (templateData.header?.type) msgType = templateData.header.type.toUpperCase()
    }

    const dispatchResult = await dispatchWhatsApp(finalizedPayload)

    // Save outbound transaction natively into DATABASE 3: MESSAGES
    const messagePage = await notion.pages.create({
      parent: { data_source_id: notionDbId.message },
      properties: {
        'Message Summary': {
          title: [{ text: { content: contentBody.slice(0, 50) + (contentBody.length > 50 ? '...' : '') } }],
        },
        Content: {
          rich_text: [{ text: { content: contentBody.slice(0, 2000) } }],
        },
        Type: {
          select: { name: msgType === 'IMAGE' || msgType === 'VIDEO' || msgType === 'AUDIO' ? msgType : 'TEXT' },
        },
        'Delivery Status': {
          select: { name: 'SENT' },
        },
        'Sent At': {
          date: { start: new Date().toISOString() },
        },
        Contact: {
          relation: [{ id: body.contactId }],
        },
      },
    })

    return {
      success: true,
      interactionId: messagePage.id,
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
