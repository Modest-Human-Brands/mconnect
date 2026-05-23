import { defineEventHandler, getQuery, HTTPError } from 'nitro/h3'
import { z } from 'zod'
import fs from 'node:fs'
import path from 'node:path'

const querySchema = z.object({
  callUuid: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { callUuid } = query as z.infer<typeof querySchema>
    const sessionTrackingId = callUuid || `stream-${Date.now()}`

    const outputDir = path.resolve('./static/recordings/live')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const localFilePath = path.join(outputDir, `${sessionTrackingId}.raw`)
    const writeStream = fs.createWriteStream(localFilePath)

    console.log(`[Media Engine]: Live connection verified. Ingesting binary audio blocks for session: ${sessionTrackingId}`)

    if (event.req && typeof event.req.on === 'function') {
      event.req.on('data', (chunk: Buffer) => {
        writeStream.write(chunk)

        // 📡 Action B: Push chunk frame down your live streaming buffer array (e.g., FFmpeg / RTMP broadcast)
        // livestreamBroadcaster.emitFrame(chunk);
      })
      event.req.on('end', () => {
        writeStream.end()
        console.log(`[Media Engine]: Stream track closed for session: ${sessionTrackingId}. File saved at ${localFilePath}`)
      })
    }

    event.res.status = 200
    event.res.headers.set('Content-Type', 'application/octet-stream')
    event.res.headers.set('Transfer-Encoding', 'chunked')
    event.res.end()
  } catch (error: any) {
    console.error('API connect/call/phone/stream POST', error)

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
