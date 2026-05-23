import { http, type Handlers, type StepConfig } from 'motia'
import { z } from 'zod'
import notion from '../../../../utils/notion'
import { templateRegistry } from '../../../../utils/template-registry-sms'
import dispatchSMS from '../../../../utils/sms-providers'

import '../../../../../templates/text/sms/InternshipCompletionCertificateV1'
import '../../../../../templates/text/sms/QuotationV1'

const notionDbId = JSON.parse(import.meta.env.NOTION_DB_ID)

const pathParamsSchema = z.object({ channel: z.literal('sms') })
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

type PathParams = z.infer<typeof pathParamsSchema>
type BodyPayload = z.infer<typeof bodySchema>

export const config = {
  name: 'SendSMSDispatcher',
  description: 'Self-contained outbound step driving abstracted vendor dispatch engines',
  flows: ['outbound-communication-flow'],
  triggers: [
    http('POST', '/api/text/sms/send', {
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
    const contactPage = (await notion.pages.retrieve({ page_id: body.contactId })) as any
    const recipientPhone = contactPage.properties?.Phone?.phone_number

    if (!recipientPhone) {
      return {
        status: 400,
        body: { error: `Contact page '${body.contactId}' does not contain a valid Phone number.` },
      }
    }

    let finalizedText = body.text || ''

    if (body.template !== 'none') {
      const templateDef = templateRegistry[body.template]
      if (!templateDef) {
        return {
          status: 400,
          body: { error: `SMS template layout '${body.template}' is not registered.` },
        }
      }

      const variables = 'variables' in body ? body.variables : {}
      const transformedProps = templateDef.transformPayload(variables)
      finalizedText = transformedProps.text || body.text || `Template compiled for: ${body.template}`
    }

    const dispatchResult = await dispatchSMS(recipientPhone, finalizedText)

    const interactionPage = await notion.pages.create({
      parent: { data_source_id: notionDbId.interaction },
      properties: {
        'Interaction ID': { title: [{ text: { content: `outbound-sms-${Date.now()}` } }] },
        Channel: { select: { name: 'sms' } },
        Direction: { select: { name: 'outbound' } },
        Timestamp: { date: { start: new Date().toISOString() } },
        Summary: {
          rich_text: [{ text: { content: `[Gateway: ${dispatchResult.activeProviderName.toUpperCase()}] ${finalizedText}` } }],
        },
        Contact: { relation: [{ id: body.contactId }] },
      },
    })

    return {
      status: 200,
      body: {
        success: true,
        interactionId: interactionPage.id,
        dispatchId: dispatchResult.providerMessageId,
      },
    }
  } catch (error: any) {
    console.error(`[SMS Step Engine Error]:`, error)
    return {
      status: 500,
      body: { error: 'Failed to process self-contained SMS pipeline', details: error.message },
    }
  }
}
