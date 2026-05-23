import registerSMSTemplate from '~/server/utils/template-registry-sms'

export interface InternshipCompletionSMSPayload {
  recipientName: string
  recipientRole: string
  certificateUrl: string
  organization?: {
    name: string
  }
}

registerSMSTemplate({
  id: 'internship-completion-certificate',
  transformPayload: (data: InternshipCompletionSMSPayload) => {
    const messageBody = `Hi ${data.recipientName}, your official certificate of completion for your tenure as our ${data.recipientRole} 
    at ${data.organization?.name} is ready! Download your verified PDF document here: ${data.certificateUrl}`

    return {
      text: messageBody,
      metadata: {
        charCount: messageBody.length,
        recipient: data.recipientName,
      },
    }
  },
})
