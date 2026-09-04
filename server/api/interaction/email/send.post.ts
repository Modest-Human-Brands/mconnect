import { defineEventHandler, HTTPError, readValidatedBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import { render } from '@vue-email/render'

import notion from '#server/utils/notion.ts'
import dispatchEmail from '#server/utils/providers-email.ts'
import { templateRegistry } from '#server/utils/template-registry-email.ts'
import type { NotionContact, NotionDB, NotionOrganization } from '~/server/types'

import '#templates/text/email/index.ts'
import notionNormalizeId from '#server/utils/notion-normalize-id.ts'
import notionTextStringify from '#server/utils/notion-text-stringify.ts'

const basePayload = z.object({
  userId: z.string().optional(),
  contactId: z.string().optional(),
  recipientEmail: z.email().optional(),
  orgId: z.string(),
})

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

function isUuid(text: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)
}

export default defineEventHandler(async (event) => {
  try {
    const { userId, contactId, recipientEmail: bodyEmail, text, html, subject, template, variables, displayName, orgId } = await readValidatedBody(event, bodySchema)

    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as NotionDB

    let recipientEmail = bodyEmail
    if (!recipientEmail && contactId) {
      const contactPage = (await notion.pages.retrieve({ page_id: contactId })) as unknown as NotionContact
      recipientEmail = contactPage.properties.Email.email ?? undefined
    }

    if (!recipientEmail) {
      throw new HTTPError({ statusCode: 400, statusMessage: 'Valid recipientEmail or contactId is required.' })
    }

    let orgSlug = orgId
    if (isUuid(orgId)) {
      const orgPage = (await notion.pages.retrieve({ page_id: orgId })) as unknown as NotionOrganization
      orgSlug = notionTextStringify(orgPage.properties.Id.rich_text) || orgId
    }

    let activeSubject = subject || ''
    if (template !== 'none') {
      const templateDef = templateRegistry[template]
      if (!templateDef) {
        throw new HTTPError({ statusCode: 400, statusMessage: `Email template layout '${template}' is not registered.` })
      }
      if (!activeSubject) {
        const potentialSubject = templateDef.subject
        activeSubject = typeof potentialSubject === 'function' ? potentialSubject(variables) : potentialSubject || 'System Notification'
      }
    }

    // 1. Create Notion record upfront as Draft to acquire permanent Notion Page ID
    const emailPage = await notion.pages.create({
      parent: { data_source_id: notionDbId.email },
      properties: {
        Title: {
          title: [{ text: { content: activeSubject || 'Outbound Email' } }],
        },
        Status: {
          status: { name: 'Draft' },
        },
        Direction: {
          select: { name: 'Outbound' },
        },
        Timestamp: {
          date: { start: new Date().toISOString() },
        },
        ...(userId ? { User: { relation: [{ id: notionNormalizeId(userId) }] } } : {}),
        ...(contactId ? { Contact: { relation: [{ id: notionNormalizeId(contactId) }] } } : {}),
      },
    })
    const emailId = emailPage.id

    let finalizedText = text || ''
    let finalizedHtml = html || ''
    let attachments: { filename: string; content: Buffer<ArrayBuffer>; contentType: string }[] | undefined = undefined

    // 2. Render templates using the acquired emailId
    if (template !== 'none') {
      const templateDef = templateRegistry[template]
      const trackingPayload = {
        ...variables?.tracking,
        emailId,
        baseUrl: config.public.connectUrl,
      }
      const templatePayload = {
        ...variables,
        tracking: trackingPayload,
      }

      const transformedProps = templateDef.transformPayload(templatePayload)

      finalizedHtml = await render(templateDef.component, transformedProps, {
        pretty: false,
      })
      finalizedText = await render(templateDef.component, transformedProps, {
        plainText: true,
      })

      if (templateDef.getAttachments) {
        attachments = await templateDef.getAttachments(templatePayload)
      }
    }

    try {
      // 3. Dispatch the email with tracking links pointing to emailId
      const dispatchResult = await dispatchEmail(
        {
          to: recipientEmail,
          subject: activeSubject,
          text: finalizedText,
          html: finalizedHtml,
          displayName: displayName,
          attachments,
        },
        orgSlug
      )

      // 4. Promote Notion page from Draft to Sent and append rendered HTML
      await notion.pages.update({
        page_id: emailId,
        properties: {
          Title: {
            title: [{ text: { content: activeSubject || 'No Subject' } }],
          },
          Content: {
            rich_text: [{ text: { content: finalizedText.slice(0, 2000) } }],
          },
          Status: {
            status: { name: 'Sent' },
          },
        },
      })

      if (finalizedHtml) {
        await notion.blocks.children.append({
          block_id: emailId,
          children: [
            {
              object: 'block',
              type: 'code',
              code: {
                language: 'html',
                rich_text: (finalizedHtml.match(/[\s\S]{1,2000}/g) || []).slice(0, 100).map((chunk) => ({ text: { content: chunk } })),
              },
            },
          ],
        })
      }

      return { success: true, dispatchId: dispatchResult.providerMessageId, emailId }
    } catch (dispatchError) {
      // 5. Flip status to Failed on dispatch failure
      await notion.pages.update({
        page_id: emailId,
        properties: {
          Status: {
            status: { name: 'Failed' },
          },
        },
      })
      throw dispatchError
    }
  } catch (error: any) {
    console.error('API connect/text/email/send POST', error)

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Failed to dispatch and log email.',
    })
  }
})
