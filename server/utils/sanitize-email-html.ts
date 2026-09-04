export default function (html: string): string {
  if (!html) return ''

  return (
    html
      // 1. Remove 1x1 tracking pixel img tag
      .replace(/<img[^>]*\/api\/track\/open[^>]*>/gi, '')
      // 2. Remove invisible honeypot trap link
      .replace(/<a[^>]*\/api\/track\/trap[^>]*>[\s\S]*?<\/a>/gi, '')
      // 3. Unwrap click tracking URLs back to their raw destination
      .replace(/(href=["'])[^"']*\/api\/track\/click\?[^"']*url=([^&"']+)[^"']*(["'])/gi, (_match, prefix, targetUrl, suffix) => {
        try {
          return `${prefix}${decodeURIComponent(targetUrl)}${suffix}`
        } catch {
          return _match
        }
      })
  )
}
