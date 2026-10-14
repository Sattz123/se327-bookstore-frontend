<script setup lang="ts">
import { isAxiosError } from 'axios'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { AddressService } from '@/services/AddressService'
import { PaymentMethodService } from '@/services/PaymentMethodService'
import { CheckoutService } from '@/services/CheckoutService'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { formatLabels, formatPrice } from '@/utils/catalog'
import type { Address } from '@/types/address'
import type { PaymentMethod } from '@/types/paymentMethod'
import type { CheckoutPayload, CheckoutReview, PaymentType } from '@/types/checkout'

const auth = useAuthStore()
const cart = useCartStore()
const router = useRouter()
const route = useRoute()
const review = ref<CheckoutReview | null>(null)
const addresses = ref<Address[]>([])
const cards = ref<PaymentMethod[]>([])
const addressId = ref<number | null>(null)
const paymentType = ref<PaymentType>('CASH_ON_DELIVERY')
const paymentMethodId = ref<number | null>(null)
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const pending = ref<CheckoutPayload | null>(null)
const selectedAddress = computed(() => addresses.value.find((a) => a.id === addressId.value))
const isAddressValid = computed(() => Boolean(addressId.value))
const isPaymentValid = computed(
  () => paymentType.value === 'CASH_ON_DELIVERY' || Boolean(paymentMethodId.value),
)
const isCartValid = computed(
  () =>
    Boolean(review.value?.cart.items.length) &&
    Boolean(review.value?.cart.items.every((i) => i.available)),
)
const ready = computed(() => isCartValid.value && isAddressValid.value && isPaymentValid.value)
let epoch = 0
let controller: AbortController | undefined
let storageKey = ''

function isValidCheckoutPayload(value: unknown): value is CheckoutPayload {
  if (!value || typeof value !== 'object') return false
  const p = value as Record<string, unknown>
  return (
    Number.isInteger(p.addressId) &&
    (p.addressId as number) > 0 &&
    (p.paymentType === 'CASH_ON_DELIVERY' || p.paymentType === 'SIMULATED_CARD') &&
    (p.paymentMethodId === null ||
      (Number.isInteger(p.paymentMethodId) && (p.paymentMethodId as number) > 0)) &&
    typeof p.checkoutKey === 'string' &&
    /^[0-9a-f-]{36}$/i.test(p.checkoutKey) &&
    typeof p.cartFingerprint === 'string' &&
    /^[a-f0-9]{64}$/.test(p.cartFingerprint)
  )
}

