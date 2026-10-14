<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { Category } from '@/types/catalog'
import CategoryIcon from '@/components/CategoryIcon.vue'
import AppIcon from '@/components/AppIcon.vue'

defineProps<{ categories: Category[] }>()
</script>

<template>
  <ul aria-label="Book categories" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <li v-for="category in categories" :key="category.id">
      <RouterLink
        :to="{ name: 'category-products', params: { id: category.id } }"
        class="category-tile"
      >
        <CategoryIcon :name="category.name" :image="category.imageUrl" />
        <span>{{ category.name }}</span>
        <AppIcon name="arrow" :size="20" />
      </RouterLink>
    </li>
  </ul>
</template>
