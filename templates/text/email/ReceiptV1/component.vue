<script setup lang="ts">
import { computed } from 'vue'
import { Html, Head, Body, Img, Container, Section, Text, Button, Tailwind, Hr, Link } from '@vue-email/components'

const props = withDefaults(
  defineProps<{
    recipientName?: string
    pricingModel?: 'project' | 'day'
    projectName?: string
    receiptNumber?: string
    invoiceNumber?: string
    paymentDate?: string
    paymentMethod?: string
    transactionId?: string
    deliverables?: {
      title: string
      description: string
      points: string[]
      rate: number
      quantity: number
      amount: number
    }[]
    financialsSubtotal?: number
    financialsDiscountLabel?: string
    financialsDiscountAmount?: number
    financialsTaxLabel?: string
    financialsTaxAmount?: number
    financialsGrandTotal?: number
    financialsAmountPaid?: number
    financialsRemainingBalance?: number
    paymentStatus?: 'PAID' | 'PARTIALLY PAID'
    ctaUrl?: string
    trackingPixelUrl?: string
    honeypotUrl?: string
    organizationName?: string
    organizationWebsite?: string
    organizationAddress?: string
    organizationLogo?: string
    organizationColorPrimary?: string
    organizationColorAccent?: string
    organizationFont?: string
  }>(),
  {
    recipientName: '',
    pricingModel: 'project',
    projectName: '',
    receiptNumber: '',
    paymentDate: '',
    paymentMethod: 'Direct Bank Transfer',
    deliverables: () => [],
    financialsSubtotal: 0,
    financialsDiscountLabel: 'Discount',
    financialsDiscountAmount: 0,
    financialsTaxLabel: 'Tax',
    financialsTaxAmount: 0,
    financialsGrandTotal: 0,
    financialsAmountPaid: 0,
    financialsRemainingBalance: 0,
    paymentStatus: 'PAID',
    ctaUrl: '#',
    organizationName: '',
    organizationWebsite: '#',
    organizationAddress: '',
    organizationLogo: '',
    organizationColorPrimary: '#111827',
    organizationColorAccent: '#16a34a',
    organizationFont: 'ui-sans-serif',
  }
)

const formatCurrency = (val: number) => `${(val || 0).toLocaleString('en-IN')} Rupees`
const formatDate = (val: string | Date) =>
  val
    ? new Date(val).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

const isValidHex = (val: unknown): val is string => typeof val === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val)

const primaryColor = computed(() => (isValidHex(props.organizationColorPrimary) ? props.organizationColorPrimary : '#111827'))
const accentColor = computed(() => (isValidHex(props.organizationColorAccent) ? props.organizationColorAccent : '#16a34a'))

const tailwindConfig = computed(() => ({
  theme: {
    extend: {
      colors: {
        primary: primaryColor.value,
        accent: accentColor.value,
      },
    },
  },
}))
</script>

