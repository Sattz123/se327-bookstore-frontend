<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { resolveImageUrl } from '@/utils/catalog'
const props = defineProps<{ name: string; image?: string | null }>()
const failed = ref(false)
const url = computed(() => resolveImageUrl(props.image ?? undefined))
watch(url, () => {
  failed.value = false
})
</script>

<template>
  <span
    aria-hidden="true"
    class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-xl text-indigo-800"
  >
    <img
      v-if="url && !failed"
      :src="url"
      alt=""
      loading="lazy"
      class="h-full w-full object-cover"
      @error="failed = true"
    />
    <span v-else>{{ name.charAt(0) }}</span>
  </span>
</template>
