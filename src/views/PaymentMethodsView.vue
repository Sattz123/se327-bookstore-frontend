<script setup lang="ts">
import { isAxiosError } from 'axios'
import { onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
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
const currentYear = new Date().getUTCFullYear()
const expiryYears = Array.from({ length: 21 }, (_, index) => currentYear + index)
const cardTypes = ['Visa', 'Mastercard', 'American Express', 'Other']
const emptyForm = () => ({
  provider: '',
  cardholderName: auth.currentUser?.username ?? '',
  lastFour: '',
  expiryMonth: '' as number | '',
  expiryYear: '' as number | '',
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
  const expiryMonth = Number(form.expiryMonth)
  const expiryYear = Number(form.expiryYear)
  if (
    !form.provider.trim() ||
    form.provider.length > 50 ||
    !form.cardholderName.trim() ||
    form.cardholderName.length > 100 ||
    !/^[0-9]{4}$/.test(form.lastFour) ||
    !Number.isInteger(expiryMonth) ||
    expiryMonth < 1 ||
    expiryMonth > 12 ||
    !Number.isInteger(expiryYear) ||
    expiryYear < currentYear ||
    expiryYear > currentYear + 20
  ) {
    error.value =
      'Choose a card type, enter the name on the card, exactly four digits, and a valid expiry date.'
    return
  }
  await mutate(
    () =>
      service.addPaymentMethod({
        ...form,
        provider: form.provider.trim(),
        cardholderName: form.cardholderName.trim(),
        expiryMonth,
        expiryYear,
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
        v-if="!showForm"
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
        class="payment-editor mt-6"
        @submit.prevent="saveMethod"
      >
        <div class="payment-editor-heading">
          <span class="payment-card-icon"><AppIcon name="card" :size="23" /></span>
          <div>
            <h2>Add a card</h2>
            <p>Save sample card details for simulated checkout.</p>
          </div>
        </div>
        <fieldset :disabled="busy" class="payment-fields">
          <label class="payment-field"
            >Card type<select id="payment-provider" v-model="form.provider" required>
              <option disabled value="">Choose a card type</option>
              <option v-for="type in cardTypes" :key="type" :value="type">{{ type }}</option>
            </select></label
          >
          <label class="payment-field"
            >Name on card<input
              id="payment-name"
              v-model="form.cardholderName"
              required
              maxlength="100"
              placeholder="e.g. Alex Morgan"
          /></label>
          <div class="payment-field">
            <label for="payment-last-four">Last 4 digits</label>
            <div class="payment-card-ending">
              <span aria-hidden="true">•••• •••• ••••</span
              ><input
                id="payment-last-four"
                v-model="form.lastFour"
                required
                inputmode="numeric"
                pattern="[0-9]{4}"
                minlength="4"
                maxlength="4"
                placeholder="1234"
                aria-describedby="payment-digits-help"
              />
            </div>
            <small id="payment-digits-help"
              >Use four sample digits. No full card number or security code is needed.</small
            >
          </div>
          <div class="payment-field">
            <span id="payment-expiry-label">Expiry date</span>
            <div class="payment-expiry" role="group" aria-labelledby="payment-expiry-label">
              <label class="sr-only" for="payment-month">Expiry month</label>
              <select id="payment-month" v-model.number="form.expiryMonth" required>
                <option disabled value="">MM</option>
                <option v-for="month in 12" :key="month" :value="month">
                  {{ String(month).padStart(2, '0') }}
                </option>
              </select>
              <span aria-hidden="true">/</span>
              <label class="sr-only" for="payment-year">Expiry year</label>
              <select id="payment-year" v-model.number="form.expiryYear" required>
                <option disabled value="">YYYY</option>
                <option v-for="year in expiryYears" :key="year" :value="year">{{ year }}</option>
              </select>
            </div>
          </div>
          <label class="payment-default"
            ><input v-model="form.isDefault" type="checkbox" />Use as default payment method</label
          >
          <div class="payment-form-actions">
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

<style scoped>
.payment-editor {
  max-width: 640px;
  padding: 28px;
  border: 1px solid #e1e5ec;
  border-radius: 12px;
  background: #fff;
}
.payment-editor-heading {
  display: flex;
  align-items: center;
  gap: 13px;
}
.payment-editor-heading h2 {
  font-size: 19px;
  font-weight: 600;
}
.payment-editor-heading p {
  margin-top: 4px;
  color: #697586;
  font-size: 13px;
}
.payment-card-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border: 1px solid #e4e8ef;
  border-radius: 9px;
  color: #45546b;
  flex-shrink: 0;
}
.payment-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px 20px;
  margin-top: 26px;
}
.payment-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
}
.payment-field > input,
.payment-field > select,
.payment-expiry select {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid #dfe4eb;
  border-radius: 7px;
  background: #fff;
  font-size: 14px;
  font-weight: 400;
}
.payment-field > small {
  color: #697586;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.6;
}
.payment-card-ending {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid #dfe4eb;
  border-radius: 7px;
  gap: 10px;
}
.payment-card-ending > span {
  color: #8a94a2;
  white-space: nowrap;
  font-size: 14px;
  letter-spacing: 1px;
}
.payment-card-ending #payment-last-four {
  padding: 10px 0;
  width: 64px;
  min-width: 0;
  min-height: 0;
  border: 0;
  border-radius: 0;
  font-family: monospace;
  font-size: 16px;
  box-shadow: none;
  background: transparent;
}
.payment-card-ending:focus-within {
  outline: 2px solid #3d53df;
  outline-offset: 1px;
}
.payment-card-ending #payment-last-four:focus-visible {
  outline: none;
}
.payment-expiry {
  display: flex;
  gap: 10px;
  align-items: center;
}
.payment-expiry > span {
  color: #8a94a2;
}
.payment-default {
  display: flex;
  align-items: center;
  gap: 9px;
  grid-column: 1 / -1;
  font-size: 13px;
}
.payment-form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  grid-column: 1 / -1;
  padding-top: 2px;
}
.payment-form-actions > button {
  font-size: 13px;
}
@media (max-width: 540px) {
  .payment-editor {
    padding: 21px 18px;
  }
  .payment-fields {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .payment-editor-heading {
    align-items: flex-start;
  }
}
</style>
