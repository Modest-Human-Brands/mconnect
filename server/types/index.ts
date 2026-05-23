export const resourceTypes = ['contact', 'interaction', 'user'] as const

export type ResourceType = (typeof resourceTypes)[number]

export type NotionDB = { [K in ResourceType]: string }
