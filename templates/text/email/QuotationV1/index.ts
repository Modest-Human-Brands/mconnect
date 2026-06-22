import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry-email'
import { z } from 'zod'

export const quotationSchema = z.object({
  contact: z.object({
    name: z.string(),
  }),
  project: z.object({
    quoteNumber: z.string(),
    quoteExpiry: z.date(),
  }),
  deliverables: z.array(
    z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      points: z.array(z.string()).optional(),
      quantity: z.number().min(1).optional(),
      rate: z.number().min(0).optional(),
    })
  ),
  financials: z
    .object({
      discountLabel: z.string().optional(),
      discountValue: z.number().min(0).optional(),
      isDiscountPercentage: z.boolean().optional(),
    })
    .optional(),
  link: z.string(),
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

export type QuotationPayload = z.infer<typeof quotationSchema>

type DeliverableInput = QuotationPayload['deliverables'][number]

interface ComputedDeliverable {
  title: string
  points: string[]
  amountRaw: number
  amount: string
}

const placeholders: QuotationPayload = {
  contact: {
    name: 'Wayne Enterprises',
  },
  project: {
    quoteNumber: 'QT-2026-089',
    quoteExpiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  },
  deliverables: [
    { title: 'Premium Brand Strategy', quantity: 1, rate: 5000, points: [] },
    { title: 'UI/UX Design System', quantity: 1, rate: 8500, points: [] },
  ],
  financials: {
    discountLabel: 'Discount',
    discountValue: 0,
    isDiscountPercentage: false,
  },
  link: '#',
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
  id: 'quotation',
  schema: quotationSchema,
  placeholders,
  subject: (rawData: QuotationPayload) => {
    const qNum = rawData?.project.quoteNumber || placeholders.project.quoteNumber
    const orgName = rawData?.organization?.name || placeholders.organization.name
    return `Project Quotation Estimate #${qNum} - ${orgName}`
  },
  component: Component,
  transformPayload: (rawData: QuotationPayload) => {
    const p = placeholders
    const org = rawData?.organization || {}

    const computedDeliverables: ComputedDeliverable[] = (rawData.deliverables || p.deliverables).map((item: DeliverableInput) => {
      const qty = item.quantity || 1
      const rate = item.rate || 0
      const rowTotal = qty * rate
      return {
        title: item.title || item.description || 'Service',
        points: Array.isArray(item.points) ? item.points.filter((pt: string) => pt.trim() !== '') : [],
        amountRaw: rowTotal,
        amount: rowTotal.toLocaleString('en-IN'),
      }
    })

    const subtotal = computedDeliverables.reduce((acc: number, curr: ComputedDeliverable) => acc + curr.amountRaw, 0)

    let discountAmount = 0
    const financials = rawData.financials || p.financials
    const discountValue = financials?.discountValue || 0

    if (financials?.isDiscountPercentage) {
      discountAmount = (subtotal * discountValue) / 100
    } else {
      discountAmount = discountValue
    }
    const total = subtotal - discountAmount

    return {
      clientName: rawData?.contact.name || p.contact.name,
      quoteNumber: rawData?.project.quoteNumber || p.project.quoteNumber,
      validUntil: rawData?.project.quoteExpiry || p.project.quoteExpiry,

      items: Array.isArray(rawData?.deliverables) && rawData.deliverables.length > 0 ? rawData.deliverables : p.deliverables,

      totalAmount: total,
      quotationUrl: rawData?.link || p.link,

      organizationName: org?.name || p.organization.name,
      organizationWebsite: org?.website || p.organization.website,
      organizationLogo: org?.branding?.logo || p.organization.branding.logo,
      organizationColorPrimary: org?.branding?.color?.primary || p.organization.branding.color.primary,
      organizationColorAccent: org?.branding?.color?.accent || p.organization.branding.color.accent,
      organizationFont: org?.branding?.font || p.organization.branding.font,
    }
  },
})
