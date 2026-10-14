<script setup lang="ts">
import { isAxiosError } from 'axios'
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BookCover from '@/components/BookCover.vue'
import { AdminProductService } from '@/services/AdminProductService'
import { useAuthStore } from '@/stores/auth'
import type { AdminProduct } from '@/types/adminProduct'

const props = defineProps<{ product: AdminProduct }>()
const emit = defineEmits<{ updated: [product: AdminProduct]; busy: [value: boolean] }>()
const auth = useAuthStore()
const router = useRouter()
const busy = ref(false)
const error = ref('')
const message = ref('')
const file = ref<File | null>(null)
const input = ref<HTMLInputElement | null>(null)
const preview = ref('')
const replaceIndex = ref<number | null>(null)
let epoch = 0

function clearSelection() {
  if (preview.value) window.URL.revokeObjectURL(preview.value)
  preview.value = ''
  file.value = null
  replaceIndex.value = null
  if (input.value) input.value.value = ''
}
function selectFile(event: Event) {
  const selected = (event.target as HTMLInputElement).files?.[0]
  if (preview.value) window.URL.revokeObjectURL(preview.value)
  preview.value = ''
  file.value = null
  error.value = ''
  message.value = ''
  if (!selected) return
  if (
    !['image/png', 'image/jpeg'].includes(selected.type) ||
    selected.size < 1 ||
    selected.size > 5 * 1024 * 1024
  ) {
    error.value = 'Choose a PNG or JPEG file no larger than 5 MB.'
    return
  }
  file.value = selected
  preview.value = window.URL.createObjectURL(selected)
}
async function chooseReplacement(index: number) {
  clearSelection()
  error.value = ''
  message.value = ''
  replaceIndex.value = index
  await nextTick()
  input.value?.click()
}
async function mutate(operation: () => Promise<AdminProduct>, success: string) {
  if (busy.value) return
  const session = epoch
  busy.value = true
  emit('busy', true)
  error.value = ''
  message.value = ''
  try {
    const product = await operation()
    if (session !== epoch) return
    emit('updated', product)
    clearSelection()
    message.value = success
  } catch (cause) {
    if (session !== epoch) return
    if (isAxiosError<{ detail?: string }>(cause)) {
      if (cause.response?.status === 401) {
        auth.clearAuth()
        return
      }
      if (cause.response?.status === 403) {
        void router.replace({ name: 'forbidden' })
        return
      }
      error.value = cause.response?.data?.detail || 'Image update failed. Please try again.'
    } else error.value = 'Unable to upload or update the image. Please try again.'
  } finally {
    if (session === epoch) {
      busy.value = false
      emit('busy', false)
    }
  }
}
async function upload() {
  if (!file.value || busy.value) return
  const selected = file.value
  const index = replaceIndex.value ?? undefined
  await mutate(
    () => AdminProductService.uploadImage(props.product.id, selected, props.product.version, index),
    index === undefined ? 'Image added.' : 'Image replaced.',
  )
}
function remove(index: number) {
  return mutate(
    () => AdminProductService.removeImage(props.product.id, index, props.product.version),
    'Image removed.',
  )
}
watch(
  () => props.product.id,
  () => {
    epoch++
    clearSelection()
    error.value = ''
    message.value = ''
  },
)
onBeforeUnmount(() => {
  epoch++
  clearSelection()
  emit('busy', false)
})
</script>

<template>
  <section :aria-busy="busy" class="rounded-lg border border-slate-200 p-4 md:col-span-2">
    <h3 class="text-lg font-semibold">Book images</h3>
    <p class="mt-2 text-sm text-slate-600">
      PNG or JPEG, up to 5 MB and 4096 × 4096 pixels. Maximum five images. The first image is the
      cover. Image changes are saved immediately.
    </p>
    <p v-if="error" role="alert" class="mt-3 text-rose-700">{{ error }}</p>
    <p v-if="message" role="status" class="mt-3 text-emerald-700">{{ message }}</p>
    <ul v-if="product.images.length" class="mt-4 flex flex-wrap gap-4" aria-label="Product images">
      <li v-for="(image, index) in product.images" :key="image" class="w-32">
        <BookCover :image="image" :name="`${product.name} image ${index + 1}`" />
        <p class="mt-2 text-sm font-medium">{{ index === 0 ? 'Cover' : `Image ${index + 1}` }}</p>
        <div class="mt-2 flex gap-3 text-sm">
          <button
            type="button"
            :disabled="busy"
            class="text-indigo-700 underline"
            @click="chooseReplacement(index)"
          >
            Replace</button
          ><button
            type="button"
            :disabled="busy"
            class="text-rose-700 underline"
            @click="remove(index)"
          >
            Remove
          </button>
        </div>
      </li>
    </ul>
    <p v-else class="mt-4 text-sm text-slate-600">No images yet.</p>
    <div class="mt-5 space-y-3">
      <label for="product-image-file" class="block font-medium">{{
        replaceIndex === null ? 'Add image' : `Replace image ${replaceIndex + 1}`
      }}</label>
      <input
        id="product-image-file"
        ref="input"
        type="file"
        accept="image/png,image/jpeg"
        :disabled="busy || (product.images.length >= 5 && replaceIndex === null)"
        class="block max-w-full text-sm"
        @change="selectFile"
      />
      <img
        v-if="preview"
        :src="preview"
        alt="Selected image preview"
        class="max-h-48 max-w-48 rounded-lg object-contain"
      />
      <div class="flex gap-4">
        <button
          type="button"
          :disabled="busy || !file"
          class="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          @click="upload"
        >
          {{
            busy ? 'Saving image…' : replaceIndex === null ? 'Upload image' : 'Replace image'
          }}</button
        ><button
          v-if="file || replaceIndex !== null"
          type="button"
          :disabled="busy"
          class="text-sm font-semibold text-slate-600"
          @click="clearSelection"
        >
          Clear selection
        </button>
      </div>
      <p v-if="product.images.length >= 5 && replaceIndex === null" class="text-sm text-slate-600">
        The gallery is full. Replace or remove an image to change it.
      </p>
    </div>
  </section>
</template>
