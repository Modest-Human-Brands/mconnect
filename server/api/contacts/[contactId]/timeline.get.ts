import { defineEventHandler, getQuery, getRouterParams, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import type { NotionDB } from '~/server/types'
import notion from '~/server/utils/notion'

const pathParamsSchema = z.object({ contactId: z.string() })

export default defineEventHandler(async (event) => {
  try {
    const pathParams = getRouterParams(event)
    const query = getQuery(event)

    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as unknown as NotionDB

    const { contactId } = pathParams as z.infer<typeof pathParamsSchema>

    const totalCountPlaceholder = 100_000
    const limit = query.limit ? Number(query.limit) : totalCountPlaceholder
    const skip = query.skip ? Number(query.skip) : 0

    const allLogs = []
    let hasMore = true
    let currentCursor = undefined

    while (hasMore) {
      const response = await notion.dataSources.query({
        data_source_id: notionDbId.interaction,
        filter: {
          property: 'Contact',
          relation: {
            contains: contactId,
          },
        },
        sorts: [
          {
            property: 'Timestamp',
            direction: 'descending',
          },
        ],
        page_size: 100,
        start_cursor: currentCursor,
      })

      allLogs.push(...response.results)
      hasMore = response.has_more
      currentCursor = response.next_cursor ?? undefined
    }

    const total = allLogs.length
    const paginatedLogs = allLogs.slice(skip, skip + limit)

    const results = paginatedLogs.map((page: any) => {
      const props = page.properties
      return {
        interactionId: props['Interaction ID']?.title?.[0]?.text?.content || page.id,
        channel: props['Channel']?.select?.name || 'unknown',
        direction: props['Direction']?.select?.name || 'unknown',
        timestamp: props['Timestamp']?.date?.start || page.created_time,
        summary: props['Summary']?.rich_text?.[0]?.text?.content || '',
        recordingUrl: props['Recording URL']?.url || null,
      }
    })

    event.res.status = 200
    return {
      results,
      pagination: {
        total,
        limit: query.limit ? Number(query.limit) : total,
        skip,
      },
    }
  } catch (error: any) {
    console.error('API contacts/[contactId]/timeline GET', error)

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
