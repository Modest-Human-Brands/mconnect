import { useRuntimeConfig } from 'nitro/runtime-config'
import { defineEventHandler, HTTPError, readValidatedBody } from 'nitro/h3'
import { z } from 'zod'
import { $fetch } from 'ofetch'
import notion from '#server/utils/notion.ts'
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

    const { contactId } = await $fetch('/api/contacts', {
      baseURL: config.public.connectUrl,
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
      parent: { data_source_id: notionDbId.message },
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
          select: { name: 'WhatsApp' },
        },
        Timestamp: {
          date: { start: new Date().toISOString() },
        },
        Contact: {
          relation: [{ id: contactId }],
        },
      },
    })

    return {
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
