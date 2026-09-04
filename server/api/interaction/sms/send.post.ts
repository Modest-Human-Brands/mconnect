import { defineEventHandler, HTTPError, readValidatedBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import type { NotionContact, NotionDB, NotionOrganization } from '~/server/types'
import notion from '#server/utils/notion.ts'
import notionTextStringify from '#server/utils/notion-text-stringify.ts'
import dispatchSMS from '#server/utils/providers-sms.ts'
import { templateRegistry } from '#server/utils/template-registry-sms.ts'

import '#templates/text/sms/index.ts'

const basePayload = z.object({ userId: z.string(), contactId: z.string().optional(), recipientPhone: z.string().optional(), orgId: z.string() })

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
    const { recipientPhone, userId, contactId, text, template, variables, orgId } = await readValidatedBody(event, bodySchema)

    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as NotionDB

    let finalizedPhone = recipientPhone
    if (!recipientPhone && contactId) {
      const contactPage = (await notion.pages.retrieve({ page_id: contactId })) as unknown as NotionContact
      finalizedPhone = contactPage.properties.Phone.phone_number ?? undefined
    }

    if (!recipientPhone) throw new HTTPError({ statusCode: 400, statusMessage: 'Valid recipientPhone or contactId is required.' })

    let finalizedText = text || ''

    if (template !== 'none') {
      const templateDef = templateRegistry[template]
      if (!templateDef) {
        throw new HTTPError({ statusCode: 400, statusMessage: `SMS template layout '${template}' is not registered.` })
      }

      const transformedProps = templateDef.transformPayload(variables)
      finalizedText = transformedProps.text || text || `Template compiled for: ${template}`
    }

    const orgPage = (await notion.pages.retrieve({ page_id: orgId })) as unknown as NotionOrganization

    const dispatchResult = await dispatchSMS(recipientPhone, finalizedText, notionTextStringify(orgPage.properties.Id.rich_text)!)

    const messagePage = await notion.pages.create({
      parent: { data_source_id: notionDbId.message },
      properties: {
        Title: {
          title: [{ text: { content: finalizedText.slice(0, 50) + (finalizedText.length > 50 ? '...' : '') } }],
        },
        Content: {
          rich_text: [{ text: { content: finalizedText.slice(0, 2000) } }],
        },
        Type: {
          select: { name: 'TEXT' },
        },
        Status: {
          status: { name: 'Sent' },
        },
        Direction: {
          select: { name: 'Outbound' },
        },
        Channel: {
          select: { name: 'SMS' },
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
