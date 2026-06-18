import { defineEventHandler, HTTPError, readValidatedBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import type { NotionContact, NotionDB, NotionOrganization } from '~/server/types'
import notion from '~/server/utils/notion'
import notionTextStringify from '~/server/utils/notion-text-stringify'

import dispatchWhatsApp, { type WhatsAppPayload } from '~/server/utils/providers-whatsapp'
import { templateRegistry } from '~/server/utils/template-registry-whatsapp'

import '~/templates/text/whatsapp'

const basePayload = z.object({ userId: z.string(), contactId: z.string(), orgId: z.string() })

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
    const { contactId, userId, template, text, variables, orgId } = await readValidatedBody(event, bodySchema)

    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as NotionDB

    const contactPage = (await notion.pages.retrieve({ page_id: contactId })) as unknown as NotionContact
    const recipientPhone = contactPage.properties?.['Phone']?.phone_number

    if (!recipientPhone) {
      throw new HTTPError({ statusCode: 400, statusMessage: `Contact page '${contactId}' does not contain a valid Phone number.` })
    }

    const finalizedPayload: Omit<WhatsAppPayload, 'settings'> = { to: recipientPhone }
    let contentBody = ''
    let msgType = 'TEXT'

    if (template === 'none') {
      finalizedPayload.type = 'text'
      finalizedPayload.text = text
      contentBody = text || ''
    } else {
      const templateDef = templateRegistry[template]
      if (!templateDef) {
        throw new HTTPError({ statusCode: 400, statusMessage: `WhatsApp template '${template}' is not registered.` })
      }

      const templateData = templateDef.transformPayload(variables) as any
      finalizedPayload.type = 'template'
      Object.assign(finalizedPayload, templateData)

      contentBody = templateData.body || `Template compiled for: ${template}`
      if (templateData.header?.type) msgType = templateData.header.type.toUpperCase()
    }

    const orgPage = (await notion.pages.retrieve({ page_id: orgId })) as unknown as NotionOrganization

    const dispatchResult = await dispatchWhatsApp(finalizedPayload, notionTextStringify(orgPage.properties.Id.rich_text)!)

    const messagePage = await notion.pages.create({
      parent: { data_source_id: notionDbId.message },
      properties: {
        Title: {
          title: [{ text: { content: contentBody.slice(0, 50) + (contentBody.length > 50 ? '...' : '') } }],
        },
        Content: {
          rich_text: [{ text: { content: contentBody.slice(0, 2000) } }],
        },
        Type: {
          select: { name: msgType === 'IMAGE' || msgType === 'VIDEO' || msgType === 'AUDIO' ? msgType : 'TEXT' },
        },
        Status: {
          status: { name: 'Sent' },
        },
        Direction: {
          select: { name: 'Outbound' },
        },
        Channel: {
          select: { name: 'WhatsApp' }, // Adjust based on your specific route
        },
        Timestamp: {
          date: { start: new Date().toISOString() },
        },
        ...(userId ? { User: { relation: [{ id: userId }] } } : {}),
        ...(contactId ? { Contact: { relation: [{ id: contactId }] } } : {}),
      },
    })

    return {
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
