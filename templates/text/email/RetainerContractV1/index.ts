import Component from './component.vue'
import registerTemplate from '#server/utils/template-registry-email.ts'
import { z } from 'zod'

export const retainerContractSchema = z.object({
  contact: z.object({
    name: z.string(),
    role: z.string(),
  }),
  engagement: z.object({
    title: z.string(),
    quoteNumber: z.string(),
    quoteDate: z.date(),
    startDate: z.date(),
    engagementMonths: z.number().int().min(1),
    renewalType: z.enum(['Auto-Renew', 'Manual Renewal', 'Fixed Term - No Renewal']),
    noticePeriodDays: z.number().int().min(0).default(30),
  }),
  serviceCategory: z.string(),
  compensation: z
    .object({
      flatMonthlyFee: z.number().min(0).optional(),
      targetBasedFees: z
        .array(
          z.object({
            description: z.string(),
            amountPerUnit: z.number().min(0),
            unit: z.string(),
          })
        )
        .min(1)
        .optional(),
      onboardingFee: z.number().min(0).optional(),
      currency: z.string().default('INR'),
    })
    .refine((data) => data.flatMonthlyFee !== undefined || (data.targetBasedFees && data.targetBasedFees.length > 0), {
      message: 'At least one of flatMonthlyFee or targetBasedFees must be provided',
      path: ['flatMonthlyFee'],
    }),
  link: z.string(),
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

export type RetainerContractPayload = z.infer<typeof retainerContractSchema>

const placeholders: RetainerContractPayload = {
  contact: {
    name: 'Production Partner',
    role: 'Marketing Consultant',
  },
  engagement: {
    title: 'Performance Marketing Retainer',
    quoteNumber: 'MHB-RT-2026-089',
    quoteDate: new Date(),
    startDate: new Date(),
    engagementMonths: 6,
    renewalType: 'Manual Renewal',
    noticePeriodDays: 15,
  },
  serviceCategory: 'Marketing',
  compensation: {
    flatMonthlyFee: 20_000,
    targetBasedFees: [
      {
        description: 'Bonus for every signed foreign clients closed directly from campaign traffic',
        amountPerUnit: 1000,
        unit: 'signed foreign client',
      },
      {
        description: 'Bonus for every signed Indian clients closed directly from campaign traffic',
        amountPerUnit: 500,
        unit: 'signed Indian client',
      },
    ],
    onboardingFee: 0,
    currency: 'INR',
  },
  link: 'https://modesthumanbrands.com',
  tracking: {
    emailId: 'test-retainer-1',
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

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

function describeCompensation(compensation: RetainerContractPayload['compensation']): string {
  const parts: string[] = []
  if (compensation.flatMonthlyFee) {
    parts.push(`${compensation.flatMonthlyFee.toLocaleString('en-IN')} ${compensation.currency}/month`)
  }
  for (const target of compensation.targetBasedFees || []) {
    parts.push(`${target.amountPerUnit.toLocaleString('en-IN')} ${compensation.currency} per ${target.unit}`)
  }
  return parts.join(' + ')
}

registerTemplate({
  id: 'retainer-contract',
  label: 'Retainer Contract',
  description: 'Notifies a contractor that a recurring monthly retainer agreement is ready to review and sign.',
  schema: retainerContractSchema,
  placeholders,
  subject: (rawData: RetainerContractPayload) => {
    const eTitle = rawData?.engagement?.title || placeholders.engagement.title
    const orgName = rawData?.organization?.name || placeholders.organization.name
    return `Retainer Agreement for ${eTitle} - ${orgName}`
  },
  component: Component,
  transformPayload: (rawData: RetainerContractPayload) => {
    const p = placeholders
    const org = rawData?.organization || {}
    const emailId = rawData?.tracking?.emailId || p.tracking?.emailId || 'unassigned-email'
    const baseUrl = rawData?.tracking?.baseUrl || 'https://connect.modesthumanbrands.com'

    const rawUrl = rawData?.link || p.link
    const utmParams = '?ref=mail-contract&utm_source=mconnect&utm_medium=email'
    const destinationWithUtm = `${rawUrl}${utmParams}`
    const trackedCta = rawUrl === '#' ? '#' : `${baseUrl}/api/track/click?url=${encodeURIComponent(destinationWithUtm)}&e=${emailId}`
    const dynamicPixel = `${baseUrl}/api/track/open?e=${emailId}`
    const honeypotUrl = `${baseUrl}/api/track/trap?e=${emailId}`

    const engagement = rawData?.engagement || p.engagement
    const compensation = rawData?.compensation || p.compensation
    const endDate = addMonths(engagement.startDate, engagement.engagementMonths)

    return {
      organizationName: org?.name || p.organization.name,
      organizationAddress: org?.address || p.organization!.address,
      organizationLogo: org?.branding?.logo || p.organization.branding.logo,
      organizationFont: org?.branding?.font || p.organization.branding.font,
      organizationColorPrimary: org?.branding?.color?.primary || p.organization.branding.color.primary,
      organizationColorAccent: org?.branding?.color?.accent || p.organization.branding.color.accent,
      organizationWebsite: org?.website || p.organization.website,

      recipientName: rawData?.contact?.name || p.contact.name,
      recipientRole: rawData?.contact?.role || p.contact.role,

      engagementTitle: engagement.title,
      serviceCategory: rawData?.serviceCategory || p.serviceCategory,
      startDate: engagement.startDate,
      endDate,
      engagementMonths: engagement.engagementMonths,

      compensationSummary: describeCompensation(compensation),

      ctaUrl: trackedCta,
      trackingPixelUrl: dynamicPixel,
      honeypotUrl,
    }
  },
})
