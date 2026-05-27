import { defineEventHandler, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { SipClient, WebhookReceiver } from 'livekit-server-sdk'
import { loadConfig } from 'c12'
import { $fetch } from 'ofetch'

import notion from '~/server/utils/notion'
import type { NotionDB, NotionUser } from '~/server/types'
import notionQueryDb from '~/server/utils/notion-query-db'

export default defineEventHandler(async (event) => {
  const {
    config: {
      voiceConfig: { sip: sipSettings, activeProvider, providers },
    },
  } = await loadConfig({ configFile: '../config/messaging.config.yaml' })

  const sipTrunkId = providers?.[activeProvider]?.trunkId

  if (!sipTrunkId) {
    throw new Error(`[Voice Utility Error]: No active Outbound SIP Trunk mapping found for vendor string: "${providers?.[activeProvider]}"`)
  }

  const config = useRuntimeConfig()
  const notionDbId = JSON.parse(config.private.notionDbId) as unknown as NotionDB

  if (!sipSettings?.apiKey || !sipSettings?.apiSecret) {
    throw new HTTPError({ statusCode: 500, statusMessage: 'LiveKit credentials missing.' })
  }

  const receiver = new WebhookReceiver(sipSettings.apiKey, sipSettings.apiSecret)

  const rawBody = await event.req.text()
  const authHeader = event.req.headers.get('Authorization')

  if (!rawBody || !authHeader) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'Missing body or signature.' })
  }

  try {
    const livekitEvent = await receiver.receive(rawBody, authHeader)
    const roomName = livekitEvent.room?.name || 'unknown-room'

    console.log(`[LiveKit Webhook]: 🔔 Received '${livekitEvent.event}' for room: ${roomName}`)

    switch (livekitEvent.event) {
      case 'room_started': {
        // The room name format from our Dispatch Rule is "inbound-call_919330504883_XACjqZ7vDph6" or "outbound-call_dafsgfgadhgfhbgfhagffdg"
        const [direction, ...rest] = roomName.split('_')

        console.log(`[Routing Engine]: ${direction} call detected from ${rest[0]}. Upserting contact...`)

        const { contactId } = await $fetch<{
          contactId: string
          status: string
        }>('/api/contacts', {
          baseURL: 'http://localhost:3000',
          method: 'PUT',
          body:
            direction === 'inbound-call'
              ? {
                  brand: 'Unknown',
                  company: 'Unknown',
                  phone: '+' + rest[0],
                  email: 'unkown@unknown.com',
                  address: 'Unknown',
                  pocPerson: 'Unknown',
                  status: 'Communicate',
                }
              : {
                  contactId: rest[0],
                  status: 'Communicate',
                },
        })

        console.log(`[Routing Engine]: Customer ID resolved -> ${contactId}. Fetching agents...`)

        const sipClient = new SipClient(sipSettings.host, sipSettings.apiKey, sipSettings.apiSecret)

        let routedUserId: string | undefined
        let routingSummary = `[${direction === 'outbound-call' ? 'Outbound' : 'Inbound'} Audio Bridge Initiated via LiveKit]\nRoom Tracking Identity: ${roomName}\n`

        if (direction === 'inbound-call') {
          const users = await notionQueryDb<NotionUser>(notion, notionDbId.user, {
            filter: {
              and: [
                { property: 'Status', status: { equals: 'Verified' } },
                {
                  or: [
                    { property: 'Role', select: { equals: 'Sales' } },
                    { property: 'Role', select: { equals: 'Marketing' } },
                  ],
                },
              ],
            },
            sorts: [{ property: 'Priority', direction: 'ascending' }],
          })

          for (const { id: userId, properties } of users) {
            const userPhone = properties?.Phone?.phone_number
            if (!userPhone) continue

            console.log(`[Routing Engine]: Checking presence for Agent ${userId} (${userPhone})...`)

            // eslint-disable-next-line no-constant-condition
            if (false) {
              // && presence && presence.status === 'online'
              console.log(`[Routing Engine]: Agent is at their desk! Pushing WebRTC alert.`)

              // 2. Send a real-time WebSocket alert to the agent's browser tab
            } else {
              console.log(`[Routing Engine]: Agent is offline. PSTN dial to ${userPhone}.`)

              await sipClient.createSipParticipant(sipTrunkId, userPhone, roomName, {
                participantIdentity: `user-${userId}`,
                participantName: 'User Leg',
              })

              routedUserId = userId
              routingSummary += `User Dial Method: SIP Trunk (${userPhone})\n`
              break
            }
          }

          await notion.pages.create({
            parent: { data_source_id: notionDbId.interaction },
            properties: {
              'Interaction ID': { title: [{ text: { content: `voice-bridge-${livekitEvent.room?.sid || roomName}` } }] },
              Channel: { select: { name: 'voice' } },
              Direction: { select: { name: direction.split('-')[0] } },
              Timestamp: { date: { start: new Date().toISOString() } },
              Summary: { rich_text: [{ text: { content: routingSummary } }] },
              Contact: { relation: [{ id: contactId }] },
              ...(routedUserId ? { User: { relation: [{ id: routedUserId }] } } : {}),
            },
          })
          break
        }

        break
      }

      case 'participant_joined': {
        // 💡 Triggered when either a SIP trunk or a WebRTC agent joins
        console.log(`[Media Room]: ${livekitEvent.participant?.identity} joined.`)
        break
      }

      case 'participant_left': {
        console.log(`[Media Room]: ${livekitEvent.participant?.identity} left.`)
        break
      }

      case 'room_finished': {
        // 💡 Triggered when the call is fully hung up
        // TODO: Calculate duration and mark Notion interaction as "Completed"
        break
      }

      case 'egress_ended': {
        // 💡 Triggered when the MP4 recording is successfully saved
        const filePath = livekitEvent.egressInfo?.fileResults[0].location
        console.log(`[Recording Saved]: File located at ${filePath}`)
        // TODO: Attach this file path/URL to the Notion Interaction record
        break
      }

      default: {
        // Ignore unhandled events like 'track_published' to prevent log spam
        break
      }
    }

    // Always return a 200 OK so LiveKit knows we received it successfully
    return { status: 'success' }
  } catch (error) {
    console.error('API connect/phone/call/status POST', error)

    throw new HTTPError({ statusCode: 401, statusMessage: 'Unauthorized LiveKit Signature' })
  }
})
