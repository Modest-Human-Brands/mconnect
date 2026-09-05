export default function parseSchemaVariables(schema: any): Record<string, any> {
  const variables: Record<string, any> = {}

  // 1. Unwrap ONLY modifier wrappers, never arrays or objects
  function unwrap(item: any): any {
    let current = item
    let depth = 0
    while (current && depth++ < 15) {
      const typeName = current?._def?.typeName || current?.constructor?.name || ''

      if (typeName === 'ZodOptional' || typeName === 'ZodNullable' || typeName === 'ZodDefault' || typeName === 'ZodReadonly') {
        current = current._def.innerType
      } else if (typeName === 'ZodEffects' || typeName === 'ZodPipeline') {
        current = current._def.schema || current._def.in
      } else if (typeof current.unwrap === 'function') {
        current = current.unwrap()
      } else {
        break
      }
    }
    return current
  }

  // 2. Helper to resolve primitive and complex types
  function resolveType(zodItem: any): any {
    const current = unwrap(zodItem)
    if (!current) return 'any'

    const rawType = typeof current?._def?.type === 'string' ? current._def.type : current?._def?.typeName || current?.constructor?.name || 'any'
    const cleanType = rawType.replace('Zod', '').toLowerCase()

    if (cleanType === 'object') {
      return parseSchemaVariables(current)
    }

    if (cleanType === 'array') {
      const elemSchema = unwrap(current.element || current._def?.element || (typeof current._def?.type === 'object' ? current._def.type : null))

      const elemRawType = typeof elemSchema?._def?.type === 'string' ? elemSchema._def.type : elemSchema?._def?.typeName || elemSchema?.constructor?.name || 'any'
      const cleanElemType = elemRawType.replace('Zod', '').toLowerCase()

      if (cleanElemType === 'object') {
        return [parseSchemaVariables(elemSchema)]
      }
      return `array<${cleanElemType}>`
    }

    if (cleanType === 'record') {
      const valueSchema = current.valueSchema || current._def?.valueType || current._def?.schema
      return {
        '[key: string]': resolveType(valueSchema),
      }
    }

    return cleanType
  }

  // 3. Extract shape from object schema
  const currentSchema = unwrap(schema)
  const shape =
    typeof currentSchema?.shape === 'function'
      ? currentSchema.shape()
      : currentSchema?.shape || (typeof currentSchema?._def?.shape === 'function' ? currentSchema._def.shape() : currentSchema?._def?.shape)

  if (!shape || typeof shape !== 'object') return variables

  for (const [key, zodItem] of Object.entries(shape)) {
    variables[key] = resolveType(zodItem)
  }

  return variables
}
