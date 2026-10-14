<script setup lang="ts">
import { isAxiosError } from 'axios'
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { AdminProductService as service } from '@/services/AdminProductService'
import { useAuthStore } from '@/stores/auth'
import ProductImagesEditor from '@/components/ProductImagesEditor.vue'
import NewProductImages from '@/components/NewProductImages.vue'
import BookCover from '@/components/BookCover.vue'
import type { AdminCategory, AdminProduct, AdminProductPage } from '@/types/adminProduct'
import type { BookFormat } from '@/types/catalog'
import { formatLabels, formatPrice } from '@/utils/catalog'

const auth = useAuthStore()
const router = useRouter()
const result = ref<AdminProductPage | null>(null)
const categories = ref<AdminCategory[]>([])
const page = ref(1)
const search = ref('')
const categoryFilter = ref('')
const visibilityFilter = ref('')
const filters = reactive<{ q: string; categoryId?: number; visible?: boolean }>({ q: '' })
const loading = ref(false)
const busy = ref(false)
const imageBusy = ref(false)
const newImages = ref<File[]>([])
const error = ref('')
const message = ref('')
const showForm = ref(false)
const editing = ref<AdminProduct | null>(null)
const archiveTarget = ref<AdminProduct | null>(null)
const conflict = ref(false)
const stockDrafts = reactive<Record<number, number>>({})
const formatOptions = Object.keys(formatLabels) as BookFormat[]
function formatsLabel(formats: BookFormat[]) {
  return formats.map((format) => formatLabels[format]).join(', ') || 'No formats'
}
const emptyForm = () => ({
  name: '',
  author: '',
  description: '',
  price: 0,
  stockQuantity: 0,
  categoryId: 0,
  formats: ['PAPERBACK'] as BookFormat[],
  visible: true,
})
const form = reactive(emptyForm())
const selectedCategory = computed(() => categories.value.find((c) => c.id === form.categoryId))
let epoch = 0
let controller: AbortController | undefined

