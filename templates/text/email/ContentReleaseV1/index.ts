import Component from './component.vue'
import registerTemplate from '#server/utils/template-registry-email.ts'
import { z } from 'zod'

export const contentReleaseSchema = z.object({
  recipient: z.object({
    name: z.string().optional(),
    email: z.email(),
  }),
  emailSubject: z.string().default('New Content Published'),
  content: z.object({
    badge: z.string().optional(), // 'New Blog Post' | 'New Video' | 'Podcast Episode' | 'Case Study'
    title: z.string(),
    meta: z.string().optional(), // 'Posted by Alan Bennet, 1 min' | '12 min watch · 4K'
    imageUrl: z.url(),
    excerpt: z.string().optional(), // teaser hook paragraph
    ctaLabel: z.string().optional(), // 'Read More' | 'Watch Video' | 'Listen Now'
    linkUrl: z.url(),
  }),
  unsubscribeUrl: z.url(),
  trackingPixelUrl: z.url().optional(),
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
    socials: z.record(z.string(), z.any()).optional(),
    primaryContactId: z.string(),
    organizationMemberIds: z.array(z.string()),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
})

export type ContentReleasePayload = z.infer<typeof contentReleaseSchema>

const placeholders: ContentReleasePayload = {
  recipient: {
    name: 'Creative Partner',
    email: 'partner@agency.com',
  },
  emailSubject: 'Eliminate Operational Friction: Next-Gen Studio Automation by MHB',
  content: {
    badge: 'Capability Spotlight',
    title: 'Streamlining Production Pipelines, Asset Reviews & Client Deliverables',
    meta: 'Platform Overview by Modest Human Brands · 3 min read',
    imageUrl: 'https://modesthumanbrands.com/images/hero-image-1.webp',
    excerpt:
      'Modest Human Brands builds workflow automation and project management platforms engineered specifically for modern advertising agencies, production houses, and creative studios. Discover how our tools eliminate operational friction across client agreements, asset approvals, and high-velocity deliverable pipelines.',
    ctaLabel: 'Explore Capabilities',
    linkUrl: 'https://modesthumanbrands.com',
  },
  unsubscribeUrl: 'https://modesthumanbrands.com/newsletter/unsubscribe',
  trackingPixelUrl: 'http://localhost:3001/api/track/open?e=test',
  tracking: {
    emailId: 'test-emailid-1',
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
        primary: '#111827',
        accent: '#0284c7',
      },
      font: 'Exo2',
    },
    phone: '+919999999999',
    whatsapp: '+919999999999',
    socials: {
      instagram: 'https://www.instagram.com/modesthumanbrands/',
      facebook: 'https://facebook.com/modesthumanbrands',
      linkedin: 'https://linkedin.com/company/modesthumanbrands',
      youtube: 'https://www.youtube.com/@modesthumanbrands',
    },
  },
}

registerTemplate({
  id: 'content-release',
  label: 'Content Release',
  description: 'Notification announcing newly published blog posts, articles, videos, or editorial insights.',
  schema: contentReleaseSchema,
  placeholders,
  subject: (rawData: ContentReleasePayload) => rawData?.emailSubject || rawData?.content?.title || placeholders.emailSubject,
  component: Component,
  transformPayload: (rawData: ContentReleasePayload) => {
    const p = placeholders
    const org = rawData?.organization || p.organization

    const emailId = rawData?.tracking?.emailId || p.tracking?.emailId || 'unassigned-email'
    const baseUrl = rawData?.tracking?.baseUrl || 'https://connect.modesthumanbrands.com'

    const rawUrl = rawData?.content?.linkUrl || p.content.linkUrl
    const utmParams = '?ref=mail-content&utm_source=mconnect&utm_medium=email'
    const destinationWithUtm = `${rawUrl}${utmParams}`

    return {
      recipientName: rawData?.recipient?.name || p.recipient.name,
      recipientEmail: rawData?.recipient?.email || p.recipient.email,
      emailSubject: rawData?.emailSubject || p.emailSubject,

      // Flexible Content Payload
      contentBadge: rawData?.content?.badge || p.content.badge,
      contentTitle: rawData?.content?.title || p.content.title,
      contentMeta: rawData?.content?.meta || p.content.meta,
      contentImage: rawData?.content?.imageUrl || p.content.imageUrl,
      contentExcerpt: rawData?.content?.excerpt || p.content.excerpt,
      ctaLabel: rawData?.content?.ctaLabel || p.content.ctaLabel,

      ctaUrl: `${baseUrl}/api/track/click?url=${encodeURIComponent(destinationWithUtm)}&e=${emailId}`,
      honeypotUrl: `${baseUrl}/api/track/trap?e=${emailId}`,
      trackingPixelUrl: rawData?.trackingPixelUrl || `${baseUrl}/api/track/open?e=${emailId}`,
      unsubscribeUrl: rawData?.unsubscribeUrl || p.unsubscribeUrl,

      organizationName: org.name,
      organizationPhone: org.phone,
      organizationAddress: org.address,
      organizationWebsite: org.website || p.organization.website,
      organizationLogo: org.branding?.logo || p.organization.branding.logo,
      organizationColorPrimary: org.branding?.color?.primary || p.organization.branding.color.primary,
      organizationColorAccent: org.branding?.color?.accent || p.organization.branding.color.accent,
      organizationFont: org.branding?.font || p.organization.branding.font,
      organizationSocialWhatsapp: org.whatsapp || p.organization.whatsapp,
      organizationSocialInstagram: org.socials?.instagram || p.organization.socials?.instagram,
      organizationSocialFacebook: org.socials?.facebook || p.organization.socials?.facebook,
      organizationSocialLinkedin: org.socials?.linkedin || p.organization.socials?.linkedin,
      organizationSocialYoutube: org.socials?.youtube || p.organization.socials?.youtube,
    }
  },
})
