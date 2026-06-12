<p align="center">
  <img src="./public/logo.png" lt="Logo" width="65" />
<p>

# MConnect

![Landing](public/previews/landing.webp)

> A client outreach and communication hub for managing message/mail/popup templates, tracking campaigns, and monitoring client in-reach and out-reach activity

---

### Roadmap

| Order  | Route                                             | Module                    | Complexity Profile                                                                                                                                                                                                           | Status         |
| ------ | ------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **1**  | `GET /api/health`                                 | 0. Health Layer           | **Trivial**: Simple static JSON response checking infrastructure deployment node readiness.                                                                                                                                  | ✅ **Done**    |
| **2**  | `GET /api/contacts`                               | 1. Unified Directory      | **Low**: Standard read-only paginated list retrieval from Notion CRM database rows.                                                                                                                                          | ✅ **Done**    |
| **3**  | `GET /api/contacts/:contactId/timeline`           | 1. Unified Directory      | **Low**: Filtered paginated query retrieving chronological communication interaction records.                                                                                                                                | ✅ **Done**    |
| **4**  | `PUT /api/contacts`                               | 1. Unified Directory      | **Medium**: Smart upsert involving duplicate matching phone/email logic and strict read-only property filtering.                                                                                                             | ✅ **Done**    |
| **5**  | `POST /api/connect/text/email/send`               | 4.1 Email Gateway         | **High**: Compiles type-safe Vue single-file component templates dynamically, processes attachment streams, and maps delivery logs to the CRM timeline.                                                                      | ✅ **Done**    |
| **6**  | `POST /api/connect/text/email/receive`            | 2. Ingest Controllers     | **High**: Webhook or IMAP background poller target that ingests inbound multi-part mime mail blocks, extracts metadata, and maps records to the contact page timeline.                                                       | ✅ **Done**    |
| **7**  | `GET /api/connect/text/email/template`            | 4.3 Templates             | **Low**: Exposes active, pre-compiled Vue-Email layout definitions and expected variable schema objects to the client UI dropdowns.                                                                                          | ✅ **Done**    |
| **8**  | `POST /api/connect/text/sms/send`                 | 4.2 SMS Gateway           | **Medium**: Dynamic variable text substitution and payload routing mapped across decoupled vendor strategies (Vobiz/Fast2SMS).                                                                                               | ✅ **Done**    |
| **9**  | `POST /api/connect/text/sms/receive`              | 2. Ingest Controllers     | **Medium**: Standardizes incoming mobile network SMS text replies, maps originating numbers back to contact profiles, and appends rows to the tracking ledger.                                                               | ⏳ **Pending** |
| **10** | `GET /api/connect/text/sms/template`              | 4.3 Templates             | **Low**: Returns the system catalog of plain text SMS compilation keys and variable strings.                                                                                                                                 | ✅ **Done**    |
| **11** | `POST /api/connect/text/whatsapp/send`            | 4.4 WhatsApp Layer        | **Medium**: Connects to the Meta Cloud API to dispatch high-volume notifications, rich media documents, interactive buttons, or official template matrices.                                                                  | ⏳ **Pending** |
| **12** | `POST /api/connect/text/whatsapp/receive`         | 2. Ingest Controllers     | **Medium**: Core Meta webhook listener tracking real-time user message replies, read/delivery receipt flags, location sharing data, and incoming media uploads.                                                              | ⏳ **Pending** |
| **13** | `GET /api/connect/text/whatsapp/template`         | 4.3 Templates             | **Low**: Communicates with the Meta Graph API to synchronize and pull business-approved WhatsApp templates down to local layout pickers.                                                                                     | ⏳ **Pending** |
| **14** | `POST /api/connect/text/instagram/send`           | 4.5 Instagram Layer       | **Medium**: Utilizes Messenger API endpoints to dispatch automated direct messages, interactive replies, and image/video nodes to consumer profiles.                                                                         | ⏳ **Pending** |
| **15** | `POST /api/connect/text/instagram/receive`        | 2. Ingest Controllers     | **Medium**: Ingests real-time webhooks notifying mconnect of incoming Instagram DMs, comment mentions, story replies, or profile tags to log into the database.                                                              | ⏳ **Pending** |
| **16** | `POST /api/connect/call/phone/send`               | 3. Voice Control Layer    | **Advanced**: Spins up a centralized LiveKit Media Room, creates an internal participant session, and fires an asynchronous SIP Outbound Trunk invite to bridge the external customer leg seamlessly.                        | ✅ **Done**    |
| **17** | `POST /api/connect/call/phone/status`             | 3. Voice Control Layer    | **High**: Centralized LiveKit room webhook server endpoint. Listens for disconnect/hangup signals, calculates precise connection duration metrics, and automates AWS S3 media file recording syncs back to the CRM timeline. | ✅ **Done**    |
| **18** | `POST /api/connect/call/phone/conference`         | 3. Voice Control Layer    | **Advanced**: Unified room model endpoint. Dynamically invites additional SIP trunks or WebRTC participants into an active LiveKit room instance to execute multi-party conferencing.                                        | ⏳ **Pending** |
| **19** | `POST /api/connect/call/phone/supervisor/monitor` | 3. Voice Control Layer    | **High**: Controls track subscription rules inside a LiveKit call space. Allows managers to join rooms silently (`Silent`), unmute exclusively to the agent (`Whisper`), or publish to all legs (`Barge`).                   | ⏳ **Pending** |
| **20** | `POST /api/connect/call/phone/webrtc/token`       | 3. Voice Control Layer    | **Medium**: Generates signed, cryptographically secure LiveKit JWT tokens containing exact room names and metadata permissions to authenticate browser dashboard phone instances.                                            | ⏳ **Pending** |
| **21** | `POST /api/connect/call/phone/queue`              | 3. Voice Control Layer    | **Medium**: Holds incoming SIP trunk connections in a synchronized virtual room queue, playing continuous audio hold music until a matching agent token joins the space.                                                     | ⏳ **Pending** |
| **22** | `POST /api/connect/call/phone/ivr`                | 3. Voice Control Layer    | **Medium**: Ingests real-time DTMF tone inputs captured by LiveKit SIP participants, evaluating digit keyboard strokes to dynamically execute programmatic menu branching rules.                                             | ⏳ **Pending** |
| **23** | `POST /api/connect/schedule/google-meet/create`   | 4.6 External Integrations | **Medium**: Authenticates securely via Google Workspace OAuth nodes to programmatically spin up Google Meet calendar spaces and link them directly to Notion contact calendars.                                              | ⏳ **Pending** |
| **24** | `POST /api/campaigns/enroll`                      | 5. Automated Campaigns    | **Medium**: Registers specific contact identifiers to automated, multi-channel marketing or nurture flow schemas.                                                                                                            | ⏳ **Pending** |
| **25** | `POST /api/campaigns/trigger-action`              | 5. Automated Campaigns    | **Critical**: Time-boundary cron engine processing pending queue boundaries, determining multi-channel execution windows, and dispatching subsequent campaign actions.                                                       | ⏳ **Pending** |

