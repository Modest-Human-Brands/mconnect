export interface PaginatedEmails {
  meta: PaginationMeta
  messages: EmailMessage[]
}

export interface PaginationMeta {
  page: number
  totalPages: number
  totalMessages: number
  isCached: boolean
}

export interface EmailContact {
  name: string
  email: string
}

export interface EmailStatus {
  isRead: boolean
  isAnswered: boolean
  rawFlags: string[]
}

export interface EmailAttachment {
  id: string
  name: string
  type: string
  size: number
  isInline: boolean
  contentId?: string
}

export interface EmailBody {
  id: string
  htmlSize?: number
  plainSize?: number
}

export interface EmailMessage {
  id: string // The base64 ID
  messageId: string // The global <...xyz> message ID
  uid: number // The IMAP numeric UID
  folder: string // Mapped from 'path' (e.g., "INBOX.Sent")
  timestamp: string // Mapped from 'date'
  subject: string
  size: number
  sender: EmailContact
  to: EmailContact[]
  replyTo: EmailContact[]
  status: EmailStatus
  bodyMeta: EmailBody
  attachments: EmailAttachment[]
}

// --- OLD SCHEMA DEFINITIONS (For type-safety in the transformer) ---
interface OldContact {
  address: string
  name: string
}
interface OldAttachment {
  contentType: string
  embedded: boolean
  encodedSize: number
  filename: string
  id: string
  inline: boolean
  contentId?: string
}
interface OldMessage {
  attachments?: OldAttachment[]
  date: string
  flags: string[]
  from: OldContact
  hasAttachments: boolean
  headers: any
  id: string
  labels: string[] | null
  messageId: string
  messageSpecialUse: string
  path: string
  replyTo?: OldContact[]
  size: number
  specialUse: string
  subject: string
  text: { encodedSize: { 'text/html'?: number; 'text/plain'?: number }; id: string }
  to: OldContact[]
  uid: number
  unseen: boolean
}
export interface HostingerEmailSchema {
  cached: boolean
  messages: OldMessage[]
  page: number
  pages: number
  total: number
}
