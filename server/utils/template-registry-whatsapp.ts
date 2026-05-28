import type { z } from 'zod'

export interface WhatsAppTemplatePayload {
  header?: { type: 'text' | 'image' | 'document'; content: string }
  body: string
  footer?: string
  buttons?: Array<{ type: 'url' | 'quick_reply'; text: string; url?: string }>
  metadata?: Record<string, any>
}

export interface WhatsAppTemplateDefinition {
  id: string
  schema: z.ZodObject<any, any>
  placeholders?: Record<string, any>
  transformPayload: (rawData: any) => WhatsAppTemplatePayload
}

export const templateRegistry: Record<string, WhatsAppTemplateDefinition> = {}

export default function (definition: WhatsAppTemplateDefinition) {
  if (!definition.id) {
    throw new Error('[WhatsApp Registry Error]: Templates must be registered with a unique "id" attribute.')
  }

  templateRegistry[definition.id] = definition
  console.log(`💬 [WhatsApp Registry]: Successfully registered template -> ${definition.id}`)
}
