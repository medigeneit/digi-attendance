<template>
  <div>
    <div class="inline-flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
      <button
        v-for="t in tabs"
        :key="t"
        class="px-4 py-2 rounded-lg text-sm"
        :class="
          active === t
            ? 'bg-white dark:bg-neutral-900 shadow border border-neutral-200 dark:border-neutral-700'
            : 'opacity-70'
        "
        @click="active = t"
      >
        {{ t }}
      </button>
    </div>

    <div class="mt-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
      <p class="text-sm text-neutral-500 mb-2">
        Active tab:
        <span class="font-medium text-neutral-800 dark:text-neutral-200">{{ active }}</span>
      </p>
      <p>
        This is a minimal tabs pattern using local state only. Replace with your own components when
        needed.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const meta = { title: 'Tabs', tags: ['tabs', 'navigation'] }
const tabs = ['General', 'Billing', 'Team']
const active = ref(tabs[0])
</script>
