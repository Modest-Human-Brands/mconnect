import { $fetch } from 'ofetch'
import { z } from 'zod'
import Component from './component.vue'
import registerTemplate from '#server/utils/template-registry-email.ts'

export const internshipCompletionCertificateSchema = z.object({
  recipient: z.object({
    name: z.string(),
    role: z.string(),
  }),
  scopeOfWork: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  dateOfIssue: z.date(),
  signerName: z.string(),
  signerTitle: z.string(),
  certificateUrl: z.string(),
  tracking: z
    .object({
      emailId: z.string(),
      baseUrl: z.url().optional(),
    })
    .optional(),
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
  recipient: {
    name: 'Creative Fellow',
    role: 'Creative Operations & Studio Production Associate',
  },
  scopeOfWork: 'Studio Workflow Automation, Asset Pipeline Architecture & Digital Production Management',
  startDate: new Date('October 1, 2025'),
  endDate: new Date('March 31, 2026'),
  dateOfIssue: new Date(),
  signerName: 'Authorized Signatory',
  signerTitle: 'Head of Studio Operations & Brand Systems',
  certificateUrl: 'https://modesthumanbrands.com',
  tracking: {
    emailId: 'test-certificate-1',
    baseUrl: 'http://localhost:3001',
  },
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
        accent: '#5945EA',
      },
      font: 'Exo2',
    },
  },
}

registerTemplate({
  id: 'internship-completion-certificate',
  label: 'Internship Completion Certificate',
  description: 'The formal proof of completion, including tenure dates, role details, and an authorized signature.',
  schema: internshipCompletionCertificateSchema,
  placeholders,
  subject: (data: InternshipCompletionCertificatePayload) => `Certificate of Completion - ${data?.recipient.name || placeholders.recipient.name}`,
  component: Component,
  transformPayload: (data: InternshipCompletionCertificatePayload) => {
    const p = placeholders
    const orgName = data?.organization?.name || p.organization.name
    const emailId = data?.tracking?.emailId || p.tracking?.emailId || 'unassigned-email'
    const baseUrl = data?.tracking?.baseUrl || 'https://connect.modesthumanbrands.com'

    const rawUrl = data?.certificateUrl || p.certificateUrl
    const utmParams = '?ref=mail-certificate&utm_source=mconnect&utm_medium=email'
    const destinationWithUtm = `${rawUrl}${utmParams}`
    const trackedCta = rawUrl === '#' ? '#' : `${baseUrl}/api/track/click?url=${encodeURIComponent(destinationWithUtm)}&e=${emailId}`
    const dynamicPixel = `${baseUrl}/api/track/open?e=${emailId}`
    const honeypotUrl = `${baseUrl}/api/track/trap?e=${emailId}`

    return {
      recipientName: data?.recipient?.name || p.recipient.name,
      recipientRole: data?.recipient?.role || p.recipient.role,
      recipientScopeOfWork: data?.scopeOfWork || p.scopeOfWork,
      startDate: data?.startDate || p.startDate.toISOString(),
      endDate: data?.endDate || p.endDate.toISOString(),
      dateOfIssue: data?.dateOfIssue || p.dateOfIssue.toISOString(),
      signerName: data?.signerName || p.signerName,
      signerTitle: data?.signerTitle || p.signerTitle,
      ctaUrl: trackedCta,
      trackingPixelUrl: dynamicPixel,
      honeypotUrl,
      organizationName: orgName,
      organizationWebsite: data?.organization?.website || p.organization.website,
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
        filename: `Certificate of Completion - ${data.recipient.name}.pdf`,
        content: Buffer.from(fileBuffer),
        contentType: 'application/pdf',
      },
    ]
  },
})
