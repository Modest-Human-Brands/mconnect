import { http, type Handlers, type StepConfig } from 'motia'
import { z } from 'zod'
import notion from '../../utils/notion'

const notionDbId = JSON.parse(import.meta.env.NOTION_DB_ID)

const CONTACT_STATUSES = ['Unverified', 'Researched', 'Verified', 'Initiate', 'Communicate', 'Converted', 'Cancelled', 'Active', 'Inactive', 'On Hold'] as const
const COMPANY_TYPES = ['Brand', 'Product', 'Agency', 'Food', 'FMCG', 'Sweet', 'Real Estate', 'Hotel', 'Home Decor', 'Leather', 'Garment', 'Cosmetics', 'Jewellery', 'Accessories'] as const

export const contactSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  createdTime: z.string(),
  lastEditedTime: z.string(),
  index: z.number(),
  brand: z.string().min(1),
  company: z.string().min(1),
  email: z.string().email(),
  address: z.string().min(1),
  phone: z.string().min(1),
  pocPerson: z.string().min(1),
  status: z.enum(CONTACT_STATUSES).optional().nullable(),
  type: z.enum(COMPANY_TYPES).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  profit: z.number().optional().nullable(),
  projectCount: z.number().optional().nullable(),
  acquisitionDate: z.string().optional().nullable(),
  place: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  pocCompany: z.string().optional().nullable(),
  pocAddress: z.string().optional().nullable(),
  pocEmail: z.string().email().optional().nullable(),
  pocPhone: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  facebook: z.string().url().optional().nullable(),
  instagram: z.string().url().optional().nullable(),
  twitter: z.string().url().optional().nullable(),
  linkedIn: z.string().url().optional().nullable(),
})

export type Contact = z.infer<typeof contactSchema>

const bodySchema = contactSchema
  .omit({
    id: true,
    url: true,
    createdTime: true,
    lastEditedTime: true,
    index: true,
    profit: true,
    projectCount: true,
  })
  .extend({
    contactId: z.string().optional().nullable(),
  })

const NOTION_PROPERTY_MAP = {
  brand: { target: 'Brand', type: 'title' },
  company: { target: 'Company', type: 'rich_text' },
  email: { target: 'Email', type: 'email' },
  address: { target: 'Address', type: 'rich_text' },
  phone: { target: 'Phone', type: 'phone_number' },
  status: { target: 'Status', type: 'status' },
  type: { target: 'Type', type: 'select' },
  tags: { target: 'Tags', type: 'multi_select' },
  place: { target: 'Place', type: 'rich_text' },
  whatsapp: { target: 'Whatsapp', type: 'phone_number' },
  website: { target: 'Website', type: 'url' },
  facebook: { target: 'Facebook', type: 'url' },
  instagram: { target: 'Instagram', type: 'url' },
  twitter: { target: 'Twitter', type: 'url' },
  linkedIn: { target: 'LinkedIn', type: 'url' },
  pocPerson: { target: 'PoC Person', type: 'rich_text' },
  pocCompany: { target: 'PoC Company', type: 'rich_text' },
  pocAddress: { target: 'PoC Address', type: 'rich_text' },
  pocEmail: { target: 'PoC Email', type: 'email' },
  pocPhone: { target: 'PoC Phone', type: 'phone_number' },
  acquisitionDate: { target: 'Acquisition Date', type: 'rich_text' },
} as const

export const config = {
  name: 'UpsertContact',
  description: 'Upsert profiles in the unified Notion CRM using derived schemas',
  flows: ['contact-upsert-flow'],
  triggers: [
    http('PUT', '/api/contacts', {
      bodySchema: bodySchema,
      responseSchema: {
        200: z.object({ contactId: z.string(), status: z.string() }),
      },
    }),
  ],
  enqueues: [],
} as const satisfies StepConfig

export const handler: Handlers<typeof config> = async ({ request }) => {
  const body = request.body as z.infer<typeof bodySchema>

  try {
    const properties: Record<string, any> = {}

    for (const [incomingKey, value] of Object.entries(body)) {
      if (value === undefined || incomingKey === 'contactId') continue

      const mapping = NOTION_PROPERTY_MAP[incomingKey as keyof typeof NOTION_PROPERTY_MAP]
      if (!mapping) continue

      const { target, type } = mapping

      switch (type) {
        case 'title': {
          properties[target] = { title: value === null ? [] : [{ text: { content: value } }] }
          break
        }
        case 'status': {
          properties[target] = { status: value === null ? null : { name: value } }
          break
        }
        case 'select': {
          properties[target] = { select: value === null ? null : { name: value } }
          break
        }
        case 'multi_select': {
          properties[target] = { multi_select: value === null ? [] : value.map((name: string) => ({ name })) }
          break
        }
        case 'rich_text': {
          properties[target] = { rich_text: value === null ? [] : [{ text: { content: value } }] }
          break
        }
        case 'url': {
          properties[target] = { url: value }
          break
        }
        case 'phone_number': {
          properties[target] = { phone_number: value }
          break
        }
        case 'email': {
          properties[target] = { email: value }
          break
        }
      }
    }

    let targetPageId = body.contactId

    if (!targetPageId) {
      if (body.phone) {
        const phonePages = await notion.databases.query({
          data_source_id: notionDbId.contact,
          filter: {
            property: 'Phone',
            phone_number: { contains: body.phone },
          },
        })

        if (phonePages.results.length > 0) {
          targetPageId = phonePages.results[0].id
        }
      }

      if (!targetPageId && body.email) {
        const emailPages = await notion.databases.query({
          data_source_id: notionDbId.contact,
          filter: {
            property: 'Email',
            email: { equals: body.email },
          },
        })

        if (emailPages.results.length > 0) {
          targetPageId = emailPages.results[0].id
        }
      }
    }

    let operationStatus = 'updated'

    if (targetPageId) {
      await notion.pages.update({
        page_id: targetPageId,
        properties,
      })
    } else {
      const newPage = await notion.pages.create({
        parent: { data_source_id: notionDbId.contact },
        properties,
      })
      targetPageId = newPage.id
      operationStatus = 'created'
    }

    return {
      status: 200,
      body: {
        contactId: targetPageId,
        status: operationStatus,
      },
    }
  } catch (error: any) {
    return {
      status: 500,
      body: {
        error: 'Failed to upsert CRM entry',
        details: error.message,
      },
    }
  }
}
