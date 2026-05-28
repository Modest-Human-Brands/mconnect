import { z } from 'zod'
import registerWhatsAppTemplate from '~/server/utils/template-registry-whatsapp'

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

registerWhatsAppTemplate({
  id: 'quotation',
  schema: quotationSchema,
  placeholders,
  transformPayload: (data: QuotationPayload) => {
    const p = placeholders
    const client = data?.clientName || p.clientName
    const quoteNo = data?.quoteNumber || p.quoteNumber
    const amount = data?.totalAmount || p.totalAmount
    const link = data?.quotationUrl || p.quotationUrl
    const orgName = data?.organization?.name || p.organization?.name || 'our company'

    return {
      header: {
        type: 'text',
        content: `Your Project Quotation`,
      },
      body: `Hello ${client},\n\nYour commercial project quotation estimate (*${quoteNo}*) from ${orgName} for *${amount}* is ready for your review.\n\nPlease tap the button below to access the full proposal and accept the terms.`,
      footer: `Powered by ${orgName}`,
      buttons: [
        {
          type: 'url',
          text: 'Review Proposal',
          url: link,
        },
      ],
      metadata: {
        recipientName: client,
        quoteId: quoteNo,
        organizationName: orgName,
      },
    }
  },
})
