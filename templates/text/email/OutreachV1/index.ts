import Component from './component.vue'
import registerTemplate from '#server/utils/template-registry-email.ts'
import { z } from 'zod'

export const outreachSchema = z.object({
  recipient: z.object({ name: z.string() }),
  emailSubject: z.string().optional(),
  heroHeadline: z.string().optional(),
  heroImageUrl: z.string().optional(),
  pitchMessage: z.string().optional(),
  ctaText: z.string().optional(),
  ctaButtonText: z.string().optional(),
  ctaButtons: z
    .array(
      z.object({
        label: z.string(),
        url: z.string(),
      })
    )
    .max(2)
    .optional(),
  sectionPretitle: z.string().optional(),
  sectionTitle: z.string().optional(),
  sectionDescription: z.string().optional(),
  category: z.string(),
  featuredItems: z
    .array(
      z.object({
        category: z.string().optional(),
        imageUrl: z.string(),
        linkUrl: z.string(),
        alt: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        actionLabel: z.string().optional(),
      })
    )
    .optional(),
  ctaUrl: z.string().optional(),
  unsubscribeUrl: z.string(),
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
      color: z.object({ primary: z.string(), accent: z.string() }),
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

export type OutreachPayload = z.infer<typeof outreachSchema>

const placeholders: OutreachPayload = {
  recipient: {
    name: 'Creative Director',
  },
  category: 'creative-studios',
  pitchMessage:
    'Modest Human Brands (MHB) builds workflow automation and project management platforms designed specifically for modern advertising agencies, production houses, and commercial studios. We eliminate operational friction across your entire creative pipeline—streamlining shoot timelines, legal contracts, live asset handoffs, and media distribution.',
  heroHeadline: 'Unified Studio Operations. Automate the Rest.',
  heroImageUrl: 'https://modesthumanbrands.com/images/hero-image-1.webp',
  sectionPretitle: '// THE MHB SUITE',
  sectionTitle: 'Four Core Tools. One Connected Pipeline.',
  sectionDescription: 'Purpose-built infrastructure to help creative studios track shoots, execute contracts, stream media, and store production assets without tier limits.',
  ctaText: 'Ready to cut hours off production planning and review cycles? Let us show you how MHB eliminates pipeline friction in a quick 15-minute walkthrough.',
  ctaButtons: [
    {
      label: 'Explore Platform →',
      url: 'https://modesthumanbrands.com/',
    },
    {
      label: 'Book 15-Min Demo',
      url: 'https://modesthumanbrands.com/demo',
    },
  ],
  ctaUrl: 'https://modesthumanbrands.com/get-started',
  unsubscribeUrl: 'https://modesthumanbrands.com/newsletter/unsubscribe',
  tracking: {
    emailId: 'outreach-campaign-preview',
    baseUrl: 'http://localhost:3001',
  },
  featuredItems: [
    {
      category: 'creative-studios',
      imageUrl: 'https://modesthumanbrands.com/images/mockup-dashboard.webp',
      linkUrl: 'https://modesthumanbrands.com/dashboard',
      title: 'Unified creative project pipeline',
      description: 'Track multi-project timelines, control budgets, and streamline creative workflows from planning to post-production.',
      actionLabel: 'Explore Dashboard →',
      alt: 'MHB Dashboard - Creative Project Pipeline',
    },
    {
      category: 'creative-studios',
      imageUrl: 'https://modesthumanbrands.com/images/mockup-document.webp',
      linkUrl: 'https://modesthumanbrands.com/mdoc',
      title: 'Frictionless client agreements',
      description: 'Generate SOWs, collect e-signatures, and issue invoices with extreme speed. Stay in the creative flow and keep projects moving.',
      actionLabel: 'Explore MDoc →',
      alt: 'MHB MDoc - Agreements & E-Signatures',
    },
    {
      category: 'creative-studios',
      imageUrl: 'https://modesthumanbrands.com/images/mockup-stream.webp',
      linkUrl: 'https://modesthumanbrands.com/msync',
      title: 'Live stream & media sync',
      description: 'Eliminate manual file transfers and broken links. Keep raw footage, project assets, and team updates synchronized across your entire pipeline.',
      actionLabel: 'Explore MSync →',
      alt: 'MHB MSync - Live Stream & Asset Handoff',
    },
    {
      category: 'creative-studios',
      imageUrl: 'https://modesthumanbrands.com/images/mockup-media.webp',
      linkUrl: 'https://modesthumanbrands.com/mdrive',
      title: 'Unified media storage & distribution',
      description: 'Organize raw production files, control client access, and store heavy media assets without storage limits or tier penalties.',
      actionLabel: 'Explore MDrive →',
      alt: 'MHB MDrive - Cloud Media Storage',
    },
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
        accent: '#5945EA',
      },
      font: 'Exo2',
    },
    phone: '+919999999999',
    whatsapp: '+919999999999',
    socials: {
      instagram: 'https://www.instagram.com/modesthumanbrands/',
      facebook: '',
      linkedin: '',
      youtube: 'https://www.youtube.com/@modesthumanbrands',
    },
  },
}

