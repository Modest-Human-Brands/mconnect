import { http, type Handlers, type StepConfig } from 'motia'
import { z } from 'zod'
import { render } from '@vue-email/render'
import { ofetch } from 'ofetch'

import { InternshipCertificate } from '../../../../email/templates/InternshipCertificate'

const TEMPLATES = {
  otp: {
    subject: 'OTP Request for Login',
    template: InternshipCertificate,
  },
  'internship-completion': {
    subject: 'Internship completion certificate',
    template: InternshipCertificate,
  },
}

export const config = {
  name: 'SendEmail',
  description: 'Render and send branded emails via Hostinger Bridge',
  flows: ['email-send-flow'],
  triggers: [
    http('POST', '/email/hostinger/send', {
      bodySchema: z.object({
        from: z.email(),
        displayName: z.string(),
        to: z.array(z.email()),
        subject: z.string().optional(),
        template: z.enum(['otp', 'internship-completion']),
        data: z.record(z.string(), z.any()),
      }),
    }),
  ],
} as const satisfies StepConfig

export const handler: Handlers<typeof config> = async ({ request }) => {
  const { from, displayName, to, template: templateName, data, subject } = request.body

  try {
    const selected = TEMPLATES[templateName]

    const templateProps = {
      ...data,
      organization: typeof data.organization === 'string' ? JSON.parse(data.organization) : data.organization,
    }

    const html = await render(selected.template, templateProps)

    const response = await ofetch('/send', {
      baseURL: `${import.meta.env.HOSTINGER_EMAIL_BASE_URL}/v2`,
      method: 'POST',
      headers: {
        cookie: import.meta.env.HOSTINGER_EMAIL_COOKIE,
      },
      body: {
        from,
        displayName,
        to,
        subject: subject || selected.subject,
        html,
        attachments: [],
        trackingEnabled: false,
      },
    })

    return {
      status: 200,
      body: {
        success: true,
        messageId: response.messageId,
        status: response.response,
      },
    }
  } catch (error: any) {
    console.error('[Motia SendEmail Error]:', error)
    return {
      status: 500,
      body: { success: false, error: error.message },
    }
  }
}
