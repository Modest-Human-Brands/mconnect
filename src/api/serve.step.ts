import { Handlers, http, StepConfig } from 'motia'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import z from 'zod'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
}

export const config = {
  name: 'ServePublicFolder',
  description: 'Serve Static Files',
  flows: ['serve-static-file-flow'],
  triggers: [
    http('GET', '/public/:filePath', {
      responseSchema: {
        200: z.object({
          status: z.string(),
        }),
      },
    }),
  ],
  enqueues: [],
} as const satisfies StepConfig

export const handler: Handlers<typeof config> = async ({ request, response }) => {
  try {
    console.log('Start')
    const filePath = request.pathParams['filePath'] || request.pathParams['*']
    console.log('Start 2', { filePathParam: JSON.stringify(filePath) })

    const publicDir = resolve(process.cwd(), 'public')
    const targetPath = resolve(publicDir, filePath)

    if (!targetPath.startsWith(publicDir)) {
      response.status(403)
      response.stream.write('Forbidden')
      response.close()
      return
    }

    const fileStat = await stat(targetPath)
    if (!fileStat.isFile()) {
      throw new Error('Not a file')
    }

    const ext = extname(targetPath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    response.status(200)
    response.headers({
      'Content-Type': contentType,
      'Content-Length': fileStat.size.toString(),
      'Cache-Control': 'public, max-age=3600',
    })

    const fileStream = createReadStream(targetPath)

    fileStream.on('data', (chunk) => {
      response.stream.write(chunk)
    })

    fileStream.on('end', () => {
      response.close()
    })

    fileStream.on('error', (err) => {
      console.error(`Error reading stream for ${targetPath}:`, err)
      response.status(500)
      response.close()
    })
  } catch {
    response.status(404)
    response.headers({ 'Content-Type': 'text/json' })
    response.stream.write('404 Not Found')
    response.close()
  }
}
