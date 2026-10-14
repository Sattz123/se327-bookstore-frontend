<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

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
  <section class="rounded-lg border border-slate-200 p-4 md:col-span-2">
    <h3 class="text-lg font-semibold">Book images</h3>
    <p class="mt-2 text-sm text-slate-600">
      Choose up to five PNG/JPEG images, each up to 5 MB and 4096 × 4096 pixels. The first image is
      the cover. They will upload when you save the product.
    </p>
    <label for="new-product-images" class="mt-4 block font-medium">Select images</label>
    <input
      id="new-product-images"
      type="file"
      multiple
      accept="image/png,image/jpeg"
      :disabled="modelValue.length >= 5"
      class="mt-2 block max-w-full text-sm"
      @change="select"
    />
    <p v-if="error" role="alert" class="mt-3 text-rose-700">{{ error }}</p>
    <ul v-if="previews.length" class="mt-4 flex flex-wrap gap-4" aria-label="Selected book images">
      <li v-for="(image, index) in previews" :key="image.url" class="w-32">
        <img
          :src="image.url"
          :alt="`Preview of ${image.name}`"
          class="aspect-[3/4] w-full rounded-lg bg-slate-100 object-contain"
        />
        <p class="mt-2 text-sm font-medium">{{ index === 0 ? 'Cover' : `Image ${index + 1}` }}</p>
        <p class="truncate text-xs text-slate-500" :title="image.name">{{ image.name }}</p>
        <button type="button" class="mt-2 text-sm text-rose-700 underline" @click="remove(index)">
          Remove
        </button>
      </li>
    </ul>
  </section>
</template>
