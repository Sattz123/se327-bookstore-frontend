<script setup lang="ts">
import { storeFaqs } from '@/data/storeInformation'
withDefaults(defineProps<{ limit?: number }>(), { limit: storeFaqs.length })
</script>

<template>
  <div class="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white px-5 sm:px-7">
    <details v-for="faq in storeFaqs.slice(0, limit)" :key="faq.question" class="py-5">
      <summary class="cursor-pointer text-lg font-semibold">{{ faq.question }}</summary>
      <p class="mt-3 leading-relaxed text-slate-600">{{ faq.answer }}</p>
      <RouterLink
        :to="{ name: faq.route }"
        class="mt-3 inline-block font-medium text-indigo-700 underline"
        >{{ faq.link }}</RouterLink
      >
    </details>
  </div>
</template>
