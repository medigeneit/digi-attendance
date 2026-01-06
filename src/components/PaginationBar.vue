<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: { type: Number, default: 1 },
  perPage: { type: Number, default: 15 },
  total: { type: Number, default: 0 },
  lastPage: { type: Number, default: 1 },
})

const emit = defineEmits(['page-change'])

const showingFrom = computed(() =>
  props.total === 0 ? 0 : (props.page - 1) * props.perPage + 1
)
const showingTo = computed(() =>
  props.total === 0 ? 0 : Math.min(props.total, props.page * props.perPage)
)

const pageNumbers = computed(() => {
  const total = Math.max(1, Number(props.lastPage || 1))
  const current = Math.min(total, Math.max(1, Number(props.page || 1)))
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  let start = Math.max(1, current - 3)
  let end = start + 6
  if (end > total) {
    end = total
    start = end - 6
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

const goToPage = (page) => emit('page-change', page)
</script>

<template>
  <div class="flex flex-col items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm md:flex-row">
    <div class="text-zinc-600">
      Showing {{ showingFrom }}-{{ showingTo }} of {{ total }}
    </div>

    <div class="flex items-center gap-1">
      <button
        type="button"
        class="h-8 rounded-md border border-zinc-300 px-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
        :disabled="page <= 1"
        @click="goToPage(page - 1)"
      >
        Prev
      </button>

      <button
        v-for="n in pageNumbers"
        :key="n"
        type="button"
        class="h-8 w-8 rounded-md border text-xs font-semibold"
        :class="n === page ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50'"
        @click="goToPage(n)"
      >
        {{ n }}
      </button>

      <button
        type="button"
        class="h-8 rounded-md border border-zinc-300 px-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
        :disabled="page >= lastPage"
        @click="goToPage(page + 1)"
      >
        Next
      </button>
    </div>
  </div>
</template>
