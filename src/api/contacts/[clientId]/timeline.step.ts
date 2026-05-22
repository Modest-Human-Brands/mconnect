import { http } from 'motia'
import { z } from 'zod'
import notion from '../../../utils/notion'

const notionDbId = JSON.parse(import.meta.env.NOTION_DB_ID)

const pathParamsSchema = z.object({ clientId: z.string() })
const queryParamsSchema = z.object({
  limit: z.number().optional(),
  skip: z.number().optional(),
})
const responseSuccessSchema = z.object({
  results: z.array(z.any()),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    skip: z.number(),
  }),
})

export const config = {
  name: 'GetContactTimeline',
  description: 'Fetch chronological interaction history for a specific contact profile with skip pagination',
  flows: ['contact-timeline-flow'],
  triggers: [
    http('GET', '/api/contacts/:clientId/timeline', {
      pathParams: pathParamsSchema,
      queryParams: queryParamsSchema,
      responseSchema: {
        200: responseSuccessSchema,
      },
    }),
  ],
  enqueues: [],
}

export const handler = async ({ request }) => {
  const { clientId } = request.pathParams as z.infer<typeof pathParamsSchema>
  const { limit, skip } = request.queryParams as z.infer<typeof queryParamsSchema>

  try {
    const allLogs = []
    let hasMore = true
    let currentCursor = undefined

    while (hasMore) {
      const response = await notion.dataSources.query({
        data_source_id: notionDbId.interaction,
        filter: {
          property: 'Contact',
          relation: {
            contains: clientId,
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
      currentCursor = response.next_cursor
    }

    const total = allLogs.length
    const paginatedLogs = allLogs.slice(skip, skip + limit)

    const results = paginatedLogs.map((page) => {
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

    return {
      status: 200,
      body: {
        results,
        pagination: {
          total,
          limit: limit,
          skip: skip,
        },
      },
    }
  } catch (error) {
    return {
      status: 500,
      body: {
        error: 'Failed to retrieve history logs',
        details: error.message,
      },
    }
  }
}
