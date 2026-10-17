import { useStorage } from 'nitro/storage'
import { defineTask } from 'nitro/task'
import { pdf } from 'pdf-to-img'

const PDF_PATTERN = /\.pdf$/i

export default defineTask({
  meta: {
    name: 'thumbnail:pdf',
    description: 'Generates the missing "<name>-preview.png" first-page thumbnail for every PDF in the fs storage',
  },
  async run() {
    const storage = useStorage('fs')
    const keys = await storage.getKeys()
    const pdfKeys = keys.filter((key) => PDF_PATTERN.test(key))

    const generated: string[] = []
    const failed: Record<string, string> = {}
    let skipped = 0

    for (const key of pdfKeys) {
      const previewKey = key.replace(PDF_PATTERN, '-preview.png')
      if (await storage.hasItem(previewKey)) {
        skipped++
        continue
      }

      try {
        const source = await storage.getItemRaw<Uint8Array>(key)
        if (!source) continue

        // Only the first page is needed for a thumbnail.
        const document = await pdf(Buffer.from(source), { scale: 1.5 })
        const firstPage = await document.getPage(1)
        await storage.setItemRaw(previewKey, firstPage)
        generated.push(previewKey)
      } catch (error: any) {
        console.error(`[thumbnail:pdf] ${key} failed:`, error?.message || error)
        failed[key] = error?.message || 'unknown error'
      }
    }

    console.info(`[thumbnail:pdf] ${generated.length} generated, ${skipped} already present, ${Object.keys(failed).length} failed`)
    return { result: { generated, skipped, failed } }
  },
})
