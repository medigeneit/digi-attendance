<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: [Number, null], default: null },     // selected user id
  display:    { type: Object, default: () => ({ name: null, dept: null }) }, // {name, dept}
  placeholder:{ type: String, default: 'Search user…' },
  fetcher:    { type: Function, required: true },          // (params) => Promise<User[]>
  laneKey:    { type: String, default: null },
  departmentId:{ type: [Number, null], default: null },
  limit:      { type: Number, default: 20 },
})

const emit = defineEmits(['update:modelValue','update:display','cleared'])

const open = ref(false)
const q = ref('')
const opts = ref([])
const loading = ref(false)
const active = ref(-1)
let timer = null

async function runSearch() {
  loading.value = true
  const list = await props.fetcher({
    q: q.value,
    lane_key: props.laneKey,
    limit: props.limit
  })
  opts.value = list
  loading.value = false
  active.value = list.length ? 0 : -1
}

function debouncedSearch() {
  clearTimeout(timer)
  timer = setTimeout(runSearch, 250)
}

function onFocus() {
  open.value = true
  if (!q.value) debouncedSearch()
}

function onKey(e) {
  if (!open.value) return
  const n = opts.value.length
  if (e.key === 'ArrowDown') { e.preventDefault(); if (n) active.value = (active.value+1) % n }
  else if (e.key === 'ArrowUp') { e.preventDefault(); if (n) active.value = (active.value-1+n) % n }
  else if (e.key === 'Enter') { e.preventDefault(); if (n && active.value>=0) select(opts.value[active.value]) }
  else if (e.key === 'Escape') { open.value = false }
}

function select(u) {
  emit('update:modelValue', u.id)
  emit('update:display', { name: u.name, dept: u.department_name || null })
  open.value = false
  q.value = ''
  opts.value = []
}

function clearSel() {
  emit('update:modelValue', null)
  emit('update:display', { name: null, dept: null })
  emit('cleared')
}

function clearQuery() {
  q.value = ''
  opts.value = []
  active.value = -1
  if (open.value) debouncedSearch()
}

function onClickOutside(e) {
  const root = wrapper.value
  if (root && !root.contains(e.target)) open.value = false
}
const wrapper = ref(null)
onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="wrapper" class="relative w-full max-w-xl">
    <!-- Selected chip -->
    <div v-if="modelValue" class="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
      <span class="text-sm font-medium text-slate-800">{{ display?.name || ('User #'+modelValue) }}</span>
      <span class="text-[11px] text-slate-500">{{ display?.dept || '' }}</span>
      <button @click="clearSel" class="text-xs px-2 py-0.5 rounded-full border border-slate-200 hover:bg-white">Clear</button>
    </div>

    <!-- Input -->
    <div class="relative">
      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        <i class="far fa-search"></i>
      </span>
      <input
        :placeholder="placeholder"
        class="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-10 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        v-model="q"
        @focus="onFocus"
        @input="debouncedSearch"
        @keydown="onKey"
      />
      <button
        v-if="q"
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
        @click="clearQuery"
      >
        Clear
      </button>
      <span
        v-if="loading"
        class="absolute top-1/2 -translate-y-1/2 text-slate-400"
        :class="q ? 'right-8' : 'right-2'"
      >
        <i class="fas fa-spinner fa-spin"></i>
      </span>
    </div>

    <!-- Options -->
    <div v-if="open" class="absolute left-0 mt-2 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-64 overflow-auto z-20">
      <div class="flex items-center justify-between px-3 py-2 text-xs text-slate-500">
        <span>Results</span>
        <span v-if="opts.length">{{ opts.length }}</span>
      </div>
      <div v-if="loading" class="px-3 py-2 text-slate-500 text-sm">Searching???</div>
      <template v-else>
        <button v-for="(u,i) in opts" :key="u.id"
                @click="select(u)"
                :class="['flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50', i===active ? 'bg-slate-50' : '']">
          <div class="min-w-0">
            <div class="truncate text-sm font-medium text-slate-800" v-html="highlight(u.name, q)"></div>
            <div class="truncate text-[11px] text-slate-500">{{ u.department_name || 'Unknown department' }}</div>
          </div>
          <span class="text-[11px] text-slate-400">#{{ u.id || 'N/A' }}</span>
        </button>
        <div v-if="!opts.length" class="px-3 py-3 text-slate-400 text-sm">No results</div>
      </template>
    </div>
  </div>
</template>

<script>
export function highlight(text, q) {
  if (!q) return text
  try {
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig')
    return text?.replace(re, '<mark>$1</mark>') ?? ''
  } catch { return text }
}
</script>