Progress = 11/25 = 44%

---

# Specs

## 0. Health Layer

### `GET /api/health`

**Description:** Verification ping to check system readiness and isolate active compute infrastructure nodes.

**Input:** _(None)_
**Output (JSON - 200 OK):**

```json
{
  "status": "OK",
  "version": "1.0.0",
  "node": "unknown-node"
}
```

---

## 1. Unified Directory & Ledger (CRM Core)

### `PUT /api/contacts`

**Description:** Upserts client profiles inside the unified Notion CRM (Database 1) using camelCase parameters. It strips away read-only fields before processing writes. If no `contactId` is supplied, it performs a fallback check querying the database for existing duplicates matching on `phone` or `email` sequentially before creating a new page record.

**Input (JSON):**

```json
{
  "brand": "Brandwizz",
  "company": "Brandwizz Communications",
  "email": "response@brandwizz.com",
  "address": "DLF Galleria, 14th Floor, New Town Action Area 1, Kolkata, India",
  "phone": "+919717402568",
  "pocPerson": "Shreeja Sarkar",
  "status": "Active",
  "type": "Agency",
  "tags": ["Premium", "In-Progress"],
  "linkedIn": "https://linkedin.com/company/brandwizz"
}
```

**Output (JSON - 200 OK):**

```json
{
  "contactId": "367ee3b0-289a-81c9-b502-d21a1ed375b0",
  "status": "created"
}
```

### `GET /api/contacts`

**Description:** Retrieves a paginated list of all contacts from the unified Notion CRM. Dynamically computes the `platforms` array based on available non-null contact fields (Phone, Email, Instagram) to determine omnichannel reachability.

**Query Parameters:**

- `limit` (number, optional) — Default: `50`.
- `offset` (number, optional) — Default: `0`.

**Output (JSON - 200 OK):**

