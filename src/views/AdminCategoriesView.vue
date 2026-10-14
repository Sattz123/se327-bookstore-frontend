<script setup lang="ts">
import { isAxiosError } from 'axios'
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import CategoryIcon from '@/components/CategoryIcon.vue'
import AppIcon from '@/components/AppIcon.vue'
import {
  AdminCategoryService as service,
  type ManagedCategory,
} from '@/services/AdminCategoryService'
import { useAuthStore } from '@/stores/auth'
import { resolveImageUrl } from '@/utils/catalog'

const auth = useAuthStore()
const router = useRouter()
const categories = ref<ManagedCategory[]>([])
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const message = ref('')
const conflict = ref(false)
const search = ref('')
const visibilityFilter = ref('')
const showForm = ref(false)
const editing = ref<ManagedCategory | null>(null)
const deleting = ref<ManagedCategory | null>(null)
const form = reactive({ name: '', imageUrl: '', visible: true })
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const preview = ref('')
const imageError = ref('')
const previewUrl = computed(() => preview.value || resolveImageUrl(form.imageUrl || undefined))
const filtered = computed(() =>
  categories.value.filter(
    (category) =>
      category.name.toLowerCase().includes(search.value.trim().toLowerCase()) &&
      (!visibilityFilter.value || category.visible === (visibilityFilter.value === 'true')),
  ),
)
let epoch = 0
let controller: AbortController | undefined

function clearFile(resetInput = true) {
  if (preview.value) window.URL.revokeObjectURL(preview.value)
  preview.value = ''
  file.value = null
  imageError.value = ''
  if (resetInput && fileInput.value) fileInput.value.value = ''
}
function selectFile(event: Event) {
  const selected = (event.target as HTMLInputElement).files?.[0]
  clearFile(false)
  if (!selected) return
  if (
    !['image/png', 'image/jpeg'].includes(selected.type) ||
    selected.size < 1 ||
    selected.size > 5 * 1024 * 1024
  ) {
    imageError.value = 'Choose a PNG or JPEG image no larger than 5 MB.'
    return
  }
  file.value = selected
  preview.value = window.URL.createObjectURL(selected)
}
function removeImage() {
  clearFile()
  form.imageUrl = ''
}
function cancel() {
  clearFile()
  editing.value = null
  showForm.value = false
  Object.assign(form, { name: '', imageUrl: '', visible: true })
}
function create() {
  cancel()
  deleting.value = null
  error.value = ''
  message.value = ''
  conflict.value = false
  showForm.value = true
}
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
      'Unable to update categories. Please try again.'
  } else error.value = 'Unable to reach the server. Please try again.'
}
async function load() {
  controller?.abort()
  const request = new AbortController()
  controller = request
  const session = epoch
  loading.value = true
  error.value = ''
  conflict.value = false
  try {
    const data = await service.list(request.signal)
    if (session !== epoch || request.signal.aborted) return
    categories.value = data
    if (deleting.value) deleting.value = data.find((c) => c.id === deleting.value?.id) ?? null
  } catch (cause) {
    if (session === epoch && !request.signal.aborted) report(cause)
  } finally {
    if (session === epoch && !request.signal.aborted) loading.value = false
  }
}
async function edit(id: number) {
  if (busy.value) return
  const session = epoch
  busy.value = true
  error.value = ''
  message.value = ''
  conflict.value = false
  try {
    const category = await service.get(id)
    if (session !== epoch) return
    clearFile()
    editing.value = category
    deleting.value = null
    Object.assign(form, {
      name: category.name,
      imageUrl: category.imageUrl ?? '',
      visible: category.visible,
    })
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
    if (closeForm) cancel()
    deleting.value = null
    message.value = success
    await load()
  } catch (cause) {
    if (session === epoch) report(cause)
  } finally {
    if (session === epoch) busy.value = false
  }
}
function save() {
  if (busy.value || imageError.value) return
  if (!form.name.trim()) {
    error.value = 'Category name is required.'
    return
  }
  const id = editing.value?.id ?? null
  const payload = {
    name: form.name.trim(),
    imageUrl: file.value ? null : form.imageUrl.trim() || null,
    visible: form.visible,
    version: editing.value?.version ?? null,
  }
  const selected = file.value
  return mutate(
    () => service.save(id, payload, selected),
    id === null ? 'Category created.' : 'Category updated.',
    true,
  )
}
function toggle(category: ManagedCategory) {
  return mutate(
    () => service.visibility(category),
    category.visible
      ? 'Category hidden. Its books are also hidden from browsing.'
      : 'Category shown. Its visible books are available again.',
  )
}
function confirmDelete() {
  const category = deleting.value
  if (category) return mutate(() => service.delete(category), 'Empty category deleted.')
}
function reloadEdited() {
  if (editing.value) void edit(editing.value.id)
}
watch(
  () => [auth.currentUser?.id, auth.currentUser?.role],
  () => {
    epoch++
    controller?.abort()
    categories.value = []
    cancel()
    deleting.value = null
    busy.value = false
    error.value = ''
    message.value = ''
    if (auth.isAuthenticated && auth.isAdmin) void load()
  },
  { immediate: true, flush: 'sync' },
)
onBeforeUnmount(() => {
  epoch++
  controller?.abort()
  clearFile()
})
</script>