function report(cause: unknown) {
  conflict.value = false
  if (isAxiosError<{ detail?: string; errors?: { message: string }[] }>(cause)) {
    if (cause.response?.status === 401) {
      auth.clearAuth()
      return
    }
    if (cause.response?.status === 403) {
      void router.replace({ name: 'forbidden' })
      return
    }
    conflict.value = cause.response?.status === 409
    error.value =
      cause.response?.data?.errors?.map((item) => item.message).join(' ') ||
      cause.response?.data?.detail ||
      'Unable to complete the request. Please try again.'
  } else error.value = 'Unable to reach the server. Please try again.'
}
async function load(includeCategories = false) {
  controller?.abort()
  const request = new AbortController()
  controller = request
  const session = epoch
  loading.value = true
  error.value = ''
  conflict.value = false
  try {
    const [data, options] = await Promise.all([
      service.list({ ...filters, page: page.value }, request.signal),
      includeCategories ? service.categories(request.signal) : Promise.resolve(categories.value),
    ])
    if (session !== epoch || request.signal.aborted) return
    if (page.value > 1 && page.value > data.totalPages) {
      page.value = Math.max(1, data.totalPages)
      await load(includeCategories)
      return
    }
    result.value = data
    categories.value = options
    for (const id of Object.keys(stockDrafts)) delete stockDrafts[Number(id)]
    for (const product of data.content) stockDrafts[product.id] = product.stockQuantity
  } catch (cause) {
    if (session === epoch && !request.signal.aborted) report(cause)
  } finally {
    if (session === epoch && !request.signal.aborted) loading.value = false
  }
}
function cancelForm() {
  newImages.value = []
  imageBusy.value = false
  showForm.value = false
  editing.value = null
  Object.assign(form, emptyForm())
}
function create() {
  cancelForm()
  archiveTarget.value = null
  error.value = ''
  message.value = ''
  conflict.value = false
  form.categoryId = categories.value[0]?.id ?? 0
  showForm.value = true
}
async function edit(id: number) {
  if (busy.value) return
  const session = epoch
  busy.value = true
  error.value = ''
  message.value = ''
  conflict.value = false
  try {
    const product = await service.get(id)
    if (session !== epoch) return
    editing.value = product
    Object.assign(form, {
      name: product.name,
      author: product.author ?? '',
      description: product.description ?? '',
      price: product.price,
      stockQuantity: product.stockQuantity,
      categoryId: product.category.id,
      formats: [...product.formats],
      visible: product.visible,
    })
    archiveTarget.value = null
    showForm.value = true
  } catch (cause) {
    if (session === epoch) report(cause)
  } finally {
    if (session === epoch) busy.value = false
  }
}
async function mutate(operation: () => Promise<unknown>, success: string, closeForm = false) {
  if (busy.value) return
  const session = epoch
  busy.value = true
  error.value = ''
  message.value = ''
  conflict.value = false
  try {
    await operation()
    if (session !== epoch) return
    if (closeForm) cancelForm()
    archiveTarget.value = null
    message.value = success
    await load()
  } catch (cause) {
    if (session === epoch) report(cause)
  } finally {
    if (session === epoch) busy.value = false
  }
}
async function save() {
  if (busy.value || imageBusy.value) return
  if (
    !form.name.trim() ||
    !form.categoryId ||
    !form.formats.length ||
    !Number.isFinite(form.price) ||
    form.price < 0 ||
    form.price > 99999999.99 ||
    Math.round(form.price * 100) / 100 !== form.price ||
    !validStock(form.stockQuantity)
  ) {
    error.value =
      'Enter a title, category, at least one format, a valid price (up to two decimal places), and nonnegative whole stock.'
    return
  }
  const payload = {
    ...form,
    name: form.name.trim(),
    author: form.author.trim() || null,
    description: form.description.trim() || null,
    formats: [...form.formats],
    version: editing.value?.version ?? null,
  }
  const id = editing.value?.id
  const files = [...newImages.value]
  const session = epoch
  await mutate(
    async () => {
      let product = id ? await service.update(id, payload) : await service.create(payload)
      if (session !== epoch) return
      // Keep the saved ID immediately so an upload failure cannot create another book on retry.
      imagesUpdated(product)
      try {
        for (const file of files) {
          product = await service.uploadImage(product.id, file, product.version)
          if (session !== epoch) return
          imagesUpdated(product)
        }
      } catch (cause) {
        if (session !== epoch) return
        newImages.value = []
        // A lost upload response may still have saved the image. Reload before offering recovery.
        try {
          const saved = await service.get(product.id)
          if (session !== epoch) return
          imagesUpdated(saved)
        } catch {
          /* The saved product ID is retained even if the refresh fails. */
        }
        if (session !== epoch) return
        await load()
        if (session !== epoch) return
        message.value = `Product #${product.id} was saved, but image upload did not finish. Review its saved images below and add any missing ones.`
        throw cause
      }
    },
    id ? 'Product updated.' : files.length ? 'Product created with images.' : 'Product created.',
    true,
  )
}
function imagesUpdated(product: AdminProduct) {
  editing.value = product
  const row = result.value?.content.findIndex((item) => item.id === product.id) ?? -1
  if (result.value && row >= 0) result.value.content[row] = product
  stockDrafts[product.id] = product.stockQuantity
}
function validStock(value: number | undefined): value is number {
  return value !== undefined && Number.isInteger(value) && value >= 0 && value <= 2147483647
}
async function updateStock(product: AdminProduct) {
  const stock = stockDrafts[product.id]
  if (!validStock(stock)) {
    error.value = 'Stock must be a whole number between 0 and 2147483647.'
    return
  }
  await mutate(() => service.inventory(product.id, stock, product.version), 'Inventory updated.')
}
function toggleVisibility(product: AdminProduct) {
  return mutate(
    () => service.visibility(product.id, !product.visible, product.version),
    product.visible ? 'Product hidden.' : 'Product visibility enabled.',
  )
}
function confirmArchive() {
  const product = archiveTarget.value
  if (product)
    return mutate(
      () => service.archive(product.id, product.version),
      'Product archived. Its records and order history were preserved.',
    )
}
function applyFilters() {
  filters.q = search.value.trim()
  filters.categoryId = categoryFilter.value ? Number(categoryFilter.value) : undefined
  filters.visible = visibilityFilter.value ? visibilityFilter.value === 'true' : undefined
  page.value = 1
  void load()
}
function changePage(value: number) {
  page.value = value
  void load()
}
function reloadEdited() {
  if (editing.value) void edit(editing.value.id)
}

