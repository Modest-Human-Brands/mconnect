import { http, type Handlers, type StepConfig } from 'motia'
import { z } from 'zod'
import { compileBridgeResponse } from '../../../../utils/voice-providers'
import notion from '../../../../utils/notion'

const querySchema = z.object({
  contactId: z.string().optional(),
  userId: z.string().optional(),
  recordCall: z.string().optional(),
})

export const config = {
  name: 'VoiceOutboundBridgeCallback',
  description: 'Intercepts Vobiz webhooks once Leg A answers and returns vendor-agnostic layout instructions to bridge Leg B',
  flows: ['voice-routing-flow'],
  triggers: [
    http('POST', '/api/connect/call/phone/bridge-callback', {
      queryParams: querySchema,
    }),
  ],
  enqueues: [],
} as const satisfies StepConfig

export const handler: Handlers<typeof config> = async ({ request, response }) => {
  try {
    const { contactId, userId, recordCall } = request.queryParams as z.infer<typeof querySchema>

    const clientPage = (await notion.pages.retrieve({ page_id: contactId! })) as any
    const legBNumber = clientPage?.properties?.Phone?.phone_number || clientPage?.properties?.Phone?.phone

    console.log(`[Bridge Webhook Received] Target Client: ${legBNumber}, Record Flag: ${recordCall}, Contact Context: ${contactId}, Agent Context: ${userId}`)

    if (!legBNumber) {
      console.error('[Bridge Callback Error]: Missing target destination number inside parameters query layout.')
      return {
        status: 400,
        body: 'Missing required bridging parameters context.',
      }
    }

    console.log(`[Bridge Callback]: Leg A connected successfully. Compiling instruction matrix to connect Leg B (${legBNumber})`)

    const compilation = await compileBridgeResponse({
      legBNumber,
      recordCall: Boolean(recordCall),
      contactId,
      userId,
    })

    response.status(201)
    response.headers({
      'Content-Type': compilation.contentType,
    })
    response.stream.write(compilation.body)
    response.close()

    // return {
    //   status: 201,
    //   body: compilation.body,
    //   headers:{
    //    'Content-Type': compilation.contentType,
    //   }
    // }
  } catch (error: any) {
    console.error('❌ [Voice Bridge Callback Compilation Failure]:', error)
    return {
      status: 500,
      body: 'Internal Telephony Bridge Callback Compilation Failure',
    }
  }
}