<template>
  <section :aria-busy="loading || busy">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold">
          {{ showForm ? (editing ? 'Edit category' : 'New category') : 'Categories' }}
        </h1>
        <p class="mt-2 text-slate-600">
          Manage category names, images and visibility. Hiding a category also hides its books from
          browsing.
        </p>
      </div>
      <button
        v-if="!showForm"
        type="button"
        :disabled="busy || loading || showForm"
        class="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
        @click="create"
      >
        New category
      </button>
    </div>
    <div v-if="error" class="mt-5 rounded-lg bg-rose-50 p-4">
      <p role="alert" class="text-rose-700">{{ error }}</p>
      <button
        v-if="!showForm"
        type="button"
        :disabled="busy || loading"
        class="mt-3 text-indigo-700 underline"
        @click="load"
      >
        Reload categories</button
      ><button
        v-if="showForm && conflict && editing"
        type="button"
        :disabled="busy"
        class="mt-3 text-indigo-700 underline"
        @click="reloadEdited"
      >
        Reload category (discards edits)
      </button>
    </div>
    <p v-if="message" role="status" class="mt-5 rounded-lg bg-emerald-50 p-4 text-emerald-800">
      {{ message }}
    </p>
    <form
      v-if="showForm"
      aria-label="Category editor"
      class="admin-editor mt-6 rounded-xl border border-slate-200 bg-white p-6"
      @submit.prevent="save"
    >
      <h2 class="text-xl font-semibold">
        {{ editing ? `Edit category #${editing.id}` : 'Create category' }}
      </h2>
      <fieldset :disabled="busy" class="mt-5 space-y-5">
        <div>
          <label for="category-name" class="block font-medium">Name</label
          ><input
            id="category-name"
            v-model="form.name"
            required
            maxlength="100"
            class="mt-1 w-full rounded-lg border border-slate-300 p-2"
          />
        </div>
        <div class="image-manager">
          <div class="image-manager-heading">
            <h3>Category image</h3>
            <span>Optional</span>
          </div>
          <p class="mt-2">
            JPEG or PNG, up to 5 MB and 4096 × 4096 pixels. Saved with the category.
          </p>
          <div class="image-chooser">
            <span class="image-chooser-icon"><AppIcon name="image" :size="23" /></span>
            <div class="image-chooser-copy">
              <strong>{{ file ? file.name : 'Choose a category image' }}</strong
              ><small>Use a square image for the best result.</small>
            </div>
            <input
              id="category-image"
              ref="fileInput"
              type="file"
              accept="image/png,image/jpeg"
              class="image-file-input"
              @change="selectFile"
            />
            <label for="category-image" class="image-choose-button"
              ><AppIcon name="upload" :size="14" />Choose image</label
            >
          </div>
          <p v-if="imageError" role="alert" class="mt-2 text-rose-700">{{ imageError }}</p>
          <img
            v-if="previewUrl"
            :src="previewUrl"
            alt="Category image preview"
            class="mt-3 h-32 w-32 rounded-lg object-cover"
          /><button
            v-if="previewUrl || imageError"
            type="button"
            class="mt-3 text-sm text-rose-700 underline"
            @click="removeImage"
          >
            Remove image
          </button>
        </div>
        <div>
          <label for="category-image-url" class="block text-sm font-medium"
            >Or use an existing image URL</label
          ><input
            id="category-image-url"
            v-model="form.imageUrl"
            :disabled="!!file"
            maxlength="500"
            placeholder="https://… or /images/…"
            class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
          />
        </div>
        <label class="flex items-center gap-2"
          ><input v-model="form.visible" type="checkbox" />Visible in storefront</label
        >
        <div class="admin-editor-actions flex gap-4">
          <button
            type="submit"
            :disabled="!!imageError"
            class="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {{ busy ? 'Saving…' : 'Save category' }}</button
          ><button type="button" class="px-3 py-2 text-slate-600" @click="cancel">Cancel</button>
        </div>
      </fieldset>
    </form>
    <template v-if="!showForm">
      <div class="admin-filter-bar mt-7 flex flex-wrap gap-4">
        <div>
          <label for="category-search" class="block text-sm font-medium">Search names</label
          ><input
            id="category-search"
            v-model="search"
            type="search"
            maxlength="100"
            class="mt-1 rounded-lg border border-slate-300 bg-white p-2"
          />
        </div>
        <div>
          <label for="category-visibility" class="block text-sm font-medium">Visibility</label
          ><select
            id="category-visibility"
            v-model="visibilityFilter"
            class="mt-1 rounded-lg border border-slate-300 bg-white p-2"
          >
            <option value="">All categories</option>
            <option value="true">Visible</option>
            <option value="false">Hidden</option>
          </select>
        </div>
      </div>
      <p v-if="loading" role="status" class="mt-6">Loading categories…</p>
      <p v-else-if="!filtered.length && !error" class="mt-6">
        No categories match. Create a category or change your filters.
      </p>
      <div v-if="deleting" class="mt-6 rounded-xl bg-amber-50 p-5">
        <p class="font-semibold">Delete “{{ deleting.name }}”?</p>
        <p v-if="deleting.productCount" class="mt-2">
          This category contains {{ deleting.productCount }} product(s), including any archived
          books. Reassign them in
          <RouterLink :to="{ name: 'admin-products' }" class="text-indigo-700 underline"
            >Products and inventory</RouterLink
          >
          before deleting.
        </p>
        <p v-else class="mt-2">This empty category will be permanently removed.</p>
        <div class="mt-4 flex gap-4">
          <button
            type="button"
            :disabled="busy || deleting.productCount > 0"
            class="font-semibold text-rose-700 disabled:opacity-50"
            @click="confirmDelete"
          >
            Confirm delete</button
          ><button type="button" :disabled="busy" @click="deleting = null">Cancel</button>
        </div>
      </div>
      <div
        v-if="filtered.length && !loading"
        class="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white"
      >
        <table class="w-full text-left text-sm">
          <caption class="sr-only">
            Administrator categories
          </caption>
          <thead class="bg-slate-100">
            <tr>
              <th scope="col" class="p-4">Category</th>
              <th scope="col" class="p-4">Products</th>
              <th scope="col" class="p-4">Visibility</th>
              <th scope="col" class="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="category in filtered" :key="category.id" class="border-t border-slate-200">
              <td class="p-4">
                <div class="flex items-center gap-3">
                  <CategoryIcon :name="category.name" :image="category.imageUrl" />
                  <div>
                    <p class="font-semibold">{{ category.name }}</p>
                    <p class="text-xs text-slate-500">#{{ category.id }}</p>
                  </div>
                </div>
              </td>
              <td class="p-4">{{ category.productCount }}</td>
              <td class="p-4" :class="category.visible ? 'text-emerald-700' : 'text-amber-800'">
                {{ category.visible ? 'Visible' : 'Hidden' }}
              </td>
              <td class="p-4">
                <div class="admin-row-actions flex flex-wrap gap-4">
                  <button
                    type="button"
                    :disabled="busy || showForm"
                    class="font-semibold text-indigo-700 disabled:opacity-50"
                    @click="edit(category.id)"
                  >
                    Edit</button
                  ><button
                    type="button"
                    :disabled="busy || showForm"
                    class="font-semibold text-indigo-700 disabled:opacity-50"
                    @click="toggle(category)"
                  >
                    {{ category.visible ? 'Hide' : 'Show' }}</button
                  ><button
                    type="button"
                    :disabled="busy || showForm"
                    class="font-semibold text-rose-700 disabled:opacity-50"
                    @click="deleting = category"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
