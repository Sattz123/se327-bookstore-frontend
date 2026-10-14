<script setup lang="ts">
import { isAxiosError } from 'axios'
import { onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PaymentMethodService as service } from '@/services/PaymentMethodService'
import { useAuthStore } from '@/stores/auth'
import type { PaymentMethod } from '@/types/paymentMethod'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const methods = ref<PaymentMethod[]>([])
const loading = ref(true)
const busy = ref(false)
const showForm = ref(false)
const deletingId = ref<number | null>(null)
const loadError = ref('')
const error = ref('')
const message = ref('')
const emptyForm = () => ({
  provider: 'Credit Card',
  cardholderName: '',
  lastFour: '',
  expiryMonth: 1,
  expiryYear: new Date().getUTCFullYear() + 1,
  isDefault: false,
})
const form = reactive(emptyForm())
let epoch = 0
let controller: AbortController | undefined

function errorText(cause: unknown, fallback: string) {
  if (isAxiosError<{ detail?: string; errors?: { message: string }[] }>(cause)) {
    if (cause.response?.status === 401) auth.clearAuth()
    return (
      cause.response?.data?.errors?.map((item) => item.message).join(' ') ||
      cause.response?.data?.detail ||
      fallback
    )
  }
  return fallback
}

async function loadMethods() {
  controller?.abort()
  const request = new AbortController()
  controller = request
  const session = epoch
  loading.value = true
  loadError.value = ''
  try {
    const data = await service.getPaymentMethods(request.signal)
    if (session === epoch && !request.signal.aborted) methods.value = data
  } catch (cause) {
    if (session === epoch && !request.signal.aborted)
      loadError.value = errorText(cause, "We couldn't load your payment methods.")
  } finally {
    if (session === epoch && !request.signal.aborted) loading.value = false
  }
}

function resetForm() {
  showForm.value = false
  Object.assign(form, emptyForm())
}
function openForm() {
  resetForm()
  error.value = ''
  message.value = ''
  showForm.value = true
}

async function mutate(operation: () => Promise<unknown>, success: string) {
  if (busy.value) return
  const session = epoch
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    await operation()
    if (session !== epoch) return
    resetForm()
    deletingId.value = null
    message.value = success
    await loadMethods()
  } catch (cause) {
    if (session === epoch)
      error.value = errorText(cause, 'The payment method could not be updated. Please try again.')
  } finally {
    if (session === epoch) busy.value = false
  }
}

async function saveMethod() {
  if (busy.value) return
  if (
    !form.provider.trim() ||
    form.provider.length > 50 ||
    !form.cardholderName.trim() ||
    form.cardholderName.length > 100 ||
    !/^[0-9]{4}$/.test(form.lastFour) ||
    !Number.isInteger(form.expiryMonth) ||
    form.expiryMonth < 1 ||
    form.expiryMonth > 12 ||
    !Number.isInteger(form.expiryYear) ||
    form.expiryYear < 2000 ||
    form.expiryYear > 9999
  ) {
    error.value =
      'Enter a provider, cardholder name, exactly four digits, and a valid expiry month/year.'
    return
  }
  await mutate(
    () =>
      service.addPaymentMethod({
        ...form,
        provider: form.provider.trim(),
        cardholderName: form.cardholderName.trim(),
      }),
    'Payment method saved.',
  )
}

function makeDefault(id: number) {
  return mutate(() => service.setDefault(id), 'Default payment method updated.')
}

function deleteMethod(id: number) {
  return mutate(() => service.deletePaymentMethod(id), 'Payment method deleted.')
}

watch(
  () => auth.currentUser?.id,
  (id) => {
    epoch++
    controller?.abort()
    methods.value = []
    busy.value = false
    resetForm()
    deletingId.value = null
    error.value = ''
    message.value = ''
    if (id) void loadMethods()
    else void router.replace({ name: 'login', query: { redirect: route.fullPath } })
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  epoch++
  controller?.abort()
})
</script>

