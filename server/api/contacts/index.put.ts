import { defineEventHandler, HTTPError, readBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import type { NotionDB } from '~/server/types'
import notion from '~/server/utils/notion'

const CONTACT_STATUSES = ['Unverified', 'Researched', 'Verified', 'Initiate', 'Communicate', 'Converted', 'Cancelled', 'Active', 'Inactive', 'On Hold'] as const
const COMPANY_TYPES = ['Brand', 'Product', 'Agency', 'Food', 'FMCG', 'Sweet', 'Real Estate', 'Hotel', 'Home Decor', 'Leather', 'Garment', 'Cosmetics', 'Jewellery', 'Accessories'] as const

export const contactSchema = z.object({
  id: z.string(),
  url: z.url(),
  createdTime: z.string(),
  lastEditedTime: z.string(),
  index: z.number(),
  brand: z.string().min(1),
  company: z.string().min(1),
  email: z.email(),
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
  pocEmail: z.email().optional().nullable(),
  pocPhone: z.string().optional().nullable(),
  website: z.url().optional().nullable(),
  facebook: z.url().optional().nullable(),
  instagram: z.url().optional().nullable(),
  twitter: z.url().optional().nullable(),
  linkedIn: z.url().optional().nullable(),
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

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as z.infer<typeof bodySchema>
    const properties: Record<string, any> = {}

    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as unknown as NotionDB

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
          properties[target] = { multi_select: value === null || typeof value === 'string' ? [] : value.map((name: string) => ({ name })) }
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
        const phonePages = await notion.dataSources.query({
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
        const emailPages = await notion.dataSources.query({
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

    event.res.status = 200
    return {
      contactId: targetPageId,
      status: operationStatus,
    }
  } catch (error: any) {
    console.error('API contacts PUT', error)

    const { code: errorCode } = error as { code?: string }

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Some Unknown Error Found',
    })
  }
})
