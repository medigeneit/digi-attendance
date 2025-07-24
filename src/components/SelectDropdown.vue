<template>
  <div class="relative w-full">
    <!-- Control -->
    <div
      class="border rounded px-3 py-2 cursor-pointer bg-white shadow-sm flex items-center justify-between"
      @click="toggleDropdown"
      :class="{ 'bg-gray-100': disabled }"
    >
      <!-- Display selected values or placeholder -->
      <div class="flex flex-wrap items-center gap-1">
        <template v-if="multiple">
          <template v-for="item in selectedItems" :key="getOptionKey(item)">
            <slot name="selected-option" :option="item">
              <span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                {{ getOptionLabel(item) }}
                <button @click.stop="removeItem(item)" class="ml-1 text-xs">×</button>
              </span>
            </slot>
          </template>
        </template>
        <template v-else>
          <slot name="selected-option" :option="selectedItems">
            {{ getOptionLabel(selectedItems) || placeholder }}
          </slot>
        </template>
      </div>

      <!-- Indicator -->
      <slot name="open-indicator">
        <svg class="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </slot>
    </div>

    <!-- Dropdown -->
    <transition name="fade">
      <div
        v-show="isOpen"
        class="absolute mt-1 w-full bg-white border rounded shadow-lg z-50 max-h-60 overflow-auto"
      >
        <div class="p-2">
          <slot name="search">
            <input
              type="text"
              v-model="search"
              class="w-full px-2 py-1 border rounded"
              placeholder="Search..."
              @focus="$emit('search:focus')"
              @blur="$emit('search:blur')"
            />
          </slot>
        </div>

        <slot name="list-header"></slot>

        <ul>
          <template v-if="filteredOptions.length">
            <li
              v-for="option in filteredOptions"
              :key="getOptionKey(option)"
              class="px-3 py-2 hover:bg-blue-100 cursor-pointer"
              @click="selectOption(option)"
              :class="{ 'bg-blue-50': isSelected(option) }"
            >
              <slot name="option" :option="option">
                {{ getOptionLabel(option) }}
              </slot>
            </li>
          </template>
          <li v-else class="px-3 py-2 text-gray-500">
            <slot name="no-options">No options found</slot>
          </li>
        </ul>

        <slot name="list-footer"></slot>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { onClickOutside } from '@vueuse/core'
import { computed, ref } from 'vue'

const props = defineProps({
  options: { type: Array, required: true },
  modelValue: { type: [Object, Array, String, Number, null], default: null },
  placeholder: { type: String, default: 'Select...' },
  multiple: { type: Boolean, default: false },
  label: { type: String, default: 'label' },
  value: { type: String, default: 'value' },
  clearable: { type: Boolean, default: true },
  searchable: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  filterBy: { type: Function, default: null },
  reduce: { type: Function, default: null },
})

const emit = defineEmits([
  'update:modelValue',
  'input',
  'open',
  'close',
  'search',
  'search:focus',
  'search:blur',
  'option:selecting',
  'option:selected',
  'option:deselecting',
  'option:deselected',
])

const isOpen = ref(false)
const search = ref('')
const dropdownRef = ref()

onClickOutside(dropdownRef, () => handleOutsideClick())

const selectedItems = computed(() => {
  if (props.multiple) {
    return Array.isArray(props.modelValue) ? props.modelValue : []
  } else {
    return props.modelValue
  }
})

const getOptionLabel = (option) => option?.[props.label] ?? option?.label ?? option

const getOptionKey = (option) => option?.[props.value] ?? option?.value ?? option

const toggleDropdown = () => {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  emit(isOpen.value ? 'open' : 'close')
}

const isSelected = (option) => {
  const val = getOptionKey(option)
  if (props.multiple) {
    return selectedItems.value.some((o) => getOptionKey(o) === val)
  }
  return getOptionKey(selectedItems.value) === val
}

const selectOption = (option) => {
  if (props.multiple) {
    if (isSelected(option)) {
      emit('option:deselecting', option)
      const newSelection = selectedItems.value.filter(
        (o) => getOptionKey(o) !== getOptionKey(option),
      )
      emit('update:modelValue', newSelection)
      emit('option:deselected', option)
    } else {
      emit('option:selecting', option)
      const newSelection = [...selectedItems.value, option]
      emit('update:modelValue', newSelection)
      emit('option:selected', option)
    }
  } else {
    emit('option:selected', option)
    emit('update:modelValue', option)
    isOpen.value = false
    emit('close')
  }
  emit('input', option)
  search.value = ''
}

const removeItem = (option) => {
  if (!props.multiple) return
  const newSelection = selectedItems.value.filter((o) => getOptionKey(o) !== getOptionKey(option))
  emit('update:modelValue', newSelection)
  emit('option:deselected', option)
}

const filteredOptions = computed(() => {
  const term = search.value.toLowerCase()
  if (!props.searchable || !term) return props.options
  if (props.filterBy) return props.filterBy(props.options, term)
  return props.options.filter((opt) => getOptionLabel(opt).toLowerCase().includes(term))
})

function handleOutsideClick() {
  if (isOpen.value) {
    isOpen.value = false
    emit('close')
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
