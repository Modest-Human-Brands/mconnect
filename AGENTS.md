# Guide: Creating a New Email Template

## Directory Structure

```
templates/text/email/
├── index.ts                          ← import your new template here
└── YourTemplateV1/
    ├── index.ts                     ← schema + placeholders + registerTemplate
    └── component.vue               ← Vue email component (vue-email)
```

---

## Step 1 — Create the `index.ts` file

### 1a. Imports

```ts
import Component from './component.vue'
import registerTemplate from '#server/utils/template-registry-email.ts'
import { z } from 'zod'
```

### 1b. Zod Schema

Define a `z.object()` that captures every field the caller must supply. The schema is split into:

| Section                  | Purpose                                            |
| ------------------------ | -------------------------------------------------- |
| Template-specific fields | Business data (names, dates, amounts, links, etc.) |
| `organization`           | Shared organization object (see below)             |

**Canonical naming rules for template-specific fields:**

| Concept                      | **Required prop name** | Never use                                                  |
| ---------------------------- | ---------------------- | ---------------------------------------------------------- |
| Person receiving the email   | `recipientName`        | ~~clientName, contractorName, personName~~                 |
| Role/title of recipient      | `recipientRole`        | ~~contractorRole, clientRole~~                             |
| Project/engagement name      | `projectName`          | ~~projectTitle~~                                           |
| Quotation reference number   | `quotationNumber`      | ~~quoteNumber~~                                            |
| Date the document was issued | `dateOfIssue`          | ~~dataOfIssue~~ (typo)                                     |
| Action / CTA link URL        | `ctaUrl`               | ~~certificateUrl, quotationUrl, contractLink, invoiceUrl~~ |

> **Rule:** If your template has a single "action link" button, it is always named `ctaUrl`. No exceptions.

### 1c. Organization Schema (shared across all templates)

```ts
z.object({
  id: z.string(),
  name: z.string(),
  legalName: z.string(),
  entityType: z.enum(['LLP', 'Private Limited', 'Proprietorship']),
  tradeRelationship: z.enum(['Primary', 'Trading As', 'Operating Division', 'Wholly-Owned Subsidiary', 'Special Purpose Vehicle']),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  address: z.string(),
  foundedYear: z.number(),
  accountDetails: z.object({
    accountName: z.string(),
    accountNumber: z.number(),
    bankName: z.string(),
    ifscCode: z.string(),
  }),
  branding: z.object({
    logo: z.string(),
    color: z.object({
      primary: z.string(),
      accent: z.string(),
    }),
    font: z.string(),
  }),
  website: z.string().optional(),
  phone: z.string().optional(),
  contactEmail: z.email(),
  billingEmail: z.email(),
  whatsapp: z.string().optional(),
  socials: z.record(z.any(), z.any()).optional(),
  primaryContactId: z.string(),
  organizationMemberIds: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
})
```

### 1d. Type Export + Placeholders

```ts
export type YourTemplatePayload = z.infer<typeof yourTemplateSchema>

const placeholders: YourTemplatePayload = {
  // Fill every field with realistic sample data.
  // These serve as fallbacks in transformPayload and as preview defaults.
  recipientName: 'John Doe',
  projectName: 'Sample Project',
  ctaUrl: '#',
  organization: {/* full org object with branding */},
}
```

### 1e. `registerTemplate(...)` call

```ts
registerTemplate({
  id: 'your-template-slug', // kebab-case, unique
  label: 'Your Template Label', // Display name in UI
  description: '',
  schema: yourTemplateSchema,
  placeholders,
  subject: (rawData: YourTemplatePayload) => rawData?.emailSubject || placeholders.emailSubject,
  component: Component,
  transformPayload: (rawData: YourTemplatePayload) => {
    const p = placeholders
    const org = rawData?.organization || p.organization

    return {
      // ─── Template-specific fields (use canonical names) ───
      recipientName: rawData?.recipient?.name || p.recipient.name,
      projectName: rawData?.projectName || p.projectName,
      ctaUrl: rawData?.ctaUrl || p.ctaUrl,

      // ─── Organization branding (ALWAYS include all 6) ───
      organizationName: org?.name || p.organization.name,
      organizationWebsite: org?.website || p.organization.website,
      organizationLogo: org?.branding?.logo || p.organization.branding.logo,
      organizationColorPrimary: org?.branding?.color?.primary || p.organization.branding.color.primary,
      organizationColorAccent: org?.branding?.color?.accent || p.organization.branding.color.accent,
      organizationFont: org?.branding?.font || p.organization.branding.font,
    }
  },
})
```