watch(
  () => [auth.currentUser?.id, auth.currentUser?.role],
  () => {
    epoch++
    controller?.abort()
    result.value = null
    categories.value = []
    cancelForm()
    archiveTarget.value = null
    busy.value = false
    error.value = ''
    message.value = ''
    page.value = 1
    if (auth.isAuthenticated && auth.isAdmin) void load(true)
  },
  { immediate: true, flush: 'sync' },
)
onBeforeUnmount(() => {
  epoch++
  controller?.abort()
})
</script>

<template>
  <section :aria-busy="loading || busy">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold">
          {{ showForm ? (editing ? 'Edit product' : 'Add a new book') : 'Products and inventory' }}
        </h1>
        <p class="mt-2 text-slate-600">
          Manage book details, availability, and shared stock across formats.
        </p>
      </div>
      <button
        v-if="!showForm"
        type="button"
        :disabled="busy || loading || showForm || !categories.length"
        class="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
        @click="create"
      >
        New product
      </button>
    </div>
    <div v-if="error" class="mt-5 rounded-lg bg-rose-50 p-4">
      <p role="alert" class="text-rose-700">{{ error }}</p>
      <button
        v-if="!showForm"
        type="button"
        :disabled="busy || loading"
        class="mt-3 text-indigo-700 underline"
        @click="load(true)"
      >
        Reload products
      </button>
      <button
        v-if="showForm && conflict && editing"
        type="button"
        :disabled="busy"
        class="mt-3 text-indigo-700 underline"
        @click="reloadEdited"
      >
        Reload product (discards edits)
      </button>
    </div>
    <p v-if="message" role="status" class="mt-5 rounded-lg bg-emerald-50 p-4 text-emerald-800">
      {{ message }}
    </p>
    <form
      v-if="showForm"
      aria-label="Product editor"
      class="admin-editor mt-6 rounded-xl border border-slate-200 bg-white p-6"
      @submit.prevent="save"
    >
      <h2 class="text-xl font-semibold">
        {{ editing ? `Edit product #${editing.id}` : 'Create product' }}
      </h2>
      <fieldset :disabled="busy || imageBusy" class="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <label for="product-name" class="block font-medium">Title</label
          ><input
            id="product-name"
            v-model="form.name"
            maxlength="255"
            required
            class="mt-1 w-full rounded-lg border border-slate-300 p-2"
          />
        </div>
        <div>
          <label for="product-author" class="block font-medium">Author</label
          ><input
            id="product-author"
            v-model="form.author"
            maxlength="255"
            class="mt-1 w-full rounded-lg border border-slate-300 p-2"
          />
        </div>
        <div>
          <label for="product-price" class="block font-medium">Price</label
          ><input
            id="product-price"
            v-model.number="form.price"
            type="number"
            min="0"
            max="99999999.99"
            step="0.01"
            required
            class="mt-1 w-full rounded-lg border border-slate-300 p-2"
          />
        </div>
        <div>
          <label for="product-stock" class="block font-medium">Stock quantity</label
          ><input
            id="product-stock"
            v-model.number="form.stockQuantity"
            type="number"
            min="0"
            max="2147483647"
            step="1"
            required
            class="mt-1 w-full rounded-lg border border-slate-300 p-2"
          />
        </div>
        <div>
          <label for="product-category" class="block font-medium">Category</label
          ><select
            id="product-category"
            v-model="form.categoryId"
            required
            class="mt-1 w-full rounded-lg border border-slate-300 p-2"
          >
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}{{ category.visible ? '' : ' (hidden)' }}
            </option>
          </select>
          <p
            v-if="selectedCategory && !selectedCategory.visible"
            class="mt-2 text-sm text-amber-800"
          >
            This category is hidden, so the book will not appear in the storefront.
          </p>
        </div>
        <fieldset class="flex flex-wrap gap-4">
          <legend class="mb-2 font-medium">Book formats</legend>
          <label v-for="format in formatOptions" :key="format" class="flex items-center gap-2"
            ><input v-model="form.formats" type="checkbox" :value="format" />{{
              formatLabels[format]
            }}</label
          >
        </fieldset>
        <div class="md:col-span-2">
          <label for="product-description" class="block font-medium">Description</label
          ><textarea
            id="product-description"
            v-model="form.description"
            rows="4"
            maxlength="10000"
            class="mt-1 w-full rounded-lg border border-slate-300 p-2"
          ></textarea>
        </div>
        <ProductImagesEditor
          v-if="editing"
          :key="editing.id"
          :product="editing"
          @updated="imagesUpdated"
          @busy="imageBusy = $event"
        />
        <NewProductImages v-else v-model="newImages" />
        <label class="flex items-center gap-2"
          ><input v-model="form.visible" type="checkbox" />Visible in storefront</label
        >
        <div class="admin-editor-actions flex gap-4 md:col-span-2">
          <button type="submit" class="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white">
            {{ busy ? 'Saving…' : 'Save product' }}</button
          ><button type="button" class="px-3 py-2 font-semibold text-slate-600" @click="cancelForm">
            Cancel
          </button>
        </div>
      </fieldset>
    </form>
    <template v-if="!showForm">
      <form
        class="admin-filter-bar mt-7 flex flex-wrap items-end gap-3"
        aria-label="Product filters"
        @submit.prevent="applyFilters"
      >
        <fieldset :disabled="busy || loading || showForm" class="contents">
          <div>
            <label for="admin-product-search" class="block text-sm font-medium"
              >Title or author</label
            ><input
              id="admin-product-search"
              v-model="search"
              type="search"
              maxlength="100"
              class="mt-1 rounded-lg border border-slate-300 bg-white p-2"
            />
          </div>
          <div>
            <label for="admin-category-filter" class="block text-sm font-medium">Category</label
            ><select
              id="admin-category-filter"
              v-model="categoryFilter"
              class="mt-1 rounded-lg border border-slate-300 bg-white p-2"
            >
              <option value="">All categories</option>
              <option
                v-for="category in categories"
                :key="category.id"
                :value="String(category.id)"
              >
                {{ category.name }}
              </option>
            </select>
          </div>
          <div>
            <label for="admin-visibility-filter" class="block text-sm font-medium">Visibility</label
            ><select
              id="admin-visibility-filter"
              v-model="visibilityFilter"
              class="mt-1 rounded-lg border border-slate-300 bg-white p-2"
            >
              <option value="">All products</option>
              <option value="true">Visible flag on</option>
              <option value="false">Hidden / archived</option>
            </select>
          </div>
          <button type="submit" class="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white">
            Search
          </button>
        </fieldset>
      </form>
      <p v-if="loading" role="status" class="mt-6">Loading products…</p>
      <p v-else-if="!categories.length && !error" class="mt-6">
        No categories are available. Add a category before creating a product.
      </p>
      <p v-if="!loading && result && !result.content.length" class="mt-6">
        No products match your filters.
      </p>
      <div v-if="archiveTarget" class="mt-6 rounded-xl bg-amber-50 p-5">
        <p>
          Archive “{{ archiveTarget.name }}”? It will be hidden from the storefront. Its records and
          order history will remain, and you can restore its visibility later.
        </p>
        <div class="mt-4 flex gap-4">
          <button
            type="button"
            :disabled="busy"
            class="font-semibold text-rose-700"
            @click="confirmArchive"
          >
            Confirm archive</button
          ><button type="button" :disabled="busy" @click="archiveTarget = null">Cancel</button>
        </div>
      </div>
      <div
        v-if="result?.content.length && !loading"
        class="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white"
      >
        <table class="w-full text-left text-sm">
          <caption class="sr-only">
            Administrator product inventory
          </caption>
          <thead class="bg-slate-100">
            <tr>
              <th scope="col" class="p-4">Book</th>
              <th scope="col" class="p-4">Price</th>
              <th scope="col" class="p-4">Inventory</th>
              <th scope="col" class="p-4">Visibility</th>
              <th scope="col" class="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="product in result.content"
              :key="product.id"
              class="border-t border-slate-200"
            >
              <td class="min-w-52 p-4">
                <div class="admin-product-cell">
                  <BookCover :image="product.images[0]" :name="product.name" />
                  <div class="min-w-0">
                    <p class="font-semibold">{{ product.name }}</p>
                    <p class="mt-1 text-slate-500">
                      #{{ product.id }} · {{ product.author || 'Unknown author' }}
                    </p>
                    <p class="mt-1">
                      {{ product.category.name }} ·
                      {{ formatsLabel(product.formats) }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="whitespace-nowrap p-4">{{ formatPrice(product.price) }}</td>
              <td class="p-4">
                <form
                  :aria-label="`Inventory for ${product.name}`"
                  class="flex gap-2"
                  @submit.prevent="updateStock(product)"
                >
                  <fieldset :disabled="busy || showForm" class="admin-stock-form flex gap-2">
                    <input
                      v-model.number="stockDrafts[product.id]"
                      :aria-label="`Stock for ${product.name}`"
                      type="number"
                      min="0"
                      max="2147483647"
                      step="1"
                      required
                      class="w-24 rounded-lg border border-slate-300 p-2"
                    /><button type="submit" class="font-semibold text-indigo-700">
                      Save stock
                    </button>
                  </fieldset>
                </form>
              </td>
              <td class="whitespace-nowrap p-4">
                <span
                  :class="
                    product.visible && product.category.visible
                      ? 'text-emerald-700'
                      : 'text-amber-800'
                  "
                  >{{
                    !product.visible
                      ? 'Hidden / archived'
                      : product.category.visible
                        ? 'Visible'
                        : 'Category hidden'
                  }}</span
                >
              </td>
              <td class="p-4">
                <div class="admin-row-actions flex flex-wrap gap-3">
                  <button
                    type="button"
                    :disabled="busy || showForm"
                    class="font-semibold text-indigo-700 disabled:opacity-50"
                    @click="edit(product.id)"
                  >
                    Edit</button
                  ><button
                    type="button"
                    :disabled="busy || showForm"
                    class="font-semibold text-indigo-700 disabled:opacity-50"
                    @click="toggleVisibility(product)"
                  >
                    {{ product.visible ? 'Hide' : 'Show' }}</button
                  ><button
                    v-if="product.visible"
                    type="button"
                    :disabled="busy || showForm"
                    class="font-semibold text-rose-700 disabled:opacity-50"
                    @click="archiveTarget = product"
                  >
                    Archive
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <nav
        v-if="result && result.totalPages > 1"
        aria-label="Product pagination"
        class="mt-6 flex items-center gap-5"
      >
        <button
          type="button"
          :disabled="page <= 1 || busy || loading || showForm"
          class="font-semibold text-indigo-700 disabled:opacity-50"
          @click="changePage(page - 1)"
        >
          Previous</button
        ><span
          >Page {{ page }} of {{ result.totalPages }} · {{ result.totalElements }} products</span
        ><button
          type="button"
          :disabled="page >= result.totalPages || busy || loading || showForm"
          class="font-semibold text-indigo-700 disabled:opacity-50"
          @click="changePage(page + 1)"
        >
          Next
        </button>
      </nav>
    </template>
  </section>
</template>