registerTemplate({
  id: 'outreach',
  label: 'Outreach',
  description: 'Cold outreach and brand pitch campaign featuring targeted service showcases and custom portfolio items.',
  schema: outreachSchema,
  placeholders,
  subject: (rawData: OutreachPayload) => rawData?.emailSubject || `Elevating visual branding for ${rawData?.recipient?.name || 'your brand'}`,
  component: Component,
  transformPayload: (rawData: OutreachPayload) => {
    const p = placeholders
    const org = rawData?.organization || p.organization
    const activeCategoryKey = (rawData?.category || p.category).toLowerCase()
    const emailId = rawData?.tracking?.emailId || p.tracking?.emailId || 'unassigned-email'
    const baseUrl = rawData?.tracking?.baseUrl || 'https://connect.modesthumanbrands.com'

    const wrapTracked = (rawUrl?: string) => {
      if (!rawUrl || rawUrl === '#') return '#'
      const utmParams = '?ref=mail-outreach&utm_source=mconnect&utm_medium=email'
      const destinationWithUtm = `${rawUrl}${utmParams}`
      return `${baseUrl}/api/track/click?url=${encodeURIComponent(destinationWithUtm)}&e=${emailId}`
    }

    const rawUrl = rawData?.ctaUrl || p.ctaUrl
    const trackedCta = wrapTracked(rawUrl)
    const dynamicPixel = `${baseUrl}/api/track/open?e=${emailId}`
    const honeypotUrl = `${baseUrl}/api/track/trap?e=${emailId}`

    // Resolve all featured items safely, then filter by category
    const allItems = Array.isArray(rawData?.featuredItems) && rawData.featuredItems.length > 0 ? rawData.featuredItems : p.featuredItems || []

    const categoryFiltered = allItems.filter((item) => !item.category || item.category.toLowerCase() === activeCategoryKey)
    const sourceItems = categoryFiltered.length > 0 ? categoryFiltered : allItems

    const resolvedItems = sourceItems.map((item) => ({
      ...item,
      linkUrl: wrapTracked(item.linkUrl),
    }))

    const rawButtons = Array.isArray(rawData?.ctaButtons) && rawData.ctaButtons.length > 0 ? rawData.ctaButtons : p.ctaButtons || []

    const trackedButtons = rawButtons.map((btn) => ({
      label: btn.label,
      url: wrapTracked(btn.url),
    }))

    return {
      recipientName: rawData?.recipient?.name || p.recipient.name,
      categoryName: activeCategoryKey,
      heroHeadline: rawData?.heroHeadline || p.heroHeadline,
      heroImageUrl: rawData?.heroImageUrl || p.heroImageUrl,
      pitchMessage: rawData?.pitchMessage || p.pitchMessage,
      ctaText: rawData?.ctaText || p.ctaText,
      ctaButtonText: rawData?.ctaButtonText,
      ctaButtons: trackedButtons,
      sectionPretitle: rawData?.sectionPretitle || p.sectionPretitle,
      sectionTitle: rawData?.sectionTitle || p.sectionTitle,
      sectionDescription: rawData?.sectionDescription || p.sectionDescription,
      ctaUrl: trackedCta,
      trackingPixelUrl: dynamicPixel,
      honeypotUrl,
      unsubscribeUrl: rawData?.unsubscribeUrl || p.unsubscribeUrl,
      featuredItems: resolvedItems,

      organizationName: org.name,
      organizationPhone: org.phone || p.organization.phone,
      organizationAddress: org.address,
      organizationWebsite: org.website || p.organization.website,
      organizationEpisodeUrl: org.website ? `${org.website}/episode` : p.organization.website ? `${p.organization.website}/episode` : undefined,
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
