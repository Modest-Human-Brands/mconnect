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
  const notionDbId = JSON.parse(config.private.notionDbId) as NotionDB

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
          // Queries DB 1 (Users & Contacts) for internal users
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
            const userPhone = properties['Phone'].phone_number
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
            parent: { data_source_id: notionDbId.call },
            properties: {
              'Call Log ID': {
                title: [{ text: { content: `voice-bridge-${livekitEvent.room?.sid || roomName}` } }],
              },
              Type: {
                select: { name: 'AUDIO' },
              },
              Status: {
                select: { name: 'ONGOING' },
              },
              Network: {
                select: { name: 'CELLULAR' },
              },
              Timeframe: {
                date: { start: new Date().toISOString() },
              },
              Initiator: {
                relation: [{ id: direction === 'inbound-call' ? contactId : routedUserId || contactId }],
              },
              Participants: {
                // Adds both the contact and the mapped agent (if available) to the call participants
                relation: [{ id: contactId }, ...(routedUserId ? [{ id: routedUserId }] : [])],
              },
            },
          })
          break
        }

        break
      }

      case 'participant_joined': {
        console.log(`[Media Room]: ${livekitEvent.participant?.identity} joined.`)
        break
      }

      case 'participant_left': {
        console.log(`[Media Room]: ${livekitEvent.participant?.identity} left.`)
        break
      }

      case 'room_finished': {
        // TODO: Calculate duration and mark Notion interaction as "COMPLETED"
        break
      }

      case 'egress_ended': {
        const filePath = livekitEvent.egressInfo?.fileResults[0].location
        console.log(`[Recording Saved]: File located at ${filePath}`)
        break
      }

      default: {
        break
      }
    }

    return { status: 'success' }
  } catch (error) {
    console.error('API connect/phone/call/receive POST', error)
    throw new HTTPError({ statusCode: 401, statusMessage: 'Unauthorized LiveKit Signature' })
  }
})
