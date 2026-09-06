import Component from './component.vue'
import registerTemplate from '#server/utils/template-registry-email.ts'
import { z } from 'zod'

const deliveryLinkSchema = z.object({
  title: z.string(),
  url: z.string(),
  description: z.string().optional(),
})

export const projectDeliverySchema = z.object({
  recipient: z.object({ name: z.string() }),
  projectName: z.string(),
  completionDate: z.date(),
  deliveryNotes: z.string(),
  projectLinks: z.array(deliveryLinkSchema),
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

export type ProjectDeliveryPayload = z.infer<typeof projectDeliverySchema>

const placeholders: ProjectDeliveryPayload = {
  recipient: { name: 'Production Partner' },
  projectName: 'Studio Workflow Automation & Campaign Asset Pipeline',
  completionDate: new Date(),
  deliveryNotes:
    'We are pleased to hand over the finalized assets and automated production pipeline for your studio campaign. All visual deliverables, media kits, and system workflows have been categorized and staged for immediate deployment. Please review the pipeline documentation and asset guidelines below before launching downstream production.',
  projectLinks: [
    {
      title: 'Workflow Architecture & Guidelines (Portal)',
      url: 'https://modesthumanbrands.com',
      description: 'Production standards, review triggers, and asset naming specifications.',
    },
    {
      title: 'Production Master Deliverables (Vault)',
      url: 'https://modesthumanbrands.com',
      description: 'High-resolution renders, vector kits, and automated social packages.',
    },
  ],
  tracking: {
    emailId: 'test-project-delivery-1',
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
  id: 'project-delivery',
  label: 'Project Delivery',
  description: 'Final handover notification delivering production assets, drive folders, brand guidelines, and documentation.',
  schema: projectDeliverySchema,
  placeholders,
  subject: (data: ProjectDeliveryPayload) => {
    const pName = data?.projectName || placeholders.projectName
    const orgName = data?.organization?.name || placeholders.organization.name
    return `Project Delivery: ${pName} is ready! - ${orgName}`
  },
  component: Component,
  transformPayload: (data: ProjectDeliveryPayload) => {
    const p = placeholders
    const org = data?.organization || {}
    const emailId = data?.tracking?.emailId || p.tracking?.emailId || 'unassigned-email'
    const baseUrl = data?.tracking?.baseUrl || 'https://connect.modesthumanbrands.com'

    const rawLinks = Array.isArray(data?.projectLinks) && data.projectLinks.length > 0 ? data.projectLinks : p.projectLinks
    const trackedLinks = rawLinks.map((item) => {
      const rawUrl = item.url || '#'
      const utmParams = '?ref=mail-delivery&utm_source=mconnect&utm_medium=email'
      const destinationWithUtm = `${rawUrl}${utmParams}`
      const trackedUrl = rawUrl === '#' ? '#' : `${baseUrl}/api/track/click?url=${encodeURIComponent(destinationWithUtm)}&e=${emailId}`
      return { ...item, url: trackedUrl }
    })

    const dynamicPixel = `${baseUrl}/api/track/open?e=${emailId}`
    const honeypotUrl = `${baseUrl}/api/track/trap?e=${emailId}`

    return {
      recipientName: data?.recipient?.name || p.recipient.name,
      projectName: data?.projectName || p.projectName,
      completionDate: data?.completionDate || p.completionDate.toISOString(),
      deliveryNotes: data?.deliveryNotes || p.deliveryNotes,
      projectLinks: trackedLinks,
      trackingPixelUrl: dynamicPixel,
      honeypotUrl,
      organizationName: org?.name || p.organization.name,
      organizationWebsite: org?.website || p.organization.website,
      organizationLogo: org?.branding?.logo || p.organization.branding.logo,
      organizationColorPrimary: org?.branding?.color?.primary || p.organization.branding.color.primary,
      organizationColorAccent: org?.branding?.color?.accent || p.organization.branding.color.accent,
      organizationFont: org?.branding?.font || p.organization.branding.font,
    }
  },
})
