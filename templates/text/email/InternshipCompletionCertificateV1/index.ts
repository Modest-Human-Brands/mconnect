import { ofetch } from 'ofetch'
import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry-email'

export interface InternshipCompletionCertificatePayload {
  recipientName: string
  recipientRole: string
  scopeOfWork: string
  startDate: string
  endDate: string
  dataOfIssue: string
  signerName: string
  signerTitle: string
  certificateUrl: string
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

registerTemplate({
  id: 'internship-completion-certificate',
  subject: (data: InternshipCompletionCertificatePayload) => `Certificate of Completion - ${data.recipientName}`,
  component: Component,
  transformPayload: (data: InternshipCompletionCertificatePayload) => {
    return {
      recipientName: data.recipientName,
      bodyContent: `This certificate acknowledges your outstanding contribution and dedication as a ${data.recipientRole} towards ${data.scopeOfWork} during ${data.startDate} - ${data.endDate}, showcasing your commitment to excellence and teamwork at ${data.organization.name}.`,
      dataOfIssue: data.dataOfIssue,
      signerName: data.signerName,
      signerTitle: data.signerTitle,
      certificateUrl: data.certificateUrl,
      organization: data.organization,
    }
  },
  getAttachments: async (data: InternshipCompletionCertificatePayload) => {
    const fileBuffer = await ofetch(data.certificateUrl, {
      responseType: 'arrayBuffer',
    })
    return [
      {
        filename: `Certificate of Completion - ${data.recipientName}.pdf`,
        content: Buffer.from(fileBuffer),
        contentType: 'application/pdf',
      },
    ]
  },
})
