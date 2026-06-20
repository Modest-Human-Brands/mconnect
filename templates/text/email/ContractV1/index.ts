import Component from './component.vue'
import registerTemplate from '~/server/utils/template-registry-email'
import { z } from 'zod'

export const contractSchema = z.object({
  contractorName: z.string(),
  projectName: z.string(),
  shootDates: z.string(),
  compensationAmount: z.string(),
  contractLink: z.string(),
  organization: z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    website: z.string(),
    branding: z.object({
      logo: z.string(),
      color: z.object({
        primary: z.string(),
        accent: z.string(),
      }),
      font: z.string(),
    }),
    socials: z.record(z.any(), z.any()).optional(),
  }),
})

export type contractPayload = z.infer<typeof contractSchema>

const placeholders: contractPayload = {
  contractorName: 'Alex Mercer',
  projectName: 'Autumn Commercial Shoot',
  shootDates: 'October 12th - October 14th',
  compensationAmount: '₹ 45,000',
  contractLink: '#',
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
  subject: (data: any) => {
    const pName = data?.projectName || placeholders.projectName
    const orgName = data?.organization?.name || placeholders.organization.name
    return `Action Required: Contractor Agreement for ${pName} - ${orgName}`
  },
  component: Component,
  transformPayload: (data: any) => {
    const p = placeholders
    const org = data?.organization || {}

    // We separate the raw deep schema from the flattened computed inputs needed by the Vue component
    return {
      contractorName: data?.contractorName || p.contractorName,
      projectName: data?.projectName || p.projectName,
      shootDates: data?.shootDates || p.shootDates,
      compensationAmount: data?.compensationAmount || p.compensationAmount,
      contractLink: data?.contractLink || p.contractLink,

      // Computed Organization Variables
      organizationName: org?.name || p.organization.name,
      organizationWebsite: org?.website || p.organization.website,
      organizationLogo: org?.branding?.logo || p.organization.branding.logo,
      organizationColorPrimary: org?.branding?.color?.primary || p.organization.branding.color.primary,
      organizationFont: org?.branding?.font || p.organization.branding.font,
    }
  },
})
