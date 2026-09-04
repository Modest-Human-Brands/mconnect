export interface TelemetryRecord {
  id: string
  type: 'open' | 'click' | 'trap'
  emailId: string
  targetUrl?: string
  ip?: string
  userAgent?: string
  deviceType?: 'mobile' | 'desktop' | 'unknown'
  location?: {
    country: string | null
    city: string | null
    timezone: string | null
  }
  timestamp: string | Date
  isValid: boolean
  isBot: string | false
  syncedAt?: string
  invalidatedReason?: string
}
