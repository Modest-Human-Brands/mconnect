import { defineEventHandler, HTTPError, readValidatedBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import type { NotionContact, NotionDB } from '~/server/types'
import notion from '~/server/utils/notion'
import dispatchSMS from '~/server/utils/providers-sms'
import { templateRegistry } from '~/server/utils/template-registry-sms'

import '~/templates/text/sms'

const basePayload = z.object({ userId: z.string(), contactId: z.string().optional(), recipientPhone: z.string().optional() })

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

    let recipientPhone = body.recipientPhone
    if (!recipientPhone && body.contactId) {
      const contactPage = (await notion.pages.retrieve({ page_id: body.contactId })) as unknown as NotionContact
      recipientPhone = contactPage.properties.Phone.phone_number ?? undefined
    }

    if (!recipientPhone) throw new HTTPError({ statusCode: 400, statusMessage: 'Valid recipientPhone or contactId is required.' })

    let finalizedText = body.text || ''

    if (body.template !== 'none') {
      const templateDef = templateRegistry[body.template]
      if (!templateDef) {
        throw new HTTPError({ statusCode: 400, statusMessage: `SMS template layout '${body.template}' is not registered.` })
      }

      const variables = 'variables' in body ? body.variables : {}
      const transformedProps = templateDef.transformPayload(variables)
      finalizedText = transformedProps.text || body.text || `Template compiled for: ${body.template}`
    }

    const dispatchResult = await dispatchSMS(recipientPhone, finalizedText)

    const messagePage = await notion.pages.create({
      parent: { data_source_id: notionDbId.message },
      properties: {
        'Message Summary': {
          title: [{ text: { content: finalizedText.slice(0, 50) + (finalizedText.length > 50 ? '...' : '') } }],
        },
        Content: {
          rich_text: [{ text: { content: finalizedText.slice(0, 2000) } }],
        },
        Type: {
          select: { name: 'TEXT' },
        },
        'Delivery Status': {
          select: { name: 'SENT' },
        },
        'Sent At': {
          date: { start: new Date().toISOString() },
        },
        ...(body.userId ? { User: { relation: [{ id: body.userId }] } } : {}),
        ...(body.contactId ? { Contact: { relation: [{ id: body.contactId }] } } : {}),
      },
    })

    return {
      success: true,
      interactionId: messagePage.id,
      dispatchId: dispatchResult.providerMessageId,
    }
  } catch (error: any) {
    console.error('API connect/text/sms/send POST', error)

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Failed to dispatch and log SMS.',
    })
  }
})
