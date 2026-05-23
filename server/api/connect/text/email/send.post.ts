import { defineEventHandler, readBody, getRouterParams, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import { render } from '@vue-email/render'

import notion from '~/server/utils/notion'
import dispatchEmail from '~/server/utils/email-providers'
import { templateRegistry } from '~/server/utils/template-registry-email'

import '~/templates/text/email/InternshipCompletionCertificateV1'
import '~/templates/text/email/QuotationV1'
import type { NotionDB } from '~/server/types'

const pathParamsSchema = z.object({ channel: z.literal('mail') })
const basePayload = z.object({ contactId: z.string() })

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
  variables: z.record(z.any(), z.any()),
})

const bodySchema = z.union([
  basePayload.extend({ subject: z.string().min(1), displayName: z.string().optional() }).and(rawContent),
  basePayload.extend({ subject: z.string().optional(), displayName: z.string().optional() }).and(templatedContent),
])

type PathParams = z.infer<typeof pathParamsSchema>
type BodyPayload = z.infer<typeof bodySchema>

export default defineEventHandler(async (event) => {
  try {
    const pathParams = getRouterParams(event)
    const body = (await readBody(event)) as BodyPayload
    const { channel } = pathParams as PathParams

    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as unknown as NotionDB

    const contactPage = (await notion.pages.retrieve({ page_id: body.contactId })) as any
    const recipientEmail = contactPage.properties?.Email?.email

    if (!recipientEmail) {
      event.res.status = 400
      return { error: `Contact page '${body.contactId}' does not contain a valid Email address.` }
    }

    let finalizedText = body.text || ''
    let finalizedHtml = body.html || ''
    let activeSubject = 'subject' in body ? body.subject || '' : ''
    let attachments: any[] | undefined = undefined

    if (body.template !== 'none') {
      const templateDef = templateRegistry[body.template]
      if (!templateDef) {
        event.res.status = 400
        return { error: `Email template layout '${body.template}' is not registered.` }
      }

      const variables = 'variables' in body ? body.variables : {}
      const transformedProps = templateDef.transformPayload(variables)

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
      displayName: body.displayName,
      attachments,
    })

    await notion.pages.create({
      parent: { data_source_id: notionDbId.interaction },
      properties: {
        'Interaction ID': { title: [{ text: { content: `outbound-email-${Date.now()}` } }] },
        Channel: { select: { name: 'email' } },
        Direction: { select: { name: 'outbound' } },
        Timestamp: { date: { start: new Date().toISOString() } },
        Summary: {
          rich_text: [{ text: { content: `[Driver: ${dispatchResult.activeProviderName.toUpperCase()}] Subject: ${activeSubject}\n\n${finalizedText}` } }],
        },
        Contact: { relation: [{ id: body.contactId }] },
      },
    })

    event.res.status = 200
    return { success: true, dispatchId: dispatchResult.providerMessageId }
  } catch (error: any) {
    console.error('API connect/text/email/send POST', error)

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
