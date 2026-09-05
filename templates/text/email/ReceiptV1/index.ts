import Component from './component.vue'
import registerTemplate from '#server/utils/template-registry-email.ts'
import { z } from 'zod'
import { $fetch } from 'ofetch'

export const receiptEmailSchema = z.object({
  recipient: z.object({
    name: z.string(),
  }),
  pricingModel: z.enum(['project', 'day']).optional(),
  project: z.object({
    title: z.string(),
    receiptNumber: z.string(),
    invoiceNumber: z.string().optional(),
  }),
  deliverables: z
    .array(
      z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        points: z.array(z.string()).optional(),
        quantity: z.number().min(1).optional(),
        rate: z.number().min(0).optional(),
      })
    )
    .optional(),
  financials: z.object({
    subtotal: z.number().min(0).optional(),
    discountLabel: z.string().optional(),
    discountValue: z.number().min(0).optional(),
    isDiscountPercentage: z.boolean().optional(),
    taxLabel: z.string().optional(),
    taxRate: z.number().min(0).optional(),
    amountPaid: z.number().min(0),
  }),
  paymentDate: z.coerce.date(),
  paymentMethod: z.string().optional(),
  transactionId: z.string().optional(),
  receiptUrl: z.string(),
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

export type ReceiptEmailPayload = z.infer<typeof receiptEmailSchema>

type DeliverableInput = NonNullable<ReceiptEmailPayload['deliverables']>[number]

interface ComputedDeliverable {
  title: string
  description: string
  points: string[]
  rate: number
  quantity: number
  amount: number
}

