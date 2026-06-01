import { useRuntimeConfig } from 'nitro/runtime-config'
import { defineEventHandler, HTTPError, readValidatedBody } from 'nitro/h3'
import { z } from 'zod'
import { $fetch } from 'ofetch'
import notion from '~/server/utils/notion'
import type { NotionDB } from '~/server/types'

const bodySchema = z.object({
  from: z.string(),
  to: z.string(),
  subject: z.string(),
  text: z.string().optional(),
  html: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const { from, to, subject, text, html } = await readValidatedBody(event, bodySchema)

    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as unknown as NotionDB

    const nameMatch = from.match(/^"?(.*?)"?\s*<.+>$/)
    const fallbackName = from.split('@')[0]
    const pocPerson = nameMatch ? nameMatch[1] : fallbackName

    const { contactId } = await $fetch('/api/contacts', {
      baseURL: 'http://localhost:3000',
      method: 'PUT',
      body: {
        brand: 'Unknown',
        company: 'Unknown',
        email: from.toLowerCase().trim(),
        phone: '',
        address: 'Unknown',
        pocPerson,
        status: 'Communicate',
      },
    })

    const interactionPage = await notion.pages.create({
      parent: { data_source_id: notionDbId.interaction },
      properties: {
        Id: {
          title: [{ text: { content: `email-${Date.now()}` } }],
        },
        Channel: {
          select: { name: 'email' },
        },
        Direction: {
          select: { name: 'inbound' },
        },
        Timestamp: {
          date: { start: new Date().toISOString() },
        },
        Summary: {
          rich_text: [{ text: { content: `Subject: ${subject}\n\n${text || 'HTML content only'}` } }],
        },
        Contact: {
          relation: [{ id: contactId }],
        },
      },
    })

    event.res.status = 200
    return {
      success: true,
      interactionId: interactionPage.id,
    }
  } catch (error: any) {
    console.error('API connect/text/email/receive POST', error)

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
