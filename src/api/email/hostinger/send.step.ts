import { http, type Handlers, type StepConfig } from 'motia'
import { z } from 'zod'
import path from 'node:path'
import fs from 'node:fs/promises'
import { render } from '@maizzle/framework'
import { ofetch } from 'ofetch'

const TEMPLATES = { otp: { subject: 'OTP Request for Login', template: await fs.readFile(path.join(process.cwd(), '/email/templates/otp.vue'), 'utf8') } }

interface HostingerSendResponseSchema {
  messageId: string
  queueId: string
  response: string
  sendAt: string
}

function injectProps(rawTemplate: string, props: Record<string, string>) {
  return rawTemplate.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return props[key] === undefined ? match : props[key]
  })
}

export const config = {
  name: 'SendEmail',
  description: 'Render an email template and send it via Hostinger',
  flows: ['email-send-flow'],
  triggers: [
    http('POST', '/email/hostinger/send', {
      bodySchema: z.object({
        from: z.email(),
        displayName: z.string(),
        to: z.array(z.email()),
        subject: z.string(),
        template: z.enum(['otp']),
        data: z.record(z.string(), z.string()),
      }),
      responseSchema: {
        200: z.object({
          success: z.boolean(),
          messageId: z.string().optional(),
          status: z.string(),
        }),
        500: z.object({
          success: z.boolean(),
          error: z.string(),
        }),
      },
    }),
  ],
  enqueues: [],
} as const satisfies StepConfig

export const handler: Handlers<typeof config> = async ({ request }) => {
  const { from, displayName, to, template: templateName, data } = request.body

  try {
    const selectedTemplate = TEMPLATES[templateName]
    const template = injectProps(selectedTemplate.template, data)
    const { html } = await render(template)

    const hostingerResponse = await ofetch<HostingerSendResponseSchema>('/send', {
      baseURL: `${import.meta.env.HOSTINGER_EMAIL_BASE_URL}/v2`,
      method: 'POST',
      headers: {
        cookie: import.meta.env.HOSTINGER_EMAIL_COOKIE,
      },
      body: {
        from,
        displayName,
        to: to,
        subject: selectedTemplate.subject,
        html: html,
        attachments: [],
        trackingEnabled: false,
      },
    })

    return {
      status: 200,
      body: {
        success: true,
        messageId: hostingerResponse.messageId,
        status: hostingerResponse.response,
      },
    }
  } catch (error: any) {
    console.error('Email sending failed:', error)

    return {
      status: 500,
      body: error.message || 'Failed to communicate with Hostinger Bridge API',
    }
  }
}