<template>
  <section :aria-busy="loading || busy">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold">Payment methods</h1>
        <p class="mt-2 text-slate-600">
          Simulated payments only. Use fake display details; no payments are processed.
        </p>
      </div>
      <button
        type="button"
        :disabled="loading || busy || !!loadError"
        class="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
        @click="openForm"
      >
        Add payment method
      </button>
    </div>
    <p v-if="message" role="status" class="mt-5 rounded-lg bg-emerald-50 p-4 text-emerald-800">
      {{ message }}
    </p>
    <p v-if="error" role="alert" class="mt-5 rounded-lg bg-rose-50 p-4 text-rose-800">
      {{ error }}
    </p>
    <p v-if="loading" role="status" class="mt-8 text-slate-600">Loading payment methods…</p>
    <div v-else-if="loadError" role="alert" class="mt-6 rounded-lg bg-rose-50 p-5">
      <p>{{ loadError }}</p>
      <button type="button" class="mt-3 font-semibold text-indigo-700" @click="loadMethods">
        Try again
      </button>
    </div>
    <template v-else>
      <form
        v-if="showForm"
        aria-label="Payment method form"
        class="mt-6 rounded-xl border border-slate-200 bg-white p-6"
        @submit.prevent="saveMethod"
      >
        <h2 class="text-xl font-semibold">New payment method</h2>
        <fieldset :disabled="busy" class="mt-5 grid gap-4 sm:grid-cols-2">
          <label class="text-sm font-medium"
            >Provider<input
              id="payment-provider"
              v-model="form.provider"
              required
              maxlength="50"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          /></label>
          <label class="text-sm font-medium"
            >Cardholder name<input
              id="payment-name"
              v-model="form.cardholderName"
              required
              maxlength="100"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          /></label>
          <label class="text-sm font-medium"
            >Last four digits only<input
              id="payment-last-four"
              v-model="form.lastFour"
              required
              inputmode="numeric"
              pattern="[0-9]{4}"
              minlength="4"
              maxlength="4"
              placeholder="1234"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          /></label>
          <div class="flex gap-3">
            <label class="text-sm font-medium"
              >Expiry month<input
                id="payment-month"
                v-model.number="form.expiryMonth"
                type="number"
                required
                min="1"
                max="12"
                step="1"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            /></label>
            <label class="text-sm font-medium"
              >Expiry year<input
                id="payment-year"
                v-model.number="form.expiryYear"
                type="number"
                required
                min="2000"
                max="9999"
                step="1"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            /></label>
          </div>
          <label class="flex items-center gap-2 sm:col-span-2"
            ><input v-model="form.isDefault" type="checkbox" />Use as default payment method</label
          >
          <div class="flex gap-3 sm:col-span-2">
            <button
              type="submit"
              class="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white"
            >
              {{ busy ? 'Saving…' : 'Save payment method' }}</button
            ><button
              type="button"
              class="rounded-lg border border-slate-300 px-4 py-2"
              @click="resetForm"
            >
              Cancel
            </button>
          </div>
        </fieldset>
      </form>
      <p v-if="!methods.length" class="mt-8 text-slate-600">No saved payment methods yet.</p>
      <ul v-else aria-label="Saved payment methods" class="mt-6 grid gap-5 md:grid-cols-2">
        <li
          v-for="method in methods"
          :key="method.id"
          class="rounded-xl border border-slate-200 bg-white p-6"
        >
          <article :aria-label="`${method.provider} ${method.cardNumberMasked}`">
            <div class="flex flex-wrap items-center gap-3">
              <h2 class="text-xl font-semibold">{{ method.provider }}</h2>
              <span
                v-if="method.isDefault"
                class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800"
                >Default payment method</span
              >
            </div>
            <p class="mt-3 font-mono">{{ method.cardNumberMasked }}</p>
            <p class="mt-1 text-slate-600">{{ method.cardholderName }}</p>
            <p class="text-slate-600">
              Expires {{ String(method.expiryMonth).padStart(2, '0') }}/{{ method.expiryYear }}
            </p>
            <div class="mt-5 flex gap-4">
              <button
                v-if="!method.isDefault"
                type="button"
                :disabled="busy"
                class="font-semibold text-indigo-700 disabled:opacity-50"
                @click="makeDefault(method.id)"
              >
                Make default</button
              ><button
                type="button"
                :disabled="busy"
                class="font-semibold text-rose-700 disabled:opacity-50"
                @click="deletingId = method.id"
              >
                Delete
              </button>
            </div>
            <div v-if="deletingId === method.id" class="mt-4 rounded-lg bg-rose-50 p-4">
              <p>
                Delete this payment method?{{
                  method.isDefault ? ' You will have no default until you choose another.' : ''
                }}
              </p>
              <div class="mt-3 flex gap-4">
                <button
                  type="button"
                  :disabled="busy"
                  class="font-semibold text-rose-700"
                  @click="deleteMethod(method.id)"
                >
                  Confirm delete</button
                ><button type="button" :disabled="busy" @click="deletingId = null">
                  Keep method
                </button>
              </div>
            </div>
          </article>
        </li>
      </ul>
    </template>
  </section>
</template>
