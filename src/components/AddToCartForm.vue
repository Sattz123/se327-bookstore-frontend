<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import { piniaSymbol } from 'pinia'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
import type { BookFormat, Product } from '@/types/catalog'
import { formatLabels } from '@/utils/catalog'

const props = defineProps<{ product: Product }>()
const hasPinia = inject(piniaSymbol, null) !== null
const auth = hasPinia ? useAuthStore() : null
const cart = hasPinia ? useCartStore() : null
const route = useRoute()
const router = useRouter()
const format = ref<BookFormat | ''>('')
const quantity = ref(1)
const feedback = ref('')
const validation = ref('')
const unavailable = computed(() => props.product.stockQuantity < 1 || !props.product.formats.length)
watch(
  () => props.product.id,
  () => {
    format.value = props.product.formats[0] ?? ''
    quantity.value = 1
    feedback.value = ''
    validation.value = ''
  },
  { immediate: true },
)
watch(
  () => auth?.currentUser?.id,
  () => {
    feedback.value = ''
    validation.value = ''
  },
)

async function add() {
  feedback.value = ''
  validation.value = ''
  if (!auth?.isAuthenticated) {
    await router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  if (
    unavailable.value ||
    !format.value ||
    !props.product.formats.includes(format.value) ||
    !Number.isInteger(quantity.value) ||
    quantity.value < 1 ||
    quantity.value > props.product.stockQuantity
  ) {
    validation.value = 'Choose an available format and a whole quantity within available stock.'
    return
  }
  const owner = auth.currentUser?.id
  if (
    await cart?.addItem({
      productId: props.product.id,
      format: format.value,
      quantity: quantity.value,
    })
  ) {
    if (owner === auth.currentUser?.id) feedback.value = 'Added to cart.'
  }
}
</script>

<template>
  <form
    aria-label="Add book to cart"
    class="mt-6 rounded-xl border border-slate-200 p-5"
    @submit.prevent="add"
  >
    <fieldset :disabled="unavailable || cart?.busy" class="flex flex-wrap items-end gap-4">
      <div>
        <label for="cart-format" class="block text-sm font-semibold">Format</label>
        <select
          id="cart-format"
          v-model="format"
          required
          class="mt-2 rounded-lg border border-slate-300 p-2"
        >
          <option v-for="option in product.formats" :key="option" :value="option">
            {{ formatLabels[option] }}
          </option>
        </select>
      </div>
      <div>
        <label for="cart-quantity" class="block text-sm font-semibold">Quantity</label>
        <input
          id="cart-quantity"
          v-model.number="quantity"
          type="number"
          min="1"
          :max="product.stockQuantity"
          step="1"
          required
          class="mt-2 w-24 rounded-lg border border-slate-300 p-2"
        />
      </div>
      <button
        type="submit"
        class="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {{ cart?.busy ? 'Adding…' : 'Add to cart' }}
      </button>
    </fieldset>
    <p v-if="unavailable" class="mt-3 text-slate-600">This book is currently unavailable to add.</p>
    <p v-if="validation || cart?.error" role="alert" class="mt-3 text-rose-700">
      {{ validation || cart?.error }}
    </p>
    <p v-if="feedback" role="status" class="mt-3 text-emerald-700">
      {{ feedback }}
      <RouterLink :to="{ name: 'cart' }" class="font-semibold underline">View cart</RouterLink>
    </p>
  </form>
</template>