function remember(payload: CheckoutPayload | null) {
  pending.value = payload
  try {
    if (payload) window.sessionStorage.setItem(storageKey, JSON.stringify(payload))
    else window.sessionStorage.removeItem(storageKey)
  } catch {
    /* In-memory retries still use the same key if browser storage is unavailable. */
  }
}
function restorePending() {
  try {
    const raw = window.sessionStorage.getItem(storageKey)
    if (!raw) return
    const value = JSON.parse(raw) as unknown
    if (isValidCheckoutPayload(value)) {
      pending.value = value
    }
  } catch {
    remember(null)
  }
}
function errorText(cause: unknown) {
  if (isAxiosError<{ detail?: string; errors?: { message: string }[] }>(cause)) {
    if (cause.response?.status === 401) auth.clearAuth()
    return (
      cause.response?.data?.errors?.map((e) => e.message).join(' ') ||
      cause.response?.data?.detail ||
      'We could not complete this request. Please try again.'
    )
  }
  return 'We could not reach the server. Please try again.'
}
async function load() {
  if (busy.value) return
  controller?.abort()
  const request = new AbortController()
  controller = request
  const session = epoch
  loading.value = true
  error.value = ''
  try {
    const [data, savedAddresses, savedCards] = await Promise.all([
      CheckoutService.review(request.signal),
      AddressService.getAddresses(request.signal),
      PaymentMethodService.getPaymentMethods(request.signal),
    ])
    if (session !== epoch || request.signal.aborted) return
    review.value = data
    addresses.value = savedAddresses
    cards.value = savedCards
    if (!savedAddresses.some((a) => a.id === addressId.value))
      addressId.value = (savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0])?.id ?? null
    if (!savedCards.some((c) => c.id === paymentMethodId.value))
      paymentMethodId.value = (savedCards.find((c) => c.isDefault) ?? savedCards[0])?.id ?? null
  } catch (cause) {
    if (session === epoch && !request.signal.aborted) {
      review.value = null
      error.value = errorText(cause)
    }
  } finally {
    if (session === epoch && !request.signal.aborted) loading.value = false
  }
}
async function placeOrder() {
  if (busy.value || loading.value) return
  error.value = ''
  if (!pending.value && (!ready.value || !review.value || !addressId.value)) {
    error.value = 'Choose an address, an available payment option, and review your cart.'
    return
  }
  const payload = pending.value ?? {
    addressId: addressId.value!,
    paymentType: paymentType.value,
    paymentMethodId: paymentType.value === 'SIMULATED_CARD' ? paymentMethodId.value : null,
    checkoutKey: window.crypto.randomUUID(),
    cartFingerprint: review.value!.cartFingerprint,
  }
  remember(payload)
  const session = epoch
  busy.value = true
  try {
    const order = await CheckoutService.placeOrder(payload)
    if (session !== epoch) return
    remember(null)
    await cart.refreshAfterCheckout()
    if (session === epoch)
      await router.push({ name: 'order-confirmation', params: { id: order.id } })
  } catch (cause) {
    if (session !== epoch) return
    // A server response below 500 is definitive. Network/server errors may hide a committed order.
    if (isAxiosError(cause) && cause.response && cause.response.status < 500) remember(null)
    error.value = errorText(cause)
    if (!pending.value) review.value = null
  } finally {
    if (session === epoch) busy.value = false
  }
}

watch(
  () => auth.currentUser?.id,
  (id) => {
    epoch++
    controller?.abort()
    review.value = null
    addresses.value = []
    cards.value = []
    addressId.value = null
    paymentMethodId.value = null
    paymentType.value = 'CASH_ON_DELIVERY'
    pending.value = null
    busy.value = false
    error.value = ''
    storageKey = `bookstore_checkout_pending_${id}`
    if (id) {
      restorePending()
      void load()
    } else void router.replace({ name: 'login', query: { redirect: route.fullPath } })
  },
  { immediate: true, flush: 'sync' },
)
onBeforeUnmount(() => {
  epoch++
  controller?.abort()
})
</script>

