import { ofetch } from 'ofetch'
import { z } from 'zod'
import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry-email'

export const internshipCompletionCertificateSchema = z.object({
  recipientName: z.string(),
  recipientRole: z.string(),
  scopeOfWork: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  dataOfIssue: z.string(),
  signerName: z.string(),
  signerTitle: z.string(),
  certificateUrl: z.string(),
  organization: z.object({
    id: z.string(),
    name: z.string(),
    website: z.string(),
    branding: z.object({
      logo: z.string(),
      color: z.object({
        primary: z.string(),
        accent: z.string(),
      }),
      font: z.string(),
    }),
    socials: z.record(z.any(), z.any()).optional(),
  }),
})

export type InternshipCompletionCertificatePayload = z.infer<typeof internshipCompletionCertificateSchema>

const placeholders: InternshipCompletionCertificatePayload = {
  recipientName: 'Alex Mercer',
  recipientRole: 'Senior Marketing Intern',
  scopeOfWork: 'Digital Campaign Management',
  startDate: 'June 1, 2025',
  endDate: 'December 31, 2025',
  dataOfIssue: new Date().toLocaleDateString(),
  signerName: 'Sarah Jenkins',
  signerTitle: 'Director of Marketing',
  certificateUrl: '#',
  organization: {
    id: 'modest-human-brands',
    name: 'Modest Human Brands',
    website: 'https://modesthumanbrands.com',
    branding: {
      logo: 'https://modesthumanbrands.com/logo.svg',
      color: {
        primary: '#2B2B2B',
        accent: '#4A85FF',
      },
      font: 'sans-serif',
    },
  },
}

registerTemplate({
  id: 'internship-completion-certificate',
  schema: internshipCompletionCertificateSchema,
  placeholders,
  subject: (data: InternshipCompletionCertificatePayload) => `Certificate of Completion - ${data?.recipientName || placeholders.recipientName}`,
  component: Component,
  transformPayload: (data: InternshipCompletionCertificatePayload) => {
    const p = placeholders
    const orgName = data?.organization?.name || p.organization.name

    return {
      recipientName: data?.recipientName || p.recipientName,
      bodyContent: `This certificate acknowledges your outstanding contribution and dedication as a ${data?.recipientRole || p.recipientRole} towards ${data?.scopeOfWork || p.scopeOfWork} during ${data?.startDate || p.startDate} - ${data?.endDate || p.endDate}, showcasing your commitment to excellence and teamwork at ${orgName}.`,
      dataOfIssue: data?.dataOfIssue || p.dataOfIssue,
      signerName: data?.signerName || p.signerName,
      signerTitle: data?.signerTitle || p.signerTitle,
      certificateUrl: data?.certificateUrl || p.certificateUrl,

      organizationName: orgName,
      organizationLogo: data?.organization?.branding?.logo || p.organization.branding.logo,
      organizationColorPrimary: data?.organization?.branding?.color?.primary || p.organization.branding.color.primary,
      organizationColorAccent: data?.organization?.branding?.color?.accent || p.organization.branding.color.accent,
      organizationFont: data?.organization?.branding?.font || p.organization.branding.font,
    }
  },
  getAttachments: async (data: InternshipCompletionCertificatePayload) => {
    if (!data?.certificateUrl || data.certificateUrl === '#') return []

    const fileBuffer = await ofetch(data.certificateUrl, {
      responseType: 'arrayBuffer',
    })
    return [
      {
        filename: `Certificate of Completion - ${data.recipientName}.pdf`,
        content: Buffer.from(fileBuffer),
        contentType: 'application/pdf',
      },
    ]
  },
})