```json
{
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 142
  },
  "results": [
    {
      "id": "189c4e20-3b1a-4c22-98a1-8d2a3c9b7e54",
      "name": "Sarah Liu",
      "company": "WaveLength Creative Co.",
      "jobTitle": "Marketing Manager",
      "email": "sarah.liu@wavelength.co",
      "phone": "+15551234567",
      "instagram": "sarah_creative",
      "status": "Active",
      "lastActive": "2023-10-27T10:33:00.000Z",
      "lastMessageSnippet": "Sure, let's schedule a quick call.",
      "platforms": ["whatsapp", "email", "phone", "instagram"]
    }
  ]
}
```

### 🕒 `GET /api/contacts/:contactId/timeline`

**Description:** Retrieves a unified, chronologically descended list (newest first) of communications by concurrently querying the Messages (DB 3), Calls (DB 4), and Emails (DB 5) databases and flattening them into a standardized OmniChannel ledger.

**Path Parameters:**

- 🆔 `contactId` (string, required): Target contact page ID.

**Output (JSON - 200 OK):**

```json
{
  "client_id": "189c4e20-3b1a-4c22-98a1-8d2a3c9b7e54",
  "results": [
    {
      "interactionId": "msg_90123",
      "channel": "whatsapp",
      "direction": "inbound",
      "timestamp": "2023-10-27T10:33:00.000Z",
      "summary": "Sure, let's schedule a quick call.",
      "status": "delivered",
      "metadata": {
        "hasAttachments": false,
        "mediaUrl": null
      }
    },
    {
      "interactionId": "eml_88214",
      "channel": "email",
      "direction": "outbound",
      "timestamp": "2023-10-27T09:15:00.000Z",
      "summary": "Re: Project Requirements - I have attached the scope document.",
      "status": "sent",
      "metadata": {
        "hasAttachments": true,
        "labels": []
      }
    }
  ],
  "pagination": {
    "total": 2,
    "limit": 50,
    "skip": 0
  }
}
```

---

## 2. Channel-Specific Ingest Controllers

### 📨 `POST /api/connect/text/email/receive`

**Description:** Dedicated webhook target endpoint managed by incoming IMAP email background pollers. Standardizes incoming mail metadata, upserts the contact, and logs the email directly into the **Emails Database** with a `RECEIVE` status, linking the `Contact` relation.

**Input Body (JSON):**

```json
{
  "from": "customer@example.com",
  "to": "replies@modesthuman.com",
  "subject": "Project Scope Questions",
  "text": "Hi team, I had a few questions regarding the new project deadline...",
  "html": "<p>Hi team...</p>"
}
```

**Output (JSON - 200 OK):**

```json
{
  "success": true,
  "interactionId": "b34ab8e0-1234-4b9c-8f9d-e7d9834b9d0a"
}
```

### 💬 `POST /api/connect/text/sms/receive`

**Description:** Dedicated inbound hook for processing incoming mobile network replies. Standardizes incoming SMS bodies, upserts the contact via the queue endpoint, and logs the message directly into the **Messages Database** linking the `Sender` relation.

**Input Body (JSON):**

```json
{
  "from": "+919876543210",
  "to": "+918012345678",
  "text": "Thanks for the certificate!"
}
```

**Output (JSON - 200 OK):**

```json
{
  "success": true,
  "interactionId": "smsInboundLogUuid123"
}
```

---

## 3. Telephony Voice & LiveKit Call Control Layer

### `POST /api/connect/phone/call/receive`

_(Note: Endpoint path aligns with LiveKit webhook receiver code)_

**Description:** Direct entry port for LiveKit webhooks (including carrier SIP Trunk `room_started` events). Evaluates the incoming caller ID, provisions a virtual tracking room, checks agent presence via DB 1 queries, dials PSTN fallbacks, and natively logs the session into the **Calls Log Database** linking `Participants` and the `Initiator`.

**Input (JSON):**
_(LiveKit Standard Webhook Payload)_

**Output (JSON - 200 OK):**

```json
{
  "status": "success"
}
```

### `POST /api/connect/phone/call/send`

**Description:** Programmatically initiates a dual-leg call session by spinning up a centralized LiveKit Media Room, establishing an internal agent participant token, and launching an asynchronous SIP outbound carrier trunk hook to bridge the client destination leg cleanly using DB 1 `Phone Number` properties.

**Input (JSON):**

```json
{
  "contactId": "36bee3b0289a8030a6f9c0eea0708f12",
  "userId": "307ee3b0289a8179a8a8d2efcdb67bbf",
  "recordCall": true,
  "orgId": "307ee3b0289a8116afb0f6a1795a27a0",
  "webCall": false
}
```

