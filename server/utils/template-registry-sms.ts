export interface SMSTemplateDefinition {
  id: string
  transformPayload: (rawData: any) => Record<string, any>
}

export const templateRegistry: Record<string, SMSTemplateDefinition> = {}

export default function (definition: SMSTemplateDefinition) {
  if (!definition.id) {
    throw new Error('[SMS Registry Error]: Templates must be registered with a unique "id" attribute.')
  }

  templateRegistry[definition.id] = definition
  console.log(`📧[SMS Registry Engine]: Loaded tracking metrics for channel template: "${definition.id}"`)
}
