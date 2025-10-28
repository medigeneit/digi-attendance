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

function onClickOutside(e) {
  const root = wrapper.value
  if (root && !root.contains(e.target)) open.value = false
}
const wrapper = ref(null)
onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="wrapper" class="relative">
    <!-- Selected chip -->
    <div v-if="modelValue" class="mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1">
      <span class="text-sm">{{ display?.name || ('User #'+modelValue) }}</span>
      <span class="text-[11px] text-slate-500">{{ display?.dept || '' }}</span>
      <button @click="clearSel" class="text-xs px-2 py-0.5 rounded border hover:bg-slate-50">Clear</button>
    </div>

    <!-- Input -->
    <input
      :placeholder="placeholder"
      class="border rounded-lg px-3 py-2 w-[28rem] max-w-full"
      v-model="q"
      @focus="onFocus"
      @input="debouncedSearch"
      @keydown="onKey"
    />

    <!-- Options -->
    <div v-if="open" class="absolute left-0 mt-1 border bg-white rounded-lg shadow max-h-56 overflow-auto w-[28rem] max-w-[90vw] z-20">
      <div v-if="loading" class="px-3 py-2 text-slate-500 text-sm">Searching…</div>
      <template v-else>
        <button v-for="(u,i) in opts" :key="u.id"
                @click="select(u)"
                :class="['flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50', i===active ? 'bg-slate-50' : '']">
          <span v-html="highlight(u.name, q)"></span>
          <span class="text-[11px] text-slate-500">{{ u.id || 'N/A' }}</span>
        </button>
        <div v-if="!opts.length" class="px-3 py-2 text-slate-400 text-sm">No results</div>
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