**Output (JSON - 200 OK):**

```json
{
  "status": "bridging_initiated",
  "provider": "livekit-sip",
  "callUuid": "call_abcd1234efgh"
}
```

---

## ✉️ 4. Outbound Dispatchers & Templates

### 4.1 `POST /api/connect/text/email/send`

**Description:** Compiles type-safe Vue single-file component templates dynamically, processes attachment streams, and dispatches high-performance outbound emails. Logs the transaction natively into the **Emails Database**, associating both the `User` (sender) and `Contact` (recipient). Supports direct payload overriding via `recipientEmail`.

**Request Body (JSON):**

```json
{
  "userId": "307ee3b0289a8179a8a8d2efcdb67bbf",
  "contactId": "367ee3b0-289a-81c9-b502-d21a1ed375b0",
  "recipientEmail": "override@example.com",
  "template": "internship-completion-certificate",
  "variables": {
    "recipientName": "Alex Mercer",
    "recipientRole": "Intern",
    "scopeOfWork": "Systems Development",
    "startDate": "2026-01-01",
    "endDate": "2026-05-01",
    "dateOfIssue": "2026-05-22",
    "signerName": "John Doe",
    "signerTitle": "Managing Director",
    "certificateUrl": "https://document.modesthumanbrands.com/cert.pdf"
  }
}
```

**Response Body (JSON - 200 OK):**

```json
{
  "success": true,
  "dispatchId": "<cb978aaa-50eb-99df-9ded-aa04750f76d0@example.com>"
}
```

### 4.2 `POST /api/connect/text/sms/send`

**Description:** Dispatches text messages via localized string interpolation templates or raw messaging setups. Pushes the logs directly into the **Messages Database**, linking both `User` and `Contact`. Supports direct payload overriding via `recipientPhone`.

**Request Body (JSON):**

```json
{
  "userId": "307ee3b0289a8179a8a8d2efcdb67bbf",
  "contactId": "367ee3b0-289a-81c9-b502-d21a1ed375b0",
  "recipientPhone": "+15551234567",
  "template": "none",
  "text": "Hi Alex, this is an automated message confirming your API integration is functioning."
}
```

**Response Body (JSON - 200 OK):**

```json
{
  "success": true,
  "interactionId": "msg_90124",
  "dispatchId": "fast2sms-req-8832199"
}
```

### 4.3 Template Registries

#### `GET /api/connect/text/email/template`

**Description:** Fetches all currently active, pre-compiled Vue-Email structural template keys alongside their required validation variables.

#### `GET /api/connect/text/sms/template`

**Description:** Returns the baseline system configuration registry catalog for text-based transactional templates.

#### `GET /api/connect/text/whatsapp/template`

**Description:** Polls and synchronizes verified Meta Business template spaces down to native dropdown managers.

---

## 4.4 Meta WhatsApp Cloud API Integration

### `POST /api/connect/text/whatsapp/send`

**Description:** Connects to the Meta Cloud architecture to dispatch text alerts, rich attachments, quick-reply options, or approved WABA templates to a user's mobile device. Logs directly to the **Messages Database** setting `Type` and `Delivery Status` cleanly.

**Request Body (JSON):**

```json
{
  "contactId": "367ee3b0-289a-81c9-b502-d21a1ed375b0",
  "template": "utility_shipping_update",
  "variables": {
    "customerName": "Alex",
    "trackingNumber": "TRK123456"
  }
}
```

**Response Body (JSON - 200 OK):**

```json
{
  "success": true,
  "interactionId": "msg_90125",
  "dispatchId": "wamid.HBgLOTE5ODc2NTQzMjEwFQIAERg2..."
}
```

### `POST /api/connect/text/whatsapp/receive`

**Description:** Webhook target endpoint listening for live payload receipts from Meta. Upserts the contact and natively maps the incoming payload straight to the **Messages Database** setting the `Contact` relation.

**Input Body (JSON):**

```json
{
  "from": "+919876543210",
  "to": "+918012345678",
  "text": "Got it, thanks!"
}
```

**Output (JSON - 200 OK):**

```json
{
  "success": true,
  "interactionId": "waInboundLog123"
}
```

---

## License

Published under the [MIT](https://github.com/Modest-Human-Brands/mconnect/blob/main/LICENSE) license.
<br><br>
<a href="https://github.com/Modest-Human-Brands/mconnect/graphs/contributors">
<img src="https://contrib.rocks/image?repo=Modest-Human-Brands/mconnect" />
</a>
