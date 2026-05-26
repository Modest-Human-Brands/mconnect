import type { Component } from 'vue'

export interface EmailTemplateDefinition {
  id: string
  subject: string | ((data: any) => string)
  component: Component
  transformPayload: (rawData: any) => Record<string, any>
  getAttachments?: (rawData: any) => Promise<any[]>
}

export const templateRegistry: Record<string, EmailTemplateDefinition> = {}

export default function (definition: EmailTemplateDefinition) {
  if (!definition.id) {
    throw new Error('[Email Registry Error]: Templates must be registered with a unique "id" attribute.')
  }

  templateRegistry[definition.id] = definition
  console.log(`📧 [Email Registry]: Successfully registered template -> ${definition.id}`)
}
