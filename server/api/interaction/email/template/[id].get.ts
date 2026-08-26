import { defineEventHandler, getRouterParam, HTTPError } from 'nitro/h3'
import { templateRegistry } from '~/server/utils/template-registry-email'
import zodToJsonSchema from '~/server/utils/zod-to-json-schema'

import '~/templates/text/email'

export default defineEventHandler((event) => {
  try {
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw new HTTPError({
        statusCode: 400,
        statusMessage: 'Template ID is required',
      })
    }

    const template = templateRegistry[id]

    if (!template) {
      throw new HTTPError({
        statusCode: 404,
        statusMessage: 'Template not found',
      })
    }

    return {
      id: template.id,
      label: template.label,
      description: template.description,
      variables: template.schema ? zodToJsonSchema(template.schema) : {},
    }
  } catch (error: unknown) {
    console.error('API /interaction/email/template/[id] GET', error)

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Some Unknown Error Found',
    })
  }
})
