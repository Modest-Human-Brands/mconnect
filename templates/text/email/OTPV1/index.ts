import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry-email'
import { z } from 'zod'

export const otpSchema = z.object({
  recipientEmail: z.string().email(),
  otpCode: z.string(),
  expiresIn: z.string().default('10 minutes'),
  organization: z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    website: z.string(),
    branding: z.object({
      logo: z.string(),
      color: z.object({
        primary: z.string(),
        accent: z.string(),
      }),
      font: z.string(),
    }),
    socials: z.record(z.any(), z.any()).optional(),
  }),
})

export type OtpPayload = z.infer<typeof otpSchema>

const placeholders: OtpPayload = {
  recipientEmail: 'alex.mercer@example.com',
  otpCode: '2p9T6y',
  expiresIn: '10 minutes',
  organization: {
    id: 'modest-human-brands',
    name: 'Modest Human Brands',
    address: 'Abc Road, Near DEF, UIO - 1890',
    website: 'https://modesthumanbrands.com',
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
  id: 'otp',
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

    return {
      recipientEmail: data?.recipientEmail || p.recipientEmail,
      otpCode: data?.otpCode || p.otpCode,
      expiresIn: data?.expiresIn || p.expiresIn,

      organizationName: org?.name || p.organization.name,
      organizationWebsite: org?.website || p.organization.website,
      organizationLogo: org?.branding?.logo || p.organization.branding.logo,
      organizationColorPrimary: org?.branding?.color?.primary || p.organization.branding.color.primary,
      organizationFont: org?.branding?.font || p.organization.branding.font,
    }
  },
})
