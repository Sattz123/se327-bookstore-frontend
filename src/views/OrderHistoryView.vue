<script setup lang="ts">
import { isAxiosError } from 'axios'
import { onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import '@/assets/orders.css'
import { OrderService, type OrderSummary } from '@/services/OrderService'
import { useAuthStore } from '@/stores/auth'
import { formatPrice } from '@/utils/catalog'
import { orderStatusClass, orderStatusLabels } from '@/utils/orders'

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
  <section :aria-busy="loading" class="orders-page">
    <div class="orders-page-heading">
      <div>
        <span class="orders-eyebrow">My account</span>
        <h1>Order history</h1>
        <p>Your previous purchases, newest first.</p>
      </div>
      <RouterLink to="/products" class="orders-button orders-button-secondary"
        >Continue shopping <AppIcon name="arrow" :size="16"
      /></RouterLink>
    </div>
    <p v-if="loading" role="status" class="orders-state">Loading orders…</p>
    <div v-else-if="error" class="orders-state">
      <p role="alert" class="text-rose-700">{{ error }}</p>
      <button type="button" class="mt-3 font-semibold text-indigo-700 underline" @click="load">
        Try again
      </button>
    </div>
    <div v-else-if="!orders.length" class="orders-empty">
      <span class="orders-empty-icon"><AppIcon name="orders" :size="32" /></span>
      <h2>No orders yet.</h2>
      <p>Your next good read is waiting on the shelves.</p>
      <RouterLink to="/products" class="orders-button"
        >Browse books <AppIcon name="arrow" :size="16"
      /></RouterLink>
    </div>
    <ul v-else class="order-history-list" aria-label="Your orders">
      <li v-for="order in orders" :key="order.id" class="order-history-card">
        <div class="order-history-top">
          <div class="order-history-identity">
            <span class="order-receipt-icon"><AppIcon name="orders" :size="23" /></span>
            <div>
              <h2>Order #{{ order.id }}</h2>
              <time :datetime="order.createdAt">Placed {{ dateLabel(order.createdAt) }}</time>
            </div>
          </div>
          <span class="order-status" :class="orderStatusClass(order.status)">{{
            orderStatusLabels[order.status]
          }}</span>
        </div>
        <div class="order-history-bottom">
          <dl class="order-history-payment">
            <dt>Payment method</dt>
            <dd>{{ order.paymentDisplay }}</dd>
          </dl>
          <dl>
            <dt>Order total</dt>
            <dd class="order-history-total">{{ formatPrice(order.total) }}</dd>
          </dl>
          <RouterLink
            :to="{ name: 'order-detail', params: { id: order.id } }"
            class="orders-button orders-button-secondary"
            :aria-label="`View order #${order.id}`"
            >View details <AppIcon name="arrow" :size="16"
          /></RouterLink>
        </div>
      </li>
    </ul>
  </section>
</template>
