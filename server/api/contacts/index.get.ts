import { defineEventHandler, getValidatedQuery, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import type { NotionContact, NotionDB } from '~/server/types'
import notion from '~/server/utils/notion'
import notionQueryDb from '~/server/utils/notion-query-db'

const queryParamsSchema = z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const query = await getValidatedQuery(event, queryParamsSchema)

    const limit = query.limit ? Number(query.limit) : 50
    const offset = query.offset ? Number(query.offset) : 0

    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as unknown as NotionDB

    const contacts = await notionQueryDb<NotionContact>(notion, notionDbId.contact)

    const total = contacts.length
    const paginatedContent = contacts.slice(offset, offset + limit)

    const results = paginatedContent.map((page) => {
      const props = page.properties
      return {
        id: page.id,
        url: page.url,
        brand: props.Brand?.title?.[0]?.text?.content || '',
        company: props.Company?.rich_text?.[0]?.text?.content || '',
        email: props.Email?.email || '',
        phone: props.Phone?.phone_number || '',
        status: props.Status?.status?.name || null,
        type: props.Type?.select?.name || null,
      }
    })

    return {
      results,
      pagination: {
        total,
        limit,
        offset,
      },
    }
  } catch (error: any) {
    console.error('API contacts GET', error)

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
