<script setup lang="ts">
import { isAxiosError } from 'axios'
import { onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  AdminOrderService,
  type AdminOrderPage,
  type AdminOrderDetail,
} from '@/services/AdminOrderService'
import type { OrderStatus } from '@/types/checkout'
import { useAuthStore } from '@/stores/auth'
import { formatLabels, formatPrice } from '@/utils/catalog'
import { orderStatusClass, orderStatusLabels } from '@/utils/orders'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const result = ref<AdminOrderPage | null>(null)
const detail = ref<AdminOrderDetail | null>(null)
const search = ref('')
const statusFilter = ref<OrderStatus | ''>('')
const applied = ref<{ q: string; status?: OrderStatus }>({ q: '' })
const page = ref(1)
const loading = ref(false)
const detailLoading = ref(false)
const busy = ref(false)
const error = ref('')
const detailError = ref('')
const message = ref('')
const selectedStatus = ref<OrderStatus | ''>('')
const statuses = Object.keys(orderStatusLabels) as OrderStatus[]
let epoch = 0
let listController: AbortController | undefined
let detailController: AbortController | undefined

function failure(cause: unknown) {
  if (isAxiosError<{ detail?: string }>(cause)) {
    if (cause.response?.status === 401) {
      auth.clearAuth()
      return ''
    }
    if (cause.response?.status === 403) {
      void router.replace({ name: 'forbidden' })
      return ''
    }
    return cause.response?.data?.detail || 'Unable to update or load orders. Please try again.'
  }
  return 'Unable to reach the server. Please try again.'
}
async function loadList() {
  listController?.abort()
  const request = new AbortController()
  listController = request
  const session = epoch
  loading.value = true
  error.value = ''
  try {
    const data = await AdminOrderService.list(
      { ...applied.value, page: page.value },
      request.signal,
    )
    if (session !== epoch || request.signal.aborted) return
    if (page.value > 1 && page.value > data.totalPages) {
      page.value = Math.max(1, data.totalPages)
      await loadList()
      return
    }
    result.value = data
  } catch (cause) {
    if (session === epoch && !request.signal.aborted) error.value = failure(cause)
  } finally {
    if (session === epoch && !request.signal.aborted) loading.value = false
  }
}
async function loadDetail() {
  detailController?.abort()
  const request = new AbortController()
  detailController = request
  const session = epoch
  detail.value = null
  detailError.value = ''
  selectedStatus.value = ''
  message.value = ''
  const id = String(route.params.id ?? '')
  if (!id) {
    detailLoading.value = false
    return
  }
  if (!/^[1-9]\d*$/.test(id)) {
    detailError.value = 'Order not found.'
    detailLoading.value = false
    return
  }
  detailLoading.value = true
  try {
    const data = await AdminOrderService.get(id, request.signal)
    if (session === epoch && !request.signal.aborted) detail.value = data
  } catch (cause) {
    if (session === epoch && !request.signal.aborted) detailError.value = failure(cause)
  } finally {
    if (session === epoch && !request.signal.aborted) detailLoading.value = false
  }
}
async function updateStatus() {
  if (busy.value || !detail.value || !selectedStatus.value) return
  const session = epoch
  const current = detail.value
  const status = selectedStatus.value
  busy.value = true
  detailError.value = ''
  message.value = ''
  try {
    const data = await AdminOrderService.updateStatus(current.order.id, status, current.version)
    if (session !== epoch) return
    detail.value = data
    selectedStatus.value = ''
    message.value =
      status === 'CANCELLED'
        ? 'Order cancelled. Purchased quantities were restored once.'
        : 'Order status updated.'
    await loadList()
  } catch (cause) {
    if (session === epoch) detailError.value = failure(cause)
  } finally {
    if (session === epoch) busy.value = false
  }
}
function applyFilters() {
  applied.value = { q: search.value.trim(), status: statusFilter.value || undefined }
  page.value = 1
  void loadList()
}
function changePage(value: number) {
  page.value = value
  void loadList()
}
function openOrder(id: number) {
  void router.push({ name: 'admin-order-detail', params: { id } })
}
function date(value: string) {
  return new Date(value).toLocaleString()
}
watch(
  () => [auth.currentUser?.id, auth.currentUser?.role, route.params.id],
  () => {
    epoch++
    listController?.abort()
    detailController?.abort()
    result.value = null
    detail.value = null
    busy.value = false
    error.value = ''
    detailError.value = ''
    message.value = ''
    selectedStatus.value = ''
    if (auth.isAuthenticated && auth.isAdmin) {
      void loadList()
      void loadDetail()
    }
  },
  { immediate: true, flush: 'sync' },
)
onBeforeUnmount(() => {
  epoch++
  listController?.abort()
  detailController?.abort()
})
</script>

