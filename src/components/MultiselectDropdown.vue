<template>
  <div class="w-full">
    <div class="mb-2 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <slot name="label">
          <p v-if="labelText" class="text-sm font-semibold text-slate-600">{{ labelText }}</p>
        </slot>
        <p v-if="labelHint" class="text-xs text-slate-400">{{ labelHint }}</p>
      </div>
      <div class="flex items-center gap-2">
        <span
          v-if="summaryLabel"
          class="whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500"
        >
          {{ summaryLabel }}
        </span>
        <button
          v-if="clearable && hasValue"
          type="button"
          class="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:opacity-50"
          @click="clearSelection()"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M10 8.586l4.95-4.95a1 1 0 1 1 1.414 1.414L11.414 10l4.95 4.95a1 1 0 0 1-1.414 1.414L10 11.414l-4.95 4.95a1 1 0 1 1-1.414-1.414L8.586 10l-4.95-4.95A1 1 0 1 1 5.05 3.636L10 8.586z"
              clip-rule="evenodd"
            />
          </svg>
          Clear
        </button>
      </div>
    </div>

    <div class="relative" :style="dropdownStyle">
      <label class="top-label -top-1">{{ topLabel }}</label>
      <Multiselect
        v-model="selectedValue"
        :options="options"
        :multiple="multiple"
        :track-by="trackBy"
        :label="label"
        :searchable="searchable"
        :clear-on-select="clearOnSelect"
        :close-on-select="!multiple"
        :allow-empty="true"
        :internal-search="true"
        :loading="loading"
        :show-no-results="true"
        :max-height="maxHeight"
        :placeholder="placeholder"
        :disabled="disabled"
        @select="(opt, val) => emit('select', opt, val)"
        @remove="(opt, val) => emit('remove', opt, val)"
        @open="handleOpen"
        @close="handleClose"
        @search-change="handleSearchChange"
        class="w-full"
        :class="[
          'smart-multi',
          sizeClass,
          stateClass,
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
        ]"
      >
        <!-- Caret -->
        <!-- <template #caret>
          <svg class="h-4 w-4 text-gray-500 mr-2 transition-transform"
               :class="{ 'rotate-180': isOpenHint }"
               viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 12a1 1 0 0 1-.7-.29l-4-4a1 1 0 1 1 1.4-1.42L10 9.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-4 4A1 1 0 0 1 10 12z" clip-rule="evenodd"/>
          </svg>
        </template> -->

        <!-- Custom SEARCH with magnifier + clear (×) -->
        <template #search="{ search, attributes, events }">
          <div
            class="sticky top-0 z-10 border-b border-gray-100 bg-white/95 px-2 pt-2 pb-2 backdrop-blur supports-[backdrop-filter]:bg-white/80"
          >
            <div class="relative">
              <svg
                class="absolute left-2 top-2.5 h-4 w-4 text-gray-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M13.293 14.707a8 8 0 1 1 1.414-1.414l3.5 3.5a1 1 0 0 1-1.414 1.414l-3.5-3.5zM8 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"
                  clip-rule="evenodd"
                />
              </svg>
              <input
                class="w-full pl-8 pr-8 py-1 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                v-bind="attributes"
                v-on="events"
                :placeholder="searchPlaceholder || 'Search...'"
              />
              <button
                v-if="search"
                type="button"
                class="absolute right-2 top-2 h-6 w-6 inline-flex items-center justify-center rounded hover:bg-gray-100"
                @click.stop="events.input({ target: { value: '' } })"
                aria-label="Clear search"
              >
                <svg class="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M10 8.586l4.243-4.243a1 1 0 1 1 1.414 1.414L11.414 10l4.243 4.243a1 1 0 0 1-1.414 1.414L10 11.414l-4.243 4.243a1 1 0 0 1-1.414-1.414L8.586 10 4.343 5.757a1 1 0 0 1 1.414-1.414L10 8.586z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </div>

            <!-- Toolbar: Select All / Clear / Invert / Select Visible -->
            <div
              v-if="multiple && showToolbar"
              class="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-gray-600"
            >
              <button type="button" class="btn-chip" @click.stop="toggleAll">
                <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    d="M16 3H4a2 2 0 00-2 2v5h2V5h12v10H4v-2H2v2a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2z"
                  />
                  <path d="M5 9l3 3 5-6 1.5 1.2L8 14 3.5 9.5 5 9z" />
                </svg>
                <span>{{ allSelected ? 'Unselect all' : 'Select all' }}</span>
              </button>

              <button
                type="button"
                class="btn-chip"
                :disabled="!hasValue"
                @click.stop="clearSelection()"
              >
                <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    d="M6 7h8v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7zm2-4h4l1 1h3a1 1 0 1 1 0 2H4a1 1 0 1 1 0-2h3l1-1z"
                  />
                </svg>
                <span>Clear</span>
              </button>

              <button
                type="button"
                class="btn-chip"
                :disabled="!options?.length"
                @click.stop="invertSelection"
              >
                <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4h12v2H4V4zm0 5h8v2H4V9zm0 5h12v2H4v-2z" />
                </svg>
                <span>Invert</span>
              </button>

              <button
                v-if="enableSelectVisible"
                type="button"
                class="btn-chip"
                :disabled="!currentQuery"
                @click.stop="selectVisible"
                title="Select items matching current search"
              >
                <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 12l-3-3 1.414-1.414L8 9.172l5.586-5.586L15 5z" />
                </svg>
                <span>Select visible</span>
              </button>
            </div>
          </div>
        </template>

        <!-- Option -->
        <template #option="{ option }">
          <slot name="option" :option="option">
            <div class="flex items-center justify-between gap-3">
              <span class="truncate text-sm">
                <span v-if="labelPrefix" class="text-gray-400">{{ option?.[labelPrefix] }} - </span>
                <span class="text-gray-700">{{ displayLabel(option) }}</span>
              </span>
              <span
                v-if="isSelectedOption(option)"
                class="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600"
              >
                <span class="h-1.5 w-1.5 rounded bg-current"></span>
                Selected
              </span>
            </div>
          </slot>
        </template>

        <!-- Single label -->
        <template #singleLabel="{ option }">
          <slot name="singleLabel" :option="option">
            <div class="line-clamp-1" :title="displayLabel(option)">
              <span v-if="labelPrefix">{{ option?.[labelPrefix] }} - </span>
              <span>{{ displayLabel(option) }}</span>
            </div>
          </slot>
        </template>

        <!-- Multiple chips -->
        <template v-if="multiple" #selection="{ values }">
          <slot name="selection" :values="values">
            <div class="flex flex-wrap items-center gap-1">
              <template v-for="(item, i) in values.slice(0, chipLimit)" :key="track(item)">
                <span class="chip">
                  {{ displayLabel(item) }}
                  <button
                    type="button"
                    class="chip-x"
                    @click.stop="removeOne(item)"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </span>
              </template>
              <span v-if="values.length > chipLimit" class="text-xs text-gray-500"
                >+{{ values.length - chipLimit }} more</span
              >
              <span v-if="showCounter && values.length" class="ml-1 text-[11px] text-gray-400"
                >({{ values.length }})</span
              >
            </div>
          </slot>
        </template>

        <!-- Spinner -->
        <template #spinner>
          <svg class="animate-spin h-4 w-4 text-gray-500 mr-2" viewBox="0 0 24 24">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="3"
              fill="none"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4z"
            />
          </svg>
        </template>

        <!-- Empty / No result -->
        <template #noOptions>
          <div class="px-3 py-1 text-sm text-gray-500">{{ noOptionsText }}</div>
        </template>
        <template #noResult>
          <div class="px-3 py-1 text-sm text-gray-500">{{ noResultText }}</div>
        </template>
      </Multiselect>

      <!-- Helper / states -->
      <div class="mt-1 flex items-center justify-between text-xs">
        <slot name="help">
          <p v-if="help" class="text-gray-500">{{ help }}</p>
        </slot>
        <p v-if="error" class="text-red-600 ml-auto">
          {{ typeof error === 'string' ? error : 'Invalid selection' }}
        </p>
        <p v-else-if="success" class="text-emerald-600 ml-auto">Looks good</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import Multiselect from 'vue-multiselect'

