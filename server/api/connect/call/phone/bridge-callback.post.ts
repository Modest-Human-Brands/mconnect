import { defineEventHandler, getQuery, HTTPError } from 'nitro/h3'
import { z } from 'zod'
import notion from '~/server/utils/notion'
import { compileBridgeResponse } from '~/server/utils/voice-providers'

const querySchema = z.object({
  contactId: z.string().optional(),
  userId: z.string().optional(),
  recordCall: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { contactId, userId, recordCall } = query as z.infer<typeof querySchema>

    const clientPage = (await notion.pages.retrieve({ page_id: contactId! })) as any
    const legBNumber = clientPage?.properties?.Phone?.phone_number || clientPage?.properties?.Phone?.phone

    console.log(`[Bridge Webhook Received] Target Client: ${legBNumber}, Record Flag: ${recordCall}, Contact Context: ${contactId}, Agent Context: ${userId}`)

    if (!legBNumber) {
      console.error('[Bridge Callback Error]: Missing target destination number inside parameters query layout.')
      event.res.status = 400
      return 'Missing required bridging parameters context.'
    }

    console.log(`[Bridge Callback]: Leg A connected successfully. Compiling instruction matrix to connect Leg B (${legBNumber})`)

    const compilation = await compileBridgeResponse({
      legBNumber,
      recordCall: Boolean(recordCall),
      contactId,
      userId,
    })

    event.res.status = 201
    event.res.headers.set('Content-Type', compilation.contentType)

    return compilation.body
  } catch (error: any) {
    console.error('API connect/call/phone/bridge-callback POST', error)

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
