import fs from 'node:fs'
import * as compilerDom from '@vue/compiler-dom'
import * as VueRuntime from 'vue'
import { Html, Head, Body, Img, Container, Section, Text, Button, Tailwind, Font, Hr } from '@vue-email/components'
import type { Component } from 'vue'

export interface EmailTemplateDefinition {
  id: string
  subject: string | ((data: any) => string)
  component: Component
  transformPayload: (rawData: any) => Record<string, any>
  getAttachments?: (rawData: any) => Promise<any[]>
}

export const templateRegistry: Record<string, EmailTemplateDefinition> = {}

const emailComponents = { Html, Head, Body, Img, Container, Section, Text, Button, Tailwind, Font, Hr }

interface RegisterOptions {
  id: string
  subject: string | ((data: any) => string)
  componentPath: string
  transformPayload: (rawData: any) => Record<string, any>
  getAttachments?: (rawData: any) => Promise<any[]>
}

export default function registerVueTemplate(options: RegisterOptions) {
  if (!fs.existsSync(options.componentPath)) {
    throw new Error(`[Registry Error]: Could not locate template file at: ${options.componentPath}`)
  }

  const fileContent = fs.readFileSync(options.componentPath, 'utf8')
  const templateMatch = fileContent.match(/<template>([\s\S]*)<\/template>/)
  if (!templateMatch) {
    throw new Error(`[Compiler Error]: Template file at "${options.componentPath}" is missing a <template> block.`)
  }

  const compiledResult = compilerDom.compile(templateMatch[1], {
    mode: 'function',
    hoistStatic: true,
    prefixIdentifiers: true,
  })

  const factoryTemplateRunner = new Function('Vue', compiledResult.code)
  const executableRenderFunction = factoryTemplateRunner(VueRuntime)

  const compiledComponent: Component = {
    setup(props, { attrs }) {
      return attrs
    },
    render: executableRenderFunction,
    components: emailComponents,
  }

  templateRegistry[options.id] = {
    id: options.id,
    subject: options.subject,
    component: compiledComponent,
    transformPayload: options.transformPayload,
    getAttachments: options.getAttachments,
  }

  console.log(`[Email Registry Engine]: Eagerly compiled layout: "${options.id}"`)
}
