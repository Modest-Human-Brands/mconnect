import { defineEventHandler, getValidatedQuery, getValidatedRouterParams, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import type { NotionCall, NotionDB, NotionEmail, NotionMessage } from '~/server/types'
import notion from '~/server/utils/notion'
import notionQueryDb from '~/server/utils/notion-query-db'

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
      const isSender = p.properties.Contact.relation.some((r: any) => r.id === contactId)
      return {
        interactionId: p.id,
        channel: 'whatsapp', // Assumes default channel for DB3 is WhatsApp (or parse from DB2)
        direction: isSender ? 'inbound' : 'outbound',
        timestamp: p.properties['Sent At']?.date?.start || p.created_time,
        summary: p.properties['Message Summary']?.title?.[0]?.plain_text || 'Sent an attachment',
        status: p.properties['Delivery Status']?.select?.name?.toLowerCase() || 'delivered',
        metadata: {
          hasAttachments: (p.properties['Media/Attachments']?.files?.length || 0) > 0,
          mediaUrl: p.properties['Media/Attachments']?.files?.[0]?.file?.url || p.properties['Media/Attachments']?.files?.[0]?.external?.url || null,
        },
      }
    })

    const mappedCalls = callsRaw.map((p) => {
      const isInitiator = p.properties['Initiator']?.relation?.some((r: any) => r.id === contactId)
      const type = p.properties['Type']?.select?.name || 'AUDIO'
      return {
        interactionId: p.id,
        channel: 'phone',
        direction: isInitiator ? 'inbound' : 'outbound',
        timestamp: p.properties['Timeframe']?.date?.start || p.created_time,
        summary: p.properties['Call Log ID']?.title?.[0]?.plain_text || `${isInitiator ? 'Incoming' : 'Outgoing'} ${type} Call`,
        status: p.properties['Status']?.select?.name?.toLowerCase() || 'completed',
        metadata: {
          durationSeconds: p.properties['Duration (Seconds)']?.number || 0,
          cost: p.properties['Cost ($)']?.number || 0,
        },
      }
    })

    const mappedEmails = emailsRaw.map((p) => {
      const isSender = p.properties.Contact.relation.some((r: any) => r.id === contactId)
      const subject = p.properties['Subject']?.title?.[0]?.plain_text || 'No Subject'
      const snippet = p.properties['Body Snippet']?.rich_text?.[0]?.plain_text || ''
      return {
        interactionId: p.id,
        channel: 'email',
        direction: isSender ? 'inbound' : 'outbound',
        timestamp: p.properties['Sent At']?.date?.start || p.created_time,
        summary: snippet ? `${subject} - ${snippet}` : subject,
        status: p.properties['Status']?.select?.name?.toLowerCase() || 'sent',
        metadata: {
          hasAttachments: (p.properties['Attachments']?.files?.length || 0) > 0,
          labels: p.properties['Labels']?.relation?.map((r: any) => ({ id: r.id })) || [], // If you fetch DB6, you can map real names/colors here
        },
      }
    })

    const unifiedTimeline = [...mappedMessages, ...mappedCalls, ...mappedEmails]

    unifiedTimeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const total = unifiedTimeline.length
    const results = unifiedTimeline.slice(offset, offset + limit)

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
