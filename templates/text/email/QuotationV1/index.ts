import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry-email'
import { z } from 'zod'

const quotationItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  amount: z.union([z.string(), z.number()]),
})

export const quotationSchema = z.object({
  clientName: z.string(),
  quoteNumber: z.string(),
  validUntil: z.string(),
  items: z.array(quotationItemSchema),
  totalAmount: z.union([z.string(), z.number()]),
  quotationUrl: z.string(),
  organization: z.object({
    id: z.string(),
    name: z.string(),
    website: z.string(),
    branding: z.object({
      logo: z.string(),
      color: z.object({ primary: z.string(), accent: z.string() }),
      font: z.string(),
    }),
    socials: z.record(z.any(), z.any()).optional(),
  }),
})

export type QuotationPayload = z.infer<typeof quotationSchema>

const placeholders: QuotationPayload = {
  clientName: 'Wayne Enterprises',
  quoteNumber: 'QT-2026-089',
  validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
  items: [
    { description: 'Premium Brand Strategy', quantity: 1, amount: '5,000.00' },
    { description: 'UI/UX Design System', quantity: 1, amount: '8,500.00' },
  ],
  totalAmount: '13,500.00',
  quotationUrl: '#',
  organization: {
    id: 'modest-human-brands',
    name: 'Modest Human Brands',
    website: 'https://modesthumanbrands.com',
    branding: {
      logo: 'https://modesthumanbrands.com/logo.svg',
      color: {
        primary: '#2B2B2B',
        accent: '#4A85FF',
      },
      font: 'sans-serif',
    },
  },
}

registerTemplate({
  id: 'quotation',
  schema: quotationSchema,
  placeholders,
  subject: (data: QuotationPayload) => {
    const qNum = data?.quoteNumber || placeholders.quoteNumber
    const orgName = data?.organization?.name || placeholders.organization.name
    return `Project Quotation Estimate #${qNum} - ${orgName}`
  },
  component: Component,
  transformPayload: (data: any) => {
    const p = placeholders
    const org = data?.organization || {}

    return {
      clientName: data?.clientName || p.clientName,
      quoteNumber: data?.quoteNumber || p.quoteNumber,
      validUntil: data?.validUntil || p.validUntil,

      items: Array.isArray(data?.items) && data.items.length > 0 ? data.items : p.items,

      totalAmount: data?.totalAmount || p.totalAmount,
      quotationUrl: data?.quotationUrl || p.quotationUrl,

      organizationName: org?.name || p.organization.name,
      organizationWebsite: org?.website || p.organization.website,
      organizationLogo: org?.branding?.logo || p.organization.branding.logo,
      organizationColorPrimary: org?.branding?.color?.primary || p.organization.branding.color.primary,
      organizationFont: org?.branding?.font || p.organization.branding.font,
    }
  },
})
