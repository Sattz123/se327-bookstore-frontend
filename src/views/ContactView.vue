<script setup lang="ts">
import StoreFaqList from '@/components/StoreFaqList.vue'
import { storeContact } from '@/data/storeInformation'
</script>

<template>
  <section>
    <h1 class="text-3xl font-bold sm:text-4xl">Contact the store</h1>
    <p class="mt-3 text-slate-600">
      Questions about a book or an order? Get in touch with InwZa Bookstore.
    </p>
    <div class="mt-8 grid gap-6 md:grid-cols-2">
      <div class="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <h2 class="text-xl font-semibold">Get in touch</h2>
        <dl class="mt-6 space-y-6">
          <div>
            <dt class="font-semibold">Address</dt>
            <dd class="mt-1 text-slate-600">
              <address class="not-italic">{{ storeContact.address }}</address>
            </dd>
          </div>
          <div>
            <dt class="font-semibold">Phone</dt>
            <dd class="mt-1">
              <a :href="`tel:${storeContact.telephone}`" class="text-indigo-700 underline">{{
                storeContact.phone
              }}</a>
              <p class="mt-1 text-sm text-slate-600">{{ storeContact.hours }}</p>
            </dd>
          </div>
          <div>
            <dt class="font-semibold">Email</dt>
            <dd class="mt-1">
              <a
                :href="`mailto:${storeContact.email}`"
                class="break-all text-indigo-700 underline"
                >{{ storeContact.email }}</a
              >
            </dd>
          </div>
        </dl>
        <p class="mt-6 text-sm text-slate-500">
          These are sample contact details from the bookstore demo. For an order question, include
          your order number and keep passwords and card details private.
        </p>
      </div>
      <section
        class="min-w-0 rounded-xl border border-slate-200 bg-white p-5"
        aria-labelledby="location-heading"
      >
        <h2 id="location-heading" class="text-xl font-semibold">Store location</h2>
        <iframe
          :src="storeContact.mapEmbed"
          title="Map of the store address in Sydney"
          loading="lazy"
          referrerpolicy="no-referrer"
          class="mt-4 h-72 w-full rounded-lg border-0"
        />
        <a
          :href="storeContact.mapUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-4 inline-block text-indigo-700 underline"
          >Open map in a new tab</a
        >
      </section>
    </div>
    <h2 class="mt-10 text-2xl font-bold">Order questions</h2>
    <div class="mt-5"><StoreFaqList :limit="2" /></div>
    <RouterLink
      :to="{ name: 'faq' }"
      class="mt-5 inline-block font-semibold text-indigo-700 underline"
      >Read all frequently asked questions</RouterLink
    >
  </section>
</template>
