<p align="center">
  <img src="./public/logo.png" lt="Logo" width="65" />
<p>

# MConnect

![Landing](public/previews/landing.webp)

> A client outreach and communication hub for managing message/mail/popup templates, tracking campaigns, and monitoring client in-reach and out-reach activity

# Specs

# Specs

## 0. Health Layer

### `GET /api/health`

**Description:** Verification ping to check system readiness and isolate active compute infrastructure nodes.

**Input:** _(None)_ **Output (JSON - 200 OK):**

```json
{
  "status": "OK",
  "node": "Gigabyte"
}
```

---

## 1. Unified Directory & Ledger (CRM Core)

### `PUT /api/contacts`

**Description:** Upserts client profiles inside the unified Notion CRM using camelCase parameters. This endpoint is backed by a single master schema definition. It strips away read-only fields (such as Notion formulas or rollups like `profit` and `projectCount`) before processing writes. If no `contactId` is supplied, it performs a fallback check querying the database for existing duplicates matching on `phone` or `email` values sequentially before creating a new page record.

**Input (JSON):**

```json
{
  "brand": "Brandwizz",
  "company": "Brandwizz Communications",
  "email": "response@brandwizz.com",
  "address": "DLF Galleria, 14th Floor, New Town Action Area 1, Kolkata, India 700156",
  "phone": "+919717402568",
  "pocPerson": "Shreeja Sarkar",
  "status": "Active",
  "type": "Agency",
  "tags": ["Premium", "In-Progress"],
  "linkedIn": "https://linkedin.com/company/brandwizz"
}
```

#### Payload Parameter Rules

- **Required Fields:** `brand`, `company`, `email`, `address`, `phone`, `pocPerson`
- **Optional/Nullable Fields:** `contactId`, `status` (Strict Status Enum), `type` (Strict Company Type Enum), `tags`, `acquisitionDate`, `place`, `whatsapp`, `pocCompany`, `pocAddress`, `pocEmail`, `pocPhone`, `website`, `facebook`, `instagram`, `twitter`, `linkedIn`
- **Ignored Fields (Read-Only):** `id`, `url`, `index`, `createdTime`, `lastEditedTime`, `profit`, `projectCount`

**Output (JSON - 200 OK):**

```json
{
  "contactId": "367ee3b0-289a-81c9-b502-d21a1ed375b0",
  "status": "created"
}
```

### `GET /api/contacts`

**Description:** Retrieves a paginated list of all contacts from the unified Notion CRM, safely transformed into standardized camelCase objects.

**Query Parameters:**

- `limit` (number, optional) — The maximum number of records to return. Default: `50`.
- `offset` (number, optional) — The number of records to skip before beginning to return results. Default: `0`.

**Output (JSON - 200 OK):**

```json
{
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 4
  },
  "results": [
    {
      "id": "947f4df5-cf45-4a43-aabc-7d152118c7af",
      "url": "https://www.notion.so/Sundar-Skincare-...",
      "brand": "Sundar Skincare",
      "company": "Sundar",
      "email": "partnerships@sundarskincare.example",
      "phone": "+919900000003",
      "status": "Researched",
      "type": "Cosmetics"
    }
  ]
}
```

### 🕒 `GET /api/contacts/:contactId/timeline`

**Description:** Retrieves a chronologically descended list (newest first) of communication interaction logs linked to a specific contact page using traditional offset-based pagination.

**Path Parameters:**

- 🆔 `contactId` (string, required): The unique identifier of the target contact page.

**Query Parameters:**

- 📊 `limit` (number, optional): The maximum number of interaction records to return. Default: `50`.
- 🧭 `offset` (number, optional): The number of records to skip before beginning to return results. Default: `0`.

**Output (JSON - 200 OK):**

```json
{
  "results": [
    {
      "interactionId": "outboundEmail1716381000000",
      "channel": "email",
      "direction": "outbound",
      "timestamp": "2026-05-22T14:30:00.000Z",
      "summary": "Subject: Commercial Project Quotation Estimate\n\nTemplate payload compiled for: quotation",
      "recordingUrl": null
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}
```

---

## 2. Channel-Specific Ingest Controllers

### 📨 `POST /api/connect/text/email/receive`

**Description:** Dedicated webhook target endpoint managed by incoming IMAP email background pollers or external mail hooks. Standardizes incoming mail metadata payloads and appends them straight onto the client's CRM Timeline page.

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

