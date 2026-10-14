<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import BookCard from '@/components/BookCard.vue'
import ProductService from '@/services/ProductService'
import type { Product } from '@/types/catalog'

const products = ref<Product[]>([])
const loading = ref(true)
const error = ref(false)
let controller: AbortController | undefined

async function loadProducts() {
  controller?.abort()
  const request = new AbortController()
  controller = request
  loading.value = true
  error.value = false
  products.value = []
  try {
    const response = await ProductService.getProducts(request.signal)
    if (!request.signal.aborted) products.value = response.data
  } catch {
    if (!request.signal.aborted) error.value = true
  } finally {
    if (!request.signal.aborted) loading.value = false
  }
}

onMounted(loadProducts)
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <section :aria-busy="loading">
    <p class="text-sm font-semibold tracking-widest text-indigo-700 uppercase">The catalog</p>
    <h1 class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Books</h1>
    <p class="mt-3 text-slate-600">Find a story to get lost in or something new to learn.</p>

    <p v-if="loading" role="status" class="mt-10 text-slate-600">Loading books…</p>
    <div
      v-else-if="error"
      role="alert"
      class="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-6"
    >
      <p>We couldn't load the books. Please try again.</p>
      <button
        type="button"
        class="mt-4 rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white hover:bg-indigo-800"
        @click="loadProducts"
      >
        Try again
      </button>
    </div>
    <p v-else-if="products.length === 0" role="status" class="mt-10 text-slate-600">
      No books available yet. Please check back later.
    </p>
    <template v-else>
      <p class="mt-8 text-sm text-slate-500">
        {{ products.length }} {{ products.length === 1 ? 'book' : 'books' }} available
      </p>
      <ul aria-label="Books" class="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <li v-for="product in products" :key="product.id">
          <BookCard :product="product" />
        </li>
      </ul>
    </template>
  </section>
</template>
