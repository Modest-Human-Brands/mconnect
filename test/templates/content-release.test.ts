import { describe, it, expect, vi, beforeAll } from 'vitest'

const mocks = vi.hoisted(() => ({
  templateConfig: null as any,
}))

vi.mock('~/server/utils/template-registry-email', () => ({
  default: (config: any) => {
    mocks.templateConfig = config
    return config
  },
}))

import '~/templates/text/email/ContentReleaseV1'

describe('Content Release Email Template', () => {
  beforeAll(() => {
    expect(mocks.templateConfig).toBeDefined()
    expect(mocks.templateConfig.id).toBe('content-release')
  })

  it('generates tracked CTA, dynamic pixel, and honeypot with explicit tracking parameters', () => {
    const rawData = {
      recipient: {
        name: 'Alice Smith',
        email: 'alice@example.com',
      },
      emailSubject: 'Special Update',
      content: {
        title: 'New Feature Release',
        imageUrl: 'https://cdn.example.com/cover.jpg',
        linkUrl: 'https://example.com/blog/new-feature',
      },
      unsubscribeUrl: 'https://example.com/unsubscribe',
      tracking: {
        emailId: 'email-alice-999',
        baseUrl: 'https://track.example.com',
      },
      organization: mocks.templateConfig.placeholders.organization,
    }

    const payload = mocks.templateConfig.transformPayload(rawData)

    // 1. Canonical Prop Names
    expect(payload.recipientName).toBe('Alice Smith')
    expect(payload.recipientEmail).toBe('alice@example.com')
    expect(payload.contentTitle).toBe('New Feature Release')

    // 2. Click Wrapping & UTM
    expect(payload.ctaUrl).toContain('https://track.example.com/api/track/click?')
    expect(payload.ctaUrl).toContain('e=email-alice-999')

    const urlParam = new URL(payload.ctaUrl).searchParams.get('url')
    expect(urlParam).toBe('https://example.com/blog/new-feature?ref=mail-content&utm_source=mconnect&utm_medium=email')

    // 3. Dynamic Telemetry Pixel
    expect(payload.trackingPixelUrl).toBe('https://track.example.com/api/track/open?e=email-alice-999')

    // 4. Honeypot Trap Link
    expect(payload.honeypotUrl).toBe('https://track.example.com/api/track/trap?e=email-alice-999')
  })

  it('falls back to placeholder emailId when tracking object is omitted', () => {
    const rawData = {
      recipient: {
        name: 'Bob Jones',
        email: 'bob@domain.com',
      },
      content: {
        title: 'Fallback Testing',
        imageUrl: 'https://cdn.example.com/img.jpg',
        linkUrl: 'https://example.com/article',
      },
      unsubscribeUrl: 'https://example.com/unsub',
      organization: mocks.templateConfig.placeholders.organization,
    }

    const payload = mocks.templateConfig.transformPayload(rawData)
    const defaultEmailId = mocks.templateConfig.placeholders.tracking.emailId

    expect(payload.ctaUrl).toContain(`e=${defaultEmailId}`)
    expect(payload.trackingPixelUrl).toContain(`e=${defaultEmailId}`)
    expect(payload.honeypotUrl).toContain(`e=${defaultEmailId}`)
  })

  it('includes all 6 required organization branding keys per AGENTS.md', () => {
    const payload = mocks.templateConfig.transformPayload(mocks.templateConfig.placeholders)

    expect(payload).toHaveProperty('organizationName')
    expect(payload).toHaveProperty('organizationWebsite')
    expect(payload).toHaveProperty('organizationLogo')
    expect(payload).toHaveProperty('organizationColorPrimary')
    expect(payload).toHaveProperty('organizationColorAccent')
    expect(payload).toHaveProperty('organizationFont')
  })
})
