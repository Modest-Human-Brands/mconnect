export const resourceTypes = ['contact', 'user', 'message', 'call', 'email'] as const

export type ResourceType = (typeof resourceTypes)[number]

export type NotionDB = { [K in ResourceType]: string }

export interface ResourceRecordMap {
  contact: NotionContact
  user: NotionUser
  email: NotionEmail
  message: NotionMessage
  call: NotionCall
}

export interface Resource<T extends ResourceType = ResourceType> {
  type: T
  notificationStatus: boolean
  record: ResourceRecordMap[T]
}

type NotionImage =
  | {
      type: 'file'
      file: {
        url: string
        expiry_time: string
      }
    }
  | {
      type: 'external'
      external: {
        url: string
      }
    }
  | null

export interface NotionUser {
  id: string
  created_time: string
  last_edited_time: string
  cover: NotionImage
  icon: NotionImage
  properties: {
    Name: {
      type: 'title'
      title: { plain_text: string }[]
    }
    Organization: {
      type: 'relation'
      relation: { id: string }[]
    }
    Role: {
      type: 'select'
      select: {
        name: 'Admin' | 'Editor' | 'Viewer'
      }
    }
    Status: {
      type: 'status'
      status: {
        name: 'Unfilled' | 'Filled' | 'Verified' | 'Active' | 'Inactive'
      }
    }
    Gender: {
      type: 'select'
      select: {
        name: 'Male' | 'Female' | 'Other'
      }
    }
    DOB: {
      type: 'date'
      date: {
        start: string
      }
    }
    Email: {
      type: 'email'
      email: string
    }
    Phone: {
      type: 'phone_number'
      phone_number: string
    }
    Emails: {
      type: 'relation'
      relation: { id: string }[]
    }
  }
}

export interface NotionMessage {
  id: string
  created_time: string
  last_edited_time: string
  url: string
  properties: {
    'Message Summary': {
      type: 'title'
      title: { plain_text: string; text: { content: string } }[]
    }
    Content: {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
    }
    Type: {
      type: 'select'
      select: { name: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'POST_SHARE' | string } | null
    }
    'Delivery Status': {
      type: 'select'
      select: { name: 'SENT' | 'CARRIER_DELIVERED' | 'DELIVERED' | 'FAILED' | string } | null
    }
    'Sent At': {
      type: 'date'
      date: { start: string; end?: string | null } | null
    }
    'Media/Attachments': {
      type: 'files'
      files: {
        name: string
        type: 'file' | 'external'
        file?: { url: string; expiry_time: string }
        external?: { url: string }
      }[]
    }

    // --- Relations (Omnichannel Linking) ---
    'Chat Thread'?: {
      type: 'relation'
      relation: { id: string }[]
    }
    Contact: {
      type: 'relation'
      relation: { id: string }[]
    }
    'Read By': {
      type: 'relation'
      relation: { id: string }[]
    }
  }
}

export interface NotionContact {
  id: string
  created_time: string
  last_edited_time: string
  cover: NotionImage | null
  icon: NotionImage | null
  url: string
  properties: {
    Name: {
      type: 'title'
      title: { plain_text: string; text: { content: string } }[]
    }
    Username: {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
    }
    Company: {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
    }
    'Job Title': {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
    }
    Email: {
      type: 'email'
      email: string | null
    }
    Phone: {
      type: 'phone_number'
      phone_number: string | null
    }
    'Platform Profile': {
      type: 'url'
      url: string | null
    }
    Status: {
      type: 'select'
      select: { name: 'Active' | 'Inactive' | 'External Contact' | string } | null
    }

    // --- Relations (Omnichannel Linking) ---
    Organization: {
      // Kept optional in case you still maintain a separate B2B DB
      type: 'relation'
      relation: { id: string }[]
    }
    Chats: {
      type: 'relation'
      relation: { id: string }[]
    }
    Emails: {
      type: 'relation'
      relation: { id: string }[]
    }
    Calls: {
      type: 'relation'
      relation: { id: string }[]
    }

    // --- Dynamic/Rollup fields for the UI Queue ---
    'Last Active'?: {
      type: 'date'
      date: { start: string; end?: string | null } | null
    }
    'Last Message Snippet': {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
    }
  }
}

export interface NotionCall {
  id: string
  created_time: string
  last_edited_time: string
  url: string
  properties: {
    'Call Log ID': {
      type: 'title'
      title: { plain_text: string; text: { content: string } }[]
    }
    Type: {
      type: 'select'
      select: { name: 'AUDIO' | 'VIDEO' | string } | null
    }
    Status: {
      type: 'select'
      select: { name: 'ONGOING' | 'COMPLETED' | 'MISSED' | 'BUSY' | string } | null
    }
    Network: {
      type: 'select'
      select: { name: 'IP' | 'CELLULAR' | string } | null
    }

    // --- Telco & Billing Data ---
    'Duration (Seconds)': {
      type: 'number'
      number: number | null
    }
    'Cost ($)': {
      type: 'number'
      number: number | null
    }
    Timeframe: {
      type: 'date'
      date: { start: string; end?: string | null } | null
    }

    // --- Relations (Omnichannel Linking) ---
    'Chat Context'?: {
      type: 'relation'
      relation: { id: string }[]
    }
    Initiator: {
      type: 'relation'
      relation: { id: string }[]
    }
    Participants: {
      type: 'relation'
      relation: { id: string }[]
    }
  }
}

export interface NotionEmail {
  id: string
  created_time: string
  last_edited_time: string
  url: string
  properties: {
    Subject: {
      type: 'title'
      title: { plain_text: string; text: { content: string } }[]
    }
    'Body Snippet': {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
    }
    Status: {
      type: 'select'
      select: { name: 'DRAFT' | 'READY_TO_SEND' | 'SENT' | 'FAILED' | string } | null
    }
    'Sent At': {
      type: 'date'
      date: { start: string; end?: string | null } | null
    }
    Attachments: {
      type: 'files'
      files: {
        name: string
        type: 'file' | 'external'
        file?: { url: string; expiry_time: string }
        external?: { url: string }
      }[]
    }

    // --- Relations (Omnichannel Linking) ---
    Contact: {
      type: 'relation'
      relation: { id: string }[]
    }
    Cc: {
      type: 'relation'
      relation: { id: string }[]
    }
    Bcc: {
      type: 'relation'
      relation: { id: string }[]
    }
    Labels: {
      type: 'relation'
      relation: { id: string }[]
    }
  }
}