**Description:** Dedicated inbound hook for processing incoming mobile network transactional reply event streams. Standardizes incoming SMS bodies and links them to the Notion CRM contact timeline by cross-referencing origin caller signatures.

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

### `POST /api/connect/call/phone/receive`

**Description:** Direct entry port for carrier SIP Trunk inbound `INVITE` webhooks. Evaluates the incoming caller ID against the database, provisions a virtual tracking room, and sets up parallel or sequential hunting states across available WebRTC endpoints and physical extensions.

**Input (JSON):**

```json
{
  "orgId": "org-123",
  "to": "+918065480698",
  "callUuid": "uuid-vobiz-call-789"
}
```

**Output (JSON - 200 OK):**

```json
{
  "success": true,
  "roomName": "room-inbound-vobiz-789",
  "action": "huntingInitiated"
}
```

### `POST /api/connect/call/phone/send`

**Description:** Programmatically initiates a dual-leg call session by spinning up a centralized LiveKit Media Room, establishing an internal agent participant token, and launching an asynchronous SIP outbound carrier trunk hook to bridge the client destination leg cleanly.

**Input (JSON):**

```json
{
  "contactId": "36bee3b0289a8030a6f9c0eea0708f12",
  "userId": "307ee3b0289a8179a8a8d2efcdb67bbf",
  "recordCall": true,
  "orgId": "307ee3b0289a8116afb0f6a1795a27a0"
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

### `POST /api/connect/call/phone/bridge-callback`

**Description:** Generates unified structural variables, secure endpoint routing hashes, and config matrix states used to securely hook persistent real-time telecommunication channels into internal media proxy application layers.

**Input (JSON):**

```json
{
  "contactId": "36bee3b0289a8030a6f9c0eea0708f12",
  "userId": "307ee3b0289a8179a8a8d2efcdb67bbf",
  "recordCall": true,
  "template": "standard-call"
}
```

**Output (JSON - 201 Created):**

```json
{
  "success": true,
  "bridgeSessionId": "bridge_sess_99211",
  "routingPayloadUrl": "https://api.mconnect.com/api/connect/call/phone/stream"
}
```

### `POST /api/connect/call/phone/status`

**Description:** Centralized LiveKit room webhook status server endpoint. Monitors active participants, catches disconnect or network hangup event frames, extracts precise stream call duration metrics, and automates AWS S3 media file archival recording links right back to the contact interaction ledger.

**Input (JSON):**

```json
{
  "event": "room.finished",
  "roomName": "room-inbound-vobiz-789",
  "duration": 142,
  "recordingUrl": "https://s3.amazonaws.com/mconnect-bucket/voice-records/rec-789.mp3"
}
```

**Output (JSON - 200 OK):**

```json
{
  "success": true
}
```

### `POST /api/connect/call/phone/fallback`

**Description:** Error handling routing channel executed automatically when LiveKit room invitation sequences encounter timeout parameters or non-responsive agent endpoints. Safely fires cross-channel recovery functions like recording instant voicemails or triggering SMS drop replies.

**Input (JSON):**

```json
{
  "callUuid": "call_abcd1234efgh",
  "reason": "noAnswer",
  "contactId": "36bee3b0289a8030a6f9c0eea0708f12"
}
```

**Output (JSON - 200 OK):**

```json
{
  "success": true,
  "fallbackActionExecuted": "smsAutoResponder"
}
```

### `POST /api/connect/call/phone/stream`

**Description:** Low-latency proxy interceptor using LiveKit Egress or raw audio track routing. Sequences incoming call chunks cleanly to disk arrays while publishing frame buffers to internal pipelines for immediate consumption.

**Input (JSON / Binary Stream Chunk):**

```json
{
  "callUuid": "call_abcd1234efgh",
  "chunk": "SGVsbG8gV29ybGQ=",
  "sequence": 42
}
```

**Output (JSON - 200 OK):**

```json
{
  "success": true
}
```

### `POST /api/connect/call/phone/conference`

**Description:** Dynamic room allocation controller. Invites additional active carrier trunk numbers or authenticated dashboard users directly into an active, live LiveKit session room to execute seamless multi-party call conferencing.

**Input (JSON):**

```json
{
  "roomName": "room-inbound-vobiz-789",
  "inviteTargetPhone": "+919876543212",
  "participantType": "externalThirdParty"
}
```

**Output (JSON - 200 OK):**

```json
{
  "success": true,
  "participantId": "part_9931a"
}
```

### `POST /api/connect/call/phone/supervisor/monitor`

**Description:** Implements specific track layer subscription policies inside LiveKit. Authorizes designated management nodes to enter active streams to audit calls under three operational rules: Silent (listen only), Whisper (talk exclusively to the internal agent), or Barge (publish audio to all participants).

**Input (JSON):**

```json
{
  "supervisorId": "user_manager_1",
  "roomName": "room-inbound-vobiz-789",
  "mode": "whisper"
}
```

**Output (JSON - 200 OK):**

```json
{
  "success": true,
  "activeMode": "whisper"
}
```

### `POST /api/connect/call/phone/webrtc/token`

**Description:** Signs and generates cryptographically sound LiveKit JWT access tokens containing explicit user metadata rules, device profile identities, and room clearance tokens to authenticate modern, in-browser softphone UI dashboards.

**Input (JSON):**

```json
{
  "userId": "307ee3b0289a8179a8a8d2efcdb67bbf",
  "roomName": "room-inbound-vobiz-789"
}
```

**Output (JSON - 200 OK):**

```json
{
  "accessToken": "..."
}
```

### `POST /api/connect/call/phone/queue`

**Description:** Holds inbound phone channels inside a virtual waiting room, looping specific wait-line audio templates sequentially while monitoring active workspace states until an available agent registers a session token to claim the caller.

**Input (JSON):**

```json
{
  "callUuid": "call_abcd1234efgh",
  "queueId": "salesQueue"
}
```

**Output (JSON - 200 OK):**

```json
{
  "success": true,
  "queuePosition": 2
}
```

### `POST /api/connect/call/phone/ivr`

**Description:** Catches real-time digital keyboard frequency tones (DTMF keypad strokes) reported from LiveKit SIP connection tracking parameters, running conditional menu branching configurations to parse user choices.

**Input (JSON):**

```json
{
  "callUuid": "call_abcd1234efgh",
  "digitsPressed": "1"
}
```

**Output (JSON - 200 OK):**

```json
{
  "success": true,
  "nextRouteAction": "transferToSalesQueue"
}
```

---

## ✉️ 4. Outbound Dispatchers & Templates

### 4.1 `POST /api/connect/text/email/send`

**Description:** Compiles type-safe Vue single-file component templates dynamically, processes attachment streams, and dispatches high-performance outbound emails via mapped provider layouts.

**Request Body (JSON):**

```json
{
  "contactId": "367ee3b0-289a-81c9-b502-d21a1ed375b0",
  "channel": "email",
  "template": "internship-completion-certificate",
  "variables": {
    "recipientName": "Test 1",
    "recipientRole": "Test 2",
    "scopeOfWork": "Backend Core Systems Development",
    "startDate": "2026-01-01",
    "endDate": "2026-05-01",
    "dataOfIssue": "2026-05-22",
    "signerName": "John Doe",
    "signerTitle": "Managing Director",
    "certificateUrl": "https://document.modesthumanbrands.com/api/document/...",
    "organization": {
      "id": "red-cat-pictures",
      "name": "RED CAT PICTURES",
      "website": "https://redcatpictures.com",
      "branding": {
        "logo": "https://redcatpictures.com/logo-dark.svg",
        "color": { "primary": "#CD2D2D", "accent": "" },
        "font": "Exo 2"
      },
      "socials": {}
    }
  }
}
```

**Response Body (JSON - 200 OK):**

```json
{
  "success": true,
  "dispatchId": "<cb978aaa-50eb-99df-9ded-aa04750f76d0@redcatpictures.com>"
}
```

### 4.2 `POST /api/connect/text/sms/send`

**Description:** Dispatches text messages via localized string interpolation templates or raw messaging setups, pushing the metadata rows directly onto the client's crm timeline.

**Request Body (JSON):**

```json
{
  "contactId": "367ee3b0-289a-81c9-b502-d21a1ed375b0",
  "template": "none",
  "text": "Hi Alex, this is an automated message confirming your API integration is functioning."
}
```

**Response Body (JSON - 200 OK):**

```json
{
  "success": true,
  "dispatchId": "fast2sms-req-8832199"
}
```

### 4.3 Template Registries

#### `GET /api/connect/text/email/template`

**Description:** Fetches all currently active, pre-compiled Vue-Email structural template keys alongside their required validation variables.

**Output (JSON - 200 OK):**

```json
{
  "channel": "email",
  "templates": [
    {
      "templateId": "internship-completion-certificate",
      "requiredVariables": ["recipientName", "recipientRole", "scopeOfWork"]
    }
  ]
}
```

#### `GET /api/connect/text/sms/template`

**Description:** Returns the baseline system configuration registry catalog for text-based transactional templates.

**Output (JSON - 200 OK):**

```json
{
  "channel": "sms",
  "templates": [
    {
      "templateId": "paymentReminderV1",
      "requiredVariables": ["customerName", "amountDue", "dueDate"]
    }
  ]
}
```

#### `GET /api/connect/call/phone/template`

**Description:** Accesses the available room configuration assets, pipeline initializers, and soundscape layouts.

**Output (JSON - 200 OK):**

```json
{
  "channel": "phone",
  "templates": [
    {
      "templateId": "standard-call",
      "requiredVariables": ["companName", "holdMusic", "streamUrl"]
    }
  ]
}
```

#### `GET /api/connect/text/whatsapp/template`

**Description:** Polls and synchronizes verified Meta Business template spaces down to native dropdown managers.

**Output (JSON - 200 OK):**

```json
{
  "channel": "whatsapp",
  "templates": [
    {
      "templateId": "utility_shipping_update",
      "language": "en_US",
      "status": "APPROVED"
    }
  ]
}
```

---

## 4.4 Meta WhatsApp Cloud API Integration

### `POST /api/connect/text/whatsapp/send`

**Description:** Connects to the Meta Cloud architecture to dispatch text alerts, rich attachments, quick-reply options, or approved templates to a user's mobile device.

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
  "dispatchId": "wamid.HBgLOTE5ODc2NTQzMjEwFQIAERg2..."
}
```

