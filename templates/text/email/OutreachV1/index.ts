import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry-email'
import { z } from 'zod'

export const outreachSchema = z.object({
  recipient: z.object({ name: z.string() }),
  category: z.string().default('ecommerce'),
  customPortfolioItems: z.record(z.string(), z.array(z.object({ imageUrl: z.string(), linkUrl: z.string(), alt: z.string() }))),
  ctaUrl: z.string(),
  unsubscribeUrl: z.string(),
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
    socials: z.record(z.any(), z.any()).optional(),
    primaryContactId: z.string(),
    organizationMemberIds: z.array(z.string()),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
})

export type OutreachPayload = z.infer<typeof outreachSchema>

const placeholders: OutreachPayload = {
  recipient: { name: 'Prospect Brand' },
  category: 'ecommerce',
  ctaUrl: '#',
  unsubscribeUrl: '#',
  customPortfolioItems: {
    ecommerce: [
      {
        imageUrl: 'https://cdn.redcatpictures.com/media/image/f_auto&q_80&progressive_yes&fit_cover&s_427x640/photo-0020-0001-002',
        linkUrl: 'https://redcatpictures.com/photo/photo-0020-0001-002',
        alt: 'Ecommerce 1',
      },
      {
        imageUrl: 'https://cdn.redcatpictures.com/media/image/f_auto&q_80&progressive_yes&fit_cover&s_427x640/photo-0000-0025-002',
        linkUrl: 'https://redcatpictures.com/photo/photo-0000-0025-002',
        alt: 'Ecommerce 2',
      },
      {
        imageUrl: 'https://cdn.redcatpictures.com/media/image/f_auto&q_80&progressive_yes&fit_cover&s_427x640/photo-0000-0007-001',
        linkUrl: 'https://redcatpictures.com/photo/photo-0000-0007-001',
        alt: 'Ecommerce 3',
      },
      {
        imageUrl: 'https://cdn.redcatpictures.com/media/image/f_auto&q_80&progressive_yes&fit_cover&s_427x640/photo-0022-0004-001',
        linkUrl: 'https://redcatpictures.com/photo/photo-0022-0004-001',
        alt: 'Ecommerce 4',
      },
      {
        imageUrl: 'https://cdn.redcatpictures.com/media/image/f_auto&q_80&progressive_yes&fit_cover&s_427x640/photo-0000-0016-001',
        linkUrl: 'https://redcatpictures.com/photo/photo-0000-0016-001',
        alt: 'Ecommerce 5',
      },
      {
        imageUrl: 'https://cdn.redcatpictures.com/media/image/f_auto&q_80&progressive_yes&fit_cover&s_427x640/photo-0010-0004-001',
        linkUrl: 'https://redcatpictures.com/photo/photo-0010-0004-001',
        alt: 'Ecommerce 6',
      },
      {
        imageUrl: 'https://cdn.redcatpictures.com/media/image/f_auto&q_80&progressive_yes&fit_cover&s_427x640/photo-0003-0005-001',
        linkUrl: 'https://redcatpictures.com/photo/photo-0003-0005-001',
        alt: 'Ecommerce 7',
      },
      {
        imageUrl: 'https://cdn.redcatpictures.com/media/image/f_auto&q_80&progressive_yes&fit_cover&s_427x640/photo-0011-0005-001',
        linkUrl: 'https://redcatpictures.com/photo/photo-0011-0005-001',
        alt: 'Ecommerce 8',
      },
    ],
    food: [
      {
        imageUrl: 'https://cdn.redcatpictures.com/media/image/f_auto&q_80&progressive_yes&fit_cover&s_427x640/food-photo-042-002',
        linkUrl: 'https://redcatpictures.com/photo/food-photo-042-002',
        alt: 'Food 1',
      },
      {
        imageUrl: 'https://cdn.redcatpictures.com/media/image/f_auto&q_80&progressive_yes&fit_cover&s_427x640/food-photo-042-004',
        linkUrl: 'https://redcatpictures.com/photo/food-photo-042-004',
        alt: 'Food 2',
      },
      {
        imageUrl: 'https://cdn.redcatpictures.com/media/image/f_auto&q_80&progressive_yes&fit_cover&s_427x640/food-photo-042-003',
        linkUrl: 'https://redcatpictures.com/photo/food-photo-042-003',
        alt: 'Food 3',
      },
      {
        imageUrl: 'https://cdn.redcatpictures.com/media/image/f_auto&q_80&progressive_yes&fit_cover&s_427x640/food-photo-000-016',
        linkUrl: 'https://redcatpictures.com/photo/food-photo-000-016',
        alt: 'Food 4',
      },
      {
        imageUrl: 'https://cdn.redcatpictures.com/media/image/f_auto&q_80&progressive_yes&fit_cover&s_427x640/food-photo-010-002',
        linkUrl: 'https://redcatpictures.com/photo/food-photo-010-002',
        alt: 'Food 5',
      },
      {
        imageUrl: 'https://cdn.redcatpictures.com/media/image/f_auto&q_80&progressive_yes&fit_cover&s_427x640/food-photo-031-003',
        linkUrl: 'https://redcatpictures.com/photo/food-photo-031-003',
        alt: 'Food 6',
      },
      {
        imageUrl: 'https://cdn.redcatpictures.com/media/image/f_auto&q_80&progressive_yes&fit_cover&s_427x640/food-photo-000-024',
        linkUrl: 'https://redcatpictures.com/photo/food-photo-000-024',
        alt: 'Food 7',
      },
      {
        imageUrl: 'https://cdn.redcatpictures.com/media/image/f_auto&q_80&progressive_yes&fit_cover&s_427x640/food-photo-000-019',
        linkUrl: 'https://redcatpictures.com/photo/food-photo-000-019',
        alt: 'Food 8',
      },
    ],
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
    phone: '+919999999999',
    whatsapp: '+919999999999',
    socials: {
      instagram: 'https://www.instagram.com/modesthumanbrands/',
      facebook: '',
      linkedin: '',
      youtube: 'https://www.youtube.com/@red_cat_pictures',
    },
  },
}

