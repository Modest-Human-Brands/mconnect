import { useRuntimeConfig } from 'nitro/runtime-config'
import { defineEventHandler, HTTPError, readValidatedBody } from 'nitro/h3'
import { z } from 'zod'
import { $fetch } from 'ofetch'
import notion from '~/server/utils/notion'
import type { NotionDB } from '~/server/types'

const bodySchema = z.object({
  from: z.string(),
  to: z.string(),
  text: z.string(),
})

export default defineEventHandler(async (event) => {
  try {
    const { from, to, text } = await readValidatedBody(event, bodySchema)

    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as NotionDB

    // Resolve or generate standard database contact layout identity frame
    const { contactId } = await $fetch('/api/contacts', {
      baseURL: 'http://localhost:3001',
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

    // Log the incoming session response transaction directly inside DATABASE 3: MESSAGES
    const messagePage = await notion.pages.create({
      parent: { data_source_id: notionDbId.message },
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
          relation: [{ id: contactId }],
        },
      },
    })

    event.res.status = 200
    return {
      success: true,
      interactionId: messagePage.id,
    }
  } catch (error: any) {
    console.error('API connect/text/whatsapp/receive POST', error)

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Failed to safely index inbound WhatsApp event stream data.',
    })
  }
})
