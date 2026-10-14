<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BookCover from '@/components/BookCover.vue'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
import { formatLabels, formatPrice } from '@/utils/catalog'

const cart = useCartStore()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const quantities = reactive<Record<number, number>>({})
const message = ref('')
const validation = ref('')
watch(
  () => cart.cart.items,
  (items) => {
    for (const id of Object.keys(quantities)) delete quantities[Number(id)]
    for (const item of items) quantities[item.id] = item.quantity
  },
  { immediate: true },
)
watch(
  () => auth.currentUser?.id,
  (id) => {
    message.value = ''
    validation.value = ''
    if (!id) void router.replace({ name: 'login', query: { redirect: route.fullPath } })
  },
)
onMounted(() => {
  void cart.fetchCart()
})

async function update(id: number) {
  message.value = ''
  validation.value = ''
  const quantity = quantities[id]
  if (!quantity || !Number.isInteger(quantity) || quantity < 1) {
    validation.value = 'Quantity must be a positive whole number.'
    return
  }
  if (await cart.updateQuantity(id, quantity)) message.value = 'Cart updated.'
}
async function remove(id: number) {
  message.value = ''
  validation.value = ''
  if (await cart.removeItem(id)) message.value = 'Item removed.'
}
</script>

<template>
  <section :aria-busy="cart.loading || cart.busy">
    <h1 class="text-3xl font-bold">Shopping cart</h1>
    <p v-if="cart.error || validation" role="alert" class="mt-5 text-rose-700">
      {{ validation || cart.error }}
    </p>
    <button
      v-if="cart.error"
      type="button"
      :disabled="cart.busy || cart.loading"
      class="mt-3 font-semibold text-indigo-700"
      @click="cart.fetchCart()"
    >
      Try again
    </button>
    <p v-if="message" role="status" class="mt-5 text-emerald-700">{{ message }}</p>
    <p v-if="cart.loading" role="status" class="mt-6">Loading cart…</p>
    <p v-else-if="!cart.cart.items.length && !cart.error" class="mt-6">
      Your cart is empty.
      <RouterLink to="/products" class="font-semibold text-indigo-700 underline"
        >Browse books</RouterLink
      >
    </p>
    <template v-if="cart.cart.items.length">
      <ul class="mt-6 space-y-5" aria-label="Cart items">
        <li v-for="item in cart.cart.items" :key="item.id">
          <article
            :aria-label="`${item.name} ${formatLabels[item.format]}`"
            class="flex flex-wrap gap-5 rounded-xl border border-slate-200 bg-white p-5"
          >
            <div class="w-20"><BookCover :image="item.image ?? undefined" :name="item.name" /></div>
            <div class="flex-1">
              <RouterLink
                :to="{ name: 'product-detail', params: { id: item.productId } }"
                class="text-lg font-semibold text-indigo-800"
                >{{ item.name }}</RouterLink
              >
              <p>{{ formatLabels[item.format] }}</p>
              <p>{{ formatPrice(item.unitPrice) }} each · {{ item.stockQuantity }} in stock</p>
              <p v-if="!item.available" class="mt-2 text-rose-700">
                This selection is unavailable or exceeds current stock. Reduce the quantity or
                remove it.
              </p>
              <form
                class="mt-4"
                :aria-label="`Update ${item.name} ${formatLabels[item.format]}`"
                @submit.prevent="update(item.id)"
              >
                <fieldset
                  :disabled="cart.busy || cart.loading"
                  class="flex flex-wrap items-end gap-3"
                >
                  <div>
                    <label :for="`quantity-${item.id}`" class="block text-sm font-semibold"
                      >Quantity</label
                    >
                    <input
                      :id="`quantity-${item.id}`"
                      v-model.number="quantities[item.id]"
                      type="number"
                      min="1"
                      :max="Math.max(item.stockQuantity, item.quantity)"
                      step="1"
                      required
                      class="mt-1 w-24 rounded-lg border border-slate-300 p-2"
                    />
                  </div>
                  <button
                    type="submit"
                    class="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
                  >
                    Update
                  </button>
                  <button
                    type="button"
                    class="px-3 py-2 font-semibold text-rose-700"
                    @click="remove(item.id)"
                  >
                    Remove
                  </button>
                </fieldset>
              </form>
            </div>
            <p class="font-semibold">{{ formatPrice(item.lineTotal) }}</p>
          </article>
        </li>
      </ul>
      <div class="mt-6 rounded-xl bg-indigo-50 p-5">
        <p>{{ cart.cart.totalQuantity }} items</p>
        <p class="mt-2 text-2xl font-bold">Total: {{ formatPrice(cart.cart.total) }}</p>
        <p class="mt-2 text-sm text-slate-600">
          Prices reflect the current catalog. Items are not reserved.
        </p>
        <RouterLink
          v-if="
            !cart.loading &&
            !cart.busy &&
            !cart.error &&
            cart.cart.items.every((item) => item.available)
          "
          :to="{ name: 'checkout' }"
          class="mt-5 inline-block rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white"
          >Proceed to checkout</RouterLink
        >
      </div>
    </template>
  </section>
</template>
