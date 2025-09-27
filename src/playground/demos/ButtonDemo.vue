<template>
  <div class="space-y-6">
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <button class="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700">Primary</button>
      <button class="px-4 py-2 rounded-xl bg-neutral-900 text-white hover:bg-black">Dark</button>
      <button class="px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100">
        Outline
      </button>
      <button class="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
        Success
      </button>
      <button class="px-4 py-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600">
        Warning
      </button>
      <button class="px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700">Danger</button>
    </div>

    <div class="space-y-2">
      <p class="text-sm text-neutral-500">Sizes</p>
      <div class="flex items-center gap-3 flex-wrap">
        <button class="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs">XS</button>
        <button class="px-3.5 py-2 rounded-lg bg-blue-600 text-white text-sm">SM</button>
        <button class="px-4 py-2.5 rounded-xl bg-blue-600 text-white">MD</button>
        <button class="px-5 py-3 rounded-xl bg-blue-600 text-white text-lg">LG</button>
      </div>
    </div>

    <div class="space-y-2">
      <p class="text-sm text-neutral-500">Disabled / Loading</p>
      <div class="flex items-center gap-3 flex-wrap">
        <button disabled class="px-4 py-2 rounded-xl bg-blue-600/50 text-white cursor-not-allowed">
          Disabled
        </button>
        <button class="px-4 py-2 rounded-xl bg-blue-600 text-white inline-flex items-center gap-2">
          <span class="animate-spin">⏳</span>
          Loading
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const meta = {
  title: 'Buttons',
  tags: ['button', 'actions', 'inputs'],
}
</script>
