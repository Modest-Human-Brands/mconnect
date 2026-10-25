type NotionIcon = { type?: string; external?: { url: string }; file?: { url: string } } | null | undefined

/** URL of a Notion page icon, whether it is an external link or a Notion-hosted file. */
export default function (icon: NotionIcon) {
  if (icon?.type === 'external') return icon.external?.url
  if (icon?.type === 'file') return icon.file?.url
  return undefined
}