### `POST /api/connect/text/whatsapp/receive`

**Description:** Webhook target endpoint listening for live payload receipts from Meta. Captures incoming messages, status markers (sent, delivered, read), context links, and media streams.

**Input Body (JSON):**

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "88219931",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "messages": [{ "from": "+919876543210", "text": { "body": "Got it, thanks!" } }]
          },
          "field": "messages"
        }
      ]
    }
  ]
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

## 4.5 Meta Instagram Messenger Integration

### `POST /api/connect/text/instagram/send`

**Description:** Connects via the Meta Graph Messenger system to transmit text elements, image cards, and carousel blocks directly to user profiles.

**Request Body (JSON):**

```json
{
  "contactId": "367ee3b0-289a-81c9-b502-d21a1ed375b0",
  "text": "Thank you for reaching out via Instagram! Here is the link to our portfolio."
}
```

**Response Body (JSON - 200 OK):**

```json
{
  "success": true,
  "dispatchId": "igmid.AgAAAV..."
}
```

### `POST /api/connect/text/instagram/receive`

**Description:** Live webhook receiver tracking consumer-initiated direct messages, story responses, comment threads, or brand mentions, updating the target contact page automatically.

**Input Body (JSON):**

```json
{
  "object": "instagram",
  "entry": [
    {
      "id": "ig_account_id",
      "messaging": [
        {
          "sender": { "id": "customer_ig_scoped_id" },
          "message": { "text": "Loved your latest post!" }
        }
      ]
    }
  ]
}
```

