import registerSMSTemplate from '~/server/utils/template-registry-sms'

export interface QuotationSMSPayload {
  clientName: string
  quoteNumber: string
  totalAmount: string | number
  quotationUrl: string
}

registerSMSTemplate({
  id: 'quotation',
  transformPayload: (data: QuotationSMSPayload) => {
    const client = data.clientName || 'Client'
    const quoteNo = data.quoteNumber || `QT-${Date.now()}`
    const amount = data.totalAmount || '0.00'
    const link = data.quotationUrl || 'modesthumanbrands.com'

    const messageBody = `Hello ${client}, your commercial project quotation estimate (${quoteNo}) for ${amount} is ready for your review. Access the full proposal and accept terms here: ${link}`

    return {
      text: messageBody,
      metadata: {
        charCount: messageBody.length,
        recipient: client,
        quoteId: quoteNo,
      },
    }
  },
})