const placeholders: ReceiptEmailPayload = {
  recipient: {
    name: 'Creative Studio Partner',
  },
  pricingModel: 'project',
  project: {
    title: 'Studio Workflow Automation & Production Pipeline Architecture',
    receiptNumber: 'MHB-REC-2026-104',
    invoiceNumber: 'MHB-INV-2026-104',
  },
  deliverables: [
    {
      title: 'Studio Workflow Automation & Pipeline Deployment',
      quantity: 1,
      rate: 85_000,
      points: [],
    },
    {
      title: 'Digital Asset Management & Client Portal Integration',
      quantity: 1,
      rate: 65_000,
      points: [],
    },
  ],
  financials: {
    subtotal: 150_000,
    discountLabel: 'Discount',
    discountValue: 0,
    isDiscountPercentage: false,
    taxLabel: 'IGST @ 18%',
    taxRate: 18,
    amountPaid: 177_000,
  },
  paymentDate: new Date(),
  paymentMethod: 'Bank Wire / RTGS',
  transactionId: 'HDFC98234710293',
  receiptUrl: 'https://modesthumanbrands.com',
  tracking: {
    emailId: 'test-receipt-1',
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
        accent: '#16a34a',
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
  id: 'receipt',
  label: 'Payment Receipt',
  description: 'Official payment confirmation and receipt verifying settled amounts, transaction IDs, and balance due.',
  schema: receiptEmailSchema,
  placeholders,
  subject: (rawData: ReceiptEmailPayload) => {
    const recNum = rawData?.project?.receiptNumber || placeholders.project.receiptNumber
    const orgName = rawData?.organization?.name || placeholders.organization.name
    return `Payment Receipt #${recNum} from ${orgName}`
  },
  component: Component,
  transformPayload: (rawData: ReceiptEmailPayload) => {
    const p = placeholders
    const org = rawData?.organization || p.organization

    const sourceDeliverables = Array.isArray(rawData?.deliverables) && rawData.deliverables.length > 0 ? rawData.deliverables : p.deliverables || []

    const computedDeliverables: ComputedDeliverable[] = sourceDeliverables.map((item: DeliverableInput) => {
      const qty = item?.quantity ?? 1
      const rate = item?.rate ?? 0
      return {
        title: item?.title ?? '',
        description: item?.description ?? '',
        points: Array.isArray(item?.points) ? item.points.filter((pt: string) => pt && pt.trim() !== '') : [],
        rate,
        quantity: qty,
        amount: qty * rate,
      }
    })

    const rawSubtotal = computedDeliverables.reduce((acc: number, curr: ComputedDeliverable) => acc + curr.amount, 0)
    const subtotal = rawSubtotal > 0 ? rawSubtotal : rawData?.financials?.subtotal || p.financials.subtotal || 0

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

    const amountPaid = financials?.amountPaid ?? 0
    const remainingBalance = Math.max(0, grandTotal - amountPaid)
    const paymentStatus = remainingBalance <= 0 ? 'PAID' : 'PARTIALLY PAID'

    const emailId = rawData?.tracking?.emailId || p.tracking?.emailId || 'unassigned-email'
    const baseUrl = rawData?.tracking?.baseUrl || 'https://connect.modesthumanbrands.com'

    const rawUrl = rawData?.receiptUrl || p.receiptUrl
    const destinationWithUtm = `${rawUrl}?ref=mail-receipt&utm_source=mconnect&utm_medium=email`
    const trackedCta = rawUrl === '#' ? '#' : `${baseUrl}/api/track/click?url=${encodeURIComponent(destinationWithUtm)}&e=${emailId}`

    const rawPaymentDate = rawData?.paymentDate || p.paymentDate
    const resolvedPaymentDate = rawPaymentDate instanceof Date ? rawPaymentDate.toISOString() : String(rawPaymentDate)

    return {
      recipientName: rawData?.recipient?.name || p.recipient.name,
      pricingModel: rawData?.pricingModel || p.pricingModel,
      projectName: rawData?.project?.title || p.project.title,
      receiptNumber: rawData?.project?.receiptNumber || p.project.receiptNumber,
      invoiceNumber: rawData?.project?.invoiceNumber || p.project.invoiceNumber,
      paymentDate: resolvedPaymentDate,
      paymentMethod: rawData?.paymentMethod || p.paymentMethod,
      transactionId: rawData?.transactionId || p.transactionId,
      deliverables: computedDeliverables,

      financialsSubtotal: subtotal,
      financialsDiscountLabel: financials?.discountLabel || (discountAmount > 0 ? 'Discount' : ''),
      financialsDiscountAmount: discountAmount,
      financialsTaxLabel: financials?.taxLabel || (taxAmount > 0 ? 'Tax' : ''),
      financialsTaxAmount: taxAmount,
      financialsGrandTotal: grandTotal,
      financialsAmountPaid: amountPaid,
      financialsRemainingBalance: remainingBalance,
      paymentStatus,

      ctaUrl: trackedCta,
      trackingPixelUrl: `${baseUrl}/api/track/open?e=${emailId}`,
      honeypotUrl: `${baseUrl}/api/track/trap?e=${emailId}`,

      organizationName: org.name,
      organizationAddress: org.address,
      organizationWebsite: org.website || p.organization.website,
      organizationLogo: org.branding?.logo || p.organization.branding.logo,
      organizationColorPrimary: org.branding?.color?.primary || p.organization.branding.color.primary,
      organizationColorAccent: org.branding?.color?.accent || p.organization.branding.color.accent,
      organizationFont: org.branding?.font || p.organization.branding.font,
    }
  },
  getAttachments: async (rawData: ReceiptEmailPayload) => {
    if (!rawData?.receiptUrl || rawData.receiptUrl === '#') return []

    try {
      const fileBuffer = await $fetch(rawData.receiptUrl, {
        responseType: 'arrayBuffer',
      })

      const recNum = rawData.project?.receiptNumber || 'Receipt'
      return [
        {
          filename: `${recNum}.pdf`,
          content: Buffer.from(fileBuffer),
          contentType: 'application/pdf',
        },
      ]
    } catch (error) {
      console.error('Failed to fetch receipt PDF for attachment:', error)
      return []
    }
  },
})
