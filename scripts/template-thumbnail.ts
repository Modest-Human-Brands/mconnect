import fs from 'node:fs'
import path from 'node:path'
import nodeHtmlToImage from 'node-html-to-image'

const API_BASE_URL = (process.env.NITRO_PUBLIC_CONNECT_URL || 'https://connect.modesthumanbrands.com').replace(/\/$/, '')

interface TemplateSummary {
  id: string
  label: string
  description?: string
}

interface TemplateSchemaResponse {
  id: string
  placeholders?: Record<string, unknown>
}

interface PreviewApiResponse {
  contentHtml?: string
  error?: string | { message?: string }
}

async function fetchTemplateList(): Promise<TemplateSummary[]> {
  const response = await fetch(`${API_BASE_URL}/api/interaction/email/template`)
  if (!response.ok) {
    throw new Error(`Failed to load templates: ${response.status} ${response.statusText}`)
  }
  return (await response.json()) as TemplateSummary[]
}

async function fetchTemplateSchema(id: string): Promise<TemplateSchemaResponse> {
  const response = await fetch(`${API_BASE_URL}/api/interaction/email/template/${id}`)
  if (!response.ok) {
    return { id, placeholders: {} }
  }
  return (await response.json()) as TemplateSchemaResponse
}

async function fetchPreviewHtml(templateId: string, variables: Record<string, unknown> = {}): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/interaction/email/template/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      templateId,
      variables,
    }),
  })

  if (!response.ok) {
    throw new Error(`API responded with HTTP ${response.status}: ${response.statusText}`)
  }

  const data = (await response.json()) as PreviewApiResponse

  if (!data.contentHtml) {
    const message = typeof data.error === 'object' ? data.error?.message : data.error
    throw new Error(message || 'No contentHtml returned from preview endpoint.')
  }

  return data.contentHtml
}

async function generateAllTemplatePreviews(): Promise<void> {
  const outputDir = './public/previews'

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const templates = await fetchTemplateList()
  console.log(`Found ${templates.length} registered template(s).`)

  for (const template of templates) {
    const id = template.id
    try {
      console.log(`Generating preview for [${id}]...`)

      let placeholders: Record<string, unknown> = {}
      try {
        const schema = await fetchTemplateSchema(id)
        placeholders = schema.placeholders ?? {}
      } catch {
        placeholders = {}
      }

      const finalHtml = await fetchPreviewHtml(id, placeholders)
      const outputPath = path.join(outputDir, `${id}.png`)

      await nodeHtmlToImage({
        output: outputPath,
        html: finalHtml,
        puppeteerArgs: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          defaultViewport: {
            width: 576,
            height: 600,
          },
        },
      })

      console.log(`✓ Generated: ${outputPath}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`✗ Failed to generate preview for [${id}]:`, message)
    }
  }

  console.log('Batch preview generation complete.')
}

await generateAllTemplatePreviews()
