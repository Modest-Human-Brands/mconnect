import { useRuntimeConfig } from 'nitro/runtime-config'
import { defineEventHandler, HTTPError, readValidatedBody } from 'nitro/h3'
import { z } from 'zod'
import { $fetch } from 'ofetch'
import notion from '~/server/utils/notion'

const bodySchema = z.object({
  from: z.string(),
  to: z.string(),
  text: z.string(),
})

export default defineEventHandler(async (event) => {
  try {
    const { from, to, text } = await readValidatedBody(event, bodySchema)

    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as any

    // Upserts the contact using your queue endpoint
    const { contactId } = await $fetch('/api/contacts', {
      baseURL: 'http://localhost:3000',
      method: 'PUT',
      body: {
        brand: 'Unknown',
        company: 'Unknown',
        email: '',
        phone: from.trim(),
        address: 'Unknown',
        pocPerson: from,
        status: 'Active',
      },
    })

    // Log the inbound SMS into DATABASE 3: MESSAGES
    const messagePage = await notion.pages.create({
      parent: { data_source_id: notionDbId.messages },
      properties: {
        'Message Summary': {
          title: [{ text: { content: text.slice(0, 50) + (text.length > 50 ? '...' : '') } }],
        },
        Content: {
          rich_text: [{ text: { content: text.slice(0, 2000) } }],
        },
        Type: {
          select: { name: 'TEXT' },
        },
        'Delivery Status': {
          select: { name: 'DELIVERED' },
        },
        'Sent At': {
          date: { start: new Date().toISOString() },
        },
        Contact: {
          relation: [{ id: contactId }], // External contact sent this to us
        },
      },
    })

    event.res.status = 200
    return {
      success: true,
      interactionId: messagePage.id,
    }
  } catch (error: any) {
    console.error('API connect/text/sms/receive POST', error)

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Failed to process incoming SMS.',
    })
  }
})
