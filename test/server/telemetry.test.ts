import { describe, it, expect, beforeEach } from 'vitest'
import type { H3Event } from 'h3'
import { extractTelemetry } from '~/server/utils/telemetry'
import { appleMppCidrs } from '~/server/plugins/apple-mpp'

// Lightweight mock helper for H3Event
function createMockEvent(options: { userAgent?: string; ip?: string; headers?: Record<string, string> }): H3Event {
  const headers = new Map<string, string>()

  if (options.userAgent) {
    headers.set('user-agent', options.userAgent)
  }
  if (options.ip) {
    headers.set('x-forwarded-for', options.ip)
  }
  if (options.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      headers.set(k.toLowerCase(), v)
    }
  }

  return {
    req: {
      headers: {
        get: (name: string) => headers.get(name.toLowerCase()) || null,
      },
    },
    node: {
      req: {
        headers: Object.fromEntries(headers),
        socket: { remoteAddress: options.ip || '127.0.0.1' },
      },
    },
  } as unknown as H3Event
}

describe('extractTelemetry', () => {
  beforeEach(() => {
    appleMppCidrs.length = 0
  })

  it('identifies human desktop traffic accurately', () => {
    const event = createMockEvent({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ip: '8.8.8.8',
    })

    const telemetry = extractTelemetry(event)

    expect(telemetry.isBot).toBe(false)
    expect(telemetry.deviceType).toBe('desktop')
    expect(telemetry.ip).toBe('8.8.8.8')
  })

  it('identifies human mobile traffic on iOS/Android', () => {
    const iphoneEvent = createMockEvent({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      ip: '8.8.8.8',
    })
    const androidEvent = createMockEvent({
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36',
      ip: '8.8.8.8',
    })

    expect(extractTelemetry(iphoneEvent).deviceType).toBe('mobile')
    expect(extractTelemetry(androidEvent).deviceType).toBe('mobile')
    expect(extractTelemetry(iphoneEvent).isBot).toBe(false)
  })

  it('flags known security scanners and search engine bots', () => {
    const botUserAgents = [
      { ua: 'Googlebot/2.1 (+http://www.google.com/bot.html)', expected: 'agent:googlebot' },
      { ua: 'Mozilla/5.0 (compatible; Barracuda Sentinel)', expected: 'agent:barracuda' },
      { ua: 'Proofpoint-Email-Protection-Scanner/1.0', expected: 'agent:proofpoint' },
      { ua: 'GoogleImageProxy', expected: 'agent:googleimageproxy' },
      { ua: 'Mimecast / Email Security', expected: 'agent:mimecast' },
    ]

    for (const { ua, expected } of botUserAgents) {
      const event = createMockEvent({ userAgent: ua })
      const telemetry = extractTelemetry(event)

      expect(telemetry.isBot).toBe(expected)
      expect(telemetry.deviceType).toBe('unknown')
    }
  })

  it('identifies Apple Mail Privacy Protection via CIDR range', () => {
    // Populate mock Apple MPP CIDR list
    appleMppCidrs.push('17.58.0.0/16', '2620:149:a40::/44')

    const ipv4Event = createMockEvent({
      userAgent: 'Mozilla/5.0',
      ip: '17.58.12.34',
    })
    const ipv6Event = createMockEvent({
      userAgent: 'Mozilla/5.0',
      ip: '2620:149:a40::1',
    })

    const telemetry4 = extractTelemetry(ipv4Event)
    const telemetry6 = extractTelemetry(ipv6Event)

    expect(telemetry4.isBot).toBe('apple-mpp')
    expect(telemetry6.isBot).toBe('apple-mpp')
    expect(telemetry4.deviceType).toBe('unknown')
  })

  it('handles missing headers and unknown IP without throwing', () => {
    const event = createMockEvent({})
    const telemetry = extractTelemetry(event)

    expect(telemetry.isBot).toBe(false)
    expect(telemetry.deviceType).toBe('desktop')
    expect(telemetry.location).toEqual({ country: null, city: null, timezone: null })
  })
})
