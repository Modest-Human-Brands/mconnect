<p align="center">
  <a href="https://github.com/Modest-Human-Brands/mconnect">
    <img src="https://raw.githubusercontent.com/Modest-Human-Brands/mconnect/main/public/logo.png" alt="MConnect Logo" width="80" height="80" />
  </a>
</p>

<h1 align="center">MConnect</h1>

<p align="center">
  <strong>An omnichannel client outreach and communication hub powered by Nitro, Notion CRM, Vue Email, and LiveKit.</strong>
</p>

<p align="center">
  <a href="https://github.com/Modest-Human-Brands/mconnect/actions/workflows/integrate.yml"><img src="https://img.shields.io/github/actions/workflow/status/Modest-Human-Brands/mconnect/integrate.yml?branch=develop&label=CI&logo=github" alt="CI Status" /></a>
  <a href="https://github.com/Modest-Human-Brands/mconnect/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License" /></a>
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/Runtime-Bun%201.4+-fbf0df?logo=bun&logoColor=black" alt="Bun Runtime" /></a>
  <a href="https://nitro.build"><img src="https://img.shields.io/badge/Engine-Nitro%203.x-ea580c?logo=nitro" alt="Nitro Engine" /></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-Enabled-8A2BE2" alt="MCP Enabled" /></a>
</p>

---

## Overview