<template>
  <section :aria-busy="loading || detailLoading || busy">
    <h1 class="text-3xl font-bold">Orders</h1>
    <p class="mt-2 text-slate-600">
      Find orders, review purchase details, and update their status.
    </p>
    <p v-if="detailLoading" role="status" class="mt-6">Loading order details…</p>
    <div v-if="detailError" class="mt-5 rounded-lg bg-rose-50 p-4">
      <p role="alert" class="text-rose-700">{{ detailError }}</p>
      <button
        type="button"
        :disabled="busy"
        class="mt-3 text-indigo-700 underline"
        @click="loadDetail"
      >
        Reload order
      </button>
    </div>
    <p v-if="message" role="status" class="mt-5 rounded-lg bg-emerald-50 p-4 text-emerald-800">
      {{ message }}
    </p>
    <article v-if="detail" class="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h2 class="text-2xl font-semibold">Order #{{ detail.order.id }}</h2>
        <span
          class="rounded-full px-3 py-1 font-medium"
          :class="orderStatusClass(detail.order.status)"
          >{{ orderStatusLabels[detail.order.status] }}</span
        >
      </div>
      <p class="text-sm text-slate-600">
        Placed {{ date(detail.order.createdAt) }} · Updated {{ date(detail.updatedAt) }}
      </p>
      <div class="grid gap-5 md:grid-cols-2">
        <div>
          <h3 class="font-semibold">Customer</h3>
          <p>{{ detail.customerName }} (#{{ detail.customerId }})</p>
          <p>{{ detail.customerEmail }}</p>
          <p v-if="detail.customerPhone">{{ detail.customerPhone }}</p>
        </div>
        <div>
          <h3 class="font-semibold">Delivery snapshot</h3>
          <p>{{ detail.order.recipientName }}</p>
          <p v-if="detail.order.shippingPhone">{{ detail.order.shippingPhone }}</p>
          <p class="whitespace-pre-line">{{ detail.order.shippingAddress }}</p>
        </div>
      </div>
      <p>{{ detail.order.paymentDisplay }}</p>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <caption class="sr-only">
            Purchased items
          </caption>
          <thead class="bg-slate-100">
            <tr>
              <th scope="col" class="p-3">Book / format</th>
              <th scope="col" class="p-3">Quantity</th>
              <th scope="col" class="p-3">Unit price</th>
              <th scope="col" class="p-3">Line total</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in detail.order.items"
              :key="index"
              class="border-t border-slate-200"
            >
              <td class="p-3">{{ item.title }} · {{ formatLabels[item.format] }}</td>
              <td class="p-3">{{ item.quantity }}</td>
              <td class="p-3">{{ formatPrice(item.unitPrice) }}</td>
              <td class="p-3">{{ formatPrice(item.lineTotal) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-xl font-bold">Total: {{ formatPrice(detail.order.total) }}</p>
      <form
        v-if="detail.allowedStatuses.length"
        aria-label="Update order status"
        @submit.prevent="updateStatus"
      >
        <fieldset :disabled="busy" class="space-y-3">
          <label for="order-status" class="block font-semibold">Change status</label
          ><select
            id="order-status"
            v-model="selectedStatus"
            required
            class="rounded-lg border border-slate-300 p-2"
          >
            <option value="" disabled>Choose next status</option>
            <option v-for="status in detail.allowedStatuses" :key="status" :value="status">
              {{ orderStatusLabels[status] }}
            </option>
          </select>
          <p v-if="selectedStatus === 'CANCELLED'" class="text-sm text-rose-700">
            Cancelling restores purchased quantities once and cannot be undone. No real card refund
            is processed.
          </p>
          <button
            type="submit"
            :disabled="!selectedStatus || busy"
            class="block rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {{
              busy
                ? 'Updating…'
                : selectedStatus === 'CANCELLED'
                  ? 'Confirm cancellation'
                  : 'Update status'
            }}
          </button>
        </fieldset>
      </form>
      <p v-else class="text-sm text-slate-600">This cancelled order cannot be reopened.</p>
      <RouterLink :to="{ name: 'admin-orders' }" class="inline-block text-indigo-700 underline"
        >Close order details</RouterLink
      >
    </article>
    <form
      class="mt-7 flex flex-wrap items-end gap-3"
      aria-label="Filter orders"
      @submit.prevent="applyFilters"
    >
      <fieldset :disabled="busy || loading" class="contents">
        <div>
          <label for="order-search" class="block text-sm font-medium"
            >Order ID, customer name or email</label
          ><input
            id="order-search"
            v-model="search"
            type="search"
            maxlength="100"
            class="mt-1 rounded-lg border border-slate-300 bg-white p-2"
          />
        </div>
        <div>
          <label for="order-filter" class="block text-sm font-medium">Status</label
          ><select
            id="order-filter"
            v-model="statusFilter"
            class="mt-1 rounded-lg border border-slate-300 bg-white p-2"
          >
            <option value="">All statuses</option>
            <option v-for="status in statuses" :key="status" :value="status">
              {{ orderStatusLabels[status] }}
            </option>
          </select>
        </div>
        <button type="submit" class="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white">
          Search
        </button>
      </fieldset>
    </form>
    <p v-if="loading" role="status" class="mt-6">Loading orders…</p>
    <div v-else-if="error" class="mt-6">
      <p role="alert" class="text-rose-700">{{ error }}</p>
      <button type="button" class="mt-3 text-indigo-700 underline" @click="loadList">
        Try again
      </button>
    </div>
    <p v-else-if="!result?.content.length" class="mt-6">No orders match your filters.</p>
    <div v-else class="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table class="w-full text-left text-sm">
        <caption class="sr-only">
          Order list
        </caption>
        <thead class="bg-slate-100">
          <tr>
            <th scope="col" class="p-4">Order</th>
            <th scope="col" class="p-4">Customer</th>
            <th scope="col" class="p-4">Status</th>
            <th scope="col" class="p-4">Payment</th>
            <th scope="col" class="p-4">Total</th>
            <th scope="col" class="p-4">Details</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in result.content" :key="order.id" class="border-t border-slate-200">
            <td class="p-4">
              <p class="font-semibold">#{{ order.id }}</p>
              <time class="text-xs text-slate-500" :datetime="order.createdAt">{{
                date(order.createdAt)
              }}</time>
            </td>
            <td class="p-4">
              <p>{{ order.customerName }}</p>
              <p class="text-xs text-slate-500">{{ order.customerEmail }}</p>
            </td>
            <td class="p-4">
              <span
                class="whitespace-nowrap rounded-full px-3 py-1"
                :class="orderStatusClass(order.status)"
                >{{ orderStatusLabels[order.status] }}</span
              >
            </td>
            <td class="p-4">{{ order.paymentDisplay }}</td>
            <td class="whitespace-nowrap p-4">{{ formatPrice(order.total) }}</td>
            <td class="p-4">
              <button
                type="button"
                :disabled="busy"
                class="font-semibold text-indigo-700 underline disabled:opacity-50"
                @click="openOrder(order.id)"
              >
                View
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <nav
      v-if="result && result.totalPages > 1"
      aria-label="Order pagination"
      class="mt-6 flex gap-5"
    >
      <button
        type="button"
        :disabled="page <= 1 || loading || busy"
        class="text-indigo-700 disabled:opacity-50"
        @click="changePage(page - 1)"
      >
        Previous</button
      ><span>Page {{ page }} of {{ result.totalPages }} · {{ result.totalElements }} orders</span
      ><button
        type="button"
        :disabled="page >= result.totalPages || loading || busy"
        class="text-indigo-700 disabled:opacity-50"
        @click="changePage(page + 1)"
      >
        Next
      </button>
    </nav>
  </section>
</template>
