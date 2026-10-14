<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
</script>

<template>
  <section>
    <h1 class="text-3xl font-bold text-slate-900">Administrator overview</h1>
    <p class="mt-3 text-slate-600">
      Welcome, {{ auth.currentUser?.username }}. You are signed in to the bookstore back office.
    </p>
    <div class="mt-7 max-w-xl rounded-xl border border-slate-200 bg-white p-6">
      <h2 class="text-xl font-semibold">Your account</h2>
      <dl class="mt-4 space-y-4">
        <div>
          <dt class="text-sm text-slate-500">Email</dt>
          <dd class="mt-1 break-words">{{ auth.currentUser?.email }}</dd>
        </div>
        <div>
          <dt class="text-sm text-slate-500">Access</dt>
          <dd class="mt-1 font-medium text-indigo-800">Administrator</dd>
        </div>
      </dl>
    </div>
  </section>
</template>
