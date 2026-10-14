<script setup lang="ts">
import { isAxiosError } from 'axios'
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { AdminDashboardService, type AdminDashboard } from '@/services/AdminDashboardService'
import { useAuthStore } from '@/stores/auth'
import { formatPrice } from '@/utils/catalog'
import AppIcon from '@/components/AppIcon.vue'
import { orderStatusClass, orderStatusLabels } from '@/utils/orders'

const auth = useAuthStore()
const router = useRouter()
const data = ref<AdminDashboard | null>(null)
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
    const result = await AdminDashboardService.get(page.value, request.signal)
    if (!request.signal.aborted) data.value = result
  } catch (cause) {
    if (!request.signal.aborted) {
      if (isAxiosError(cause) && cause.response?.status === 401) auth.clearAuth()
      else if (isAxiosError(cause) && cause.response?.status === 403)
        void router.replace({ name: 'forbidden' })
      else error.value = 'Unable to load the dashboard. Please try again.'
    }
  } finally {
    if (!request.signal.aborted) loading.value = false
  }
}
function changePage(value: number) {
  page.value = value
  void load()
}
watch(
  () => [auth.currentUser?.id, auth.currentUser?.role],
  () => {
    controller?.abort()
    data.value = null
    page.value = 1
    if (auth.isAuthenticated && auth.isAdmin) void load()
  },
  { immediate: true, flush: 'sync' },
)
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <section :aria-busy="loading">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-3xl font-bold">Administrator dashboard</h1>
      <button
        type="button"
        :disabled="loading"
        class="text-indigo-700 underline disabled:opacity-50"
        @click="load"
      >
        Refresh
      </button>
    </div>
    <p class="mt-2 text-slate-600">Welcome, {{ auth.currentUser?.username }}.</p>
    <p v-if="loading" role="status" class="mt-6">Loading dashboard…</p>
    <div v-else-if="error" class="mt-6">
      <p role="alert" class="text-rose-700">{{ error }}</p>
      <button type="button" class="mt-3 text-indigo-700 underline" @click="load">Try again</button>
    </div>
    <template v-else-if="data">
      <dl class="mt-7 grid gap-4 sm:grid-cols-3">
        <div class="admin-stat rounded-xl border border-slate-200 bg-white p-6">
          <span class="admin-stat-icon"><AppIcon name="book" /></span>
          <dt>
            <RouterLink :to="{ name: 'admin-products' }" class="text-indigo-700 underline"
              >Total books</RouterLink
            >
          </dt>
          <dd class="mt-3 text-3xl font-bold">{{ data.totalProducts.toLocaleString() }}</dd>
        </div>
        <div class="admin-stat rounded-xl border border-slate-200 bg-white p-6">
          <span class="admin-stat-icon"><AppIcon name="orders" /></span>
          <dt>
            <RouterLink :to="{ name: 'admin-orders' }" class="text-indigo-700 underline"
              >Total orders</RouterLink
            >
          </dt>
          <dd class="mt-3 text-3xl font-bold">{{ data.totalOrders.toLocaleString() }}</dd>
        </div>
        <div class="admin-stat rounded-xl border border-slate-200 bg-white p-6">
          <span class="admin-stat-icon"><AppIcon name="users" /></span>
          <dt>
            <RouterLink :to="{ name: 'admin-customers' }" class="text-indigo-700 underline"
              >Total customers</RouterLink
            >
          </dt>
          <dd class="mt-3 text-3xl font-bold">{{ data.totalCustomers.toLocaleString() }}</dd>
        </div>
      </dl>
      <p class="mt-3 text-sm text-slate-500">
        Books include hidden and archived entries. Orders include cancellations. Customers exclude
        administrators.
      </p>
      <div class="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-xl font-semibold">Recent orders</h2>
        <RouterLink :to="{ name: 'admin-orders' }" class="text-indigo-700 underline"
          >View all orders</RouterLink
        >
      </div>
      <p v-if="!data.recentOrders.length" class="mt-5">No orders on this page yet.</p>
      <div v-else class="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table class="w-full text-left text-sm">
          <caption class="sr-only">
            Recent orders, newest first
          </caption>
          <thead class="bg-slate-100">
            <tr>
              <th scope="col" class="p-4">Order / customer</th>
              <th scope="col" class="p-4">Total</th>
              <th scope="col" class="p-4">Status</th>
              <th scope="col" class="p-4">Placed</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="order in data.recentOrders"
              :key="order.id"
              class="border-t border-slate-200"
            >
              <td class="p-4">
                <RouterLink
                  :to="{ name: 'admin-order-detail', params: { id: order.id } }"
                  class="font-semibold text-indigo-700 underline"
                  >#{{ order.id }}</RouterLink
                >
                <p class="mt-1">{{ order.customerName }}</p>
              </td>
              <td class="whitespace-nowrap p-4">{{ formatPrice(order.total) }}</td>
              <td class="p-4">
                <span class="rounded-full px-3 py-1" :class="orderStatusClass(order.status)">{{
                  orderStatusLabels[order.status]
                }}</span>
              </td>
              <td class="whitespace-nowrap p-4">
                <time :datetime="order.createdAt">{{
                  new Date(order.createdAt).toLocaleString()
                }}</time>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <nav
        v-if="data.totalPages > 1"
        aria-label="Recent orders pagination"
        class="mt-5 flex flex-wrap gap-5"
      >
        <button
          type="button"
          :disabled="page <= 1 || loading"
          class="text-indigo-700 disabled:opacity-50"
          @click="changePage(page - 1)"
        >
          Previous
        </button>
        <span>Page {{ page }} of {{ data.totalPages }}</span>
        <button
          type="button"
          :disabled="page >= data.totalPages || loading"
          class="text-indigo-700 disabled:opacity-50"
          @click="changePage(page + 1)"
        >
          Next
        </button>
      </nav>
    </template>
  </section>
</template>
