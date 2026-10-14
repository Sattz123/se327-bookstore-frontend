<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps<{ modelValue: File[] }>()
const emit = defineEmits<{ 'update:modelValue': [files: File[]] }>()
const previews = ref<{ name: string; url: string }[]>([])
const error = ref('')

function releasePreviews() {
  for (const image of previews.value) window.URL.revokeObjectURL(image.url)
  previews.value = []
}
watch(
  () => props.modelValue,
  (files) => {
    releasePreviews()
    previews.value = files.map((file) => ({
      name: file.name,
      url: window.URL.createObjectURL(file),
    }))
  },
  { immediate: true },
)

function select(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  error.value = ''
  if (props.modelValue.length + files.length > 5) {
    error.value = 'Choose up to five images in total.'
    return
  }
  if (
    files.some(
      (file) =>
        !['image/png', 'image/jpeg'].includes(file.type) ||
        file.size < 1 ||
        file.size > 5 * 1024 * 1024,
    )
  ) {
    error.value = 'Each image must be a PNG or JPEG no larger than 5 MB.'
    return
  }
  emit('update:modelValue', [...props.modelValue, ...files])
}
function remove(index: number) {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, position) => position !== index),
  )
  error.value = ''
}
onBeforeUnmount(releasePreviews)
</script>

<template>
  <section class="image-manager md:col-span-2">
    <div class="image-manager-heading">
      <h3>Product images</h3>
      <span>{{ modelValue.length }} / 5 images</span>
    </div>
    <p class="mt-2">
      PNG/JPEG, up to 5 MB each (4096 × 4096 px). Images upload when you save the product.
    </p>
    <div class="image-chooser">
      <span class="image-chooser-icon"><AppIcon name="image" :size="23" /></span>
      <div class="image-chooser-copy">
        <strong>{{
          modelValue.length >= 5 ? 'All five image slots are filled' : 'Choose images for this book'
        }}</strong
        ><small>{{
          modelValue.length
            ? 'The first image will be used as the cover.'
            : 'You can select more than one image.'
        }}</small>
      </div>
      <input
        id="new-product-images"
        type="file"
        multiple
        accept="image/png,image/jpeg"
        :disabled="modelValue.length >= 5"
        class="image-file-input"
        @change="select"
      />
      <label
        for="new-product-images"
        class="image-choose-button"
        :class="{ 'opacity-40 cursor-not-allowed': modelValue.length >= 5 }"
        ><AppIcon name="upload" :size="14" />Choose images</label
      >
    </div>
    <p v-if="error" role="alert" class="mt-3 !text-rose-700">{{ error }}</p>
    <ul v-if="previews.length" class="image-preview-grid" aria-label="Selected book images">
      <li v-for="(image, index) in previews" :key="image.url" class="image-preview-card">
        <img :src="image.url" :alt="`Preview of ${image.name}`" />
        <div class="image-preview-title">
          <strong>{{ index === 0 ? 'Cover image' : `Image ${index + 1}` }}</strong
          ><span>Ready</span>
        </div>
        <p class="image-preview-filename" :title="image.name">{{ image.name }}</p>
        <div class="image-preview-actions">
          <button type="button" :aria-label="`Remove ${image.name}`" @click="remove(index)">
            Remove
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>
