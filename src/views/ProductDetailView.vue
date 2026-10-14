<script setup lang="ts">
import { isAxiosError } from 'axios'
import { onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BookCover from '@/components/BookCover.vue'
import ProductService from '@/services/ProductService'
import type { Product } from '@/types/catalog'
import { formatLabels, formatPrice } from '@/utils/catalog'

const route = useRoute()
const product = ref<Product | null>(null)
const loading = ref(true)
const error = ref<'missing' | 'unavailable' | null>(null)
const selectedImage = ref(0)
let controller: AbortController | undefined

async function loadProduct() {
  controller?.abort()
  const request = new AbortController()
  controller = request
  product.value = null
  error.value = null
  selectedImage.value = 0
  loading.value = true
  const id = String(route.params.id)
  if (!/^[1-9]\d*$/.test(id)) {
    error.value = 'missing'
    loading.value = false
    return
  }
  try {
    const response = await ProductService.getProduct(id, request.signal)
    if (!request.signal.aborted) product.value = response.data
  } catch (cause) {
    if (!request.signal.aborted) {
      error.value =
        isAxiosError(cause) && cause.response?.status === 404 ? 'missing' : 'unavailable'
    }
  } finally {
    if (!request.signal.aborted) loading.value = false
  }
}

watch(() => route.params.id, loadProduct, { immediate: true })
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <section :aria-busy="loading">
    <RouterLink
      :to="{ name: 'products' }"
      class="text-sm font-semibold text-indigo-700 hover:underline"
    >
      &larr; Back to books
    </RouterLink>

    <p v-if="loading" role="status" class="mt-10 text-slate-600">Loading book…</p>
    <div v-else-if="error" class="mt-8 rounded-xl border border-slate-200 bg-white p-8">
      <h1 class="text-3xl font-bold">
        {{ error === 'missing' ? 'Book not found' : 'Unable to load book' }}
      </h1>
      <p role="alert" class="mt-4 text-slate-600">
        {{
          error === 'missing'
            ? 'This book is unavailable or no longer listed.'
            : "We couldn't load this book. Please try again."
        }}
      </p>
      <button
        v-if="error === 'unavailable'"
        type="button"
        class="mt-5 rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white hover:bg-indigo-800"
        @click="loadProduct"
      >
        Try again
      </button>
    </div>
    <div v-else-if="product" class="mt-8 grid gap-8 md:grid-cols-2 md:gap-12">
      <div class="mx-auto w-full max-w-sm">
        <BookCover :image="product.images[selectedImage]" :name="product.name" />
        <div v-if="product.images.length > 1" class="mt-4 flex gap-3" aria-label="Book covers">
          <button
            v-for="(image, index) in product.images"
            :key="index"
            type="button"
            :aria-label="`View cover ${index + 1}`"
            :aria-pressed="selectedImage === index"
            class="w-16 rounded-lg border-2 p-1"
            :class="selectedImage === index ? 'border-indigo-700' : 'border-transparent'"
            @click="selectedImage = index"
          >
            <BookCover :image="image" :name="product.name" />
          </button>
        </div>
      </div>
      <div>
        <p class="text-sm font-semibold tracking-wide text-indigo-700">
          {{ product.category.name }}
        </p>
        <h1 class="mt-3 text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
          {{ product.name }}
        </h1>
        <p class="mt-3 text-lg text-slate-600">By {{ product.author || 'Unknown author' }}</p>
        <p class="mt-6 text-3xl font-bold text-indigo-800">{{ formatPrice(product.price) }}</p>
        <p
          class="mt-3 font-medium"
          :class="product.stockQuantity > 0 ? 'text-emerald-700' : 'text-slate-500'"
        >
          {{
            product.stockQuantity > 0 ? `${product.stockQuantity} copies available` : 'Out of stock'
          }}
        </p>
        <h2 class="mt-8 text-lg font-semibold">About this book</h2>
        <p class="mt-3 leading-relaxed whitespace-pre-line text-slate-600">
          {{ product.description || 'No description available.' }}
        </p>
        <h2 class="mt-8 text-lg font-semibold">Available formats</h2>
        <ul
          v-if="product.formats.length"
          class="mt-3 flex flex-wrap gap-2"
          aria-label="Available formats"
        >
          <li
            v-for="format in product.formats"
            :key="format"
            class="rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-800"
          >
            {{ formatLabels[format] }}
          </li>
        </ul>
        <p v-else class="mt-3 text-slate-500">No formats listed.</p>
      </div>
    </div>
  </section>
</template>
