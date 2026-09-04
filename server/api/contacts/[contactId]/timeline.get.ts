import { defineEventHandler, getValidatedQuery, getValidatedRouterParams, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import type { NotionCall, NotionDB, NotionEmail, NotionMessage } from '~/server/types'
import notion from '#server/utils/notion.ts'
import notionQueryDb from '#server/utils/notion-query-db.ts'
import notionTextStringify from '#server/utils/notion-text-stringify.ts'

const pathParamsSchema = z.object({ contactId: z.string() })
const queryParamsSchema = z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const { contactId } = await getValidatedRouterParams(event, pathParamsSchema)
    const query = await getValidatedQuery(event, queryParamsSchema)

    const config = useRuntimeConfig()
    const notionDbId = JSON.parse(config.private.notionDbId) as NotionDB

    const totalCountPlaceholder = 100_000
    const limit = query.limit ? Number(query.limit) : totalCountPlaceholder
    const offset = query.offset ? Number(query.offset) : 0

    const [emailsRaw, messagesRaw, callsRaw] = await Promise.all([
      notionQueryDb<NotionEmail>(notion, notionDbId.email, {
        filter: {
          or: [{ property: 'Contact', relation: { contains: contactId } }],
        },
      }),
      notionQueryDb<NotionMessage>(notion, notionDbId.message, {
        filter: {
          or: [{ property: 'Contact', relation: { contains: contactId } }],
        },
      }),
      notionQueryDb<NotionCall>(notion, notionDbId.call, {
        filter: {
          or: [{ property: 'Contact', relation: { contains: contactId } }],
        },
      }),
    ])

    const mappedMessages = messagesRaw.map((p) => {
      return {
        interactionId: p.id,
        channel: p.properties.Channel?.select?.name?.toLowerCase() || 'whatsapp',
        direction: p.properties.Direction?.select?.name?.toLowerCase() || 'outbound',
        timestamp: p.properties.Timestamp?.date?.start || p.created_time,
        summary: notionTextStringify(p.properties.Title?.title) || 'Sent an attachment',
        status: p.properties.Status?.status?.name?.toLowerCase() || 'delivered',
        metadata: {
          hasAttachments: (p.properties.Attachments?.files?.length || 0) > 0,
          mediaUrl: p.properties.Attachments?.files?.[0]?.file?.url || p.properties.Attachments?.files?.[0]?.external?.url || null,
        },
      }
    })

    const mappedCalls = callsRaw.map((p) => {
      const type = p.properties.Type?.select?.name || 'AUDIO'
      return {
        interactionId: p.id,
        channel: 'phone',
        direction: p.properties.Direction?.select?.name?.toLowerCase() || 'outbound',
        timestamp: p.properties.Timestamp?.date?.start || p.created_time,
        summary: notionTextStringify(p.properties.Title?.title) || `${type} Call`,
        status: p.properties.Status?.status?.name?.toLowerCase() || 'completed',
        metadata: {},
      }
    })

    const mappedEmails = emailsRaw.map((p) => {
      const subject = notionTextStringify(p.properties.Title.title) || 'No Subject'
      const content = notionTextStringify(p.properties.Content.rich_text) || ''

      return {
        interactionId: p.id,
        channel: 'email',
        direction: p.properties.Direction.select?.name?.toLowerCase() || 'outbound',
        timestamp: p.properties.Timestamp.date?.start || p.created_time,
        content: content,
        status: p.properties.Status.status?.name?.toLowerCase() || 'sent',
        metadata: {
          subject,
          hasAttachments: (p.properties.Attachments.files?.length || 0) > 0,
        },
      }
    })

    const unifiedTimeline = [...mappedMessages, ...mappedCalls, ...mappedEmails]

    unifiedTimeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const total = unifiedTimeline.length
    const results = unifiedTimeline.slice(offset, offset + limit)

    // Extract full HTML body ONLY for the paginated emails to avoid rate limits
    await Promise.all(
      results.map(async (interaction) => {
        if (interaction.channel === 'email') {
          try {
            const blocks = await notion.blocks.children.list({ block_id: interaction.interactionId })
            const codeBlock = (blocks.results as any[]).find((b) => b.type === 'code' && b.code?.language === 'html')

            if (codeBlock && codeBlock.code?.rich_text) {
              const htmlContent = notionTextStringify(codeBlock.code.rich_text)
              if (htmlContent) {
                interaction.content = htmlContent // Overrides the fallback snippet
              }
            }
          } catch {
            // Fails silently; the interaction.content remains the fallback property snippet
          }
        }
      })
    )

    return {
      client_id: contactId,
      results,
      pagination: {
        total,
        limit: query.limit ? Number(query.limit) : total,
        skip: offset,
      },
    }
  } catch (error: any) {
    console.error('API contacts/[contactId]/timeline GET', error)

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Failed to generate omnichannel timeline.',
    })
  }
})
