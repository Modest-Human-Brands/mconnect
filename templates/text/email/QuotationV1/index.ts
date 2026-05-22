import path from 'node:path'
import registerVueTemplate from '../../../../src/utils/template-registry-email'

export interface QuotationItem {
  description: string
  quantity: number
  amount: string | number
}

export interface QuotationPayload {
  clientName: string
  quoteNumber: string
  validUntil: string
  items: QuotationItem[]
  totalAmount: string | number
  quotationUrl: string
  organization: {
    id: string
    name: string
    website: string
    branding: {
      logo: string
      color: {
        primary: string
        accent: string
      }
      font: string
    }
    socials?: Record<string, any>
  }
}

registerVueTemplate({
  id: 'quotation',
  subject: (data: QuotationPayload) => `Project Quotation Estimate #${data.quoteNumber} - ${data.organization.name}`,
  componentPath: path.resolve(process.cwd(), 'templates/text/email/QuotationV1/component.vue'),
  transformPayload: (data: QuotationPayload) => {
    return {
      clientName: data.clientName,
      quoteNumber: data.quoteNumber,
      validUntil: data.validUntil,
      items: Array.isArray(data.items) ? data.items : [],
      totalAmount: data.totalAmount,
      quotationUrl: data.quotationUrl,
      organization: data.organization,
    }
  },
})
