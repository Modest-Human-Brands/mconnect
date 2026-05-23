import { http, type Handlers, type StepConfig } from 'motia'
import { z } from 'zod'
import fs from 'node:fs'
import path from 'node:path'

const querySchema = z.object({
  callUuid: z.string().optional(),
})

export const config = {
  name: 'VoiceLiveMediaStreamProxy',
  description: 'Ingests real-time raw audio binary payloads straight out of the active HTTP request stream pipeline wrapper',
  flows: ['voice-routing-flow'],
  triggers: [
    http('POST', '/api/connect/call/phone/stream', {
      queryParams: querySchema,
    }),
  ],
  enqueues: [],
} as const satisfies StepConfig

export const handler: Handlers<typeof config> = async ({ request, response }) => {
  const { callUuid } = request.queryParams as z.infer<typeof querySchema>
  const sessionTrackingId = callUuid || `stream-${Date.now()}`

  const outputDir = path.resolve('./static/recordings/live')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const localFilePath = path.join(outputDir, `${sessionTrackingId}.raw`)
  const writeStream = fs.createWriteStream(localFilePath)

  console.log(`[Media Engine]: Live connection verified. Ingesting binary audio blocks for session: ${sessionTrackingId}`)

  if (request.body && typeof (request.body as any).on === 'function') {
    ;(request.body as any).on('data', (chunk: Buffer) => {
      writeStream.write(chunk)

      // 📡 Action B: Push chunk frame down your live streaming buffer array (e.g., FFmpeg / RTMP broadcast)
      // livestreamBroadcaster.emitFrame(chunk);
    })
    ;(request.body as any).on('end', () => {
      writeStream.end()
      console.log(`[Media Engine]: Stream track closed for session: ${sessionTrackingId}. File saved at ${localFilePath}`)
    })
  } else if (Buffer.isBuffer(request.body)) {
    writeStream.write(request.body)
    writeStream.end()
  }

  response.status(200)
  response.headers({
    'Content-Type': 'application/octet-stream',
    'Transfer-Encoding': 'chunked',
  })
  response.close()
}