**Transform output key rules:**

| Transform output key       | Source                       | Notes                                |
| -------------------------- | ---------------------------- | ------------------------------------ |
| `recipientName`            | schema recipient name        | Always this name                     |
| `ctaUrl`                   | action link                  | Single canonical CTA                 |
| `organizationName`         | `org.name`                   | Required                             |
| `organizationWebsite`      | `org.website`                | Required (can be `undefined`)        |
| `organizationLogo`         | `org.branding.logo`          | Single logo, no Full/Simple variants |
| `organizationColorPrimary` | `org.branding.color.primary` | Required                             |
| `organizationColorAccent`  | `org.branding.color.accent`  | Required                             |
| `organizationFont`         | `org.branding.font`          | Required                             |

> Every transform output key must have a matching prop in `component.vue`. No orphan keys.

---

## Step 2 — Create the `component.vue` file

### 2a. Script Setup

```vue
<script setup lang="ts">
import { Html, Head, Body, Img, Container, Section, Text, Button } from '@vue-email/components'

defineProps<{
  // ─── Template-specific (canonical names) ───
  recipientName: string
  projectName: string
  ctaUrl: string
  // ... other template fields

  // ─── Organization branding (always all 6) ───
  organizationName: string
  organizationWebsite: string
  organizationLogo: string
  organizationColorPrimary: string
  organizationColorAccent: string
  organizationFont: string
}>()
</script>
```

### 2b. Template Body

Use `@vue-email/components` primitives (`Html`, `Head`, `Body`, `Container`, `Section`, `Text`, `Button`, `Img`, `Hr`). Apply inline styles (email-safe). Use the org color/font props for theming:

```html
<html>
  <body style="font-family: {{ organizationFont }}, sans-serif">
    <!-- Header with logo -->
    <img :src="organizationLogo" alt="" />

    <!-- Content using canonical prop names -->
    <Text>Hello {{ recipientName }},</Text>
    <Text>{{ projectName }}</Text>

    <!-- CTA button -->
    <button href="#" style="background-color: {{ organizationColorPrimary }}">View Details</button>

    <!-- Accent usage (borders, highlights) -->
    <section :style="{ borderTop: `2px solid ${organizationColorAccent}` }" />
  </body>
</html>
```

---

## Step 3 — Register in the email index

Add to `templates/text/email/index.ts`:

```ts
import './YourTemplateV1'
```

(Import order is alphabetical.)

---

## Canonical Naming Reference (Quick-Check Table)

| Layer                                 | Field / Key                | Applies to                           |
| ------------------------------------- | -------------------------- | ------------------------------------ |
| Schema → Transform → Props → Template | `recipientName`            | All templates with a named recipient |
| Schema → Transform → Props → Template | `recipientRole`            | Templates showing a title/role       |
| Schema → Transform → Props → Template | `projectName`              | Templates referencing a project      |
| Schema → Transform → Props → Template | `quotationNumber`          | Quotation-specific                   |
| Schema → Transform → Props → Template | `dateOfIssue`              | Document issue dates                 |
| Schema → Transform → Props → Template | `ctaUrl`                   | Any single action link / button      |
| Transform → Props → Template          | `organizationName`         | All templates                        |
| Transform → Props → Template          | `organizationWebsite`      | All templates                        |
| Transform → Props → Template          | `organizationLogo`         | All templates (single logo)          |
| Transform → Props → Template          | `organizationColorPrimary` | All templates                        |
| Transform → Props → Template          | `organizationColorAccent`  | All templates                        |
| Transform → Props → Template          | `organizationFont`         | All templates                        |

### Forbidden names (legacy, must not reappear)

```
clientName, contractorName, personName
contractorRole, clientRole
projectTitle
quoteNumber
dataOfIssue
certificateUrl, quotationUrl, contractLink, invoiceUrl (as CTA)
organizationLogoFull, organizationLogoSimple
```

---

## Checklist Before Submitting

- [ ] Schema fields use canonical names
- [ ] Placeholders object fills every schema field with realistic data
- [ ] `transformPayload` returns keys that exactly match component props
- [ ] All 6 organization branding keys present in transform output
- [ ] `component.vue` `defineProps` matches transform output 1:1
- [ ] Template references use canonical prop names (no legacy aliases)
- [ ] `registerTemplate` has a unique kebab-case `id`
- [ ] Import added to `templates/text/email/index.ts`
- [ ] No forbidden legacy names anywhere in the two files
