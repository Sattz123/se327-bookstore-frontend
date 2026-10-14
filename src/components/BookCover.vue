<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { resolveImageUrl } from '@/utils/catalog'

const props = defineProps<{ image?: string; name: string }>()
const failed = ref(false)
const imageUrl = computed(() => resolveImageUrl(props.image))
watch(imageUrl, () => (failed.value = false))
</script>

<template>
  <div
    class="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-slate-100"
  >
    <img
      v-if="imageUrl && !failed"
      :src="imageUrl"
      :alt="name"
      loading="lazy"
      class="h-full w-full object-contain"
      @error="failed = true"
    />
    <span v-else class="px-4 text-center text-sm text-slate-500">Cover unavailable</span>
  </div>
</template>