**Output (JSON - 200 OK):**

```json
{
  "success": true,
  "interactionId": "igInboundLog123"
}
```

---

## 4.6 Productivity Workspace Layer

### `POST /api/connect/schedule/google-meet/create`

**Description:** Leverages Google Workspace secure OAuth token parameters to programmatically provision dynamic Google Meet video links, mapping the created event down to the Notion CRM calendar logs.

**Input Body (JSON):**

```json
{
  "contactId": "367ee3b0-289a-81c9-b502-d21a1ed375b0",
  "summary": "MHB Project Discovery Alignment Session",
  "startTime": "2026-06-01T10:00:00Z",
  "endTime": "2026-06-01T10:45:00Z"
}
```

**Output (JSON - 200 OK):**

```json
{
  "success": true,
  "meetUrl": "https://meet.google.com/abc-defg-hij",
  "eventId": "gCalEventId123"
}
```

---

## 5. Automated Campaigns & Lead Generation

### `POST /api/campaigns/enroll`

**Description:** Attaches a `contactId` to an automated drip sequence (e.g., standard lead nurture, post-project review requests).

**Input (JSON):**

```json
{
  "contactId": "367ee3b0-289a-81c9-b502-d21a1ed375b0",
  "campaignId": "camp-lead-nurture-01",
  "triggerSource": "missed_call"
}
```

