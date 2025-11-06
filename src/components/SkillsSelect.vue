<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  fetcher: { type: Function, required: true },
  creator: { type: Function, required: true },
  label: { type: String, default: 'Skills' },
  placeholder: { type: String, default: 'Search skills (e.g., Laravel)…' },
  max: { type: [Number, null], default: null },
  popularOnFocus: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const q = ref('')
const list = ref([]) // [{id,name}]
const loading = ref(false)
const active = ref(-1)
const creating = ref(false)
const inputRef = ref(null)
const rootRef = ref(null)
let debounceTimer = null

const selected = computed({
  get: () => props.modelValue || [],
  set: (v) => emit('update:modelValue', v)
})

const canAddMore = computed(() => props.max == null || selected.value.length < props.max)

function focusInput() { nextTick(() => inputRef.value?.focus?.()) }
function setOpen(v){ open.value = v; if(v){ active.value = list.value.length?0:-1 } }
function clearInput(){ q.value=''; list.value=[]; active.value=-1; focusInput() }

function normalizeName(s){ return String(s||'').trim().replace(/\s+/g,' ') }
function hasById(id){ return selected.value.some(s=>Number(s.id)===Number(id)) }
function hasByName(name){
  const n = normalizeName(name).toLowerCase();
  return selected.value.some(s=>String(s.name).toLowerCase()===n)
}

function addItem(obj){
  if(!obj || !obj.id) return
  if(!hasById(obj.id)) selected.value = [...selected.value, {id:Number(obj.id), name: obj.name}]
}
function removeId(id){ selected.value = selected.value.filter(s=>Number(s.id)!==Number(id)) }
function clearAll(){ selected.value = [] }

async function searchNow(term){
  loading.value = true
  try{
    const data = await props.fetcher(String(term||''))
    list.value = Array.isArray(data) ? data : []
  }catch(e){ list.value = [] }
  finally{ loading.value = false; active.value = list.value.length?0:-1 }
}

watch(q, (val)=>{
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(()=> searchNow(val), 180)
})

async function onFocus(){
  setOpen(true)
  if(props.popularOnFocus && !q.value){ await searchNow('') }
}

function onArrow(d){ if(!list.value.length) return; active.value = (active.value + d + list.value.length) % list.value.length }

async function createAndAdd(name){
  if(!name || !canAddMore.value) return
  creating.value = true
  try{
    const res = await props.creator(normalizeName(name))
    addItem(res); clearInput(); setOpen(false)
  }catch(e){ /* parent may toast */ }
  finally{ creating.value=false }
}

function onBackspaceWhenEmpty(){
  if(q.value===''){
    const last = selected.value[selected.value.length-1]
    if(last) removeId(last.id)
  }
}

async function onEnter(){
  if(!canAddMore.value) return
  if(active.value>=0 && active.value<list.value.length){ addItem(list.value[active.value]); clearInput(); setOpen(false); return }
  if(q.value.trim()) await createAndAdd(q.value.trim())
}

function onPaste(e){
  const text = (e.clipboardData?.getData('text')||'').trim()
  if(!text) return
  const parts = text.split(/[;,\n]+/).map(normalizeName).filter(Boolean)
  if(parts.length<=1) return
  e.preventDefault()
  ;(async ()=>{
    for(const p of parts){
      if(hasByName(p)) continue
      const hit = (await props.fetcher(p)).find(x=>String(x.name).toLowerCase()===p.toLowerCase())
      if(hit) addItem(hit) 
      else await createAndAdd(p)
      if(!canAddMore.value) break
    }
    clearInput(); setOpen(false)
  })()
}

function onClickOutside(e){ if(rootRef.value && !rootRef.value.contains(e.target)) setOpen(false) }
onMounted(()=> window.addEventListener('mousedown', onClickOutside))
onBeforeUnmount(()=> window.removeEventListener('mousedown', onClickOutside))
</script>

<template>
  <div ref="rootRef">
    <label class="text-sm text-gray-700 flex items-center justify-between">
      <span>{{ label }}</span>
      <span v-if="max" class="text-xs text-gray-400">{{ selected.length }}/{{ max }}</span>
    </label>

    <div class="mt-1 rounded-xl border bg-white focus-within:ring-2 focus-within:ring-indigo-200" role="combobox" aria-expanded="open" aria-haspopup="listbox">
      <div class="flex flex-wrap gap-1 items-center px-2 py-1.5">
        <template v-for="s in selected" :key="s.id">
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs">
            {{ s.name }}
            <button type="button" class="opacity-70 hover:opacity-100" @click="removeId(s.id)" aria-label="Remove">✕</button>
          </span>
        </template>

        <input ref="inputRef" v-model="q" :placeholder="selected.length ? '' : placeholder" class="flex-1 min-w-[8rem] outline-none py-1.5 px-2 text-sm"
               @focus="onFocus" @keydown.down.prevent="onArrow(1)" @keydown.up.prevent="onArrow(-1)" @keydown.esc.prevent="setOpen(false)" @keydown.enter.prevent="onEnter" @keydown.backspace="onBackspaceWhenEmpty" @paste="onPaste" />

        <button v-if="selected.length" type="button" class="text-xs text-rose-600 px-1.5 py-1" @click="clearAll()">Clear all</button>
      </div>

      <div v-show="open" class="relative">
        <div class="absolute z-10 left-0 right-0 mt-1 rounded-xl border bg-white shadow-sm overflow-hidden" role="listbox">
          <div v-if="loading" class="py-6 text-center text-sm text-gray-500">Searching…</div>

          <template v-else>
            <template v-if="list.length">
              <ul class="max-h-60 overflow-auto py-1">
                <li v-for="(row,i) in list" :key="row.id" class="px-3 py-2 text-sm cursor-pointer flex items-center justify-between" :class="i===active ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'" @mousedown.prevent="addItem(row); clearInput(); setOpen(false)">
                  <span>{{ row.name }}</span>
                  <span v-if="hasById(row.id)" class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Added</span>
                </li>
              </ul>
            </template>

            <div v-else class="p-3 text-sm text-gray-500">No matches</div>

            <div v-if="q && !loading && canAddMore && !hasByName(q)" class="border-t px-3 py-2 flex items-center justify-between">
              <span class="text-sm">Create “{{ q }}”</span>
              <button type="button" class="px-2 py-1 rounded bg-emerald-600 text-white text-xs" :disabled="creating" @mousedown.prevent="createAndAdd(q)">{{ creating ? 'Adding…' : 'Add' }}</button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <p class="mt-1 text-xs text-gray-500">Tip: Press Enter to select. Paste comma-separated skills to add many at once.</p>
  </div>
</template>
