<script setup lang="ts">
import { isAxiosError } from 'axios'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { CheckoutService } from '@/services/CheckoutService'
import { OrderService } from '@/services/OrderService'
import { useAuthStore } from '@/stores/auth'
import type { Order } from '@/types/checkout'
import { formatLabels, formatPrice } from '@/utils/catalog'
import { orderStatusDescription } from '@/utils/orders'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const isHistory = computed(() => route.name === 'order-detail')
const order = ref<Order | null>(null)
const loading = ref(false)
const error = ref('')
let controller: AbortController | undefined
async function load() {
  controller?.abort()
  const request = new AbortController()
  controller = request
  order.value = null
  error.value = ''
  loading.value = true
  const id = String(route.params.id)
  if (!auth.currentUser) {
    loading.value = false
    await router.replace({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  if (!/^[1-9]\d*$/.test(id)) {
    error.value = 'Order not found.'
    loading.value = false
    return
  }
  try {
    const data = isHistory.value
      ? await OrderService.getOrder(id, request.signal)
      : await CheckoutService.confirmation(id, request.signal)
    if (!request.signal.aborted) order.value = data
  } catch (cause) {
    if (!request.signal.aborted) {
      if (isAxiosError(cause) && cause.response?.status === 401) auth.clearAuth()
      error.value =
        isAxiosError(cause) && cause.response?.status === 404
          ? 'Order not found.'
          : 'Unable to load your order. Please try again.'
    }
  } finally {
    if (!request.signal.aborted) loading.value = false
  }
}
watch(() => [route.name, route.params.id, auth.currentUser?.id], load, {
  immediate: true,
  flush: 'sync',
})
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <section :aria-busy="loading">
    <h1 class="text-3xl font-bold">{{ isHistory ? 'Order details' : 'Order confirmation' }}</h1>
    <p v-if="loading" role="status" class="mt-6">Loading your order…</p>
    <div v-if="error" class="mt-6">
      <p role="alert" class="text-rose-700">{{ error }}</p>
      <button type="button" class="mt-3 text-indigo-700 underline" @click="load">Try again</button>
    </div>
    <div v-if="order" class="mt-6 space-y-5 rounded-xl border border-slate-200 p-6">
      <h2 class="text-xl font-semibold">Order #{{ order.id }}</h2>
      <p class="text-sm text-slate-600">Placed {{ new Date(order.createdAt).toLocaleString() }}</p>
      <p role="status">
        {{ orderStatusDescription(order.status, order.paymentType) }}
      </p>
      <p>{{ order.paymentDisplay }}</p>
      <div>
        <h3 class="font-semibold">Delivery</h3>
        <p>{{ order.recipientName }}</p>
        <p v-if="order.shippingPhone">{{ order.shippingPhone }}</p>
        <p class="whitespace-pre-line">{{ order.shippingAddress }}</p>
      </div>
      <ul class="space-y-3" aria-label="Purchased items">
        <li v-for="(item, index) in order.items" :key="index">
          {{ item.title }} · {{ formatLabels[item.format] }} · {{ item.quantity }} ×
          {{ formatPrice(item.unitPrice) }} = {{ formatPrice(item.lineTotal) }}
        </li>
      </ul>
      <p class="text-2xl font-bold">Total: {{ formatPrice(order.total) }}</p>
      <p class="text-sm text-slate-600">No real card payment was processed.</p>
      <RouterLink
        v-if="!isHistory"
        :to="{ name: 'order-detail', params: { id: order.id } }"
        class="inline-block font-semibold text-indigo-700 underline"
        >View order details</RouterLink
      >
    </div>
    <RouterLink
      :to="{ name: 'orders' }"
      class="mt-6 mr-6 inline-block font-semibold text-indigo-700 underline"
      >All orders</RouterLink
    >
    <RouterLink to="/products" class="mt-6 inline-block font-semibold text-indigo-700 underline"
      >Continue shopping</RouterLink
    >
  </section>
</template>
