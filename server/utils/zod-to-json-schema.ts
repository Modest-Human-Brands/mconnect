export default function parseSchemaVariables(schema: any): Record<string, any> {
  const variables: Record<string, any> = {}

  if (!schema?.shape) return variables

  for (const [key, zodItem] of Object.entries(schema.shape)) {
    let currentDef = zodItem as any

    while (currentDef?._def?.innerType) {
      currentDef = currentDef._def.innerType
    }

    const typeName = currentDef?._def?.typeName || currentDef?.constructor?.name || 'any'
    const cleanType = typeName.replace('Zod', '').toLowerCase()

    if (cleanType === 'object') {
      variables[key] = parseSchemaVariables(currentDef)
    } else if (cleanType === 'array' && currentDef._def?.type) {
      let arrayElem = currentDef._def.type
      while (arrayElem?._def?.innerType) arrayElem = arrayElem._def.innerType

      const elemTypeName = arrayElem?._def?.typeName || arrayElem?.constructor?.name || 'any'
      const cleanElemType = elemTypeName.replace('Zod', '').toLowerCase()

      if (cleanElemType === 'object') {
        variables[key] = [parseSchemaVariables(arrayElem)]
      } else {
        variables[key] = `array<${cleanElemType}>`
      }
    } else {
      variables[key] = cleanType
    }
  }
  return variables
}
