import { defineEventHandler, HTTPError, readValidatedBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import { render } from '@vue-email/render'

import notion from '~/server/utils/notion'
import dispatchEmail from '~/server/utils/providers-email'
import { templateRegistry } from '~/server/utils/template-registry-email'
import type { NotionContact, NotionDB } from '~/server/types'

import '~/templates/text/email'
import notionNormalizeId from '~/server/utils/notion-normalize-id'

const basePayload = z.object({ userId: z.string(), contactId: z.string().optional(), recipientEmail: z.string().email().optional() })

const rawContent = z.object({
  template: z.literal('none'),
  text: z.string().min(1),
  html: z.string().optional(),
  variables: z.undefined(),
})

const templatedContent = z.object({
  template: z.string().min(1),
  text: z.string().optional(),
  html: z.string().optional(),
  variables: z.record(z.string(), z.any()),
})

const bodySchema = z.union([
  basePayload.extend({ subject: z.string().min(1), displayName: z.string().optional() }).and(rawContent),
  basePayload.extend({ subject: z.string().optional(), displayName: z.string().optional() }).and(templatedContent),
])

export default defineEventHandler(async (event) => {
  try {
    const { userId, contactId, recipientEmail: bodyEmail, text, html, subject, template, variables, displayName } = await readValidatedBody(event, bodySchema)

    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as NotionDB

    let recipientEmail = bodyEmail
    if (!recipientEmail && contactId) {
      const contactPage = (await notion.pages.retrieve({ page_id: contactId })) as unknown as NotionContact
      recipientEmail = contactPage.properties.Email.email ?? undefined
    }

    if (!recipientEmail) throw new HTTPError({ statusCode: 400, statusMessage: 'Valid recipientEmail or contactId is required.' })

    let finalizedText = text || ''
    let finalizedHtml = html || ''
    let activeSubject = subject || ''
    let attachments: { filename: string; content: Buffer<ArrayBuffer>; contentType: string }[] | undefined = undefined

    if (template !== 'none') {
      const templateDef = templateRegistry[template]
      if (!templateDef) {
        event.res.status = 400
        return { error: `Email template layout '${template}' is not registered.` }
      }

      const transformedProps = templateDef.transformPayload(variables ?? {})

      finalizedHtml = await render(templateDef.component, transformedProps, {
        pretty: false,
      })
      finalizedText = await render(templateDef.component, transformedProps, {
        plainText: true,
      })

      if (!activeSubject) {
        const potentialSubject = templateDef.subject
        activeSubject = typeof potentialSubject === 'function' ? potentialSubject(variables) : potentialSubject || 'System Notification'
      }

      if (templateDef.getAttachments) {
        attachments = await templateDef.getAttachments(variables)
      }
    }

    const dispatchResult = await dispatchEmail({
      to: recipientEmail,
      subject: activeSubject,
      text: finalizedText,
      html: finalizedHtml,
      displayName: displayName,
      attachments,
    })

    await notion.pages.create({
      parent: { data_source_id: notionDbId.email },
      properties: {
        Subject: {
          title: [{ text: { content: activeSubject || 'No Subject' } }],
        },
        'Body Snippet': {
          rich_text: [{ text: { content: finalizedText.slice(0, 2000) } }],
        },
        Status: {
          select: { name: 'SENT' },
        },
        'Sent At': {
          date: { start: new Date().toISOString() },
        },
        ...(userId ? { User: { relation: [{ id: notionNormalizeId(userId) }] } } : {}),
        ...(contactId ? { Contact: { relation: [{ id: notionNormalizeId(contactId) }] } } : {}),
      },
    })

    return { success: true, dispatchId: dispatchResult.providerMessageId }
  } catch (error: any) {
    console.error('API connect/text/email/send POST', JSON.stringify(error, null, 2))

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Failed to dispatch and log email.',
    })
  }
})
