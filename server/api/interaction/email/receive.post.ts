import { useRuntimeConfig } from 'nitro/runtime-config'
import { defineEventHandler, HTTPError, readValidatedBody } from 'nitro/h3'
import { z } from 'zod'
import { $fetch } from 'ofetch'
import notion from '~/server/utils/notion'
import notionNormalizeId from '~/server/utils/notion-normalize-id'
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
    const notionDbId = JSON.parse(config.private.notionDbId) as NotionDB

    const emailMatch = from.match(/<([^>]+)>/)
    const rawEmail = emailMatch ? emailMatch[1] : from

    const nameMatch = from.match(/^"?(.*?)"?\s*</)
    const fallbackName = rawEmail.split('@')[0]
    const pocPerson = nameMatch && nameMatch[1].trim() ? nameMatch[1].trim() : fallbackName

    console.log(
      JSON.stringify(
        {
          brand: 'Unknown',
          company: 'Unknown',
          email: rawEmail.toLowerCase().trim(),
          address: 'Unknown',
          pocPerson,
          status: 'Active',
        },
        null,
        2
      )
    )

    const { contactId } = await $fetch('/api/contacts', {
      baseURL: config.public.connectUrl,
      method: 'PUT',
      body: {
        brand: 'Unknown',
        company: 'Unknown',
        email: rawEmail.toLowerCase().trim(),
        address: 'Unknown',
        pocPerson,
        status: 'Active',
      },
    })

    const emailPage = await notion.pages.create({
      parent: { data_source_id: notionDbId.email },
      properties: {
        Title: {
          title: [{ text: { content: subject || 'No Subject' } }],
        },
        Content: {
          rich_text: [{ text: { content: (text || 'HTML content only').slice(0, 2000) } }],
        },
        Status: {
          status: { name: 'Received' },
        },
        Direction: {
          select: { name: 'Inbound' },
        },
        Timestamp: {
          date: { start: new Date().toISOString() },
        },
        ...(contactId ? { Contact: { relation: [{ id: notionNormalizeId(contactId) }] } } : {}),
      },
    })

    return {
      success: true,
      interactionId: emailPage.id,
    }
  } catch (error: any) {
    console.error('API connect/text/email/receive POST', error)

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Failed to process incoming email.',
    })
  }
})
