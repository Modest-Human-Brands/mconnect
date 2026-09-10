import { z } from 'zod'
import registerSMSTemplate from '#server/utils/template-registry-sms.ts'

export const quotationSchema = z.object({
  clientName: z.string(),
  quoteNumber: z.string(),
  totalAmount: z.union([z.string(), z.number()]),
  quotationUrl: z.string(),
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

export type QuotationPayload = z.infer<typeof quotationSchema>

const placeholders: QuotationPayload = {
  clientName: 'Wayne Enterprises',
  quoteNumber: 'QT-2026-089',
  totalAmount: '13,500.00',
  quotationUrl: 'https://modesthumanbrands.com/quote/12345',
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

registerSMSTemplate({
  id: 'quotation',
  schema: quotationSchema,
  placeholders,
  transformPayload: (data: QuotationPayload) => {
    const p = placeholders
    const client = data?.clientName || p.clientName
    const quoteNo = data?.quoteNumber || p.quoteNumber
    const amount = data?.totalAmount || p.totalAmount
    const link = data?.quotationUrl || p.quotationUrl
    const orgName = data?.organization?.name || p.organization?.name

    const messageBody = `Hello ${client}, your commercial project quotation estimate (${quoteNo}) from ${orgName} for ${amount} is ready for your review. Access the full proposal and accept terms here: ${link}`

    return {
      text: messageBody,
      metadata: {
        charCount: messageBody.length,
        recipientName: client,
        quoteId: quoteNo,
        organizationName: orgName,
      },
    }
  },
})
