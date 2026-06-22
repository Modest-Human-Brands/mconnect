import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry-email'
import { z } from 'zod'

export const contractSchema = z.object({
  contact: z.object({
    name: z.string(),
    title: z.string(),
  }),
  project: z.object({
    title: z.string(),
    shootDate: z.date(),
  }),
  totalAmount: z.number(),
  link: z.string(),
  organization: z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    website: z.string(),
    branding: z.object({
      logo: z.url(),
      color: z.object({
        primary: z.string(),
        accent: z.string(),
      }),
      font: z.string(),
    }),
    socials: z.record(z.any(), z.any()).optional(),
  }),
})

export type ContractPayload = z.infer<typeof contractSchema>

const placeholders: ContractPayload = {
  contact: {
    name: 'Alex Mercer',
    title: 'Lead Cinematographer',
  },
  project: {
    title: 'Photography and Videography',
    shootDate: new Date(),
  },
  totalAmount: 150_000,
  link: '#',
  organization: {
    id: 'modest-human-brands',
    name: 'Modest Human Brands',
    address: 'Abc Road, Near DEF, UIO - 1890',
    website: 'https://modesthumanbrands.com',
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
  id: 'contract',
  schema: contractSchema,
  placeholders,
  subject: (rawData: ContractPayload) => {
    const pName = rawData?.project.title || placeholders.project.title
    const orgName = rawData?.organization?.name || placeholders.organization.name
    return `Action Required: Contractor Agreement for ${pName} - ${orgName}`
  },
  component: Component,
  transformPayload: (rawData: ContractPayload) => {
    const p = placeholders
    const org = rawData?.organization || {}

    return {
      contractorName: rawData?.contact.name || p.contact.name,
      projectName: rawData?.project.title || p.project.title,
      shootDates: rawData?.project.shootDate || p.project.shootDate,
      compensationAmount: rawData?.totalAmount || p.totalAmount,
      contractLink: rawData?.link || p.link,
      organizationName: org?.name || p.organization.name,
      organizationWebsite: org?.website || p.organization.website,
      organizationLogo: org?.branding?.logo || p.organization.branding.logo,
      organizationColorPrimary: org?.branding?.color?.primary || p.organization.branding.color.primary,
      organizationFont: org?.branding?.font || p.organization.branding.font,
    }
  },
})
