<template>
  <div class="grid sm:grid-cols-2 gap-6">
    <article
      class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden"
    >
      <header class="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <h3 class="font-semibold">Simple card</h3>
        <p class="text-sm text-neutral-500">Header + content + footer</p>
      </header>
      <div class="p-4">
        <p>
          Tailwind card with balanced padding and subtle borders. Use this as a base for lists,
          settings, or dashboards.
        </p>
      </div>
      <footer class="p-4 border-t border-neutral-200 dark:border-neutral-800 text-right">
        <button class="px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100">
          Cancel
        </button>
        <button class="ml-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700">
          Save
        </button>
      </footer>
    </article>

    <article
      class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 p-6"
    >
      <h3 class="font-semibold mb-1">Elevated card</h3>
      <p class="text-sm text-neutral-500 mb-4">With shadow and gradient surface</p>
      <ul class="space-y-2 text-sm">
        <li>• Clean corners (rounded-2xl)</li>
        <li>• Soft shadow (shadow-sm)</li>
        <li>• High‑contrast in dark mode</li>
      </ul>
    </article>
  </div>
</template>

<script setup></script>
