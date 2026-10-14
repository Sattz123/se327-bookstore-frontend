<script setup lang="ts">
import { RouterLink } from 'vue-router'
import BookCover from '@/components/BookCover.vue'
import type { Product } from '@/types/catalog'
import { formatPrice } from '@/utils/catalog'

defineProps<{ product: Product }>()
</script>

<template>
  <article
    class="h-full rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-md"
  >
    <RouterLink
      :to="{ name: 'product-detail', params: { id: product.id } }"
      class="flex h-full flex-col rounded-xl p-4"
    >
      <BookCover :image="product.images[0]" :name="product.name" />
      <p class="mt-4 text-xs font-semibold tracking-wide text-indigo-700">
        {{ product.category.name }}
      </p>
      <h2 class="mt-2 text-lg leading-snug font-semibold">{{ product.name }}</h2>
      <p class="mt-1 text-sm text-slate-600">{{ product.author || 'Unknown author' }}</p>
      <div class="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
        <p class="font-bold text-indigo-800">{{ formatPrice(product.price) }}</p>
        <p v-if="product.stockQuantity === 0" class="text-xs font-medium text-slate-500">
          Out of stock
        </p>
      </div>
    </RouterLink>
  </article>
</template>