**Output (JSON - 200 OK):**

```json
{
  "status": "enrolled",
  "nextActionAt": "2026-05-18T10:05:00Z"
}
```

### `POST /api/campaigns/trigger-action`

**Description:** Internal cron-job or webhook endpoint that forces the evaluation of active campaigns and dispatches pending actions (e.g., Day 2 Follow-up Email).

**Input (JSON):**

```json
{
  "executeTimestamp": "2026-05-18T12:00:00Z"
}
```

**Output (JSON - 200 OK):**

```json
{
  "processedActions": 14,
  "dispatchedChannels": {
    "sms": 4,
    "email": 10
  }
}
```

---

### Roadmap (SIP Trunk + LiveKit Migration)

| Order  | Route                                             | Module                    | Complexity Profile                                                                                                                                                                                                           | Status         |
| ------ | ------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **1**  | `GET /api/health`                                 | 0. Health Layer           | **Trivial**: Simple static JSON response checking infrastructure deployment node readiness.                                                                                                                                  | ✅ **Done**    |
| **2**  | `GET /api/contacts`                               | 1. Unified Directory      | **Low**: Standard read-only paginated list retrieval from Notion CRM database rows.                                                                                                                                          | ✅ **Done**    |
| **3**  | `GET /api/contacts/:contactId/timeline`           | 1. Unified Directory      | **Low**: Filtered paginated query retrieving chronological communication interaction records.                                                                                                                                | ✅ **Done**    |
| **4**  | `PUT /api/contacts`                               | 1. Unified Directory      | **Medium**: Smart upsert involving duplicate matching phone/email logic and strict read-only property filtering.                                                                                                             | ✅ **Done**    |
| **5**  | `POST /api/connect/text/email/send`               | 4.1 Email Gateway         | **High**: Compiles type-safe Vue single-file component templates dynamically, processes attachment streams, and maps delivery logs to the CRM timeline.                                                                      | ✅ **Done**    |
| **6**  | `POST /api/connect/text/email/receive`            | 2. Ingest Controllers     | **High**: Webhook or IMAP background poller target that ingests inbound multi-part mime mail blocks, extracts metadata, and maps records to the contact page timeline.                                                       | ✅ **Done**    |
| **7**  | `GET /api/connect/text/email/template`            | 4.3 Templates             | **Low**: Exposes active, pre-compiled Vue-Email layout definitions and expected variable schema objects to the client UI dropdowns.                                                                                          | ⏳ **Pending** |
| **8**  | `POST /api/connect/text/sms/send`                 | 4.2 SMS Gateway           | **Medium**: Dynamic variable text substitution and payload routing mapped across decoupled vendor strategies (Vobiz/Fast2SMS).                                                                                               | ✅ **Done**    |
| **9**  | `POST /api/connect/text/sms/receive`              | 2. Ingest Controllers     | **Medium**: Standardizes incoming mobile network SMS text replies, maps originating numbers back to contact profiles, and appends rows to the tracking ledger.                                                               | ⏳ **Pending** |
| **10** | `GET /api/connect/text/sms/template`              | 4.3 Templates             | **Low**: Returns the system catalog of plain text SMS compilation keys and variable strings.                                                                                                                                 | ⏳ **Pending** |
| **11** | `POST /api/connect/text/whatsapp/send`            | 4.4 WhatsApp Layer        | **Medium**: Connects to the Meta Cloud API to dispatch high-volume notifications, rich media documents, interactive buttons, or official template matrices.                                                                  | ⏳ **Pending** |
| **12** | `POST /api/connect/text/whatsapp/receive`         | 2. Ingest Controllers     | **Medium**: Core Meta webhook listener tracking real-time user message replies, read/delivery receipt flags, location sharing data, and incoming media uploads.                                                              | ⏳ **Pending** |
| **13** | `GET /api/connect/text/whatsapp/template`         | 4.3 Templates             | **Low**: Communicates with the Meta Graph API to synchronize and pull business-approved WhatsApp templates down to local layout pickers.                                                                                     | ⏳ **Pending** |
| **14** | `POST /api/connect/text/instagram/send`           | 4.5 Instagram Layer       | **Medium**: Utilizes Messenger API endpoints to dispatch automated direct messages, interactive replies, and image/video nodes to consumer profiles.                                                                         | ⏳ **Pending** |
| **15** | `POST /api/connect/text/instagram/receive`        | 2. Ingest Controllers     | **Medium**: Ingests real-time webhooks notifying mconnect of incoming Instagram DMs, comment mentions, story replies, or profile tags to log into the database.                                                              | ⏳ **Pending** |
| **16** | `GET /api/connect/text/whatsapp/template`         | 4.3 Templates             | **Low**: Communicates with the Meta Graph API to synchronize and pull business-approved WhatsApp templates down to local layout pickers.                                                                                     | ⏳ **Pending** |
| **17** | `POST /api/connect/call/phone/send`               | 3. Voice Control Layer    | **Advanced**: Spins up a centralized LiveKit Media Room, creates an internal participant session, and fires an asynchronous SIP Outbound Trunk invite to bridge the external customer leg seamlessly.                        | ✅ **Done**    |
| **18** | `POST /api/connect/call/phone/status`             | 3. Voice Control Layer    | **High**: Centralized LiveKit room webhook server endpoint. Listens for disconnect/hangup signals, calculates precise connection duration metrics, and automates AWS S3 media file recording syncs back to the CRM timeline. | ✅ **Done**    |
| **19** | `POST /api/connect/call/phone/conference`         | 3. Voice Control Layer    | **Advanced**: Unified room model endpoint. Dynamically invites additional SIP trunks or WebRTC participants into an active LiveKit room instance to execute multi-party conferencing.                                        | ⏳ **Pending** |
| **20** | `POST /api/connect/call/phone/supervisor/monitor` | 3. Voice Control Layer    | **High**: Controls track subscription rules inside a LiveKit call space. Allows managers to join rooms silently (`Silent`), unmute exclusively to the agent (`Whisper`), or publish to all legs (`Barge`).                   | ⏳ **Pending** |
| **21** | `POST /api/connect/call/phone/webrtc/token`       | 3. Voice Control Layer    | **Medium**: Generates signed, cryptographically secure LiveKit JWT tokens containing exact room names and metadata permissions to authenticate browser dashboard phone instances.                                            | ⏳ **Pending** |
| **22** | `POST /api/connect/call/phone/queue`              | 3. Voice Control Layer    | **Medium**: Holds incoming SIP trunk connections in a synchronized virtual room queue, playing continuous audio hold music until a matching agent token joins the space.                                                     | ⏳ **Pending** |
| **23** | `POST /api/connect/call/phone/ivr`                | 3. Voice Control Layer    | **Medium**: Ingests real-time DTMF tone inputs captured by LiveKit SIP participants, evaluating digit keyboard strokes to dynamically execute programmatic menu branching rules.                                             | ⏳ **Pending** |
| **24** | `POST /api/connect/schedule/google-meet/create`   | 4.6 External Integrations | **Medium**: Authenticates securely via Google Workspace OAuth nodes to programmatically spin up Google Meet calendar spaces and link them directly to Notion contact calendars.                                              | ⏳ **Pending** |
| **25** | `POST /api/campaigns/enroll`                      | 5. Automated Campaigns    | **Medium**: Registers specific contact identifiers to automated, multi-channel marketing or nurture flow schemas.                                                                                                            | ⏳ **Pending** |
| **26** | `POST /api/campaigns/trigger-action`              | 5. Automated Campaigns    | **Critical**: Time-boundary cron engine processing pending queue boundaries, determining multi-channel execution windows, and dispatching subsequent campaign actions.                                                       | ⏳ **Pending** |

---

Progress = 9/26 = 36%

## License

Published under the [MIT](https://github.com/Modest-Human-Brands/mconnect/blob/main/LICENSE) license.
<br><br>
<a href="https://github.com/Modest-Human-Brands/mconnect/graphs/contributors">
<img src="https://contrib.rocks/image?repo=Modest-Human-Brands/mconnect" />
</a>
