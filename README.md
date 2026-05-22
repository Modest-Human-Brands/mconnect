<p align="center">
  <img src="./public/logo.png" lt="Logo" width="65" />
<p>

# MConnect

![Landing](public/previews/landing.webp)

> A client outreach and communication hub for managing message/mail/popup templates, tracking campaigns, and monitoring client in-reach and out-reach activity

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

**Description:** Upserts client profiles inside the unified Notion CRM using camelCase parameters. This endpoint is backed by a single master schema definition. It strips away read-only fields (such as Notion formulas or rollups like `profit` and `projectCount`) before processing writes. If no `clientId` is supplied, it performs a fallback check querying the database for existing duplicates matching on `Phone` or `Email` values sequentially before creating a new page record.

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
  "linkedIn": "[https://linkedin.com/company/brandwizz](https://linkedin.com/company/brandwizz)"
}
```

#### Payload Parameter Rules

- **Required Fields:** `brand`, `company`, `email`, `address`, `phone`, `pocPerson`
- **Optional/Nullable Fields:** `clientId`, `status` (Strict Status Enum), `type` (Strict Company Type Enum), `tags`, `acquisitionDate`, `place`, `whatsapp`, `pocCompany`, `pocAddress`, `pocEmail`, `pocPhone`, `website`, `facebook`, `instagram`, `twitter`, `linkedIn`
- **Ignored Fields (Read-Only):** `id`, `url`, `index`, `createdTime`, `lastEditedTime`, `profit`, `projectCount`

**Output (JSON - 200 OK):**

```json
{
  "clientId": "367ee3b0-289a-81c9-b502-d21a1ed375b0",
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
      "url": "[https://www.notion.so/Sundar-Skincare-947f4df5cf454a43aabc7d152118c7af](https://www.notion.so/Sundar-Skincare-947f4df5cf454a43aabc7d152118c7af)",
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

### 🕒 `GET /api/contacts/:clientId/timeline`

**Description:** Retrieves a chronologically descended list (newest first) of communication interaction logs linked to a specific contact page using traditional offset-based pagination.

**Path Parameters:**

- 🆔 `clientId` (string, required): The unique identifier of the target contact page.

**Query Parameters:**

- 📊 `limit` (number, optional): The maximum number of interaction records to return. Default: `50`.
- 🧭 `offset` (number, optional): The number of records to skip before beginning to return results. Default: `0`.

**Output (JSON - 200 OK):**

```json
{
  "results": [
    {
      "interactionId": "outbound-email-1716381000000",
      "channel": "email",
      "direction": "outbound",
      "timestamp": "2026-05-22T14:30:00.000Z",
      "summary": "Subject: Commercial Project Quotation Estimate\n\nTemplate payload compiled for: quotation",
      "recordingUrl": null
    },
    {
      "interactionId": "outbound-sms-1716301000000",
      "channel": "sms",
      "direction": "outbound",
      "timestamp": "2026-05-21T09:15:00.000Z",
      "summary": "Hi Alex, your certificate configuration as our Intern is confirmed!",
      "recordingUrl": null
    }
  ],
  "pagination": {
    "total": 2,
    "limit": 50,
    "offset": 0
  }
}
```

---

## 2. Omnichannel Ingest Controller

### 📡 `POST /webhook/ingest/:channel`

**Description:** Receives inbound message streams from third-party communication channels (such as incoming IMAP email workers or SMS webhooks), standardizes their properties, and records the interaction to the matching CRM contact timeline page.

**Path Parameters:**

- 🔀 `channel` (string, required): The entry communication vector. E.g., `email`, `sms`.

**Input Body (JSON):**

```json
{
  "from": "customer@example.com",
  "to": "replies@modesthuman.com",
  "subject": "Project Scope Questions",
  "text": "Hi team, I had a few questions regarding the new project deadline...",
  "html": "<p>Hi team, I had a few questions regarding the new project deadline...</p>"
}
```

**Output (JSON - 200 OK):**

```json
{
  "success": true,
  "interactionId": "log-uuid-1234"
}
```

---

## 3. Vobiz Voice & Call Control Layer

### `POST /api/voice/inbound-route`

**Description:** The primary Webhook URL configured in Vobiz. Evaluates incoming caller ID against the DB to determine the account owner, applies custom caller tunes, and executes parallel or sequential hunting logic.

**Input (Form-Urlencoded from Vobiz):**

```text
From=+919876543210&To=+1800MHBBRAND&CallUUID=uuid-vobiz-call-789

```

**Output (XML):**

```xml
<Response>
  <Dial dialMusic="[https://cdn.mhb.com/audio/minimal-hold-tune.mp3](https://cdn.mhb.com/audio/minimal-hold-tune.mp3)" timeout="20" action="[https://api.mhb.com/webhook/voice/fallback](https://api.mhb.com/webhook/voice/fallback)">
    <Number>+919876543211</Number>
    <User>sip:agent_desktop@phone.vobiz.com</User>
  </Dial>
</Response>

```

### `POST /webhook/voice/fallback`

**Description:** Action URL hit by Vobiz if the initial `<Dial>` fails or times out. Triggers the async worker for the "Missed Call SMS Auto-Responder" and logs the missed call.

**Input (Form-Urlencoded from Vobiz):** Includes `DialCallStatus` (e.g., `no-answer`).

**Output (XML):**

```xml
<Response>
  <Speak>All our agents are busy. We have just sent you an SMS to continue the conversation.</Speak>
  <Hangup />
</Response>

```

### `POST /api/voice/bridge`

**Description:** Programmatically bridges two external phone numbers. Triggers Vobiz via REST to dial Number A, and upon answer, outputs XML to record and dial Number B.

**Input (JSON):**

```json
{
  "leg_a_number": "+919876543211",
  "leg_b_number": "+919876543210",
  "record_call": true
}
```

**Output (JSON - 200 OK):**

```json
{
  "status": "bridging_initiated",
  "call_uuid": "uuid-vobiz-789"
}
```

---

## ✉️ 4.1 Email Dispatcher Gateway (`POST /api/text/email/send`)

### 4.1.1 Templated Email Usage

Use this payload setup when pulling a registered compilation structure (like an `internship-completion-certificate` or `quotation` layout) from the template registry table.

**Request Body (JSON):**

```json
{
  "clientId": "367ee3b0-289a-81c9-b502-d21a1ed375b0",
  "channel": "email",
  "template": "internship-completion-certificate",
  "variables": {
    "recipientName": "Alex Mercer",
    "recipientRole": "Test 2",
    "scopeOfWork": "Backend Core Systems Development",
    "startDate": "2026-01-01",
    "endDate": "2026-05-01",
    "dataOfIssue": "2026-05-22",
    "signerName": "John Doe",
    "signerTitle": "Managing Director",
    "certificateUrl": "https://document.modesthumanbrands.com/api/document/4dd38bbf-8372-4a4b-a1c7-6f70d904f73e/content?download=true",
    "organization": {
      "id": "red-cat-pictures",
      "name": "RED CAT PICTURES",
      "website": "https://redcatpictures.com",
      "branding": {
        "logo": "https://redcatpictures.com/logo-dark.svg",
        "color": {
          "primary": "#CD2D2D",
          "accent": ""
        },
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
  "interactionId": "crm-timeline-mail-1716381000000",
  "dispatchId": "<cb978aaa-50eb-99df-9ded-aa04750f76d0@redcatpictures.com>"
}
```

### 4.1.2 Raw Email Usage (No Template)

Use this payload setup to bypass the compilation registry entirely and pass raw textual or custom standalone HTML data blocks directly into the SMTP pipeline.

**Request Body (JSON):**

```json
{
  "clientId": "367ee3b0-289a-81c9-b502-d21a1ed375b0",
  "template": "none",
  "subject": "Automated Integration Test Notification",
  "displayName": "Internal Automated Service",
  "text": "Hi Alex, this is an automated message to confirm that the email delivery pipeline and API integration are functioning correctly. No further action is required.",
  "html": "<h3>API Integration Test</h3><p>Hi Alex,</p><p>This is an automated message to verify that your email automation API integration is working as expected and communication channels are open.</p><br><p style='color:#666666; font-size: 12px;'>This is a routine system check. No action is required.</p>"
}
```

**Response Body (JSON - 200 OK):**

```json
{
  "success": true,
  "interactionId": "crm-timeline-mail-1716381085000",
  "dispatchId": "<sec-alert-8821aa09b502@redcatpictures.com>"
}
```

---

## 📱 4.2 SMS Dispatcher Gateway (`POST /api/text/sms/send`)

### 4.2.1 Templated SMS Usage

Use this payload setup to route data through the specialized `smsTemplateRegistry` layout mapping logic. The localized text transformer compiles and replaces context string elements dynamically.

**Request Body (JSON):**

```json
{
  "clientId": "367ee3b0-289a-81c9-b502-d21a1ed375b0",
  "template": "internship-completion-certificate",
  "variables": {
    "recipientName": "Alex Mercer",
    "recipientRole": "Backend Core Systems Development",
    "certificateUrl": "https://document.modesthumanbrands.com/api/document/4dd38bbf-8372-4a4b-a1c7-6f70d904f73e/content?download=true",
    "organization": {
      "id": "red-cat-pictures",
      "name": "RED CAT PICTURES",
      "website": "https://redcatpictures.com",
      "branding": {
        "logo": "https://redcatpictures.com/logo-dark.svg",
        "color": {
          "primary": "#CD2D2D",
          "accent": ""
        },
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
  "interactionId": "crm-timeline-sms-1716301000000",
  "dispatchId": "fast2sms-req-8832101"
}
```

### 4.2.2 Raw SMS Usage (No Template)

Use this payload setup when sending manual, transactional text broadcasts, or custom alerts directly to the customer's mobile device via the Fast2SMS gateway.

**Request Body (JSON):**

```json
{
  "clientId": "367ee3b0-289a-81c9-b502-d21a1ed375b0",
  "template": "none",
  "text": "Hi Alex, this is an automated message to confirm that the email delivery pipeline and API integration are functioning correctly. No further action is required."
}
```

**Response Body (JSON - 200 OK):**

```json
{
  "success": true,
  "interactionId": "crm-timeline-sms-1716301054000",
  "dispatchId": "fast2sms-req-8832199"
}
```

---

## 5. Automated Campaigns & Lead Generation

### `POST /api/campaigns/enroll`

**Description:** Attaches a `client_id` to an automated drip sequence (e.g., standard lead nurture, post-project review requests).

**Input (JSON):**

```json
{
  "client_id": "uuid-1234",
  "campaign_id": "camp-lead-nurture-01",
  "trigger_source": "missed_call"
}
```

**Output (JSON - 200 OK):**

```json
{
  "status": "enrolled",
  "next_action_at": "2026-05-18T10:05:00Z"
}
```

### `POST /api/campaigns/trigger-action`

**Description:** Internal cron-job or webhook endpoint that forces the evaluation of active campaigns and dispatches pending actions (e.g., Day 2 Follow-up Email).

**Input (JSON):**

```json
{
  "execute_timestamp": "2026-05-18T12:00:00Z"
}
```

**Output (JSON - 200 OK):**

```json
{
  "processed_actions": 14,
  "dispatched_channels": {
    "sms": 4,
    "email": 10
  }
}
```

---

Progress = 7/13 = 53%

## License

Published under the [MIT](https://github.com/Modest-Human-Brands/mconnect/blob/main/LICENSE) license.
<br><br>
<a href="https://github.com/Modest-Human-Brands/mconnect/graphs/contributors">
<img src="https://contrib.rocks/image?repo=Modest-Human-Brands/mconnect" />
</a>
