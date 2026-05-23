import { http, type Handlers, type StepConfig } from 'motia'
import { z } from 'zod'
import { ofetch } from 'ofetch'
import notion from '../../../../utils/notion'

const notionDbId = JSON.parse(import.meta.env.NOTION_DB_ID)
const apiBaseUrl = import.meta.env.INTERNAL_API_URL

const pathParamsSchema = z.object({ channel: z.string() })
const bodySchema = z.object({
  from: z.email(),
  to: z.string(),
  subject: z.string(),
  text: z.string().optional(),
  html: z.string().optional(),
})
const responseSuccessSchema = z.object({
  success: z.boolean(),
  interactionId: z.string(),
})

export const config = {
  name: 'IngestWebhookChannel',
  description: 'Universal ingestion gate for incoming communication channels',
  flows: ['webhook-pipeline-flow'],
  triggers: [
    http('POST', '/api/connect/text/email/receive', {
      pathParams: pathParamsSchema,
      bodySchema: bodySchema,
      responseSchema: {
        200: responseSuccessSchema,
      },
    }),
  ],
  enqueues: [],
} as const satisfies StepConfig

export const handler: Handlers<typeof config> = async ({ request }) => {
  const { channel } = request.pathParams as z.infer<typeof pathParamsSchema>
  const { from, to, subject, text, html } = request.body as z.infer<typeof bodySchema>

  if (channel !== 'email') {
    return {
      status: 400,
      body: { error: `Channel '${channel}' is not supported by this ingestion route.` },
    }
  }

  try {
    const nameMatch = from.match(/^"?(.*?)"?\s*<.+>$/)
    const fallbackName = from.split('@')[0]
    const pocPerson = nameMatch ? nameMatch[1] : fallbackName

    const { contactId } = await ofetch(`${apiBaseUrl}/api/contacts`, {
      method: 'PUT',
      body: {
        email: from.toLowerCase().trim(),
        brand: 'Unknown',
        company: 'Unknown',
        pocPerson,
        status: 'Communicate',
      },
    })

    const interactionPage = await notion.pages.create({
      parent: { data_source_id: notionDbId.interaction },
      properties: {
        'Interaction ID': {
          title: [{ text: { content: `email-${Date.now()}` } }],
        },
        Channel: {
          select: { name: 'email' },
        },
        Direction: {
          select: { name: 'inbound' },
        },
        Timestamp: {
          date: { start: new Date().toISOString() },
        },
        Summary: {
          rich_text: [{ text: { content: `Subject: ${subject}\n\n${text || 'HTML content only'}` } }],
        },
        Contact: {
          relation: [{ id: contactId }],
        },
      },
    })

    return {
      status: 200,
      body: {
        success: true,
        interactionId: interactionPage.id,
      },
    }
  } catch (error) {
    return {
      status: 500,
      body: {
        error: 'Webhook pipeline failed to process incoming email message',
        details: error.message,
      },
    }
  }
}
