import Component from './component.vue'
import registerTemplate from '#server/utils/template-registry-email.ts'
import { z } from 'zod'

export const otpSchema = z.object({
  recipient: z.object({
    email: z.string(),
  }),
  otpCode: z.string(),
  expiresIn: z.string().default('10 minutes'),
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

export type OtpPayload = z.infer<typeof otpSchema>

const placeholders: OtpPayload = {
  recipient: { email: 'partner@agency.com' },
  otpCode: '2p9T6y',
  expiresIn: '10 minutes',
  tracking: {
    emailId: '',
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
    address: '17 NO, N S Road,harinavi Beltola, South 24 Parganas, West Bengal, India',
    foundedYear: 2025,
    accountDetails: {
      accountName: 'Modest Human Brands LLP',
      accountNumber: 1_234_567_890,
      bankName: 'HDFC Bank',
      ifscCode: 'HDFC0001234',
    },
    website: 'https://modesthumanbrands.com',
    contactEmail: 'contact@modesthumanbrands.com',
    billingEmail: 'billing@modesthumanbrands.com',
    primaryContactId: 'contact-1',
    organizationMemberIds: ['member-1'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    branding: {
      logo: 'https://modesthumanbrands.com/logo.svg',
      color: {
        primary: '#111827',
        accent: '#5945EA',
      },
      font: 'Exo2',
    },
    phone: '+919999999999',
    whatsapp: '+919999999999',
    socials: {
      instagram: 'https://www.instagram.com/modesthumanbrands/',
      facebook: 'https://facebook.com/modesthumanbrands',
      linkedin: 'https://linkedin.com/company/modest-human-brands',
      youtube: 'https://www.youtube.com/@modesthumanbrands',
    },
  },
}

registerTemplate({
  id: 'otp',
  label: 'OTP',
  description: 'Time-sensitive one-time verification code for passwordless authentication and account security.',
  schema: otpSchema,
  placeholders,
  subject: (data: any) => {
    const orgName = data?.organization?.name || placeholders.organization.name
    return `${orgName} login code`
  },
  component: Component,
  transformPayload: (data: any) => {
    const p = placeholders
    const org = data?.organization || {}
    const emailId = data?.tracking?.emailId || p.tracking?.emailId || 'unassigned-email'
    const baseUrl = data?.tracking?.baseUrl || 'https://connect.modesthumanbrands.com'

    const dynamicPixel = `${baseUrl}/api/track/open?e=${emailId}`
    const honeypotUrl = `${baseUrl}/api/track/trap?e=${emailId}`

    return {
      recipientEmail: data?.recipientEmail || p.recipient.email,
      otpCode: data?.otpCode || p.otpCode,
      expiresIn: data?.expiresIn || p.expiresIn,
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
