import { z } from 'zod'

export default function parseSchemaVariables(schema: z.ZodTypeAny): Record<string, any> {
  const jsonSchema = z.toJSONSchema(schema, {
    unrepresentable: 'any',

    override: (ctx) => {
      const isDate = ctx.zodSchema instanceof z.ZodDate || (ctx.zodSchema as any)._def?.typeName === 'ZodDate' || (ctx.zodSchema as any)._zod?.def?.type === 'date'

      if (isDate) {
        ctx.jsonSchema.type = 'date'
      }

      let s = ctx.zodSchema as any
      while (s && !s._def?.format && !s._def?.checks && !s._zod?.def?.format && (s._def?.innerType || s._def?.schema || s._zod?.def?.innerType || s._zod?.def?.schema)) {
        s = s._def?.innerType || s._def?.schema || s._zod?.def?.innerType || s._zod?.def?.schema
      }

      const def = s?._zod?.def || s?._def || s

      const candidates = [def?.type, def?.typeName, def?.format, def?.kind, def?.name, s?.type, s?.format].filter(Boolean).map(String)

      if (Array.isArray(def?.checks)) {
        for (const c of def.checks) {
          if (c?.kind) candidates.push(String(c.kind))
          if (c?.type) candidates.push(String(c.type))
          if (c?.format) candidates.push(String(c.format))
        }
      }

      for (const cand of candidates) {
        const val = cand.toLowerCase()
        if (val === 'datetime' || val === 'iso.datetime' || val === 'date-time') {
          ctx.jsonSchema.type = 'string'
          ctx.jsonSchema.format = 'date-time'
          break
        }
        if (val === 'time' || val === 'iso.time') {
          ctx.jsonSchema.type = 'string'
          ctx.jsonSchema.format = 'time'
          break
        }
        if (val === 'date' || val === 'iso.date') {
          ctx.jsonSchema.type = 'string'
          ctx.jsonSchema.format = 'date'
          break
        }
      }
    },
  })

  const mapped = mapJsonSchemaToVariables(jsonSchema)

  return typeof mapped === 'object' && !Array.isArray(mapped) ? mapped : {}
}

function mapJsonSchemaToVariables(jsonSchema: any): any {
  if (!jsonSchema) return 'any'

  if (jsonSchema.anyOf || jsonSchema.oneOf) {
    const validTypes = (jsonSchema.anyOf || jsonSchema.oneOf).filter((s: any) => s.type !== 'null')
    if (validTypes.length > 0) return mapJsonSchemaToVariables(validTypes[0])
  }

  if (jsonSchema.enum && Array.isArray(jsonSchema.enum)) {
    return `enum:${jsonSchema.enum.join(',')}`
  }

  if (jsonSchema.type === 'array') {
    const items = jsonSchema.items

    if (items && items.type === 'object') {
      return [mapJsonSchemaToVariables(items)]
    } else if (items && items.type) {
      return `array<${items.type}>`
    }
    return 'array<any>'
  }

  if (jsonSchema.type === 'object') {
    if (jsonSchema.properties) {
      const obj: Record<string, any> = {}
      for (const [key, propSchema] of Object.entries(jsonSchema.properties)) {
        obj[key] = mapJsonSchemaToVariables(propSchema)
      }
      return obj
    }

    if (jsonSchema.additionalProperties !== false) {
      return 'record'
    }
    return 'object'
  }

  if (jsonSchema.format) {
    const fmt = String(jsonSchema.format).toLowerCase()
    if (fmt === 'email') return 'email'
    if (fmt === 'uri' || fmt === 'url') return 'url'
    if (fmt === 'date-time' || fmt === 'datetime' || fmt === 'iso.datetime') return 'datetime'
    if (fmt === 'time' || fmt === 'iso.time') return 'time'
    if (fmt === 'date' || fmt === 'iso.date') return 'date'
  }

  if (jsonSchema.type) {
    return jsonSchema.type
  }

  return 'any'
}
