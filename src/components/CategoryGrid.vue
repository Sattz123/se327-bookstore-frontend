<script setup lang="ts">
import { computed, reactive } from 'vue'
import { RouterLink } from 'vue-router'
import type { Category } from '@/types/catalog'
import AppIcon from '@/components/AppIcon.vue'
import { categoryPresentation } from '@/utils/categories'

const props = withDefaults(
  defineProps<{ categories: Category[]; variant?: 'photo' | 'collection' }>(),
  { variant: 'photo' },
)
const failedImages = reactive(new Set<number>())
const order = ['fiction', 'nonfiction', 'children', 'mystery', 'science', 'other']
const cards = computed(() =>
  props.categories
    .map((category) => ({ ...category, ...categoryPresentation(category.name) }))
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)),
)
const topCards = computed(() =>
  cards.value.filter((card) => ['fiction', 'nonfiction', 'children'].includes(card.kind)),
)
const deepCards = computed(() =>
  cards.value.filter((card) => !['fiction', 'nonfiction', 'children'].includes(card.kind)),
)
</script>

<template>
  <ul v-if="variant === 'photo'" aria-label="Book categories" class="category-photos">
    <li v-for="card in cards" :key="card.id">
      <RouterLink
        :to="{ name: 'category-products', params: { id: card.id } }"
        class="category-photo"
        :class="`category-${card.kind}`"
      >
        <img
          v-if="card.image && !failedImages.has(card.id)"
          :src="`/images/categories/${card.image}.jpg`"
          alt=""
          loading="lazy"
          @error="failedImages.add(card.id)"
        />
        <AppIcon v-else :name="card.icon" :size="70" />
        <span class="category-photo-copy"
          ><strong>{{ card.name }}</strong
          ><span>Explore <AppIcon name="arrow" :size="14" /></span
        ></span>
      </RouterLink>
    </li>
  </ul>
  <div v-else class="category-collection">
    <template v-if="topCards.length">
      <div class="store-section-heading">
        <span>Browse</span>
        <h2>Explore our collection</h2>
        <p>Find the perfect book in every genre we offer.</p>
      </div>
      <ul
        aria-label="Book categories"
        class="category-features"
        :class="{ 'has-children': topCards.some((card) => card.kind === 'children') }"
      >
        <li v-for="card in topCards" :key="card.id" :class="`feature-${card.kind}`">
          <RouterLink
            :to="{ name: 'category-products', params: { id: card.id } }"
            class="category-feature"
            :class="`category-${card.kind}`"
          >
            <div class="category-feature-copy">
              <template v-if="card.kind === 'children'"
                ><span>{{ card.name }}</span>
                <h2>{{ card.description }}</h2></template
              >
              <template v-else
                ><h2>{{ card.name }}</h2>
                <p>{{ card.description }}</p></template
              >
              <span class="category-browse">Browse <AppIcon name="arrow" :size="14" /></span>
            </div>
            <div class="category-art"><AppIcon :name="card.icon" :size="80" /></div>
          </RouterLink>
        </li>
      </ul>
    </template>
    <template v-if="deepCards.length">
      <div class="store-section-heading category-discover-heading">
        <span>Discover</span>
        <h2>
          {{
            deepCards.some((card) => card.kind === 'mystery')
              ? 'Deep dives into mystery'
              : 'More to discover'
          }}
        </h2>
        <p>Follow your curiosity and find a new favorite.</p>
      </div>
      <ul
        :aria-label="topCards.length ? 'More book categories' : 'Book categories'"
        class="category-discover"
      >
        <li v-for="card in deepCards" :key="card.id">
          <RouterLink
            :to="{ name: 'category-products', params: { id: card.id } }"
            class="category-discover-card"
          >
            <div class="category-art" :class="`category-${card.kind}`">
              <AppIcon :name="card.icon" :size="80" />
            </div>
            <div class="category-discover-copy">
              <h2>{{ card.name }}</h2>
              <p>{{ card.description }}</p>
              <span v-if="card.tags.length" class="category-tags"
                ><span v-for="tag in card.tags" :key="tag">{{ tag }}</span></span
              >
              <span class="category-browse">Browse <AppIcon name="arrow" :size="14" /></span>
            </div>
          </RouterLink>
        </li>
      </ul>
    </template>
  </div>
</template>
