import { promises as fs } from 'node:fs'
import path from 'node:path'
import { render } from '@vue-email/render'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { defineTask } from 'nitro/task'

import htmlToPng from '#server/utils/html-to-png.ts'
import { templateRegistry } from '#server/utils/template-registry-email.ts'

import '#templates/text/email/index.ts'

// Tracked with Git LFS (see .gitattributes)
const OUTPUT_DIR = './public/templates'

export default defineTask({
  meta: {
    name: 'thumbnail:template',
    description: 'Renders the neutral sample (placeholder) variant of every email template to public/templates/<id>.png',
  },
  async run({ payload }) {
    const onlyId = typeof payload?.id === 'string' ? payload.id : undefined
    const templates = Object.values(templateRegistry).filter((t) => !onlyId || t.id === onlyId)
    const { connectUrl } = useRuntimeConfig().public

    await fs.mkdir(path.resolve(OUTPUT_DIR), { recursive: true })

    const generated: string[] = []
    const failed: Record<string, string> = {}

    for (const template of templates) {
      try {
        const variables = structuredClone(template.placeholders)
        if (variables?.tracking?.baseUrl) variables.tracking.baseUrl = connectUrl

        const html = await render(template.component, template.transformPayload(variables), { pretty: false })
        const outputPath = path.resolve(OUTPUT_DIR, `${template.id}.png`)
        await fs.writeFile(outputPath, await htmlToPng(html))
        generated.push(template.id)
      } catch (error: any) {
        console.error(`[thumbnail:template] ${template.id} failed:`, error?.message || error)
        failed[template.id] = error?.message || 'unknown error'
      }
    }

    console.info(`[thumbnail:template] ${generated.length} generated, ${Object.keys(failed).length} failed`)
    return { result: { generated, failed } }
  },
})
