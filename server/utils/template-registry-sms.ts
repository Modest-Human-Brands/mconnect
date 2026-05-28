import type { z } from 'zod'

export interface SMSTemplateDefinition {
  id: string
  schema: z.ZodObject<any, any>
  placeholders: Record<string, any>
  transformPayload: (rawData: any) => Record<string, any>
}

export const templateRegistry: Record<string, SMSTemplateDefinition> = {}

export default function (definition: SMSTemplateDefinition) {
  if (!definition.id) {
    throw new Error('[SMS Registry Error]: Templates must be registered with a unique "id" attribute.')
  }

  templateRegistry[definition.id] = definition
  console.log(`💬 [SMS Registry]: Successfully registered template -> ${definition.id}`)
}
