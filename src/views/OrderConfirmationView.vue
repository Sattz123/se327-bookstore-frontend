<script setup lang="ts">
import { isAxiosError } from 'axios'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import '@/assets/orders.css'
import { CheckoutService } from '@/services/CheckoutService'
import { OrderService } from '@/services/OrderService'
import { useAuthStore } from '@/stores/auth'
import type { Order } from '@/types/checkout'
import { formatLabels, formatPrice } from '@/utils/catalog'
import { orderStatusClass, orderStatusDescription, orderStatusLabels } from '@/utils/orders'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const isHistory = computed(() => route.name === 'order-detail')
const order = ref<Order | null>(null)
const itemCount = computed(
  () => order.value?.items.reduce((count, item) => count + item.quantity, 0) ?? 0,
)
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
  <section :aria-busy="loading" class="orders-page">
    <RouterLink :to="{ name: 'orders' }" class="orders-back"
      ><AppIcon name="arrow" :size="16" />All orders</RouterLink
    >
    <div class="orders-page-heading">
      <div>
        <h1>{{ isHistory ? 'Order details' : 'Order confirmation' }}</h1>
        <p v-if="order">
          Order #{{ order.id }}<span class="orders-date-divider">·</span
          ><time :datetime="order.createdAt"
            >Placed
            {{
              new Date(order.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            }}</time
          >
        </p>
      </div>
      <span v-if="order" class="order-status" :class="orderStatusClass(order.status)">{{
        orderStatusLabels[order.status]
      }}</span>
    </div>
    <p v-if="loading" role="status" class="orders-state">Loading your order…</p>
    <div v-if="error" class="orders-state">
      <p role="alert" class="text-rose-700">{{ error }}</p>
      <button type="button" class="mt-3 text-indigo-700 underline" @click="load">Try again</button>
    </div>
    <div v-if="order" class="order-detail-layout">
      <div class="order-detail-main">
        <div class="order-update">
          <span class="order-receipt-icon"><AppIcon name="orders" :size="23" /></span>
          <div>
            <h2>{{ isHistory ? 'Order status' : 'Thank you for your order' }}</h2>
            <p role="status">{{ orderStatusDescription(order.status, order.paymentType) }}</p>
          </div>
        </div>
        <section class="order-panel" aria-labelledby="order-items-heading">
          <div class="order-panel-heading">
            <h2 id="order-items-heading">Items in your order</h2>
            <span>{{ itemCount }} {{ itemCount === 1 ? 'book' : 'books' }}</span>
          </div>
          <div class="order-item-columns" aria-hidden="true">
            <span>Book</span><span>Amount</span>
          </div>
          <ul class="order-item-list" aria-label="Purchased items">
            <li v-for="(item, index) in order.items" :key="index" class="order-item">
              <span class="order-book-icon"><AppIcon name="book" :size="25" /></span>
              <div class="order-item-info">
                <h3>{{ item.title }}</h3>
                <span class="order-format">{{ formatLabels[item.format] }}</span>
                <p>{{ item.quantity }} × {{ formatPrice(item.unitPrice) }}</p>
              </div>
              <p class="order-item-amount">{{ formatPrice(item.lineTotal) }}</p>
            </li>
          </ul>
        </section>
        <section class="order-panel order-delivery" aria-labelledby="order-delivery-heading">
          <div class="order-panel-heading">
            <h2 id="order-delivery-heading">Delivery details</h2>
          </div>
          <div class="order-delivery-content">
            <span class="order-receipt-icon"><AppIcon name="location" :size="22" /></span>
            <address>
              <strong>{{ order.recipientName }}</strong
              ><span class="order-address">{{ order.shippingAddress }}</span
              ><span v-if="order.shippingPhone" class="order-phone">{{ order.shippingPhone }}</span>
            </address>
          </div>
        </section>
      </div>
      <aside class="order-panel order-summary" aria-labelledby="order-summary-heading">
        <div class="order-panel-heading"><h2 id="order-summary-heading">Order summary</h2></div>
        <div class="order-summary-content">
          <dl class="order-summary-total">
            <dt>Total</dt>
            <dd>{{ formatPrice(order.total) }}</dd>
          </dl>
          <p class="order-summary-count">
            {{ itemCount }} {{ itemCount === 1 ? 'book' : 'books' }} in this order
          </p>
          <div class="order-payment">
            <span class="order-summary-label">Payment method</span>
            <p>
              <AppIcon
                :name="order.paymentType === 'SIMULATED_CARD' ? 'card' : 'cash'"
                :size="20"
              />{{ order.paymentDisplay }}
            </p>
            <small v-if="order.paymentType === 'SIMULATED_CARD'"
              >No real card payment was processed.</small
            >
          </div>
          <RouterLink
            v-if="!isHistory"
            :to="{ name: 'order-detail', params: { id: order.id } }"
            class="orders-button orders-button-secondary"
            >View order details <AppIcon name="arrow" :size="16"
          /></RouterLink>
          <RouterLink to="/products" class="orders-button"
            >Continue shopping <AppIcon name="arrow" :size="16"
          /></RouterLink>
        </div>
      </aside>
    </div>
  </section>
</template>
