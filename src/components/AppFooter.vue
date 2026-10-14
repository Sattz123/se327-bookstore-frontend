<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { storeContact } from '@/data/storeInformation'
const year = new Date().getFullYear()
</script>

<template>
  <footer class="store-footer">
    <div class="footer-columns">
      <div class="footer-intro">
        <RouterLink :to="{ name: 'home' }" class="store-wordmark"
          ><span>InwZa</span><small>BOOKSTORE</small></RouterLink
        >
        <p>A good book is a good beginning.<br />Find your next one with us.</p>
      </div>
      <div>
        <h2>Visit us</h2>
        <address>{{ storeContact.address }}</address>
        <p>{{ storeContact.hours }}</p>
      </div>
      <div>
        <h2>Get in touch</h2>
        <a :href="`mailto:${storeContact.email}`">{{ storeContact.email }}</a
        ><a :href="`tel:${storeContact.telephone}`">{{ storeContact.phone }}</a
        ><RouterLink :to="{ name: 'contact' }">Contact us</RouterLink>
      </div>
      <nav aria-label="Footer navigation">
        <h2>Explore</h2>
        <RouterLink :to="{ name: 'products' }">Browse books</RouterLink
        ><RouterLink :to="{ name: 'categories' }">Categories</RouterLink
        ><RouterLink :to="{ name: 'faq' }">FAQ</RouterLink
        ><RouterLink :to="{ name: 'store-information' }">Store information and terms</RouterLink>
      </nav>
    </div>
    <div class="footer-bottom">
      <p>&copy; {{ year }} InwZa Bookstore.</p>
      <p>Made for the love of reading.</p>
    </div>
  </footer>
</template>
