import { defineEventHandler } from 'nitro/h3'
import { templateRegistry } from '~/server/utils/template-registry-whatsapp'
import zodToJsonSchema from '~/server/utils/zod-to-json-schema'

import '~/templates/text/whatsapp'

export default defineEventHandler(() => {
  const templates = Object.keys(templateRegistry).map((id) => {
    const template = templateRegistry[id]
    return {
      id,
      variables: zodToJsonSchema(template.schema),
    }
  })

  return templates
})