const props = defineProps({
  modelValue: { type: [Number, Array, Object, String, null], default: null },
  options: { type: Array, default: () => [] },

  /* Behavior */
  multiple: { type: Boolean, default: false },
  searchable: { type: Boolean, default: true },
  clearOnSelect: { type: Boolean, default: true },
  clearable: { type: Boolean, default: true },
  maxHeight: { type: Number, default: 240 },

  /* Data keys & labels */
  topLabel: { type: String, default: 'name' },
  label: { type: String, default: 'name' },
  labelPrefix: { type: String, default: '' },
  trackBy: { type: String, default: 'id' },

  /* UI */
  placeholder: { type: String, default: 'Select…' },
  searchPlaceholder: { type: String, default: 'Search...' },
  size: { type: String, default: 'md' }, // sm | md | lg
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  error: { type: [Boolean, String], default: false },
  success: { type: Boolean, default: false },
  help: { type: String, default: '' },
  labelText: { type: String, default: '' },
  labelHint: { type: String, default: '' },

  /* Chips */
  chipLimit: { type: Number, default: 25 },
  showCounter: { type: Boolean, default: true },

  /* Toolbar */
  showToolbar: { type: Boolean, default: true },
  enableSelectVisible: { type: Boolean, default: true },

  /* Texts */
  noOptionsText: { type: String, default: 'No options' },
  noResultText: { type: String, default: 'No results found' },
})

const emit = defineEmits([
  'update:modelValue',
  'select',
  'remove',
  'open',
  'close',
  'search-change',
  'clear',
])

const selectedValue = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => {
    selectedValue.value = v
  },
)
watch(selectedValue, (v) => emit('update:modelValue', v))

