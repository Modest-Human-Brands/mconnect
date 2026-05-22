import path from 'node:path'
import { ofetch } from 'ofetch'
import registerVueTemplate from '../../../../src/utils/template-registry-email'

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

registerVueTemplate({
  id: 'internship-completion-certificate',
  subject: (data: InternshipCompletionCertificatePayload) => `Certificate of Completion - ${data.recipientName}`,
  componentPath: path.resolve(process.cwd(), 'templates/text/email/InternshipCompletionCertificateV1/component.vue'),
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
})
