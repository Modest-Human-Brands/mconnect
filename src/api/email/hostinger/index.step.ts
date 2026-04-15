import { http, type Handlers, type StepConfig } from 'motia'
import { ofetch } from 'ofetch'
import { HostingerEmailSchema } from 'src/utils/email'
import { z } from 'zod'

export const config = {
  name: 'ListEmails',
  description: 'Get all Emails',
  flows: ['email-list-flow'],
  triggers: [
    http('GET', '/email/hostinger/:folder', {
      queryParams: [
        { name: 'page', description: 'page number' },
        { name: 'size', description: 'page size' },
      ],
      responseSchema: {
        200: z.object({
          status: z.string(),
        }),
      },
    }),
  ],
  enqueues: [],
} as const satisfies StepConfig

export const handler: Handlers<typeof config> = async ({ request }) => {
  const folder = request.pathParams['folder'] || 'INBOX'
  const page = Number.parseInt((request.queryParams['page'] as string) || '1', 10)
  const pageSize = Number.parseInt((request.queryParams['size'] as string) || '50', 10)

  const endpoint = `/mailboxes/${encodeURIComponent(folder)}/messages`

  try {
    const response = await ofetch<HostingerEmailSchema>(endpoint, {
      method: 'GET',
      baseURL: `${import.meta.env.HOSTINGER_EMAIL_BASE_URL}/v1`,
      query: {
        page,
        pageSize,
      },
      headers: {
        cookie: import.meta.env.HOSTINGER_EMAIL_COOKIE,
      },
    })

    return {
      status: 200,
      body: {
        meta: {
          page: response.page,
          totalPages: response.pages,
          totalMessages: response.total,
          isCached: response.cached,
        },
        messages: response.messages.map((msg) => ({
          id: msg.id,
          messageId: msg.messageId,
          uid: msg.uid,
          folder: msg.path,
          timestamp: msg.date,
          subject: msg.subject,
          size: msg.size,

          sender: {
            name: msg.from.name,
            email: msg.from.address,
          },

          to: (msg.to || []).map((contact) => ({
            name: contact.name,
            email: contact.address,
          })),

          replyTo: (msg.replyTo || []).map((contact) => ({
            name: contact.name,
            email: contact.address,
          })),

          status: {
            isRead: !msg.unseen,
            isAnswered: msg.flags?.includes('\\Answered'),
            rawFlags: msg.flags || [],
          },
          bodyMeta: {
            id: msg.text?.id || '',
            htmlSize: msg.text?.encodedSize?.['text/html'],
            plainSize: msg.text?.encodedSize?.['text/plain'],
          },

          attachments: (msg.attachments || []).map((att) => ({
            id: att.id,
            name: att.filename,
            type: att.contentType,
            size: att.encodedSize,
            isInline: att.inline || att.embedded || false,
            contentId: att.contentId,
          })),
        })),
      },
    }
  } catch (error) {
    console.error(`Failed to fetch email from ${folder}:`, error)
    return {
      status: 500,
      body: { error: 'Failed to communicate with Hostinger Bridge API.' },
    }
  }
}
