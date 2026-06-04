import { defineEventHandler, getValidatedQuery, HTTPError } from 'nitro/h3'
import { useStorage } from 'nitro/storage'
import { z } from 'zod'
import type { Resource } from '~/server/types'
import notionTextStringify from '~/server/utils/notion-text-stringify'

const queryParamsSchema = z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const query = await getValidatedQuery(event, queryParamsSchema)

    const limit = query.limit ? Number(query.limit) : 50
    const offset = query.offset ? Number(query.offset) : 0

    const contactStorage = useStorage<Resource<'contact'>>(`data:resource:contact`)
    const contacts = (await contactStorage.getItems(await contactStorage.getKeys())).flatMap(({ value }) => value?.record || [])

    const total = contacts.length
    const paginatedContent = contacts.slice(offset, offset + limit)

    const results = paginatedContent.map(({ id, properties: props, last_edited_time }) => {
      const email = props['Email'].email || null
      const phone = props['Phone'].phone_number || null
      const instagram = notionTextStringify(props['Username']?.rich_text) || null

      const platforms: string[] = []
      if (phone) platforms.push('whatsapp', 'sms', 'phone')
      if (email) platforms.push('email')
      if (instagram) platforms.push('instagram')

      return {
        id,
        name: notionTextStringify(props['Name']?.title) || 'Unknown Contact',
        company: notionTextStringify(props['Company']?.rich_text) || null,
        jobTitle: notionTextStringify(props['Job Title']?.rich_text) || null,
        email,
        phone,
        instagram,
        status: props['Status']?.select?.name || 'Active',

        // Assuming Rollup properties exist on DB 1 for performance, fallback to page timestamps
        lastActive: props['Last Active']?.date?.start || last_edited_time,
        lastMessageSnippet: notionTextStringify(props['Last Message Snippet']?.rich_text) || 'No recent messages.',

        platforms: [...new Set(platforms)],
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

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Failed to fetch contact queue',
    })
  }
})
