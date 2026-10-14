<script setup lang="ts">
import { isAxiosError } from 'axios'
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AddressService } from '@/services/AddressService'
import { useAuthStore } from '@/stores/auth'
import type { Address, AddressPayload } from '@/types/address'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const addresses = ref<Address[]>([])
const loading = ref(true)
const saving = ref(false)
const actionId = ref<number | null>(null)
const busy = computed(() => saving.value || actionId.value !== null)
const loadError = ref('')
const error = ref('')
const message = ref('')
const showForm = ref(false)
const editingId = ref<number | null>(null)
const deletingId = ref<number | null>(null)
const isDefault = ref(false)
const emptyForm = () => ({
  label: 'Home',
  fullName: '',
  phone: '',
  addressLine: '',
  city: '',
  province: '',
  postalCode: '',
})
const form = reactive(emptyForm())
const fields: {
  key: keyof typeof form
  label: string
  max: number
  required?: boolean
  type?: string
}[] = [
  { key: 'label', label: 'Label', max: 50, required: true },
  { key: 'fullName', label: 'Recipient name', max: 200, required: true },
  { key: 'phone', label: 'Phone number', max: 20, type: 'tel' },
  { key: 'addressLine', label: 'Address line', max: 500, required: true },
  { key: 'city', label: 'City', max: 100 },
  { key: 'province', label: 'Province / State', max: 100 },
  { key: 'postalCode', label: 'Postal code', max: 10 },
]
let epoch = 0
let controller: AbortController | undefined

function errorMessage(cause: unknown, fallback: string) {
  if (isAxiosError<{ detail?: string; errors?: { field: string; message: string }[] }>(cause)) {
    if (cause.response?.status === 401) auth.clearAuth()
    return (
      cause.response?.data.errors?.map((item) => item.message).join(' ') ||
      cause.response?.data.detail ||
      fallback
    )
  }
  return fallback
}

async function loadAddresses() {
  controller?.abort()
  const request = new AbortController()
  controller = request
  const session = epoch
  loading.value = true
  loadError.value = ''
  try {
    const data = await AddressService.getAddresses(request.signal)
    if (session === epoch && !request.signal.aborted) addresses.value = data
  } catch (cause) {
    if (session === epoch && !request.signal.aborted)
      loadError.value = errorMessage(cause, "We couldn't load your addresses. Please try again.")
  } finally {
    if (session === epoch && !request.signal.aborted) loading.value = false
  }
}

function cancelForm() {
  Object.assign(form, emptyForm())
  isDefault.value = false
  editingId.value = null
  showForm.value = false
}

function addForm() {
  cancelForm()
  error.value = ''
  message.value = ''
  showForm.value = true
}

function editForm(address: Address) {
  for (const field of fields) form[field.key] = address[field.key] ?? ''
  isDefault.value = address.isDefault
  editingId.value = address.id
  showForm.value = true
  error.value = ''
  message.value = ''
  deletingId.value = null
}

async function mutate(operation: () => Promise<unknown>, success: string) {
  const session = epoch
  error.value = ''
  message.value = ''
  try {
    await operation()
    if (session !== epoch) return
    cancelForm()
    deletingId.value = null
    message.value = success
    await loadAddresses()
  } catch (cause) {
    if (session === epoch)
      error.value = errorMessage(cause, 'The address could not be updated. Please try again.')
  }
}

async function saveAddress() {
  if (busy.value) return
  if (
    fields.some(
      (field) => (field.required && !form[field.key].trim()) || form[field.key].length > field.max,
    )
  ) {
    error.value = 'Enter a label, recipient name, and address line within the field limits.'
    return
  }
  const payload: AddressPayload = {
    label: form.label.trim(),
    fullName: form.fullName.trim(),
    addressLine: form.addressLine.trim(),
    phone: form.phone.trim() || null,
    city: form.city.trim() || null,
    province: form.province.trim() || null,
    postalCode: form.postalCode.trim() || null,
    isDefault: isDefault.value,
  }
  saving.value = true
  try {
    const id = editingId.value
    await mutate(
      () =>
        id === null
          ? AddressService.addAddress(payload)
          : AddressService.updateAddress(id, payload),
      'Address saved.',
    )
  } finally {
    saving.value = false
  }
}

async function changeDefault(id: number) {
  if (busy.value) return
  actionId.value = id
  try {
    await mutate(() => AddressService.setDefault(id), 'Default address updated.')
  } finally {
    actionId.value = null
  }
}

async function deleteAddress(id: number) {
  if (busy.value) return
  actionId.value = id
  try {
    await mutate(
      () => AddressService.deleteAddress(id),
      'Address deleted. If it was your default, choose another when ready.',
    )
  } finally {
    actionId.value = null
  }
}

