import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry-email'
import { z } from 'zod'

const deliveryLinkSchema = z.object({
  title: z.string(),
  url: z.string(),
  description: z.string().optional(),
})

export const projectDeliverySchema = z.object({
  clientName: z.string(),
  projectName: z.string(),
  completionDate: z.date(),
  deliveryNotes: z.string(),
  projectLinks: z.array(deliveryLinkSchema),
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
  clientName: 'Sarah Jenkins',
  projectName: 'Omni-Channel Brand Refresh',
  completionDate: new Date(),
  deliveryNotes:
    'We are thrilled to hand over the final assets for your brand refresh. All files have been organized into respective folders. Please review the brand guidelines before utilizing the new vector logos in production.',
  projectLinks: [
    { title: 'Brand Guidelines (PDF)', url: '#', description: 'Rules for typography, spacing, and color usage.' },
    { title: 'Production Assets (Drive)', url: '#', description: 'High-resolution vectors and social media kits.' },
  ],
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
  id: 'project-delivery',
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

    return {
      clientName: data?.clientName || p.clientName,
      projectName: data?.projectName || p.projectName,
      completionDate: data?.completionDate || p.completionDate.toISOString(),
      deliveryNotes: data?.deliveryNotes || p.deliveryNotes,
      projectLinks: Array.isArray(data?.projectLinks) && data.projectLinks.length > 0 ? data.projectLinks : p.projectLinks,
      organizationName: org?.name || p.organization.name,
      organizationWebsite: org?.website || p.organization.website,
      organizationLogo: org?.branding?.logo || p.organization.branding.logo,
      organizationColorPrimary: org?.branding?.color?.primary || p.organization.branding.color.primary,
      organizationFont: org?.branding?.font || p.organization.branding.font,
    }
  },
})
