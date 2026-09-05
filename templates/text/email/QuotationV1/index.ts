import Component from './component.vue'
import registerTemplate from '#server/utils/template-registry-email.ts'
import { z } from 'zod'

export const quotationSchema = z.object({
  recipient: z.object({
    name: z.string(),
    isContact: z.boolean(),
    isSigned: z.boolean(),
  }),
  pricingModel: z.enum(['project', 'day']).optional(),
  project: z.object({
    title: z.string(),
    quotationNumber: z.string(),
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
      taxLabel: z.string().optional(),
      taxRate: z.number().min(0).optional(),
    })
    .optional(),
  expiresIn: z.coerce.date(), // Accepts native Date instances and ISO date strings
  link: z.string(),
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

export type QuotationPayload = z.infer<typeof quotationSchema>

type DeliverableInput = QuotationPayload['deliverables'][number]

interface ComputedDeliverable {
  title: string
  description: string
  points: string[]
  rate: number
  quantity: number
  amount: number
}

const placeholders: QuotationPayload = {
  recipient: {
    name: 'Wayne Enterprises',
    isContact: true,
    isSigned: false,
  },
  pricingModel: 'project',
  project: {
    title: 'Test',
    quotationNumber: 'QT-2026-089',
  },
  deliverables: [
    { title: 'Premium Brand Strategy', quantity: 1, rate: 5000, points: [] },
    { title: 'UI/UX Design System', quantity: 1, rate: 8500, points: [] },
  ],
  financials: {
    discountLabel: 'Discount',
    discountValue: 0,
    isDiscountPercentage: false,
    taxLabel: 'IGST @ 18%',
    taxRate: 18,
  },
  expiresIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  link: '#',
  tracking: {
    emailId: 'test-quotation-1',
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
      youtube: 'https://www.youtube.com/@modesthumanbrands',
    },
  },
}

registerTemplate({
  id: 'quotation',
  label: 'Quotation',
  description: 'The estimated pricing breakdown, scope of work, and validity window provided prior to contract signing.',
  schema: quotationSchema,
  placeholders,
  subject: (rawData: QuotationPayload) => {
    const qNum = rawData?.project?.quotationNumber || placeholders.project.quotationNumber
    const orgName = rawData?.organization?.name || placeholders.organization.name
    return `Project Quotation Estimate #${qNum} - ${orgName}`
  },
  component: Component,
  transformPayload: (rawData: QuotationPayload) => {
    const p = placeholders
    const org = rawData?.organization || p.organization

    // Guard array input to prevent runtime .map crashes
    const sourceDeliverables = Array.isArray(rawData?.deliverables) && rawData.deliverables.length > 0 ? rawData.deliverables : p.deliverables

    const computedDeliverables: ComputedDeliverable[] = sourceDeliverables.map((item: DeliverableInput) => {
      const qty = item?.quantity ?? 1
      const rate = item?.rate ?? 0
      const rowTotal = qty * rate

      return {
        title: item?.title ?? '',
        description: item?.description ?? '',
        points: Array.isArray(item?.points) ? item.points.filter((pt: string) => pt && pt.trim() !== '') : [],
        rate,
        quantity: qty,
        amount: rowTotal,
      }
    })

    const subtotal = computedDeliverables.reduce((acc: number, curr: ComputedDeliverable) => acc + curr.amount, 0)

    let discountAmount = 0
    const financials = rawData?.financials || p.financials
    const discountValue = financials?.discountValue || 0

    if (financials?.isDiscountPercentage) {
      discountAmount = (subtotal * discountValue) / 100
    } else {
      discountAmount = discountValue
    }

    const postDiscountTotal = Math.max(0, subtotal - discountAmount)
    const taxRate = financials?.taxRate || 0
    const taxAmount = (postDiscountTotal * taxRate) / 100
    const grandTotal = postDiscountTotal + taxAmount

    const emailId = rawData?.tracking?.emailId || p.tracking?.emailId || 'unassigned-email'
    const baseUrl = rawData?.tracking?.baseUrl || 'https://connect.modesthumanbrands.com'

    const rawUrl = rawData?.link || p.link
    const utmParams = '?ref=mail-quotation&utm_source=mconnect&utm_medium=email'
    const destinationWithUtm = `${rawUrl}${utmParams}`
    const trackedCta = rawUrl === '#' ? '#' : `${baseUrl}/api/track/click?url=${encodeURIComponent(destinationWithUtm)}&e=${emailId}`
    const dynamicPixel = `${baseUrl}/api/track/open?e=${emailId}`
    const honeypotUrl = `${baseUrl}/api/track/trap?e=${emailId}`

    const rawExpiresIn = rawData?.expiresIn || p.expiresIn
    const resolvedValidUntil = rawExpiresIn instanceof Date ? rawExpiresIn.toISOString() : String(rawExpiresIn)

    return {
      recipientName: rawData?.recipient?.name || p.recipient.name,
      isRecipientContact: rawData?.recipient?.isContact ?? p.recipient.isContact,
      isSigned: rawData?.recipient?.isSigned ?? p.recipient.isSigned,
      pricingModel: rawData?.pricingModel || p.pricingModel,
      projectName: rawData?.project?.title || p.project.title,
      quotationNumber: rawData?.project?.quotationNumber || p.project.quotationNumber,
      validUntil: resolvedValidUntil,
      deliverables: computedDeliverables,

      financialsSubtotal: subtotal,
      financialsDiscountLabel: financials?.discountLabel || (discountAmount > 0 ? 'Discount' : ''),
      financialsDiscountAmount: discountAmount,
      financialsTaxLabel: financials?.taxLabel || (taxAmount > 0 ? 'Tax' : ''),
      financialsTaxAmount: taxAmount,
      financialsGrandTotal: grandTotal,

      ctaUrl: trackedCta,
      trackingPixelUrl: dynamicPixel,
      honeypotUrl,
      organizationName: org.name,
      organizationWebsite: org.website || p.organization.website,
      organizationLogo: org.branding?.logo || p.organization.branding.logo,
      organizationColorPrimary: org.branding?.color?.primary || p.organization.branding.color.primary,
      organizationColorAccent: org.branding?.color?.accent || p.organization.branding.color.accent,
      organizationFont: org.branding?.font || p.organization.branding.font,
    }
  },
})
