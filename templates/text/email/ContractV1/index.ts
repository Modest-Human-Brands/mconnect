import Component from './component.vue'
import registerTemplate from '#server/utils/template-registry-email.ts'
import { z } from 'zod'

export const contractSchema = z.object({
  contact: z.object({
    name: z.string(),
    role: z.string(),
  }),
  project: z.object({
    title: z.string(),
    quoteNumber: z.string(),
    quoteDate: z.date(),
    shootDate: z.date(),
    shootLocation: z.string(),
    callTime: z.iso.time(),
  }),
  totalAmount: z.number(),
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

export type ContractPayload = z.infer<typeof contractSchema>

const placeholders: ContractPayload = {
  contact: {
    name: 'Alex Mercer',
    role: 'Lead Cinematographer',
  },
  project: {
    title: 'Photography and Videography',
    quoteNumber: 'QT-2026-089',
    quoteDate: new Date(),
    shootDate: new Date(),
    shootLocation: 'Gotham City / Remote',
    callTime: '08:00 AM',
  },
  totalAmount: 150_000,
  link: 'https://modesthumanbrands.com',
  tracking: {
    emailId: 'test-contract-1',
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
        accent: '#4A85FF',
      },
      font: 'Exo2',
    },
  },
}

registerTemplate({
  id: 'contract',
  label: 'Contract',
  description: 'The formal agreement or legal document outlining scope, terms, and obligations between parties.',
  schema: contractSchema,
  placeholders,
  subject: (rawData: ContractPayload) => {
    const pName = rawData?.project.title || placeholders.project.title
    const orgName = rawData?.organization?.name || placeholders.organization.name
    return `Contractor Agreement for ${pName} - ${orgName}`
  },
  component: Component,
  transformPayload: (rawData: ContractPayload) => {
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

      projectName: rawData?.project?.title || p.project.title,
      projectQuoteNumber: rawData?.project?.quoteNumber || p.project.quoteNumber,
      shootDate: rawData?.project?.shootDate || p.project.shootDate,
      shootLocation: rawData?.project?.shootLocation || p.project.shootLocation,
      callTime: rawData?.project?.callTime || p.project.callTime,

      totalAmount: rawData?.totalAmount || p.totalAmount,
      ctaUrl: trackedCta,
      trackingPixelUrl: dynamicPixel,
      honeypotUrl,
    }
  },
})
