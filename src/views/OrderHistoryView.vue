<script setup lang="ts">
import { isAxiosError } from 'axios'
import { onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { OrderService, type OrderSummary } from '@/services/OrderService'
import { useAuthStore } from '@/stores/auth'
import { formatPrice } from '@/utils/catalog'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const orders = ref<OrderSummary[]>([])
const loading = ref(false)
const error = ref('')
let controller: AbortController | undefined

async function load() {
  controller?.abort()
  const request = new AbortController()
  controller = request
  orders.value = []
  error.value = ''
  loading.value = true
  if (!auth.currentUser) {
    loading.value = false
    await router.replace({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  try {
    const data = await OrderService.getOrders(request.signal)
    if (!request.signal.aborted) orders.value = data
  } catch (cause) {
    if (!request.signal.aborted) {
      if (isAxiosError(cause) && cause.response?.status === 401) auth.clearAuth()
      else error.value = 'Unable to load your orders. Please try again.'
    }
  } finally {
    if (!request.signal.aborted) loading.value = false
  }
}
function dateLabel(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
watch(() => auth.currentUser?.id, load, { immediate: true, flush: 'sync' })
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <section :aria-busy="loading">
    <h1 class="text-3xl font-bold">Order history</h1>
    <p class="mt-3 text-slate-600">Your previous purchases, newest first.</p>
    <p v-if="loading" role="status" class="mt-6">Loading orders…</p>
    <div v-else-if="error" class="mt-6">
      <p role="alert" class="text-rose-700">{{ error }}</p>
      <button type="button" class="mt-3 font-semibold text-indigo-700 underline" @click="load">
        Try again
      </button>
    </div>
    <p v-else-if="!orders.length" class="mt-6">
      No orders yet.
      <RouterLink to="/products" class="font-semibold text-indigo-700 underline"
        >Browse books</RouterLink
      >
    </p>
    <ul v-else class="mt-6 space-y-4" aria-label="Your orders">
      <li
        v-for="order in orders"
        :key="order.id"
        class="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-slate-200 bg-white p-5"
      >
        <div>
          <RouterLink
            :to="{ name: 'order-detail', params: { id: order.id } }"
            class="text-xl font-semibold text-indigo-800 underline"
            >Order #{{ order.id }}</RouterLink
          >
          <p class="mt-2 text-sm text-slate-600">
            <time :datetime="order.createdAt">{{ dateLabel(order.createdAt) }}</time> ·
            {{ order.paymentDisplay }}
          </p>
        </div>
        <div class="text-right">
          <p class="font-semibold">{{ formatPrice(order.total) }}</p>
          <span
            class="mt-2 inline-block rounded-full px-3 py-1 text-sm font-medium"
            :class="
              order.status === 'PENDING'
                ? 'bg-amber-50 text-amber-800'
                : 'bg-emerald-50 text-emerald-800'
            "
            >{{ order.status === 'PENDING' ? 'Pending' : 'Completed' }}</span
          >
        </div>
      </li>
    </ul>
  </section>
</template>