<template>
  <Tailwind :config="tailwindConfig">
    <Html lang="en">
      <Head />

      <Body
        :style="{
          backgroundColor: '#f8fafc',
          fontFamily: `'${organizationFont || 'ui-sans-serif'}', system-ui, sans-serif`,
        }"
        class="m-0 p-0 bg-slate-50 text-gray-800">
        <Container class="mx-auto w-full max-w-[600px] my-10 bg-white" style="background-color: #ffffff">
          <!-- HEADER BANNER -->
          <Section class="p-8 border-t-4" :style="{ borderColor: accentColor, backgroundColor: '#ffffff' }">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tbody>
                <tr>
                  <td align="left" valign="top">
                    <Img v-if="organizationLogo" :src="organizationLogo" :alt="organizationName" width="120" class="mb-3 block border-0" />
                    <Text class="m-0 text-sm font-bold text-gray-900">
                      {{ organizationName }}
                    </Text>
                  </td>
                  <td align="right" valign="top">
                    <Text class="m-0 text-xs uppercase tracking-wider font-bold" :style="{ color: accentColor }"> Payment Receipt </Text>
                    <Text class="m-0 text-lg font-bold text-gray-900 mt-1"> #{{ receiptNumber }} </Text>
                    <Text v-if="invoiceNumber" class="m-0 text-xs text-gray-400 mt-0.5"> Ref: Invoice #{{ invoiceNumber }} </Text>
                  </td>
                </tr>
              </tbody>
            </table>

            <Hr class="border-gray-100 my-6" />

            <!-- GREETING & ACKNOWLEDGEMENT -->
            <Section class="mb-6">
              <Text class="m-0 text-base text-gray-900 font-semibold mb-2"> Hello {{ recipientName }}, </Text>
              <Text class="m-0 text-sm text-gray-600 leading-relaxed">
                This email confirms that your payment of
                <strong class="text-gray-900">{{ formatCurrency(financialsAmountPaid) }}</strong>
                for <strong>{{ projectName }}</strong> has been successfully processed and credited.
              </Text>
            </Section>

            <!-- TRANSACTION DETAILS CARD -->
            <Section class="bg-gray-50 rounded-lg p-5 my-6 border border-gray-100">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="text-xs text-gray-600">
                <tbody>
                  <tr>
                    <td class="pb-2 text-gray-400 font-medium">Payment Date:</td>
                    <td class="pb-2 text-right font-bold text-gray-900">
                      {{ formatDate(paymentDate) }}
                    </td>
                  </tr>
                  <tr v-if="paymentMethod">
                    <td class="pb-2 text-gray-400 font-medium">Payment Method:</td>
                    <td class="pb-2 text-right font-semibold text-gray-800">
                      {{ paymentMethod }}
                    </td>
                  </tr>
                  <tr v-if="transactionId">
                    <td class="pb-2 text-gray-400 font-medium">Transaction / Ref ID:</td>
                    <td class="pb-2 text-right font-mono text-gray-800">
                      {{ transactionId }}
                    </td>
                  </tr>
                  <tr>
                    <td class="pt-2 border-t border-gray-200 text-gray-400 font-medium">Payment Status:</td>
                    <td class="pt-2 border-t border-gray-200 text-right font-bold">
                      <span
                        class="px-2 py-0.5 rounded text-[11px]"
                        :style="{
                          backgroundColor: paymentStatus === 'PAID' ? '#dcfce7' : '#fef9c3',
                          color: paymentStatus === 'PAID' ? '#15803d' : '#854d0e',
                        }">
                        {{ paymentStatus === 'PAID' ? 'FULLY PAID' : 'PARTIALLY PAID' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <!-- LINE ITEM SUMMARY -->
            <Section v-if="deliverables && deliverables.length > 0" class="my-6">
              <Text class="m-0 mb-3 text-xs uppercase tracking-wider font-bold text-gray-400"> Settled Deliverables </Text>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="text-sm text-left">
                <thead>
                  <tr>
                    <th class="pb-3 border-b border-gray-200 font-semibold text-gray-500">
                      {{ pricingModel === 'day' ? 'Phase / Role' : 'Item' }}
                    </th>
                    <th class="pb-3 border-b border-gray-200 font-semibold text-gray-500 text-right">Rate</th>
                    <th class="pb-3 border-b border-gray-200 font-semibold text-gray-500 text-center">
                      {{ pricingModel === 'day' ? 'Days' : 'Qty' }}
                    </th>
                    <th class="pb-3 border-b border-gray-200 font-semibold text-gray-500 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in deliverables" :key="index">
                    <td class="py-3 border-b border-gray-100 align-top">
                      <Text class="m-0 font-semibold text-gray-900">{{ item.title }}</Text>
                      <Text v-if="item.description" class="m-0 mt-0.5 text-xs text-gray-500">
                        {{ item.description }}
                      </Text>
                      <div v-if="item.points && item.points.length" class="mt-1 pl-2 text-xs text-gray-500">
                        <div v-for="(pt, idx) in item.points" :key="idx" class="m-0 leading-snug">&bull; {{ pt }}</div>
                      </div>
                    </td>
                    <td class="py-3 border-b border-gray-100 align-top text-right text-gray-600">
                      {{ formatCurrency(item.rate) }}
                    </td>
                    <td class="py-3 border-b border-gray-100 align-top text-center text-gray-600">
                      {{ item.quantity }}
                    </td>
                    <td class="py-3 border-b border-gray-100 align-top text-right font-semibold text-gray-900">
                      {{ formatCurrency(item.amount) }}
                    </td>
                  </tr>
                </tbody>
              </table>

              <!-- FINANCIAL BREAKDOWN -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="text-sm mt-4">
                <tbody>
                  <tr>
                    <td class="py-1 text-right text-gray-500 w-3/4">Subtotal:</td>
                    <td class="py-1 text-right text-gray-800 font-medium">
                      {{ formatCurrency(financialsSubtotal) }}
                    </td>
                  </tr>
                  <tr v-if="financialsDiscountAmount">
                    <td class="py-1 text-right text-gray-500 w-3/4">{{ financialsDiscountLabel }}:</td>
                    <td class="py-1 text-right text-gray-500">- {{ formatCurrency(financialsDiscountAmount) }}</td>
                  </tr>
                  <tr v-if="financialsTaxAmount">
                    <td class="py-1 text-right text-gray-500 w-3/4">{{ financialsTaxLabel }}:</td>
                    <td class="py-1 text-right text-gray-500">
                      {{ formatCurrency(financialsTaxAmount) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="py-2 text-right text-gray-900 w-3/4 font-semibold border-t border-gray-200 mt-2">Total Billed:</td>
                    <td class="py-2 text-right text-gray-900 font-semibold border-t border-gray-200 mt-2">
                      {{ formatCurrency(financialsGrandTotal) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="py-2 text-right font-bold w-3/4 text-green-700">Total Paid:</td>
                    <td class="py-2 text-right font-bold text-green-700">
                      {{ formatCurrency(financialsAmountPaid) }}
                    </td>
                  </tr>
                  <tr v-if="financialsRemainingBalance > 0">
                    <td class="py-1 text-right text-gray-500 w-3/4 font-medium">Remaining Balance:</td>
                    <td class="py-1 text-right text-red-600 font-bold">
                      {{ formatCurrency(financialsRemainingBalance) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <!-- CALLOUT HERO: AMOUNT PAID -->
            <Section class="text-center my-8 bg-green-50 p-6 border border-green-200 rounded-lg">
              <Text class="m-0 text-xs uppercase tracking-wider text-green-800 font-bold mb-1"> Total Amount Paid </Text>
              <Text class="m-0 text-3xl font-black text-green-700">
                {{ formatCurrency(financialsAmountPaid) }}
              </Text>
              <Button
                v-if="ctaUrl && ctaUrl !== '#'"
                class="mt-4 px-6 py-2.5 rounded-lg text-white font-bold text-sm inline-block no-underline shadow-sm"
                :style="{ backgroundColor: primaryColor }"
                :href="ctaUrl">
                View Receipt Online &rarr;
              </Button>
            </Section>

            <Hr class="border-gray-100 my-6" />

            <!-- FOOTER -->
            <Section class="text-center">
              <Text class="m-0 text-xs text-gray-400 leading-normal">
                {{ organizationAddress }}
              </Text>
              <Text class="m-0 mt-2 text-xs text-gray-400">
                If you have questions regarding this payment, please contact our finance team at
                <Link :href="organizationWebsite" target="_blank" class="underline font-medium text-gray-600"> {{ organizationName }} </Link>.
              </Text>
            </Section>
          </Section>

          <!-- HONEYPOT TRAP LINK -->
          <Link v-if="honeypotUrl" :href="honeypotUrl" style="display: none; max-height: 0px; overflow: hidden; opacity: 0" aria-hidden="true"> &zwnj; </Link>

          <!-- TELEMETRY PIXEL -->
          <Img v-if="trackingPixelUrl" :src="trackingPixelUrl" width="1" height="1" alt="" class="block hidden opacity-0 invisible" />
        </Container>
      </Body>
    </Html>
  </Tailwind>
</template>