watch(
  () => auth.currentUser?.id,
  (id) => {
    epoch++
    controller?.abort()
    addresses.value = []
    cancelForm()
    error.value = ''
    message.value = ''
    deletingId.value = null
    if (id) void loadAddresses()
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
        <h1 class="text-3xl font-bold tracking-tight">Address book</h1>
        <p class="mt-2 text-slate-600">Manage your delivery addresses.</p>
      </div>
      <button
        type="button"
        class="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
        :disabled="loading || busy || !!loadError"
        @click="addForm"
      >
        Add address
      </button>
    </div>
    <p v-if="message" role="status" class="mt-5 rounded-lg bg-emerald-50 p-4 text-emerald-800">
      {{ message }}
    </p>
    <p v-if="error" role="alert" class="mt-5 rounded-lg bg-rose-50 p-4 text-rose-800">
      {{ error }}
    </p>
    <p v-if="loading" role="status" class="mt-8 text-slate-600">Loading addresses…</p>
    <div v-else-if="loadError" role="alert" class="mt-6 rounded-lg bg-rose-50 p-5">
      <p>{{ loadError }}</p>
      <button type="button" class="mt-3 font-semibold text-indigo-700" @click="loadAddresses">
        Try again
      </button>
    </div>
    <template v-else>
      <form
        v-if="showForm"
        aria-label="Address form"
        class="mt-6 rounded-xl border border-slate-200 bg-white p-6"
        @submit.prevent="saveAddress"
      >
        <h2 class="text-xl font-semibold">
          {{ editingId === null ? 'New address' : 'Edit address' }}
        </h2>
        <fieldset :disabled="busy" class="mt-5 grid gap-4 sm:grid-cols-2">
          <div
            v-for="field in fields"
            :key="field.key"
            :class="field.key === 'addressLine' ? 'sm:col-span-2' : ''"
          >
            <label :for="`address-${field.key}`" class="mb-1 block text-sm font-medium"
              >{{ field.label }}{{ field.required ? ' *' : ' (optional)' }}</label
            >
            <input
              :id="`address-${field.key}`"
              v-model="form[field.key]"
              :type="field.type ?? 'text'"
              :required="field.required"
              :maxlength="field.max"
              class="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <label class="flex items-center gap-2 sm:col-span-2"
            ><input v-model="isDefault" type="checkbox" />Use as default address</label
          >
          <div class="flex gap-3 sm:col-span-2">
            <button
              type="submit"
              class="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white"
            >
              {{ saving ? 'Saving…' : 'Save address' }}
            </button>
            <button
              type="button"
              class="rounded-lg border border-slate-300 px-4 py-2"
              @click="cancelForm"
            >
              Cancel
            </button>
          </div>
        </fieldset>
      </form>
      <p v-if="!addresses.length" class="mt-8 text-slate-600">
        No saved addresses yet. Add an address to get started.
      </p>
      <ul v-else aria-label="Saved addresses" class="mt-6 grid gap-5 md:grid-cols-2">
        <li
          v-for="address in addresses"
          :key="address.id"
          class="rounded-xl border border-slate-200 bg-white p-6"
        >
          <article :aria-label="`${address.label} address`">
            <div class="flex flex-wrap items-center gap-3">
              <h2 class="text-xl font-semibold">{{ address.label }}</h2>
              <span
                v-if="address.isDefault"
                class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800"
                >Default address</span
              >
            </div>
            <p class="mt-3 font-medium">{{ address.fullName }}</p>
            <p class="mt-1 whitespace-pre-line text-slate-600">{{ address.addressLine }}</p>
            <p class="text-slate-600">
              {{ [address.city, address.province, address.postalCode].filter(Boolean).join(', ') }}
            </p>
            <p v-if="address.phone" class="mt-1 text-slate-600">{{ address.phone }}</p>
            <div class="mt-5 flex flex-wrap gap-4">
              <button
                type="button"
                :disabled="busy"
                class="font-semibold text-indigo-700 disabled:opacity-50"
                @click="editForm(address)"
              >
                Edit
              </button>
              <button
                v-if="!address.isDefault"
                type="button"
                :disabled="busy"
                class="font-semibold text-indigo-700 disabled:opacity-50"
                @click="changeDefault(address.id)"
              >
                Make default
              </button>
              <button
                type="button"
                :disabled="busy"
                class="font-semibold text-rose-700 disabled:opacity-50"
                @click="deletingId = address.id"
              >
                Delete
              </button>
            </div>
            <div v-if="deletingId === address.id" class="mt-4 rounded-lg bg-rose-50 p-4">
              <p>
                Delete this address?{{
                  address.isDefault
                    ? ' You will have no default address until you choose another.'
                    : ''
                }}
              </p>
              <div class="mt-3 flex gap-4">
                <button
                  type="button"
                  :disabled="busy"
                  class="font-semibold text-rose-700 disabled:opacity-50"
                  @click="deleteAddress(address.id)"
                >
                  Confirm delete
                </button>
                <button
                  type="button"
                  :disabled="busy"
                  class="text-slate-600"
                  @click="deletingId = null"
                >
                  Keep address
                </button>
              </div>
            </div>
          </article>
        </li>
      </ul>
    </template>
  </section>
</template>
