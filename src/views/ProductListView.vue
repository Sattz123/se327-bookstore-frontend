<script setup lang="ts">
import { isAxiosError } from 'axios'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BookCard from '@/components/BookCard.vue'
import CategoryService from '@/services/CategoryService'
import ProductService from '@/services/ProductService'
import type { Category, ProductPage } from '@/types/catalog'

const route = useRoute()
const router = useRouter()
const results = ref<ProductPage | null>(null)
const categories = ref<Category[]>([])
const loading = ref(true)
const error = ref<'invalid' | 'missing' | 'unavailable' | null>(null)
const search = ref('')
const selectedCategory = ref('')
let controller: AbortController | undefined

const categoryId = computed(() => route.params.id ?? route.query.categoryId)
const category = computed(() =>
  categories.value.find((item) => String(item.id) === categoryId.value),
)
const heading = computed(() =>
  route.name === 'category-products' ? (category.value?.name ?? 'Category books') : 'Books',
)
const page = computed(() => Number(route.query.page ?? 1))

async function loadProducts() {
  controller?.abort()
  const request = new AbortController()
  controller = request
  loading.value = true
  error.value = null
  results.value = null
  search.value = typeof route.query.q === 'string' ? route.query.q : ''
  selectedCategory.value = typeof categoryId.value === 'string' ? categoryId.value : ''
  const invalidQuery = route.query.q !== undefined && typeof route.query.q !== 'string'
  const invalidPage =
    route.query.page !== undefined &&
    (typeof route.query.page !== 'string' || !/^[1-9]\d*$/.test(route.query.page))
  const invalidCategory =
    categoryId.value !== undefined &&
    (typeof categoryId.value !== 'string' ||
      !/^[1-9]\d*$/.test(categoryId.value) ||
      !Number.isSafeInteger(Number(categoryId.value)))
  if (
    invalidQuery ||
    invalidPage ||
    invalidCategory ||
    search.value.length > 100 ||
    page.value > 1000000
  ) {
    error.value = 'invalid'
    loading.value = false
    return
  }
  try {
    const [booksResponse, categoriesResponse] = await Promise.all([
      ProductService.getProducts(
        {
          q: search.value.trim() || undefined,
          categoryId: selectedCategory.value || undefined,
          page: page.value,
        },
        request.signal,
      ),
      CategoryService.getCategories(request.signal),
    ])
    if (!request.signal.aborted) {
      results.value = booksResponse.data
      categories.value = categoriesResponse.data
    }
  } catch (cause) {
    if (!request.signal.aborted)
      error.value =
        isAxiosError(cause) && cause.response?.status === 404 ? 'missing' : 'unavailable'
  } finally {
    if (!request.signal.aborted) loading.value = false
  }
}

function submitSearch() {
  const query = {
    q: search.value.trim() || undefined,
    categoryId: selectedCategory.value || undefined,
  }
  if (route.name === 'category-products' && selectedCategory.value === route.params.id) {
    void router.push({
      name: 'category-products',
      params: { id: selectedCategory.value },
      query: { q: query.q },
    })
  } else {
    void router.push({ name: 'products', query })
  }
}

function pageLink(target: number) {
  return {
    path: route.path,
    query: { ...route.query, page: target === 1 ? undefined : String(target) },
  }
}

watch(() => route.fullPath, loadProducts, { immediate: true })
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <section :aria-busy="loading">
    <p class="text-sm font-semibold tracking-widest text-indigo-700 uppercase">The catalog</p>
    <h1 class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
      {{ error === 'missing' ? 'Category not found' : heading }}
    </h1>
    <p class="mt-3 text-slate-600">Find a story to get lost in or something new to learn.</p>

    <form
      aria-label="Search books"
      class="mt-7 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end"
      @submit.prevent="submitSearch"
    >
      <div class="flex-1">
        <label for="book-search" class="mb-2 block text-sm font-medium">Title or author</label>
        <input
          id="book-search"
          v-model="search"
          type="search"
          maxlength="100"
          placeholder="Search books…"
          class="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>
      <div>
        <label for="category-filter" class="mb-2 block text-sm font-medium">Category</label>
        <select
          id="category-filter"
          v-model="selectedCategory"
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
        >
          <option value="">All categories</option>
          <option v-for="item in categories" :key="item.id" :value="String(item.id)">
            {{ item.name }}
          </option>
        </select>
      </div>
      <button
        type="submit"
        class="rounded-lg bg-indigo-700 px-5 py-2 font-semibold text-white hover:bg-indigo-800"
      >
        Search
      </button>
      <RouterLink
        :to="{ name: 'products' }"
        class="px-2 py-2 text-sm font-semibold text-indigo-700 hover:underline"
        >Reset filters</RouterLink
      >
    </form>

    <p v-if="loading" role="status" class="mt-10 text-slate-600">Loading books…</p>
    <div
      v-else-if="error"
      role="alert"
      class="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-6"
    >
      <p v-if="error === 'invalid'">
        The page or filters are invalid. Reset filters to browse books.
      </p>
      <p v-else-if="error === 'missing'">This category is unavailable or no longer listed.</p>
      <p v-else>We couldn't load the books. Please try again.</p>
      <button
        v-if="error === 'unavailable'"
        type="button"
        class="mt-4 rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white hover:bg-indigo-800"
        @click="loadProducts"
      >
        Try again
      </button>
    </div>
    <template v-else-if="results">
      <p class="mt-8 text-sm text-slate-500">
        {{ results.totalElements }} {{ results.totalElements === 1 ? 'book' : 'books' }} found<span
          v-if="route.query.q"
        >
          for “{{ route.query.q }}”</span
        >
      </p>
      <p v-if="!results.content.length" role="status" class="mt-6 text-slate-600">
        {{ page > 1 ? 'No books on this page.' : 'No books match these filters.' }}
        <RouterLink
          v-if="page > 1"
          :to="pageLink(1)"
          class="ml-2 font-semibold text-indigo-700 hover:underline"
          >Go to first page</RouterLink
        >
      </p>
      <ul
        v-else
        aria-label="Books"
        class="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        <li v-for="product in results.content" :key="product.id">
          <BookCard :product="product" />
        </li>
      </ul>
      <nav
        v-if="results.totalPages > 0"
        aria-label="Book pages"
        class="mt-8 flex flex-wrap items-center justify-center gap-5"
      >
        <RouterLink
          v-if="page > 1"
          :to="pageLink(Math.min(page - 1, results.totalPages))"
          class="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-indigo-700"
          >Previous</RouterLink
        >
        <span role="status" class="text-sm text-slate-600"
          >Page {{ results.page }} of {{ results.totalPages }}</span
        >
        <RouterLink
          v-if="page < results.totalPages"
          :to="pageLink(page + 1)"
          class="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-indigo-700"
          >Next</RouterLink
        >
      </nav>
    </template>
  </section>
</template>
