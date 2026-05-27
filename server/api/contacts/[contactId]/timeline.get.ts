import { defineEventHandler, getQuery, getRouterParams, getValidatedQuery, getValidatedRouterParams, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import type { NotionDB } from '~/server/types'
import notion from '~/server/utils/notion'
import notionQueryDb from '~/server/utils/notion-query-db'

const pathParamsSchema = z.object({ contactId: z.string() })
const queryParamsSchema = z.object({
  limit: z.number().optional(),
  offset: z.number().optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const pathParams = await getValidatedRouterParams(event, pathParamsSchema)
    const query = await getValidatedQuery(event, queryParamsSchema)

    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as unknown as NotionDB

    const { contactId } = pathParams as z.infer<typeof pathParamsSchema>

    const totalCountPlaceholder = 100_000
    const limit = query.limit ? Number(query.limit) : totalCountPlaceholder
    const offset = query.offset ? Number(query.offset) : 0

    const allLogs = await notionQueryDb(notion, notionDbId.interaction, {
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
    })

    const total = allLogs.length
    const paginatedLogs = allLogs.slice(offset, offset + limit)

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
        skip: offset,
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
