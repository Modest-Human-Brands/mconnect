import { http, type Handlers, type StepConfig } from 'motia'
import { z } from 'zod'
import notion from '../../utils/notion'

const notionDbId = JSON.parse(import.meta.env.NOTION_DB_ID)

const queryParamsSchema = z.object({
  limit: z.number().optional(),
  offset: z.number().optional(),
})
const responseSuccessSchema = z.object({
  results: z.array(z.any()),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  }),
})

export const config = {
  name: 'ListContacts',
  description: 'Retrieve a paginated list of contacts using traditional offset formatting',
  flows: ['contact-list-flow'],
  triggers: [
    http('GET', '/api/contacts', {
      queryParams: queryParamsSchema,
      responseSchema: {
        200: responseSuccessSchema,
      },
    }),
  ],
  enqueues: [],
} as const satisfies StepConfig

export const handler: Handlers<typeof config> = async ({ request }) => {
  const { limit = 50, offset = 0 } = request.queryParams as z.infer<typeof queryParamsSchema>

  try {
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
      currentCursor = response.next_cursor
    }

    const total = allRecords.length
    const paginatedPages = allRecords.slice(offset, offset + limit)

    const results = paginatedPages.map((page) => {
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
      status: 200,
      body: {
        results,
        pagination: {
          total,
          limit,
          offset: offset,
        },
      },
    }
  } catch (error) {
    return {
      status: 500,
      body: {
        error: 'Failed to fetch contacts list',
        details: error.message,
      },
    }
  }
}
