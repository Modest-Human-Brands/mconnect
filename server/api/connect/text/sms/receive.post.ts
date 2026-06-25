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

    const messagePage = await notion.pages.create({
      parent: { data_source_id: notionDbId.messages },
      properties: {
        Title: {
          title: [{ text: { content: text.slice(0, 50) + (text.length > 50 ? '...' : '') } }],
        },
        Content: {
          rich_text: [{ text: { content: text.slice(0, 2000) } }],
        },
        Type: {
          select: { name: 'TEXT' },
        },
        Status: {
          status: { name: 'Delivered' },
        },
        Direction: {
          select: { name: 'Inbound' },
        },
        Channel: {
          select: { name: 'SMS' },
        },
        Timestamp: {
          date: { start: new Date().toDateString() },
        },
        Contact: {
          relation: [{ id: contactId }],
        },
      },
    })

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
