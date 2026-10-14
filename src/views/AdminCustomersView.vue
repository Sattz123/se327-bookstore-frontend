<script setup lang="ts">
import { isAxiosError } from 'axios'
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { AdminCustomerService, type AdminCustomerPage } from '@/services/AdminCustomerService'
import { useAuthStore } from '@/stores/auth'
import { formatPrice } from '@/utils/catalog'

const auth = useAuthStore()
const router = useRouter()
const result = ref<AdminCustomerPage | null>(null)
const search = ref('')
const applied = ref('')
const page = ref(1)
const loading = ref(false)
const error = ref('')
let controller: AbortController | undefined
async function load() {
  controller?.abort()
  const request = new AbortController()
  controller = request
  loading.value = true
  error.value = ''
  try {
    const data = await AdminCustomerService.list(applied.value, page.value, request.signal)
    if (!request.signal.aborted) result.value = data
  } catch (cause) {
    if (!request.signal.aborted) {
      if (isAxiosError(cause) && cause.response?.status === 401) auth.clearAuth()
      else if (isAxiosError(cause) && cause.response?.status === 403)
        void router.replace({ name: 'forbidden' })
      else error.value = 'Unable to load customers. Please try again.'
    }
  } finally {
    if (!request.signal.aborted) loading.value = false
  }
}
function applySearch() {
  applied.value = search.value.trim()
  page.value = 1
  void load()
}
function changePage(value: number) {
  page.value = value
  void load()
}
function date(value: string) {
  return new Date(value).toLocaleDateString()
}
watch(
  () => [auth.currentUser?.id, auth.currentUser?.role],
  () => {
    controller?.abort()
    result.value = null
    search.value = ''
    applied.value = ''
    page.value = 1
    if (auth.isAuthenticated && auth.isAdmin) void load()
  },
  { immediate: true, flush: 'sync' },
)
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <section :aria-busy="loading">
    <h1 class="text-3xl font-bold">Customers</h1>
    <p class="mt-2 text-slate-600">
      Customer contact details and order totals. Order values include pending orders and exclude
      cancellations.
    </p>
    <form
      class="admin-filter-bar mt-6 flex flex-wrap items-end gap-3"
      aria-label="Search customers"
      @submit.prevent="applySearch"
    >
      <div>
        <label for="customer-search" class="block text-sm font-medium">Name or email</label
        ><input
          id="customer-search"
          v-model="search"
          type="search"
          maxlength="100"
          class="mt-1 rounded-lg border border-slate-300 bg-white p-2"
        />
      </div>
      <button
        type="submit"
        :disabled="loading"
        class="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        Search
      </button>
    </form>
    <p v-if="loading" role="status" class="mt-6">Loading customers…</p>
    <div v-else-if="error" class="mt-6">
      <p role="alert" class="text-rose-700">{{ error }}</p>
      <button type="button" class="mt-3 text-indigo-700 underline" @click="load">Try again</button>
    </div>
    <p v-else-if="!result?.content.length" class="mt-6">No customers match your search.</p>
    <div v-else class="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table class="w-full text-left text-sm">
        <caption class="sr-only">
          Customer list
        </caption>
        <thead class="bg-slate-100">
          <tr>
            <th scope="col" class="p-4">Customer</th>
            <th scope="col" class="p-4">Contact</th>
            <th scope="col" class="p-4">Joined</th>
            <th scope="col" class="p-4">Orders</th>
            <th scope="col" class="p-4">Order value</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="customer in result.content"
            :key="customer.id"
            class="border-t border-slate-200"
          >
            <td class="p-4">
              <p class="font-semibold">{{ customer.username }}</p>
              <p class="text-xs text-slate-500">#{{ customer.id }}</p>
            </td>
            <td class="p-4">
              <p>{{ customer.email }}</p>
              <p class="mt-1 text-slate-500">{{ customer.phone || 'No phone number' }}</p>
            </td>
            <td class="whitespace-nowrap p-4">
              <time :datetime="customer.createdAt">{{ date(customer.createdAt) }}</time>
            </td>
            <td class="p-4">{{ customer.orderCount }}</td>
            <td class="whitespace-nowrap p-4">{{ formatPrice(customer.totalSpent) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <nav
      v-if="result && result.totalPages > 1"
      aria-label="Customer pagination"
      class="mt-6 flex gap-5"
    >
      <button
        type="button"
        :disabled="page <= 1 || loading"
        class="text-indigo-700 disabled:opacity-50"
        @click="changePage(page - 1)"
      >
        Previous</button
      ><span>Page {{ page }} of {{ result.totalPages }} · {{ result.totalElements }} customers</span
      ><button
        type="button"
        :disabled="page >= result.totalPages || loading"
        class="text-indigo-700 disabled:opacity-50"
        @click="changePage(page + 1)"
      >
        Next
      </button>
    </nav>
  </section>
</template>
