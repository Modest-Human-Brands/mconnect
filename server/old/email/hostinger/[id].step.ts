import { http, type Handlers, type StepConfig } from 'motia'
import { z } from 'zod'
import { ofetch } from 'ofetch'

interface HostingerSingleMetaResponse {
  message: {
    id: string
    uid: number
    path: string
    flags: string[]
    unseen: boolean
    size: number
    subject: string
    from: { name: string; address: string }
    replyTo?: { name: string; address: string }[]
    to?: { name: string; address: string }[]
    messageId: string
    hasAttachments: boolean
    attachments?: any[]
    text: {
      id: string
      encodedSize: { 'text/html'?: number; 'text/plain'?: number }
    }
    date: string
  }
  cached: boolean
}

interface HostingerSingleTextResponse {
  text: {
    plain: string
    html: string
    hasMore: boolean
  }
  cached: boolean
}

export const config = {
  name: 'GetEmail',
  description: 'Get a Email',
  flows: ['email-flow'],
  triggers: [
    http('GET', '/email/hostinger/:folder/:id', {
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
  const id = request.pathParams['id'] as string

  const encodedFolder = encodeURIComponent(folder)
  try {
    const [metaResponse, textResponse] = await Promise.all([
      ofetch<HostingerSingleMetaResponse>(`/mailboxes/${encodedFolder}/messages/${id}`, {
        method: 'GET',
        baseURL: `${import.meta.env.HOSTINGER_EMAIL_BASE_URL}/v1`,
        headers: { cookie: import.meta.env.HOSTINGER_EMAIL_COOKIE },
      }),
      ofetch<HostingerSingleTextResponse>(`/mailboxes/${encodedFolder}/messages/${id}/text`, {
        method: 'GET',
        baseURL: `${import.meta.env.HOSTINGER_EMAIL_BASE_URL}/v1`,
        headers: { cookie: import.meta.env.HOSTINGER_EMAIL_COOKIE },
      }),
    ])

    const msg = metaResponse.message
    const bodyText = textResponse.text

    return {
      status: 200,
      body: {
        id: msg.uid,
        messageId: msg.messageId,
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
          isAnswered: msg.flags?.includes('\\Answered') || false,
          rawFlags: msg.flags || [],
        },

        bodyMeta: {
          id: msg.text?.id || '',
          htmlSize: msg.text?.encodedSize?.['text/html'],
          plainSize: msg.text?.encodedSize?.['text/plain'],
        },

        htmlBody: bodyText?.html || null,
        plainBody: bodyText?.plain || null,

        attachments: (msg.attachments || []).map((att) => ({
          id: att.id,
          name: att.filename,
          type: att.contentType,
          size: att.encodedSize,
          isInline: att.inline || att.embedded || false,
          contentId: att.contentId,
        })),
      },
    }
  } catch (error) {
    console.error(`Failed to fetch email UID ${id} from ${folder}:`, error)
    return {
      status: 500,
      body: { error: 'Failed to communicate with Hostinger Bridge API.' },
    }
  }
}
