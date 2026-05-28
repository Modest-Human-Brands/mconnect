import { z } from 'zod'
import registerSMSTemplate from '~/server/utils/template-registry-sms'

export const quotationSchema = z.object({
  clientName: z.string(),
  quoteNumber: z.string(),
  totalAmount: z.union([z.string(), z.number()]),
  quotationUrl: z.string(),
  organization: z
    .object({
      name: z.string(),
    })
    .optional(),
})

export type QuotationPayload = z.infer<typeof quotationSchema>

const placeholders: QuotationPayload = {
  clientName: 'Wayne Enterprises',
  quoteNumber: 'QT-2026-089',
  totalAmount: '13,500.00',
  quotationUrl: 'https://modesthumanbrands.com/quote/12345',
  organization: {
    name: 'Modest Human Brands',
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
