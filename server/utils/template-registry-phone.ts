export interface PhoneTemplateDefinition {
  id: string
  transformPayload: (rawData: any) => string
}

export const templateRegistry: Record<string, PhoneTemplateDefinition> = {}

export default function (definition: PhoneTemplateDefinition) {
  if (!definition.id) {
    throw new Error('[Phone Registry Error]: Templates must be registered with a unique "id" attribute.')
  }

  templateRegistry[definition.id] = definition
  console.log(`[Phone Registry Engine]: Loaded tracking metrics for channel template: "${definition.id}"`)
}