**MConnect** is a unified communication and engagement engine built with [Nitro 3](https://nitro.build). It connects multi-tenant organizations to an omnichannel gateway spanning transactional email, SMS, WhatsApp, and WebRTC/SIP telephony—orchestrating all inbound and outbound client touchpoints into a unified Notion CRM directory and ledger.

Equipped with dynamic Vue-based email rendering, anti-bot email telemetry (featuring Apple Mail Privacy Protection filtering and honeypot traps), multi-vendor carrier routing (SMTP/IMAP, Fast2SMS, Vobiz, Twilio, LiveKit), and Model Context Protocol (MCP) toolkits, MConnect powers comprehensive client relationship workflows with zero vendor lock-in.

### Features

- 🌐 **Omnichannel Communication Layer:** Unified dispatch and ingestion pipelines across Email (SMTP/IMAP), SMS (Fast2SMS, Vobiz, Twilio), WhatsApp (Vobiz / Meta Cloud API), and Telephony (LiveKit SIP Carrier Bridge).
- 🗄️ **Unified Notion CRM Core:** Smart contact deduplication (matching sequentially on phone and email), automatic profile enrichment, and consolidated omnichannel interaction timelines across all channels.
- 🎨 **10 Type-Safe Vue Email Templates:** Rich, responsive email layouts rendered via `@vue-email/render` with dynamic variable schemas, brand customizability, and JSON schema inspection.
- 🛡️ **Advanced Anti-Bot Telemetry:** Open/click tracking pixel engine with Apple Mail Privacy Protection (MPP) egress IP filtering, known security scanner detection, offline IP geolocation (`geoip-lite`), and honeypot traps that retroactively invalidate crawler noise.
- 📞 **Programmable SIP & WebRTC Voice Engine:** LiveKit media room provisioning, two-leg outbound SIP bridging, agent priority routing from CRM rows, and call duration ledger sync.
- 🤖 **Model Context Protocol (MCP) Ready:** Integrated with `nitro-mcp-toolkit` to expose system diagnostics and service tools directly to AI coding and assistant agents.
- ⚡ **Automated Task Scheduling:** Nitro cron workers executing periodic telemetry syncs, IMAP inbox polling, and multi-database Notion caching at scheduled intervals.

---

## Architecture

```text
  +---------------------------+             +-------------------------------+
  |  👤 External Client/Lead  |             |  💼 Internal Agent/Dashboard  |
  +---------------------------+             +-------------------------------+
                ^                                        ^          ^
                | Email / SMS / WhatsApp / SIP           | REST/WS  | AI Prompts
                v                                        v          v
  +-------------------------------+         +-------------------------------+
  |    📡 Omnichannel Carriers    |         | 🚀 MConnect Gateway (Nitro)   |
  |  - Email: SMTP / IMAP         |<------->|  - API Gateway & Route Engine |
  |  - SMS: Fast2SMS/Vobiz/Twilio | Webhook |  - MCP Server Toolkit         |
  |  - WhatsApp: Meta Cloud/Vobiz | Ingest/ |  - Vue-Email Rendering Engine |
  |  - Voice: LiveKit SIP Bridge  | Outbound|  - Anti-Bot Telemetry Hub     |
  +-------------------------------+         |  - Local Cache (unstorage fs) |
                                            |  - Cron Worker (sync:*)       |
                                            +-------------------------------+
                                                           |
                                                           | Direct Upsert /
                                                           | Scheduled Sync
                                                           v
                                            +-------------------------------+
                                            |   🏢 Notion CRM Core (DBs)    |
                                            |  - Contacts & Unified Ledger  |
                                            |  - Emails & Communications    |
                                            |  - Messages (SMS / WhatsApp)  |
                                            |  - Voice Calls & Recordings   |
                                            |  - Verified Telemetry Events  |
                                            +-------------------------------+
```

---

## Quickstart

### Prerequisites

- **Runtime:** [Bun](https://bun.sh) `^1.2.9` (recommended) or [Node.js](https://nodejs.org) `^22.11.0 || ^24.14.0`
- **Package Manager:** `bun@1.4.1` (configured via `packageManager`)
- **Notion Integration:** API Key and Database IDs for Contacts, Users, Emails, Messages, Calls, and Telemetry

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/Modest-Human-Brands/mconnect.git
cd mconnect

# Install dependencies using Bun
bun install
```

### 2. Environment Setup

Create `.env` in the root directory:

```env
NODE_ENV=development
PORT=3000

# Notion Integration
NOTION_API_KEY=secret_your_notion_api_key

# Public & Private Runtime Config
NITRO_PUBLIC_CONNECT_URL=http://localhost:3000
NITRO_PRIVATE_NOTION_DB_ID={"contact":"<id>","user":"<id>","email":"<id>","message":"<id>","call":"<id>","telemetry":"<id>"}
NITRO_PRIVATE_API_KEY=<long-random-secret>

# Versioning & Host Identifiers
NITRO_APP_VERSION=0.5.16
NITRO_APP_BUILD_TIME=2026-10-16T00:00:00Z
HOSTNAME=mconnect-local-1
```

### 3. Development Server

```bash
# Start local Nitro development server (with live reload)
bun run dev

# Expose local server via secure Untun tunnel (for receiving remote webhooks)
bun run tunnel
```

### 4. Production Build & Docker

```bash
# Build for production with Nitro
bun run build

# Start compiled server
bun run start

# Or build and launch via Docker
bun run docker:build
bun run docker:start
```

---

> **Authentication.** Every `/api/**` route requires an `x-api-key` header matching `NITRO_PRIVATE_API_KEY` (401 if missing or wrong, 503 if the server has no key configured). Exempt routes: `GET /api/health`, `/api/track/*` (opened by email clients), `POST /api/interaction/phone/status` (verified by the LiveKit signature), the OAuth callback `/api/email/accounts/oauth/:provider/callback`, and the SMS/WhatsApp template-preview WebSockets.
>
> Inbound SMS/WhatsApp webhooks (`POST /api/interaction/sms/receive`, `/whatsapp/receive`) also accept `?secret=<NITRO_PRIVATE_WEBHOOK_SECRET>` in the URL for providers that cannot send headers. The LiveKit webhook takes its organization from `?org=<slug>` (or `NITRO_PRIVATE_VOICE_ORG_SLUG`).

## API Reference

All `/api/**` endpoints have Cross-Origin Resource Sharing (CORS) enabled by default.

### 1. System & Health

#### `GET /api/health`

Returns deployment readiness and active compute node information.

- **Response (`200 OK`):**
  ```json
  {
    "status": "OK",
    "version": "0.5.16",
    "buildTime": "2026-10-16T00:00:00Z",
    "node": "mconnect-node-1"
  }
  ```

_Note: Also exposed as a Model Context Protocol (MCP) tool named `health`._

---

### 2. Unified Directory (Notion CRM Core)

#### `GET /api/contacts`

Retrieves a paginated list of contacts enriched with reachability channels (`platforms`), latest message snippets, unread counts, and timestamps.

- **Query Parameters:**

  | Parameter | Type     | Default | Description                                  |
  | :-------- | :------- | :------ | :------------------------------------------- |
  | `limit`   | `number` | `50`    | Maximum number of contact records to return. |
  | `offset`  | `number` | `0`     | Number of records to skip for pagination.    |

- **Response (`200 OK`):**
  ```json
  {
    "results": [
      {
        "id": "189c4e20-3b1a-4c22-98a1-8d2a3c9b7e54",
        "name": "Sarah Liu",
        "company": "WaveLength Creative Co.",
        "jobTitle": "Marketing Director",
        "email": "sarah.liu@wavelength.co",
        "phone": "+15551234567",
        "instagram": "sarah_creative",
        "status": "Active",
        "lastActive": "2026-10-15T14:20:00.000Z",
        "lastMessageSnippet": "Looking forward to reviewing the proposal.",
        "platforms": ["email", "sms", "phone", "whatsapp"],
        "unreadCount": 0
      }
    ],
    "pagination": {
      "total": 142,
      "limit": 50,
      "offset": 0
    }
  }
  ```

#### `PUT /api/contacts`

Smart contact upsert. If `contactId` is omitted, deduplicates against existing CRM pages by matching `phone` first, then `email`. If no record matches, creates a new Notion contact page.

- **Request Body (JSON):**

  | Field       | Type       | Required   | Description                                                                                                                                                               |
  | :---------- | :--------- | :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | `brand`     | `string`   | **Yes**    | Brand or primary trading name.                                                                                                                                            |
  | `company`   | `string`   | **Yes**    | Full company/legal entity name.                                                                                                                                           |
  | `address`   | `string`   | **Yes**    | Physical or business address.                                                                                                                                             |
  | `pocPerson` | `string`   | **Yes**    | Point of Contact primary person name.                                                                                                                                     |
  | `phone`     | `string`   | _Optional_ | Phone number (at least one of `phone` or `email` is required).                                                                                                            |
  | `email`     | `string`   | _Optional_ | Valid email address (at least one of `phone` or `email` is required).                                                                                                     |
  | `contactId` | `string`   | No         | Target Notion page ID. When provided, updates the existing record directly.                                                                                               |
  | `status`    | `enum`     | No         | Status: `Unverified`, `Researched`, `Verified`, `Initiate`, `Communicate`, `Converted`, `Cancelled`, `Active`, `Inactive`, `On Hold`.                                     |
  | `type`      | `enum`     | No         | Company type: `Brand`, `Product`, `Agency`, `Food`, `FMCG`, `Sweet`, `Real Estate`, `Hotel`, `Home Decor`, `Leather`, `Garment`, `Cosmetics`, `Jewellery`, `Accessories`. |
  | `tags`      | `string[]` | No         | Categorical tags.                                                                                                                                                         |
  | `whatsapp`  | `string`   | No         | Dedicated WhatsApp phone number.                                                                                                                                          |
  | `website`   | `url`      | No         | Organization website URL.                                                                                                                                                 |
  | `linkedIn`  | `url`      | No         | LinkedIn profile URL.                                                                                                                                                     |
  | `instagram` | `url`      | No         | Instagram profile URL.                                                                                                                                                    |

- **Response (`200 OK`):**
  ```json
  {
    "contactId": "367ee3b0-289a-81c9-b502-d21a1ed375b0",
    "status": "created"
  }
  ```

#### `GET /api/contacts/:contactId/timeline`

Retrieves a unified chronological history (newest first) across Emails, Messages (SMS/WhatsApp), and Phone Calls for a given contact.

- **Path Parameters:**
  - `contactId` (`string`, required): Notion contact page ID.
- **Query Parameters:**
  - `limit` (`number`, optional): Maximum interactions to return.
  - `offset` (`number`, default: `0`): Pagination skip offset.

- **Response (`200 OK`):**
  ```json
  {
    "client_id": "189c4e20-3b1a-4c22-98a1-8d2a3c9b7e54",
    "results": [
      {
        "interactionId": "msg_90123",
        "channel": "whatsapp",
        "direction": "inbound",
        "timestamp": "2026-10-15T12:00:00.000Z",
        "summary": "Can you resend the updated contract?",
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
        "timestamp": "2026-10-14T09:30:00.000Z",
        "content": "<p>Hi Sarah, here is the updated proposal...</p>",
        "status": "sent",
        "metadata": {
          "subject": "Proposal - Retainer 2026",
          "hasAttachments": true
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

### 3. Interaction & Messaging Gateway

#### 3.1 Email Gateway

##### `POST /api/interaction/email/send`

Dispatches an email via the configured SMTP provider, compiles Vue email templates (or delivers raw text/HTML), tracks recipient engagement, and creates a Notion email record.

- **Headers:**
  - `x-org-id` (`string`, **required**): Tenant organization slug (e.g. `modest-human-brands`).

- **Request Body (JSON):**

  ```json
  {
    "userId": "307ee3b0289a8179a8a8d2efcdb67bbf",
    "contactId": "367ee3b0-289a-81c9-b502-d21a1ed375b0",
    "recipientEmail": "client@example.com",
    "displayName": "Shirsendu from Modest Human",
    "template": "quotation",
    "subject": "Quotation for Q4 Production",
    "variables": {
      "recipientName": "Alex Mercer",
      "quotationNumber": "QT-2026-001",
      "dateOfIssue": "2026-10-16",
      "validUntil": "2026-11-16",
      "currency": "INR",
      "lineItems": [{ "name": "Brand Identity Redesign", "quantity": 1, "rate": 50000 }],
      "financials": {
        "subtotal": 50000,
        "discountPercentage": 10,
        "taxPercentage": 18
      },
      "ctaUrl": "https://modesthumanbrands.com/proposals/QT-2026-001",
      "organization": {
        "id": "org_1",
        "name": "Modest Human Brands",
        "legalName": "Modest Human Brands LLP",
        "entityType": "LLP",
        "tradeRelationship": "Primary",
        "address": "Kolkata, India",
        "foundedYear": 2024,
        "accountDetails": {
          "accountName": "Modest Human Brands LLP",
          "accountNumber": 1234567890,
          "bankName": "HDFC Bank",
          "ifscCode": "HDFC0001234"
        },
        "branding": {
          "logo": "https://modesthumanbrands.com/logo.svg",
          "color": { "primary": "#111827", "accent": "#3B82F6" },
          "font": "Exo2"
        },
        "contactEmail": "contact@modesthumanbrands.com",
        "billingEmail": "billing@modesthumanbrands.com",
        "primaryContactId": "user_1",
        "organizationMemberIds": ["user_1"],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    }
  }
  ```

  _For raw emails without a template, pass `"template": "none"`, `"text": "Your plain text message"`, and optional `"html": "<p>HTML</p>"`, with `"variables": undefined`._

- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "dispatchId": "<b978aaa-50eb-99df-9ded-aa04750f76d0@modesthumanbrands.com>",
    "emailId": "36bee3b0289a8030a6f9c0eea0708f12"
  }
  ```

##### `POST /api/interaction/email/receive`

Inbound email ingestion webhook. Parses multi-part MIME payloads, upserts the contact, and logs the email directly into the Notion Email database with status `Received` and direction `Inbound`.

- **Request Body (JSON):**

  ```json
  {
    "from": "John Doe <john.doe@example.com>",
    "to": "contact@modesthumanbrands.com",
    "subject": "Re: Project Scope Inquiry",
    "text": "Hi team, I had a follow-up regarding the milestone schedule.",
    "html": "<p>Hi team, I had a follow-up regarding the milestone schedule.</p>"
  }
  ```

- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "interactionId": "36bee3b0289a8030a6f9c0eea0708f12"
  }
  ```

##### `GET /api/interaction`

Retrieves all emails associated with a specific organization. Requires `x-org-id` header.

##### `GET /api/interaction/email`

Retrieves all emails across the workspace, sorted with latest first.

##### `GET /api/interaction/email/:id`

Retrieves full details and sanitized HTML for a single email interaction by its Notion page ID.

---

#### 3.2 SMS Gateway

##### `POST /api/interaction/sms/send`

Dispatches SMS via Fast2SMS, Vobiz, or Twilio, and creates a Notion message page.

- **Headers:**
  - `x-org-id` (`string`, **required**): Tenant organization slug (e.g. `modest-human-brands`).

- **Request Body (JSON):**

  ```json
  {
    "userId": "307ee3b0289a8179a8a8d2efcdb67bbf",
    "contactId": "367ee3b0-289a-81c9-b502-d21a1ed375b0",
    "recipientPhone": "+919876543210",
    "template": "none",
    "text": "Your verification code is 482910. Valid for 10 minutes."
  }
  ```

- **Response (`200 OK`):**
  ```json
  {
    "interactionId": "36bee3b0289a8030a6f9c0eea0708f12",
    "dispatchId": "fast2sms-req-8832199"
  }
  ```

##### `POST /api/interaction/sms/receive`

Inbound SMS webhook target. Upserts the contact and appends an inbound message record to Notion.

- **Request Body (JSON):**

  ```json
  {
    "from": "+919876543210",
    "to": "+918012345678",
    "text": "YES, confirm my appointment."
  }
  ```

- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "interactionId": "36bee3b0289a8030a6f9c0eea0708f12"
  }
  ```

---

#### 3.3 WhatsApp Gateway

##### `POST /api/interaction/whatsapp/send`

Dispatches WhatsApp messages or approved template structures via Meta Cloud API / Vobiz.

- **Headers:**
  - `x-org-id` (`string`, **required**): Tenant organization slug (e.g. `modest-human-brands`).

- **Request Body (JSON):**

  ```json
  {
    "userId": "307ee3b0289a8179a8a8d2efcdb67bbf",
    "contactId": "367ee3b0-289a-81c9-b502-d21a1ed375b0",
    "template": "none",
    "text": "Hi Alex, your requested quotation has been generated and sent to your email."
  }
  ```

- **Response (`200 OK`):**
  ```json
  {
    "interactionId": "36bee3b0289a8030a6f9c0eea0708f12",
    "dispatchId": "wamid.HBgLOTE5ODc2NTQzMjEwFQIAERg2..."
  }
  ```

##### `POST /api/interaction/whatsapp/receive`

Inbound webhook listener for WhatsApp messages.

- **Request Body (JSON):**

  ```json
  {
    "from": "+919876543210",
    "to": "+918012345678",
    "text": "Thanks! Reviewing now."
  }
  ```

- **Response (`200 OK`):**
  ```json
  {
    "interactionId": "36bee3b0289a8030a6f9c0eea0708f12"
  }
  ```

---

#### 3.4 Telephony & LiveKit Voice Gateway

##### `POST /api/interaction/phone/send`

Initiates a dual-leg voice call by creating a LiveKit media room, issuing an agent session token, and launching an outbound SIP trunk bridge to the destination party.

- **Headers:**
  - `x-org-id` (`string`, **required**): Tenant organization slug (e.g. `modest-human-brands`).

- **Request Body (JSON):**

  ```json
  {
    "contactId": "36bee3b0289a8030a6f9c0eea0708f12",
    "userId": "307ee3b0289a8179a8a8d2efcdb67bbf",
    "recordCall": true,
    "webCall": false
  }
  ```

- **Response (`200 OK`):**
  ```json
  {
    "status": "bridging_initiated",
    "provider": "livekit-sip",
    "callUuid": "call_98fbc123-e456"
  }
  ```

##### `POST /api/interaction/phone/status`

Webhook receiver for LiveKit room lifecycle events (`room_started`, `room_finished`). Validates cryptographic signatures via the `Authorization` header, handles automatic agent hunt routing (Sales/Marketing priority queues), and logs call durations back to Notion.

---

### 4. Template Engine & Visual Studios

#### 4.1 Email Templates

- `GET /api/interaction/email/template`: Returns an array of all 10 registered templates with labels, descriptions, and thumbnail URLs.
- `GET /api/interaction/email/template/:id`: Returns the JSON Schema representation of the template's required variables.
- `POST /api/interaction/email/template/preview`: Dynamically compiles a template with provided variables and returns `{ "contentHtml": "<...>" }`.

##### Registered Email Templates

| Template Slug                       | Description                                                            |
| :---------------------------------- | :--------------------------------------------------------------------- |
| `content-release`                   | Formal talent and media copyright release agreement.                   |
| `internship-completion-certificate` | Verification of internship completion with signatory details.          |
| `invoice`                           | Detailed commercial invoice with tax, discounts, and itemized billing. |
| `otp`                               | Clean transactional one-time password verification code email.         |
| `outreach`                          | Personalized cold outreach and partnership proposal email.             |
| `project-delivery`                  | Production deliverable handover with cloud asset download links.       |
| `quotation`                         | Formal quotation / estimate with line items and acceptance CTA.        |
| `receipt`                           | Payment acknowledgment receipt with transaction and bank details.      |
| `retainer-contract`                 | Monthly agency retainer contract terms and deliverables.               |
| `shoot-contract`                    | Production shoot agreement with logistics, schedule, and deliverables. |

#### 4.2 SMS & WhatsApp Visual Studios

- `GET /api/interaction/sms/template`: Catalog of registered SMS templates.
- `GET /api/interaction/whatsapp/template`: Catalog of registered WhatsApp templates.
- **WebSocket Previews:**
  - `ws://localhost:3000/api/interaction/sms/template/preview`
  - `ws://localhost:3000/api/interaction/whatsapp/template/preview`
- **Interactive Browser Studios:**
  - `GET /dev/sms/:id`: Live visual in-browser SMS editor and live preview.
  - `GET /dev/whatsapp/:id`: Live visual in-browser WhatsApp message renderer.

---

### 5. Anti-Bot Telemetry Engine

MConnect includes an enterprise-grade telemetry engine designed to measure genuine human interaction while filtering out automated security scanners and crawlers.

#### Telemetry Endpoints

- **`GET /api/track/open?e=<emailId>`**
  Returns a `1x1` transparent GIF with `Cache-Control: no-store, no-cache`. Logs IP, user-agent, device classification (`desktop` / `mobile`), and geolocation. Automatically filters out known bots and Apple Mail Privacy Protection (MPP) proxy requests.
- **`GET /api/track/click?url=<targetUrl>&e=<emailId>`**
  Records genuine link click-throughs and issues an HTTP `302` redirect to the destination URL (falls back to `https://modesthumanbrands.com`).
- **`GET /api/track/trap?e=<emailId>`**
  Invisible honeypot link placed in emails. When an automated crawler follows the trap, MConnect immediately tags the session as a bot and **retroactively invalidates all past opens and clicks** associated with that `emailId`.
- **`GET /api/interaction/email/:id/telemetry`**
  Retrieves deep telemetry analytics for an email, including aggregated metrics (`totalOpens`, `totalClicks`, `botFiltered`, `isHoneypotTriggered`, `deviceBreakdown`, `locations`) and a chronological event timeline.

---

## Development

<details>
<summary><strong>View Development & Build Scripts</strong></summary>

All scripts are executed using Bun:

| Script                 | Command                                              | Purpose                                                                           |
| :--------------------- | :--------------------------------------------------- | :-------------------------------------------------------------------------------- |
| `bun run dev`          | `nitro dev`                                          | Starts local development server on port 3000 with HMR.                            |
| `bun run build`        | `nitro build`                                        | Builds optimized standalone production output in `.output/`.                      |
| `bun run start`        | `node --env-file=.env.prod .output/server/index.mjs` | Runs production build with Node.js.                                               |
| `bun run preview`      | `nitro preview`                                      | Previews the compiled production build locally.                                   |
| `bun run test`         | `vitest run`                                         | Runs unit and integration test suite via Vitest.                                  |
| `bun run test:load`    | `k6 run tests/load.test.ts`                          | Runs performance load tests with k6.                                              |
| `bun run lint`         | `eslint . --fix`                                     | Runs ESLint and automatically fixes formatting errors.                            |
| `bun run format`       | `prettier . --write`                                 | Formats all code with Prettier.                                                   |
| `bun run generate`     | `nitro task run thumbnail:template`                  | Renders template sample PNGs to `public/templates` (needs `bun run dev` running). |
| `bun run tunnel`       | `bunx untun tunnel http://localhost:3000`            | Creates an HTTP tunnel to receive external webhooks.                              |
| `bun run detect`       | `gitleaks git --verbose`                             | Scans git repository history for leaked secrets.                                  |
| `bun run clean`        | `nitro cleanup`                                      | Cleans temporary Nitro caches and artifacts.                                      |
| `bun run docker:build` | `docker build ... -t mconnect:dev .`                 | Builds the multi-stage Alpine Docker container.                                   |
| `bun run docker:start` | `docker run ... mconnect:dev`                        | Runs container with mapped port 3500:3000.                                        |

</details>

---

## License

Published under the [MIT](https://github.com/Modest-Human-Brands/mconnect/blob/main/LICENSE) license.

<br />

<a href="https://github.com/Modest-Human-Brands/mconnect/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Modest-Human-Brands/mconnect" alt="Contributors" />
</a>
