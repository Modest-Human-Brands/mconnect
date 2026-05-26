import { defineEventHandler, getQuery, getValidatedQuery, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import type { NotionDB } from '~/server/types'
import notion from '~/server/utils/notion'

const queryParamsSchema = z.object({
  limit: z.number().optional(),
  offset: z.number().optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const query = await getValidatedQuery(event, queryParamsSchema)

    const limit = query.limit ? Number(query.limit) : 50
    const offset = query.offset ? Number(query.offset) : 0

    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as unknown as NotionDB

    console.log({ notionDbId: notionDbId.contact })

    const allRecords = []
    let hasMore = true
    let currentCursor = undefined

    while (hasMore) {
      const response = await notion.dataSources.query({
        data_source_id: notionDbId.contact,
        page_size: 100,
        start_cursor: currentCursor,
      })

      allRecords.push(...response.results)
      hasMore = response.has_more
      currentCursor = response.next_cursor ?? undefined
    }

    const total = allRecords.length
    const paginatedPages = allRecords.slice(offset, offset + limit)

    const results = paginatedPages.map((page: any) => {
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

    event.res.status = 200
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
