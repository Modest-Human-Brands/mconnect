import { $fetch } from 'ofetch'
import { z } from 'zod'
import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry-email'

export const internshipCompletionCertificateSchema = z.object({
  recipientName: z.string(),
  recipientRole: z.string(),
  scopeOfWork: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  dataOfIssue: z.date(),
  signerName: z.string(),
  signerTitle: z.string(),
  certificateUrl: z.string(),
  organization: z.object({
    id: z.string(),
    name: z.string(),
    legalName: z.string(),
    entityType: z.enum(['LLP', 'Private Limited', 'Proprietorship']),
    tradeRelationship: z.enum(['Primary', 'Trading As', 'Operating Division', 'Wholly-Owned Subsidiary', 'Special Purpose Vehicle']),
    gstin: z.string().optional(),
    pan: z.string().optional(),
    address: z.string(),
    foundedYear: z.number(),
    accountDetails: z.object({
      accountName: z.string(),
      accountNumber: z.number(),
      bankName: z.string(),
      ifscCode: z.string(),
    }),
    branding: z.object({
      logo: z.string(),
      color: z.object({
        primary: z.string(),
        accent: z.string(),
      }),
      font: z.string(),
    }),
    website: z.string().optional(),
    phone: z.string().optional(),
    contactEmail: z.email(),
    billingEmail: z.email(),
    whatsapp: z.string().optional(),
    socials: z.record(z.any(), z.any()).optional(),
    primaryContactId: z.string(),
    organizationMemberIds: z.array(z.string()),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
})

export type InternshipCompletionCertificatePayload = z.infer<typeof internshipCompletionCertificateSchema>

const placeholders: InternshipCompletionCertificatePayload = {
  recipientName: 'Alex Mercer',
  recipientRole: 'Senior Marketing Intern',
  scopeOfWork: 'Digital Campaign Management',
  startDate: new Date('June 1, 2025'),
  endDate: new Date('December 31, 2025'),
  dataOfIssue: new Date(),
  signerName: 'Sarah Jenkins',
  signerTitle: 'Director of Marketing',
  certificateUrl: '#',
  organization: {
    id: 'modest-human-brands',
    name: 'Modest Human Brands',
    legalName: 'Modest Human Brands LLP',
    entityType: 'LLP',
    tradeRelationship: 'Primary',
    gstin: undefined,
    pan: 'ABCDE0123F',
    address: 'Abc Road, Near DEF, UIO - 1890',
    foundedYear: 2020,
    accountDetails: {
      accountName: 'Modest Human Brands LLP',
      accountNumber: 1_234_567_890,
      bankName: 'HDFC Bank',
      ifscCode: 'HDFC0001234',
    },
    website: 'https://modesthumanbrands.com',
    contactEmail: 'hello@modesthumanbrands.com',
    billingEmail: 'billing@modesthumanbrands.com',
    primaryContactId: 'contact-1',
    organizationMemberIds: ['member-1'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    branding: {
      logo: 'https://modesthumanbrands.com/logo.svg',
      color: {
        primary: '#2B2B2B',
        accent: '#4A85FF',
      },
      font: 'Exo2',
    },
  },
}

registerTemplate({
  id: 'internship-completion-certificate',
  label: 'Internship Completion Certificate',
  description: 'The formal proof of completion, including your start and end dates, role, and an authorized signature.',
  schema: internshipCompletionCertificateSchema,
  placeholders,
  subject: (data: InternshipCompletionCertificatePayload) => `Certificate of Completion - ${data?.recipientName || placeholders.recipientName}`,
  component: Component,
  transformPayload: (data: InternshipCompletionCertificatePayload) => {
    const p = placeholders
    const orgName = data?.organization?.name || p.organization.name

    return {
      recipientName: data?.recipientName || p.recipientName,
      recipientRole: data?.recipientRole || p.recipientRole,
      recipientScopeOfWork: data?.scopeOfWork || p.scopeOfWork,
      startDate: data?.startDate || p.startDate.toISOString(),
      endDate: data?.endDate || p.endDate.toISOString(),
      dataOfIssue: data?.dataOfIssue || p.dataOfIssue.toISOString(),
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

    const fileBuffer = await $fetch(data.certificateUrl, {
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
