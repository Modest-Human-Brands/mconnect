import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry-email'
import { z } from 'zod'

export const contentReleaseSchema = z.object({
  recipient: z.object({
    name: z.string(),
    email: z.email(),
  }),
  emailSubject: z.string().default('New Content Published'),
  content: z.object({
    title: z.string(),
    imageUrl: z.url(),
    linkUrl: z.url(),
  }),
  unsubscribeUrl: z.url(),
  trackingPixelUrl: z.url().optional(), // Telemetry Hook
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

export type ContentReleasePayload = z.infer<typeof contentReleaseSchema>

const placeholders: ContentReleasePayload = {
  recipient: {
    name: 'John Doe',
    email: 'john@example.com',
  },
  emailSubject: 'Our Latest Post is Live!',
  content: {
    title: '10 Ways to Improve Your Visual Branding',
    imageUrl: 'https://cdn.redcatpictures.com/media/image/f_auto&q_80&progressive_yes&fit_cover&s_427x640/photo-0020-0001-002',
    linkUrl: 'https://redcatpictures.com/blog/visual-branding',
  },
  unsubscribeUrl: 'https://redcatpictures.com/newsletter/unsubscribe',
  trackingPixelUrl: 'https://api.redcatpictures.com/track/open?e=test',
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
  id: 'content-release',
  label: 'Content Release',
  description: '',
  schema: contentReleaseSchema,
  placeholders,
  subject: (rawData: ContentReleasePayload) => rawData?.emailSubject || placeholders.emailSubject,
  component: Component,
  transformPayload: (rawData: ContentReleasePayload) => {
    const p = placeholders
    const org = rawData?.organization || p.organization

    // Generate tracking/UTM parameters at the data layer
    const rawUrl = rawData?.content?.linkUrl || p.content.linkUrl
    const utmParams = '?ref=mail-content&utm_source=mconnect&utm_medium=email'
    const wrappedLink = `${rawUrl}${utmParams}`

    return {
      recipientName: rawData?.recipient?.name || p.recipient.name,
      recipientEmail: rawData?.recipient?.email || p.recipient.email,
      emailSubject: rawData?.emailSubject || p.emailSubject,
      contentTitle: rawData?.content?.title || p.content.title,
      contentImage: rawData?.content?.imageUrl || p.content.imageUrl,
      contentUrl: wrappedLink,
      unsubscribeUrl: rawData?.unsubscribeUrl || p.unsubscribeUrl,
      trackingPixelUrl: rawData?.trackingPixelUrl || p.trackingPixelUrl,

      organizationName: org?.name || p.organization.name,
      organizationWebsite: org?.website || p.organization.website,
      organizationLogo: org?.branding?.logo || p.organization.branding.logo,
      organizationColorPrimary: org?.branding?.color?.primary || p.organization.branding.color.primary,
      organizationColorAccent: org?.branding?.color?.accent || p.organization.branding.color.accent,
      organizationFont: org?.branding?.font || p.organization.branding.font,
    }
  },
})
