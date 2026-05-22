import { http, type Handlers, type StepConfig } from 'motia'
import { z } from 'zod'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import notion from '../../../../utils/notion'
import { templateRegistry } from '../../../../utils/template-registry-email'
import { dispatchEmail } from '../../../../utils/email-providers'

import '../../../../../templates/text/email/InternshipCompletionCertificateV1'
import '../../../../../templates/text/email/QuotationV1'

const notionDbId = JSON.parse(import.meta.env.NOTION_DB_ID)

const pathParamsSchema = z.object({ channel: z.literal('mail') })
const basePayload = z.object({ clientId: z.string() })

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
  variables: z.record(z.any()),
})

const bodySchema = z.union([
  basePayload.extend({ subject: z.string().min(1), displayName: z.string().optional() }).and(rawContent),
  basePayload.extend({ subject: z.string().optional(), displayName: z.string().optional() }).and(templatedContent),
])

type PathParams = z.infer<typeof pathParamsSchema>
type BodyPayload = z.infer<typeof bodySchema>

export const config = {
  name: 'SendMailDispatcher',
  description: 'Self-contained outbound mail dispatcher consuming decoupled pre-compiled template hooks',
  flows: ['outbound-communication-flow'],
  triggers: [
    http('POST', '/api/text/email/send', {
      pathParams: pathParamsSchema,
      bodySchema,
    }),
  ],
  enqueues: [],
} as const satisfies StepConfig

export const handler: Handlers<typeof config> = async ({ request }) => {
  const { channel } = request.pathParams as PathParams
  const body = request.body as BodyPayload

  try {
    const contactPage = (await notion.pages.retrieve({ page_id: body.clientId })) as any
    const recipientEmail = contactPage.properties?.Email?.email

    if (!recipientEmail) {
      return {
        status: 400,
        body: { error: `Contact page '${body.clientId}' does not contain a valid Email address.` },
      }
    }

    let finalizedText = body.text || ''
    let finalizedHtml = body.html || ''
    let activeSubject = 'subject' in body ? body.subject || '' : ''
    let attachments: any[] | undefined = undefined

    if (body.template !== 'none') {
      const templateDef = templateRegistry[body.template]
      if (!templateDef) {
        return {
          status: 400,
          body: { error: `Email template layout '${body.template}' is not registered.` },
        }
      }

      const variables = 'variables' in body ? body.variables : {}
      const transformedProps = templateDef.transformPayload(variables)

      const appInstance = createSSRApp({
        render() {
          return h(templateDef.component, transformedProps)
        },
      })

      finalizedHtml = await renderToString(appInstance)
      finalizedText = `Template payload compiled for: ${body.template}`

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
        Contact: { relation: [{ id: body.clientId }] },
      },
    })

    return {
      status: 200,
      body: { success: true, dispatchId: dispatchResult.providerMessageId },
    }
  } catch (error: any) {
    console.error(`[Mail Step Engine Error]:`, error)
    return {
      status: 500,
      body: { error: 'Failed to process self-contained mail pipeline', details: error.message },
    }
  }
}
