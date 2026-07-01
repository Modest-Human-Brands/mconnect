<script setup lang="ts">
import { Html, Head, Body, Img, Container, Section, Text, Button, Tailwind, Hr } from '@vue-email/components'

defineProps<{
  recipientName: string
  isRecipientContact: boolean
  isSigned: boolean
  pricingModel: 'project' | 'day'
  projectName: string
  quoteNumber: string
  validUntil: string
  deliverables: { title: string; description: string; points: string[]; rate: number; quantity: number; amount: number }[]
  financialsSubtotal: number
  financialsDiscountLabel: string
  financialsDiscountAmount: number
  financialsTaxLabel: string
  financialsTaxAmount: number
  financialsGrandTotal: number
  quotationUrl: string
  organizationName: string
  organizationWebsite: string
  organizationLogo: string
  organizationColorPrimary: string
  organizationColorAccent: string
  organizationFont: string
}>()

const formatCurrency = (val: number) => `${val.toLocaleString('en-IN')} Rupees`
const formatDate = (val: string | Date) => (val ? new Date(val).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '')
</script>

<template>
  <Html>
    <Head />
    <Tailwind :config="{ theme: { extend: { colors: { primary: organizationColorPrimary } } } }">
      <Body :style="{ fontFamily: `'${organizationFont || 'ui-sans-serif'}', system-ui, sans-serif` }" class="m-0 p-0 bg-gray-50">
        <Container class="mx-auto w-full max-w-[600px] my-10">
          <Section class="bg-white p-10 shadow-xl border-t-4" :style="{ borderColor: organizationColorPrimary }">
            <Section class="mb-8">
              <Img :src="organizationLogo" :alt="organizationName" width="120" class="mb-4" />
              <Text class="m-0 text-xs uppercase tracking-wider text-gray-400 font-semi-bold"> Commercial Estimate / Proposal </Text>
              <Text class="m-0 text-xl font-bold text-gray-800"> Quote #{{ quoteNumber }} </Text>
            </Section>

            <Hr class="border-gray-100 my-4" />

            <Section class="mb-6">
              <Text class="m-0 text-base text-gray-700 mb-2">
                Hello <strong>{{ recipientName }}</strong
                >,
              </Text>

              <template v-if="!isSigned">
                <Text v-if="isRecipientContact" class="m-0 text-sm text-gray-600 leading-relaxed">
                  Below is a breakdown of our deliverables and commercial requirements curated for the project {{ projectName }}. Please review the proposal and accept the terms to proceed.
                </Text>
                <Text v-else class="m-0 text-sm text-gray-600 leading-relaxed">
                  The commercial proposal for the project {{ projectName }} is ready for your internal review and countersignature.
                </Text>
              </template>
              <template v-else>
                <Text class="m-0 text-sm text-gray-600 leading-relaxed">
                  Great news! The proposal for the project {{ projectName }} has been fully executed. A final, legally binding copy is now available for your records.
                </Text>
              </template>

              <Text v-if="validUntil && !isSigned" class="m-0 mt-3 text-xs text-red-500 font-medium">
                This proposal pricing is valid until:
                {{ formatDate(validUntil) }}
              </Text>
            </Section>

            <Section v-if="deliverables && deliverables.length > 0" class="bg-gray-50 rounded-lg p-4 my-6">
              <Text class="m-0 mb-3 text-xs uppercase tracking-wider font-bold text-gray-400"> Estimate Summary </Text>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" class="text-sm text-left">
                <thead>
                  <tr>
                    <th class="pb-3 border-b border-gray-200 font-semi-bold text-gray-500">
                      {{ pricingModel === 'day' ? 'Role / Phase' : 'Service' }}
                    </th>
                    <th class="pb-3 border-b border-gray-200 font-semi-bold text-gray-500 text-right">
                      {{ pricingModel === 'day' ? 'Day Rate' : 'Rate' }}
                    </th>
                    <th class="pb-3 border-b border-gray-200 font-semi-bold text-gray-500 text-center">
                      {{ pricingModel === 'day' ? 'Days' : 'Qty' }}
                    </th>
                    <th class="pb-3 border-b border-gray-200 font-semi-bold text-gray-500 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in deliverables" :key="index">
                    <td class="py-3 border-b border-gray-100 align-top">
                      <Text class="m-0 font-bold text-gray-800">{{ item.title }}</Text>
                      <Text v-if="item.description" class="m-0 mt-1 text-xs text-gray-500">{{ item.description }}</Text>
                      <div v-if="item.points && item.points.length" class="m-0 mt-1 pl-2 text-xs text-gray-500">
                        <div v-for="(pt, idx) in item.points" :key="idx" class="m-0 leading-snug">• {{ pt }}</div>
                      </div>
                    </td>
                    <td class="py-3 border-b border-gray-100 align-top text-right text-gray-600">
                      {{ formatCurrency(item.rate) }}
                    </td>
                    <td class="py-3 border-b border-gray-100 align-top text-center text-gray-600">{{ item.quantity }}</td>
                    <td class="py-3 border-b border-gray-100 align-top text-right font-bold text-gray-800">
                      {{ formatCurrency(item.amount) }}
                    </td>
                  </tr>
                </tbody>
              </table>

              <!-- Financials Breakdown -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" class="text-sm mt-4">
                <tbody>
                  <tr>
                    <td class="py-1 text-right text-gray-600 w-3/4 font-semi-bold">Subtotal:</td>
                    <td class="py-1 text-right text-gray-800 font-bold">{{ formatCurrency(financialsSubtotal) }}</td>
                  </tr>
                  <tr v-if="financialsDiscountAmount">
                    <td class="py-1 text-right text-gray-500 w-3/4">{{ financialsDiscountLabel }}:</td>
                    <td class="py-1 text-right text-gray-500">{{ formatCurrency(financialsDiscountAmount) }}</td>
                  </tr>
                  <tr v-if="financialsTaxAmount">
                    <td class="py-1 text-right text-gray-500 w-3/4">{{ financialsTaxLabel }}:</td>
                    <td class="py-1 text-right text-gray-500">{{ formatCurrency(financialsTaxAmount) }}</td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Section class="text-right my-6 pr-2">
              <Text class="m-0 text-xs uppercase tracking-wider text-gray-400 font-semi-bold"> Estimated Gross Total </Text>
              <Text class="m-0 text-2xl font-black text-gray-900">
                {{ formatCurrency(financialsGrandTotal) }}
              </Text>
            </Section>

            <Section class="text-center my-8">
              <Button
                class="px-6 py-3 rounded text-white font-bold text-sm tracking-wide text-center inline-block no-underline"
                :style="{ backgroundColor: organizationColorAccent }"
                :href="quotationUrl">
                {{ isSigned ? 'Download Executed Proposal' : isRecipientContact ? 'Review Full Proposal' : 'Review & Countersign Proposal' }}
              </Button>
            </Section>

            <Hr class="border-gray-100 my-6" />

            <Section class="text-center">
              <Text class="m-0 text-xs text-gray-400 leading-normal">
                If you have any questions regarding this breakdown statement, reach out to our accounts team at
                <a :href="organizationWebsite" class="underline" :style="{ color: organizationColorPrimary }">
                  {{ organizationName }} </a
                >.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
</template>