/* ---------- Label helpers ---------- */
const displayLabel = (option) => {
  if (!option) return ''
  return option?.[props.label] ?? option?.title ?? option?.name ?? option?.id ?? ''
}
const track = (option) => option?.[props.trackBy] ?? option
const isSelectedOption = (option) => {
  if (!option) return false
  if (props.multiple) {
    return (selectedValue.value || []).some((item) => track(item) === track(option))
  }
  return track(selectedValue.value) === track(option)
}

/* ---------- UI state ---------- */
const isOpenHint = ref(false) // optional visual caret rotation
const currentQuery = ref('')

const hasValue = computed(() => {
  return props.multiple
    ? Array.isArray(selectedValue.value) && selectedValue.value.length > 0
    : !!selectedValue.value
})
const selectedCount = computed(() => {
  if (!hasValue.value) return 0
  return props.multiple ? selectedValue.value?.length || 0 : 1
})
const summaryLabel = computed(() => {
  if (!hasValue.value) return ''
  return props.multiple ? `${selectedCount.value} selected` : displayLabel(selectedValue.value)
})

const handleOpen = () => {
  isOpenHint.value = true
  emit('open')
}

const handleClose = () => {
  isOpenHint.value = false
  emit('close')
}
const allSelected = computed(() => {
  if (!props.multiple) return false
  const opts = props.options || []
  const sel = selectedValue.value || []
  if (!opts.length) return false
  return sel.length === opts.length
})

/* ---------- Actions ---------- */
const clearSelection = () => {
  selectedValue.value = props.multiple ? [] : null
  emit('clear')
}
const toggleAll = () => {
  if (!props.multiple) return
  selectedValue.value = allSelected.value ? [] : [...props.options]
}
const invertSelection = () => {
  if (!props.multiple) return
  const selMap = new Map((selectedValue.value || []).map((o) => [track(o), true]))
  selectedValue.value = (props.options || []).filter((o) => !selMap.get(track(o)))
}
const removeOne = (item) => {
  if (!props.multiple) return
  selectedValue.value = (selectedValue.value || []).filter((x) => track(x) !== track(item))
}

/* Select only items matching current search (approx. internal filter) */
const selectVisible = () => {
  if (!props.multiple) return
  const q = currentQuery.value.trim().toLowerCase()
  if (!q) return
  const visible = (props.options || []).filter((o) =>
    String(displayLabel(o)).toLowerCase().includes(q),
  )
  const map = new Map((selectedValue.value || []).map((o) => [track(o), o]))
  for (const v of visible) map.set(track(v), v)
  selectedValue.value = Array.from(map.values())
}

const handleSearchChange = (q) => {
  currentQuery.value = q || ''
  emit('search-change', q)
}

/* ---------- Classes ---------- */
const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'text-sm py-1'
    case 'lg':
      return 'text-base py-2'
    default:
      return 'text-sm py-1.5'
  }
})
const stateClass = computed(() => {
  if (props.error) return 'ring-1 ring-red-400 border-red-400'
  if (props.success) return 'ring-1 ring-emerald-400 border-emerald-400'
  return 'border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500'
})
const dropdownStyle = computed(() => ({
  '--multi-max-height': `${props.maxHeight || 240}px`,
}))
</script>

<style>
@import 'vue-multiselect/dist/vue-multiselect.css';

.smart-multi.multiselect {
  @apply w-full bg-white border rounded px-2 !py-0.5;
}
.smart-multi .multiselect__tags {
  @apply min-h-[2.5rem] border-0 bg-transparent flex items-center gap-2;
}
.smart-multi .multiselect__input,
.smart-multi .multiselect__single {
  @apply bg-transparent focus:outline-none;
}
.smart-multi .multiselect__select {
  @apply hidden;
}
.smart-multi .multiselect__content-wrapper {
  @apply border border-gray-200 rounded shadow-lg mt-1 overflow-y-auto bg-white;
  max-height: var(--multi-max-height, 240px);
}
.smart-multi .multiselect__option {
  @apply px-3 py-1 text-sm cursor-pointer;
}
.smart-multi .multiselect__option--highlight {
  @apply bg-indigo-50 text-indigo-700;
}
.smart-multi .multiselect__option--selected {
  @apply bg-gray-100 text-gray-700;
}
.smart-multi .multiselect__spinner {
  @apply absolute right-9 top-2;
}
.smart-multi .multiselect__content-wrapper::-webkit-scrollbar {
  width: 6px;
}
.smart-multi .multiselect__content-wrapper::-webkit-scrollbar-track {
  background: transparent;
}
.smart-multi .multiselect__content-wrapper::-webkit-scrollbar-thumb {
  background-color: rgba(15, 23, 42, 0.2);
  border-radius: 9999px;
}
.smart-multi .multiselect__content-wrapper:hover::-webkit-scrollbar-thumb {
  background-color: rgba(79, 70, 229, 0.35);
}

/* Chips */
.chip {
  @apply inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs;
}
.chip-x {
  @apply hover:text-red-600 focus:outline-none;
}

/* Toolbar buttons */
.btn-chip {
  @apply inline-flex items-center gap-1 px-2 py-1 rounded border bg-white hover:bg-gray-50 disabled:opacity-50;
}
</style>
