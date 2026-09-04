import { H3Event, getRequestIP } from 'h3'
import geoip from 'geoip-lite'
import ipaddr from 'ipaddr.js'
import { appleMppCidrs } from '#server/plugins/apple-mpp.ts'

const KNOWN_BOT_AGENTS = ['googleimageproxy', 'barracuda', 'proofpoint', 'mimecast', 'cisco', 'bingbot', 'googlebot']

export interface TelemetryData {
  ip: string
  userAgent: string
  isBot: string | false
  deviceType: 'mobile' | 'desktop' | 'unknown'
  location: {
    country: string | null
    city: string | null
    timezone: string | null
  }
  timestamp: Date
}

function isIpInCidrList(ipStr: string, cidrList: string[]): boolean {
  try {
    const ip = ipaddr.parse(ipStr)
    for (const cidrStr of cidrList) {
      const cidr = ipaddr.parseCIDR(cidrStr)
      // eslint-disable-next-line unicorn/prefer-regexp-test
      if (ip.kind() === cidr[0].kind() && ip.match(cidr)) {
        return true
      }
    }
  } catch {
    // Fails silently if IP is malformed
  }
  return false
}

export function extractTelemetry(event: H3Event): TelemetryData {
  const userAgent = (event.req.headers.get('user-agent') || '').toLowerCase()
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'

  let isBot: string | false = false

  const matchedBot = KNOWN_BOT_AGENTS.find((bot) => userAgent.includes(bot))
  if (matchedBot) {
    isBot = `agent:${matchedBot}`
  }

  if (!isBot && ip !== 'unknown' && isIpInCidrList(ip, appleMppCidrs)) {
    isBot = 'apple-mpp'
  }

  let locationData: { country: string | null; city: string | null; timezone: string | null } = { country: null, city: null, timezone: null }
  if (ip !== 'unknown') {
    const geo = geoip.lookup(ip)
    if (geo) {
      locationData = {
        country: geo.country || null,
        city: geo.city || null,
        timezone: geo.timezone || null,
      }
    }
  }

  let deviceType: 'mobile' | 'desktop' | 'unknown' = 'unknown'
  if (!isBot) {
    deviceType = /mobile|android|iphone|ipad/i.test(userAgent) ? 'mobile' : 'desktop'
  }

  return {
    ip,
    userAgent,
    isBot,
    deviceType,
    location: locationData,
    timestamp: new Date(),
  }
}
