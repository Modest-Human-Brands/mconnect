import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry-email'
import { z } from 'zod'
import { ofetch } from 'ofetch'

export const invoiceEmailSchema = z.object({
  recipient: z.object({
    name: z.string(),
  }),
  pricingModel: z.enum(['project', 'day']).optional(),
  project: z.object({
    title: z.string(),
    invoiceNumber: z.string(),
    quotationNumber: z.string().optional(),
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
      amountPaid: z.number().min(0).optional(),
    })
    .optional(),
  dueDate: z.date(),
  invoiceUrl: z.url(),
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

export type InvoiceEmailPayload = z.infer<typeof invoiceEmailSchema>

type DeliverableInput = InvoiceEmailPayload['deliverables'][number]

interface ComputedDeliverable {
  title: string
  description: string
  points: string[]
  rate: number
  quantity: number
  amount: number
}

const placeholders: InvoiceEmailPayload = {
  recipient: {
    name: 'Wayne Enterprises',
  },
  pricingModel: 'project',
  project: {
    title: 'Photography and Videography',
    invoiceNumber: 'RCP-I-78-2-1',
    quotationNumber: 'RCP-Q-78-2',
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
    amountPaid: 0,
  },
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  invoiceUrl: '#',
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
  id: 'invoice',
  schema: invoiceEmailSchema,
  placeholders,
  subject: (rawData: InvoiceEmailPayload) => {
    const invNum = rawData?.project?.invoiceNumber || placeholders.project.invoiceNumber
    const orgName = rawData?.organization?.name || placeholders.organization.name
    return `Invoice #${invNum} from ${orgName}`
  },
  component: Component,
  transformPayload: (rawData: InvoiceEmailPayload) => {
    const p = placeholders
    const org = rawData?.organization || p.organization

    const computedDeliverables: ComputedDeliverable[] = (rawData?.deliverables || p.deliverables).map((item: DeliverableInput) => {
      const qty = item.quantity ?? 1
      const rate = item.rate ?? 0
      const rowTotal = qty * rate

      return {
        title: item.title ?? '',
        description: item.description ?? '',
        points: Array.isArray(item.points) ? item.points.filter((pt: string) => pt.trim() !== '') : [],
        rate: rate,
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

    const postDiscountTotal = subtotal - discountAmount
    const taxRate = financials?.taxRate || 0
    const taxAmount = (postDiscountTotal * taxRate) / 100
    const grandTotal = postDiscountTotal + taxAmount

    const amountPaid = financials?.amountPaid || 0
    const amountDue = Math.max(0, grandTotal - amountPaid)

    let paymentStatus = 'UNPAID'
    if (amountPaid >= grandTotal) {
      paymentStatus = 'PAID'
    } else if (amountPaid > 0) {
      paymentStatus = 'PARTIALLY PAID'
    }

    return {
      recipientName: rawData?.recipient?.name || p.recipient.name,
      pricingModel: rawData?.pricingModel || p.pricingModel,
      projectName: rawData?.project?.title || p.project.title,
      invoiceNumber: rawData?.project?.invoiceNumber || p.project.invoiceNumber,
      quotationNumber: rawData?.project?.quotationNumber || p.project.quotationNumber,
      dueDate: rawData?.dueDate || p.dueDate.toISOString(),
      deliverables: computedDeliverables,

      financialsSubtotal: subtotal,
      financialsDiscountLabel: financials?.discountLabel || (discountAmount > 0 ? 'Discount' : ''),
      financialsDiscountAmount: discountAmount > 0 ? `- ${discountAmount.toLocaleString('en-IN')}` : '',
      financialsTaxLabel: financials?.taxLabel || (taxAmount > 0 ? 'Tax' : ''),
      financialsTaxAmount: taxAmount > 0 ? taxAmount.toLocaleString('en-IN') : '',
      financialsGrandTotal: grandTotal,
      financialsAmountPaid: amountPaid > 0 ? amountPaid.toLocaleString('en-IN') : '',
      financialsAmountDue: amountDue,
      paymentStatus,

      organizationName: org.name,
      organizationWebsite: org.website,
      organizationLogo: org.branding.logo,
      organizationColorPrimary: org.branding.color.primary,
      organizationColorAccent: org.branding.color.accent,
      organizationFont: org.branding.font,
    }
  },
  // Automatically download the invoice from the URL and attach it to the email
  getAttachments: async (rawData: InvoiceEmailPayload) => {
    if (!rawData?.invoiceUrl || rawData.invoiceUrl === '#') return []

    try {
      const fileBuffer = await ofetch(rawData.invoiceUrl, {
        responseType: 'arrayBuffer',
      })

      const invNum = rawData.project?.invoiceNumber || 'Invoice'
      return [
        {
          filename: `${invNum}.pdf`,
          content: Buffer.from(fileBuffer),
          contentType: 'application/pdf',
        },
      ]
    } catch (error) {
      console.error('Failed to fetch invoice PDF for attachment:', error)
      return []
    }
  },
})
