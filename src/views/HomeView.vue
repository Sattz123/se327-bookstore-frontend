<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import BookCard from '@/components/BookCard.vue'
import CategoryGrid from '@/components/CategoryGrid.vue'
import ProductService from '@/services/ProductService'
import CategoryService from '@/services/CategoryService'
import type { Product, Category } from '@/types/catalog'

const featured = ref<Product[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const error = ref(false)
let controller: AbortController | undefined

async function loadHome() {
  controller?.abort()
  const request = new AbortController()
  controller = request
  loading.value = true
  error.value = false
  try {
    const [books, topics] = await Promise.all([
      ProductService.getFeaturedProducts(request.signal),
      CategoryService.getCategories(request.signal),
    ])
    if (!request.signal.aborted) {
      featured.value = books.data
      categories.value = topics.data
    }
  } catch {
    if (!request.signal.aborted) error.value = true
  } finally {
    if (!request.signal.aborted) loading.value = false
  }
}

onMounted(loadHome)
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <div>
    <section class="rounded-2xl border border-indigo-100 bg-indigo-50 px-6 py-12 sm:px-12 sm:py-20">
      <p class="mb-4 text-sm font-semibold tracking-widest text-indigo-700 uppercase">
        InwZa Bookstore
      </p>
      <h1
        class="max-w-2xl text-4xl leading-tight font-bold tracking-tight text-slate-900 sm:text-5xl"
      >
        Find your next great read.
      </h1>
      <p class="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
        Explore our newest books, find a favorite author, or discover something unexpected.
      </p>
      <RouterLink
        :to="{ name: 'products' }"
        class="mt-8 inline-flex rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white transition-colors hover:bg-indigo-800"
      >
        Browse books <span aria-hidden="true" class="ml-2">&rarr;</span>
      </RouterLink>
    </section>
    <div :aria-busy="loading" class="mt-12">
      <p v-if="loading" role="status" class="text-slate-600">Loading the latest books…</p>
      <div v-else-if="error" role="alert" class="rounded-xl border border-rose-200 bg-rose-50 p-6">
        <p>We couldn't load the latest books and categories.</p>
        <button
          type="button"
          class="mt-4 rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white"
          @click="loadHome"
        >
          Try again
        </button>
      </div>
      <template v-else>
        <section aria-labelledby="featured-heading">
          <div class="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 id="featured-heading" class="text-2xl font-bold">Featured books</h2>
              <p class="mt-1 text-sm text-slate-600">The newest additions to our shelves.</p>
            </div>
            <RouterLink
              :to="{ name: 'products' }"
              class="text-sm font-semibold text-indigo-700 hover:underline"
              >View all books &rarr;</RouterLink
            >
          </div>
          <ul
            v-if="featured.length"
            aria-label="Featured books"
            class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            <li v-for="product in featured" :key="product.id"><BookCard :product="product" /></li>
          </ul>
          <p v-else class="text-slate-600">No books available yet.</p>
        </section>
        <section aria-labelledby="topics-heading" class="mt-12">
          <h2 id="topics-heading" class="mb-5 text-2xl font-bold">Browse by category</h2>
          <CategoryGrid v-if="categories.length" :categories="categories" />
          <p v-else class="text-slate-600">No categories available yet.</p>
        </section>
      </template>
    </div>
  </div>
</template>
