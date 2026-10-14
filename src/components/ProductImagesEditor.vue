<script setup lang="ts">
import { isAxiosError } from 'axios'
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BookCover from '@/components/BookCover.vue'
import AppIcon from '@/components/AppIcon.vue'
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
  <section :aria-busy="busy" class="image-manager md:col-span-2">
    <div class="image-manager-heading">
      <h3>Product images</h3>
      <span>{{ product.images.length }} / 5 images</span>
    </div>
    <p class="mt-2">PNG/JPEG, up to 5 MB each (4096 × 4096 px). Image changes save immediately.</p>
    <p v-if="error" role="alert" class="mt-3 !text-rose-700">{{ error }}</p>
    <p v-if="message" role="status" class="mt-3 !text-emerald-700">{{ message }}</p>
    <ul v-if="product.images.length" class="image-preview-grid" aria-label="Product images">
      <li v-for="(image, index) in product.images" :key="image" class="image-preview-card">
        <BookCover :image="image" :name="`${product.name} image ${index + 1}`" />
        <div class="image-preview-title">
          <strong>{{ index === 0 ? 'Cover image' : `Image ${index + 1}` }}</strong
          ><span>Saved</span>
        </div>
        <div class="image-preview-actions">
          <button
            type="button"
            :disabled="busy"
            :aria-label="`Replace image ${index + 1}`"
            @click="chooseReplacement(index)"
          >
            Replace</button
          ><button
            type="button"
            :disabled="busy"
            :aria-label="`Remove image ${index + 1}`"
            @click="remove(index)"
          >
            Remove
          </button>
        </div>
      </li>
    </ul>
    <div class="image-chooser">
      <span class="image-chooser-icon"><AppIcon name="upload" :size="23" /></span>
      <div class="image-chooser-copy">
        <strong>{{
          replaceIndex !== null
            ? `Replace image ${replaceIndex + 1}`
            : product.images.length >= 5
              ? 'Your gallery is full'
              : 'Add another image'
        }}</strong
        ><small>{{
          product.images.length >= 5 && replaceIndex === null
            ? 'Replace or remove an existing image to make a change.'
            : 'Choose a file, then select Upload to save it.'
        }}</small>
      </div>
      <input
        id="product-image-file"
        ref="input"
        type="file"
        accept="image/png,image/jpeg"
        :disabled="busy || (product.images.length >= 5 && replaceIndex === null)"
        class="image-file-input"
        @change="selectFile"
      />
      <label
        for="product-image-file"
        class="image-choose-button"
        :class="{
          'opacity-40 cursor-not-allowed':
            busy || (product.images.length >= 5 && replaceIndex === null),
        }"
        ><AppIcon name="image" :size="14" />Choose file</label
      >
    </div>
    <div v-if="file" class="image-upload-selection">
      <img :src="preview" alt="Selected image preview" />
      <div class="min-w-0 flex-1">
        <p class="text-xs font-medium">{{ file.name }}</p>
        <p class="mt-1 text-xs text-slate-400">
          {{ (file.size / 1024).toFixed(0) }} KB · Ready to upload
        </p>
      </div>
      <button
        type="button"
        :disabled="busy"
        class="rounded-lg bg-indigo-700 px-3 py-2 text-white disabled:opacity-50"
        @click="upload"
      >
        {{ busy ? 'Uploading…' : replaceIndex === null ? 'Upload image' : 'Save replacement' }}
      </button>
      <button type="button" :disabled="busy" class="text-slate-500" @click="clearSelection">
        Cancel
      </button>
    </div>
    <button
      v-else-if="replaceIndex !== null"
      type="button"
      :disabled="busy"
      class="mt-3 text-slate-500"
      @click="clearSelection"
    >
      Cancel replacement
    </button>
  </section>
</template>
