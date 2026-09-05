import { defineEventHandler, HTTPError, readBody } from 'nitro/h3'
import { render } from '@vue-email/render'
import { useRuntimeConfig } from 'nitro/runtime-config'

import { templateRegistry } from '#server/utils/template-registry-email.ts'

import '#templates/text/email/index.ts'

export default defineEventHandler(async (event) => {
  try {
    const { templateId, variables } = await readBody<{ templateId: string; variables: Record<string, any> }>(event)

    const config = useRuntimeConfig()

    if (!templateId) {
      event.res.status = 400
      event.res.statusText = 'Missing templateId in request body.'
      return { error: 'Missing templateId in request body.' }
    }

    const templateDef = templateRegistry[templateId]
    if (!templateDef) {
      event.res.status = 404
      event.res.statusText = `Template '${templateId}' not found.`
      return { error: `Template '${templateId}' not found.` }
    }

    variables.tracking.baseUrl = config.public.connectUrl
    console.log('---------------------- Test 1 --------------------------')
    const transformedProps = await templateDef.transformPayload(variables || {})
    console.log('---------------------- Test 10 --------------------------')

    const contentHtml = await render(templateDef.component, transformedProps, {
      pretty: false,
    })

    return { contentHtml }
  } catch (error: any) {
    console.error('API /interaction/email/template/preview POST', error)

    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Some Unknown Error Found',
    })
  }
})
