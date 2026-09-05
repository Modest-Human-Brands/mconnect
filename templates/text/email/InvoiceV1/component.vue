<script setup lang="ts">
import { Html, Head, Body, Img, Container, Section, Text, Button, Tailwind, Hr, Link } from '@vue-email/components'

defineProps<{
  recipientName: string
  pricingModel: 'project' | 'day'
  projectName: string
  invoiceNumber: string
  quotationNumber?: string
  dueDate: string
  deliverables: { title: string; description: string; points: string[]; rate: number; quantity: number; amount: number }[]
  financialsSubtotal: number
  financialsDiscountLabel: string
  financialsDiscountAmount: number
  financialsTaxLabel: string
  financialsTaxAmount: number
  financialsGrandTotal: number
  financialsAmountPaid: number
  financialsAmountDue: number
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIALLY PAID'
  ctaUrl?: string
  trackingPixelUrl?: string
  honeypotUrl?: string
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
      <Body :style="{ fontFamily: `'${organizationFont || 'ui-sans-serif'}', system-ui, sans-serif` }" class="m-0 p-0 bg-white">
        <Container class="mx-auto w-full max-w-[600px] my-10">
          <Section class="bg-white p-10 border-t-4" :style="{ borderColor: organizationColorPrimary }">
            <Section class="mb-8">
              <Img :src="organizationLogo" :alt="organizationName" width="120" class="mb-4" />
              <Text class="m-0 text-xs uppercase tracking-wider text-gray-400 font-semi-bold"> Tax Invoice </Text>
              <Text class="m-0 text-xl font-bold text-gray-800"> Invoice #{{ invoiceNumber }} </Text>
            </Section>

            <Hr class="border-gray-100 my-4" />

            <Section class="mb-6">
              <Text class="m-0 text-base text-gray-700 mb-2">
                Hello <strong>{{ recipientName }}</strong
                >,
              </Text>

              <template v-if="paymentStatus === 'PAID'">
                <Text class="m-0 text-sm text-gray-600 leading-relaxed">
                  Thank you for your payment. Your invoice for <strong>{{ projectName }}</strong> has been fully settled. A copy of the receipt/invoice is attached to this email for your records.
                </Text>
              </template>

              <template v-else-if="paymentStatus === 'PARTIALLY PAID'">
                <Text class="m-0 text-sm text-gray-600 leading-relaxed">
                  Thank you for your recent payment. We have attached the updated invoice for <strong>{{ projectName }}</strong> reflecting the remaining balance.
                </Text>
              </template>

              <template v-else>
                <Text class="m-0 text-sm text-gray-600 leading-relaxed">
                  Please find attached the invoice for the deliverables regarding <strong>{{ projectName }}</strong
                  >.
                </Text>
              </template>

              <Text v-if="paymentStatus !== 'PAID'" class="m-0 mt-3 text-xs text-gray-500 font-medium">
                Payment is due by:
                <strong class="text-gray-800">
                  {{ formatDate(dueDate) }}
                </strong>
              </Text>
            </Section>

            <Section v-if="deliverables && deliverables.length > 0" class="bg-gray-50 rounded-lg p-4 my-6">
              <Text class="m-0 mb-3 text-xs uppercase tracking-wider font-bold text-gray-400"> Billing Summary </Text>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" class="text-sm text-left">
                <thead>
                  <tr>
                    <th class="pb-3 border-b border-gray-200 font-semi-bold text-gray-500">
                      {{ pricingModel === 'day' ? 'Role / Phase' : 'Service' }}
                    </th>
                    <th class="pb-3 border-b border-gray-200 font-semi-bold text-gray-500 text-right">{{ pricingModel === 'day' ? 'Day Rate' : 'Rate' }}</th>
                    <th class="pb-3 border-b border-gray-200 font-semi-bold text-gray-500 text-center">{{ pricingModel === 'day' ? 'Days' : 'Qty' }}</th>
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
                    <td class="py-3 border-b border-gray-100 align-top text-right text-gray-600">{{ formatCurrency(item.rate) }}</td>
                    <td class="py-3 border-b border-gray-100 align-top text-center text-gray-600">{{ item.quantity }}</td>
                    <td class="py-3 border-b border-gray-100 align-top text-right font-bold text-gray-800">{{ formatCurrency(item.amount) }}</td>
                  </tr>
                </tbody>
              </table>

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
                  <tr>
                    <td class="py-2 text-right text-gray-800 w-3/4 font-bold border-t border-gray-200 mt-2">Grand Total:</td>
                    <td class="py-2 text-right text-gray-800 font-bold border-t border-gray-200 mt-2">
                      {{ formatCurrency(financialsGrandTotal) }}
                    </td>
                  </tr>
                  <tr v-if="financialsAmountPaid">
                    <td class="py-1 text-right text-green-600 w-3/4 font-medium">Payments Made:</td>
                    <td class="py-1 text-right text-green-600 font-medium">- {{ formatCurrency(financialsAmountPaid) }}</td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Section class="text-right my-6 pr-2">
              <Text class="m-0 text-xs uppercase tracking-wider text-gray-400 font-semi-bold mb-1"> Amount Due </Text>
              <Text class="m-0 text-3xl font-black" :class="paymentStatus === 'PAID' ? 'text-green-500' : 'text-gray-900'">
                {{ formatCurrency(financialsAmountDue) }}
              </Text>
            </Section>

            <Section class="text-center my-8 bg-gray-50 p-4 border border-gray-100 rounded-lg">
              <Text class="m-0 text-sm font-semi-bold text-gray-700">
                <span v-if="paymentStatus === 'PAID'" class="text-green-600 mr-2">PAID</span>
                <span v-else-if="paymentStatus === 'PARTIALLY PAID'" class="text-yellow-600 mr-2">PARTIALLY PAID</span>
                <span v-else class="text-red-500 mr-2">UNPAID</span>
                A PDF copy of this invoice is attached to this email.
              </Text>
              <Button
                v-if="ctaUrl && ctaUrl !== '#'"
                class="mt-4 px-6 py-2.5 rounded text-white font-bold text-sm inline-block no-underline"
                :style="{ backgroundColor: organizationColorPrimary }"
                :href="ctaUrl">
                View Invoice
              </Button>
            </Section>

            <Hr class="border-gray-100 my-6" />

            <Section class="text-center">
              <Text class="m-0 text-xs text-gray-400 leading-normal">
                If you have any questions regarding this invoice, please reach out to our accounts team at
                <a :href="organizationWebsite" class="underline" :style="{ color: organizationColorPrimary }"> {{ organizationName }} </a>.
              </Text>
            </Section>
          </Section>

          <!-- HONEYPOT TRAP LINK -->
          <Link v-if="honeypotUrl" :href="honeypotUrl" style="display: none; max-height: 0px; overflow: hidden; opacity: 0" aria-hidden="true"> &zwnj; </Link>

          <!-- MCONNECT TELEMETRY PIXEL -->
          <Img v-if="trackingPixelUrl" :src="trackingPixelUrl" width="1" height="1" alt="" class="block hidden opacity-0 invisible" />
        </Container>
      </Body>
    </Tailwind>
  </Html>
</template>
