import { defineEventHandler, HTTPError } from 'nitro/h3'
import { templateRegistry } from '#server/utils/template-registry-email.ts'

import '#templates/text/email/index.ts'

export default defineEventHandler(() => {
  try {
    const templates = Object.values(templateRegistry).map((template) => ({
      id: template.id,
      label: template.label,
      description: template.description,
    }))

    return templates
  } catch (error: unknown) {
    console.error('API /interaction/email/template/index GET', error)

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Some Unknown Error Found',
    })
  }
})