<template>
  <section :aria-busy="loading || busy">
    <h1 class="text-3xl font-bold">Checkout</h1>
    <p class="mt-3 text-slate-600">
      Review your delivery details and order. Card payments are simulated; no real charge is made.
    </p>
    <p v-if="error" role="alert" class="mt-5 text-rose-700">{{ error }}</p>
    <p v-if="loading" role="status" class="mt-5">Loading checkout…</p>
    <div v-if="pending" class="mt-6 rounded-xl bg-amber-50 p-5">
      <p>
        An order request is awaiting confirmation. Retry the same request to check its result
        safely.
      </p>
      <button
        type="button"
        :disabled="busy || loading"
        class="mt-4 rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
        @click="placeOrder"
      >
        {{ busy ? 'Checking order…' : 'Retry order' }}
      </button>
    </div>
    <button
      v-if="!pending && !loading"
      type="button"
      :disabled="busy"
      class="mt-5 font-semibold text-indigo-700"
      @click="load"
    >
      Refresh review
    </button>
    <template v-if="review && !loading && !pending">
      <p v-if="!review.cart.items.length" class="mt-6">
        Your cart is empty.
        <RouterLink to="/products" class="text-indigo-700 underline">Browse books</RouterLink>
      </p>
      <form v-else class="mt-6 space-y-6" aria-label="Place order" @submit.prevent="placeOrder">
        <fieldset :disabled="busy" class="space-y-6">
          <div class="rounded-xl border border-slate-200 p-5">
            <h2 class="text-xl font-semibold">Delivery address</h2>
            <label v-if="addresses.length" for="checkout-address" class="mt-4 block font-medium"
              >Saved address</label
            >
            <select
              v-if="addresses.length"
              id="checkout-address"
              v-model="addressId"
              required
              class="mt-2 w-full rounded-lg border border-slate-300 p-2"
            >
              <option v-for="address in addresses" :key="address.id" :value="address.id">
                {{ address.label }} — {{ address.fullName }}, {{ address.addressLine }}
              </option>
            </select>
            <p v-else class="mt-3">Add a delivery address before placing your order.</p>
            <p v-if="selectedAddress" class="mt-3 whitespace-pre-line">
              {{
                [
                  selectedAddress.fullName,
                  selectedAddress.phone,
                  selectedAddress.addressLine,
                  selectedAddress.city,
                  selectedAddress.province,
                  selectedAddress.postalCode,
                ]
                  .filter(Boolean)
                  .join('\n')
              }}
            </p>
            <RouterLink to="/addresses" class="mt-3 inline-block text-indigo-700 underline"
              >Manage addresses</RouterLink
            >
          </div>
          <div class="rounded-xl border border-slate-200 p-5">
            <h2 class="text-xl font-semibold">Payment</h2>
            <label for="checkout-payment" class="mt-4 block font-medium">Payment option</label>
            <select
              id="checkout-payment"
              v-model="paymentType"
              class="mt-2 w-full rounded-lg border border-slate-300 p-2"
            >
              <option value="CASH_ON_DELIVERY">Cash on delivery</option>
              <option value="SIMULATED_CARD">Simulated card</option>
            </select>
            <template v-if="paymentType === 'SIMULATED_CARD'">
              <label v-if="cards.length" for="checkout-card" class="mt-4 block font-medium"
                >Saved simulated card</label
              >
              <select
                v-if="cards.length"
                id="checkout-card"
                v-model="paymentMethodId"
                required
                class="mt-2 w-full rounded-lg border border-slate-300 p-2"
              >
                <option v-for="card in cards" :key="card.id" :value="card.id">
                  {{ card.provider }} {{ card.cardNumberMasked }} · {{ card.expiryMonth }}/{{
                    card.expiryYear
                  }}
                </option>
              </select>
              <p v-else class="mt-3">Add a simulated card or choose cash on delivery.</p>
              <RouterLink to="/payment-methods" class="mt-3 inline-block text-indigo-700 underline"
                >Manage payment methods</RouterLink
              >
            </template>
          </div>
          <div class="rounded-xl bg-indigo-50 p-5">
            <h2 class="text-xl font-semibold">Order review</h2>
            <ul class="mt-4 space-y-3" aria-label="Order review items">
              <li v-for="item in review.cart.items" :key="item.id">
                <p>
                  {{ item.name }} · {{ formatLabels[item.format] }} · {{ item.quantity }} ×
                  {{ formatPrice(item.unitPrice) }} = {{ formatPrice(item.lineTotal) }}
                </p>
                <p v-if="!item.available" class="text-rose-700">
                  Unavailable or insufficient stock. Update your cart.
                </p>
              </li>
            </ul>
            <p class="mt-5 text-2xl font-bold">Total: {{ formatPrice(review.cart.total) }}</p>
            <p class="mt-3 text-sm text-slate-600">
              Cash on delivery creates a pending order. Simulated card payment completes the order
              without a real charge.
            </p>
          </div>
          <button
            type="submit"
            :disabled="!ready || busy"
            class="rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {{ busy ? 'Placing order…' : 'Place order' }}
          </button>
        </fieldset>
      </form>
    </template>
    <RouterLink to="/cart" class="mt-6 inline-block text-indigo-700 underline"
      >Back to cart</RouterLink
    >
  </section>
</template>
