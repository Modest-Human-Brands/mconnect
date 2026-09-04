export const resourceTypes = ['user', 'contact', 'message', 'call', 'email', 'telemetry'] as const

export type ResourceType = (typeof resourceTypes)[number]

export type NotionDB = { [K in ResourceType]: string }

export interface ResourceRecordMap {
  user: NotionUser
  contact: NotionContact
  email: NotionEmail
  message: NotionMessage
  call: NotionCall
  telemetry: NotionTelemetry
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

export interface NotionOrganization {
  id: string
  created_time: string
  last_edited_time: string
  cover: NotionImage
  icon: NotionImage
  properties: {
    Index: {
      type: 'number'
      number: number
    }
    Name: {
      type: 'title'
      title: { plain_text: string }[]
    }
    Id: {
      type: 'rich_text'
      rich_text: {
        text: {
          content: string
        }
      }[]
    }
    Phone: {
      type: 'phone_number'
      phone_number: string
    }
    Whatsapp: {
      type: 'url'
      url: string
    }
    Website: {
      type: 'url'
      url: string
    }
    Branding: {
      type: 'rich_text'
      rich_text: {
        text: {
          content: string
        }
      }[]
    }
    'Legal Name': {
      type: 'rich_text'
      rich_text: {
        text: {
          content: string
        }
      }[]
    }
    'Entity Type': {
      type: 'select'
      select: { name: string } | null
    }
    'Trade Relationship': {
      type: 'select'
      select: { name: string } | null
    }
    GSTIN: {
      type: 'rich_text'
      rich_text: {
        text: {
          content: string
        }
      }[]
    }
    PAN: {
      type: 'rich_text'
      rich_text: {
        text: {
          content: string
        }
      }[]
    }
    Address: {
      type: 'rich_text'
      rich_text: {
        text: {
          content: string
        }
      }[]
    }
    'Account Details': {
      type: 'rich_text'
      rich_text: {
        text: {
          content: string
        }
      }[]
    }
    'Contact Email': {
      type: 'email'
      email: string | null
    }
    'Billing Email': {
      type: 'email'
      email: string | null
    }
    'Founded Year': {
      type: 'number'
      number: number
    }
    'Social Links': {
      type: 'rich_text'
      rich_text: {
        text: {
          content: string
        }
      }[]
    }
    'Primary Contact': {
      type: 'relation'
      relation: { id: string }[]
    }
    'Organization Members': {
      type: 'relation'
      relation: { id: string }[]
    }
    Contact: {
      type: 'relation'
      relation: { id: string }[]
    }
    Interactions: {
      type: 'relation'
      relation: { id: string }[]
    }
    Project: {
      type: 'relation'
      relation: { id: string }[]
    }
    Document: {
      type: 'relation'
      relation: { id: string }[]
    }
    Asset: {
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
    Index: {
      type: 'number'
      number: number | null
    }
    Status: {
      type: 'select'
      select: { name: 'Researched' | 'Active' | 'Inactive' | 'External Contact' | string } | null
    }
    Company: {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
    }
    Type: {
      type: 'select'
      select: { name: string } | null
    }
    Address: {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
    }
    Place: {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
    }
    Email: {
      type: 'email'
      email: string | null
    }
    Whatsapp: {
      type: 'phone_number'
      phone_number: string | null
    }
    Phone: {
      type: 'phone_number'
      phone_number: string | null
    }
    Website: {
      type: 'url'
      url: string | null
    }
    Facebook: {
      type: 'url'
      url: string | null
    }
    Instagram: {
      type: 'url'
      url: string | null
    }
    Twitter: {
      type: 'url'
      url: string | null
    }
    LinkedIn: {
      type: 'url'
      url: string | null
    }
    'Platform Profile': {
      type: 'url'
      url: string | null
    }
    Username: {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
    }
    Tags: {
      type: 'multi_select'
      multi_select: { name: string }[]
    }

    // --- Point of Contact Details ---
    'PoC Person': {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
    }
    'PoC Company': {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
    }
    'PoC Address': {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
    }
    'PoC Email': {
      type: 'email'
      email: string | null
    }
    'PoC Phone': {
      type: 'phone_number'
      phone_number: string | null
    }

    // --- Dates & Project ---
    Project: {
      type: 'relation'
      relation: { id: string }[]
    }
    'Acquisition Date': {
      type: 'date'
      date: { start: string; end?: string | null } | null
    }

    // --- Relations (Omnichannel Linking) ---
    Organization: {
      type: 'relation'
      relation: { id: string }[]
    }
    Emails: {
      type: 'relation'
      relation: { id: string }[]
    }
    Messages: {
      type: 'relation'
      relation: { id: string }[]
    }
    Calls: {
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
    Title: {
      type: 'title'
      title: { plain_text: string; text: { content: string } }[]
    }
    Direction: {
      type: 'select'
      select: { name: 'Inbound' | 'Outbound' | string } | null
    }
    Status: {
      type: 'status'
      status: { name: 'Draft' | 'Sent' | 'Received' | 'Failed' | string } | null
    }
    Content: {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
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
    Timestamp: {
      type: 'date'
      date: { start: string; end?: string | null } | null
    }
    'Is Read': { type: 'checkbox'; checkbox: boolean }
    User: {
      type: 'relation'
      relation: { id: string }[]
    }
    Contact: {
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
    Title: {
      type: 'title'
      title: { plain_text: string; text: { content: string } }[]
    }
    Direction: {
      type: 'select'
      select: { name: 'Inbound' | 'Outbound' | string } | null
    }
    Channel: {
      type: 'select'
      select: { name: 'WhatsApp' | 'SMS' | 'Instagram' | 'Messenger' | string } | null
    }
    Type: {
      type: 'select'
      select: { name: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'POST_SHARE' | string } | null
    }
    Status: {
      type: 'status'
      status: { name: 'Draft' | 'Sent' | 'Delivered' | 'Failed' | string } | null
    }
    Content: {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
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
    Timestamp: {
      type: 'date'
      date: { start: string; end?: string | null } | null
    }

    'Is Read': { type: 'checkbox'; checkbox: boolean }
    User: {
      type: 'relation'
      relation: { id: string }[]
    }
    Contact: {
      type: 'relation'
      relation: { id: string }[]
    }
  }
}

export interface NotionCall {
  id: string
  created_time: string
  last_edited_time: string
  url: string
  properties: {
    Title: {
      type: 'title'
      title: { plain_text: string; text: { content: string } }[]
    }
    Direction: {
      type: 'select'
      select: { name: 'Inbound' | 'Outbound' | string } | null
    }
    Type: {
      type: 'select'
      select: { name: 'AUDIO' | 'VIDEO' | string } | null
    }
    Network: {
      type: 'select'
      select: { name: 'IP' | 'CELLULAR' | string } | null
    }
    Status: {
      type: 'status'
      status: { name: 'Ongoing' | 'Completed' | 'Missed' | 'Busy' | string } | null
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
    Timestamp: {
      type: 'date'
      date: { start: string; end?: string | null } | null
    }

    'Is Read': { type: 'checkbox'; checkbox: boolean }
    User: {
      type: 'relation'
      relation: { id: string }[]
    }
    Contact: {
      type: 'relation'
      relation: { id: string }[]
    }
  }
}

export interface NotionTelemetry {
  id: string
  created_time: string
  last_edited_time: string
  cover: NotionImage | null
  icon: NotionImage | null
  properties: {
    'Event Name': {
      type: 'title'
      title: { plain_text: string }[]
    }
    Email: {
      type: 'relation'
      relation: { id: string }[]
    }
    'Event Type': {
      type: 'select'
      select: {
        name: 'open' | 'click'
      }
    }
    Recipient: {
      type: 'rich_text'
      rich_text: { plain_text: string }[]
    }
    Device: {
      type: 'select'
      select: {
        name: 'desktop' | 'mobile' | 'unknown'
      }
    }
    'Target URL': {
      type: 'url'
      url: string | null
    }
    Location: {
      type: 'rich_text'
      rich_text: { plain_text: string }[]
    }
    'IP Address': {
      type: 'rich_text'
      rich_text: { plain_text: string }[]
    }
    Timestamp: {
      type: 'date'
      date: {
        start: string
      }
    }
  }
}
