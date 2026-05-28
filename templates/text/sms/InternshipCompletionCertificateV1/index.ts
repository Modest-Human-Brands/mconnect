import { z } from 'zod'
import registerSMSTemplate from '~/server/utils/template-registry-sms'

export const internshipCompletionSMSSchema = z.object({
  recipientName: z.string(),
  recipientRole: z.string(),
  certificateUrl: z.string(),
  organization: z
    .object({
      name: z.string(),
    })
    .optional(),
})

export type InternshipCompletionSMSPayload = z.infer<typeof internshipCompletionSMSSchema>

const placeholders: InternshipCompletionSMSPayload = {
  recipientName: 'Alex Mercer',
  recipientRole: 'Senior Marketing Intern',
  certificateUrl: 'https://modesthumanbrands.com/cert/12345',
  organization: {
    name: 'Modest Human Brands',
  },
}

registerSMSTemplate({
  id: 'internship-completion-certificate',
  schema: internshipCompletionSMSSchema,
  placeholders,

  transformPayload: (data: any) => {
    const p = placeholders
    const orgName = data?.organization?.name || p.organization?.name
    const recipient = data?.recipientName || p.recipientName
    const role = data?.recipientRole || p.recipientRole
    const url = data?.certificateUrl || p.certificateUrl

    const messageBody = `Hi ${recipient}, your official certificate of completion for your tenure as our ${role} at ${orgName} is ready! Download your verified PDF document here: ${url}`

    return {
      text: messageBody,
      metadata: {
        charCount: messageBody.length,
        recipientName: recipient,
        organizationName: orgName,
      },
    }
  },
})