registerTemplate({
  id: 'outreach',
  schema: outreachSchema,
  placeholders,
  subject: (rawData: OutreachPayload) => `Elevating visual branding for ${rawData?.recipient?.name || 'your brand'}`,
  component: Component,
  transformPayload: (rawData: OutreachPayload) => {
    const p = placeholders
    const org = rawData?.organization || p.organization
    const activeCategoryKey = rawData?.category?.toLowerCase() || 'ecommerce'

    const customMap = rawData?.customPortfolioItems || p.customPortfolioItems
    const resolvedItems = customMap[activeCategoryKey]

    return {
      recipientName: rawData?.recipient?.name || p.recipient.name,
      categoryName: activeCategoryKey,
      ctaUrl: rawData?.ctaUrl || p.ctaUrl,
      unsubscribeUrl: rawData?.unsubscribeUrl || p.unsubscribeUrl,
      portfolioItems: resolvedItems,

      organizationName: org.name,
      organizationPhone: org.phone || p.organization.phone,
      organizationAddress: org.address,
      organizationWebsite: org.website || p.organization.website,
      organizationEpisodeUrl: `${org.website || p.organization.website}/episode`,
      organizationLogoFull: org.branding.logo || p.organization.branding.logo,
      organizationLogoSimple: org.branding.logo || p.organization.branding.logo,
      organizationColorPrimary: org.branding?.color?.primary || p.organization.branding.color.primary,
      organizationFont: org.branding?.font || p.organization.branding.font,
      organizationSocialWhatsapp: org.whatsapp || p.organization.whatsapp,
      organizationSocialInstagram: org.socials?.instagram || p.organization.socials?.instagram,
      organizationSocialFacebook: org.socials?.facebook || p.organization.socials?.facebook,
      organizationSocialLinkedin: org.socials?.linkedin || p.organization.socials?.linkedin,
      organizationSocialYoutube: org.socials?.youtube || p.organization.socials?.youtube,
    }
  },
})
