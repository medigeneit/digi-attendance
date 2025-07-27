<template>
  <div class="relative w-full" ref="dropdownRef">
    <!-- Control -->
    <div
      class="h-full border rounded-md px-2 py-1 cursor-pointer bg-white flex items-center justify-between"
      @click="toggleDropdown"
      :class="{ 'bg-gray-100': disabled }"
      tabindex="0"
    >
      <!-- Display selected values or placeholder -->
      <div class="w-full h-full">
        <template v-if="isMultiSelection">
          <div class="flex flex-wrap items-center gap-2 w-full h-full justify-items-stretch">
            <template v-if="Array.isArray(selectedItems) && selectedItems.length > 0">
              <template v-for="item in selectedItems" :key="getOptionKey(item)">
                <slot
                  name="selected-option"
                  :option="findOptionById(item)"
                  :removeItem="(item) => removeItem(item)"
                >
                  <span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                    <span>
                      {{ getSelectionLabel(item) }}
                    </span>
                    <button
                      @click.prevent.stop="removeItem(item)"
                      type="button"
                      class="ml-1 text-xs"
                    >
                      ×
                    </button>
                  </span>
                </slot>
              </template>
            </template>

            <span v-else-if="!taggable" class="text-gray-400">{{ placeholder || 'Select..' }}</span>
            <input
              v-model="search"
              v-if="taggable"
              type="text"
              class="flex-grow px-2 py-1 rounded outline-none"
              :placeholder="placeholder || 'Type and enter to add'"
              @keydown.prevent.stop.enter="handleTagEnter"
              @keydown.backspace="handleTagBackspace"
              @keyup="() => (isOpen = !!search)"
              @focus="$emit('search:focus')"
              @blur="$emit('search:blur')"
            />
          </div>
        </template>
        <!-- Single Item selection -->
        <template v-else>
          <div class="flex items-center h-full">
            <slot
              name="selected-option"
              :option="findOptionById(modelValue)"
              :is-selected="isSelected"
            >
              {{ getSelectionLabel(selectedItems) || placeholder || 'Select...' }}
            </slot>
          </div>
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
    <div
      v-show="isOpen"
      class="absolute w-full border rounded shadow-[0px_0px_10px_0px_rgba(0,0,0,0.25)] z-50 border-teal-500 bg-white"
      ref="dropdownMenuRef"
      :class="positionClass"
    >
      <div class="p-3" v-if="searchable && !taggable">
        <slot name="search">
          <input
            type="text"
            v-model="search"
            class="w-full px-2 py-1 border rounded"
            placeholder="Search..."
            @focus="$emit('search:focus')"
            @blur="$emit('search:blur')"
            @keydown.stop.enter="($event) => $event.preventDefault()"
          />
        </slot>
      </div>

      <slot name="list-header"></slot>

      <ul class="max-h-60 overflow-auto">
        <template v-if="filteredOptions.length">
          <li
            tabindex="0"
            v-for="option in filteredOptions"
            :key="getOptionKey(option)"
            :class="{ 'bg-blue-50': isSelected(option) }"
            class="px-3 py-2 hover:bg-blue-100 cursor-pointer"
            @click="selectOption(option)"
            @keydown.prevent.space="selectOption(option)"
            @keydown.prevent.enter="selectOption(option)"
          >
            <slot name="option" :option="option">
              {{ getOptionLabel(option) }}
            </slot>
          </li>
        </template>
        <li v-else class="px-3 py-2 text-gray-500 min-h-24 flex justify-center items-center">
          <slot name="no-options">{{
            taggable ? 'No option found, Enter to add' : 'No options found'
          }}</slot>
        </li>
      </ul>

      <slot name="list-footer"></slot>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  options: { type: Array, required: true },
  modelValue: { type: [Object, Array, String, Number, null], default: null },
  placeholder: { type: String, default: null },
  multiple: { type: Boolean, default: false },
  label: { type: String, default: 'label' },
  value: { type: String, default: 'id' },
  clearable: { type: Boolean, default: true },
  searchable: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  filterBy: { type: Function, default: null },
  reduce: { type: Function, default: null },
  position: {
    type: String,
    default: 'auto',
    validator: (value) => ['top', 'left', 'right', 'bottom', 'auto'].includes(value),
  },
  containment: { type: Object, default: () => window },
  taggable: { type: Boolean, default: false },
  createOption: Function, // optional custom create handler
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
const dropdownMenuRef = ref()

const dropdownPosition = ref(props.position)

function handleOutsideClick(event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    if (isOpen.value) {
      isOpen.value = false
      emit('close')
    }
  }
}

function findOptionById(optionId) {
  return props.options.find((opt) => opt?.[props.value] == optionId)
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
  props.containment.addEventListener('scroll', () => calculatePosition(isOpen.value))
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
  props.containment.removeEventListener('scroll', () => calculatePosition(isOpen.value))
})

const isMultiSelection = computed(() => props.multiple || props.taggable)
const positionClass = computed(() => {
  const map = {
    top: 'bottom-[100%] mb-0.5',
    left: 'right-[100%] mr-0.5',
    right: 'left-[100%] ml-0.5',
    bottom: 'top-[100%] mt-0.5',
  }
  return map[dropdownPosition.value] || map.bottom
})

const selectedItems = computed(() => {
  if (props.multiple || props.taggable) {
    return Array.isArray(props.modelValue) ? props.modelValue : []
  } else {
    return props.modelValue
  }
})

const getOptionLabel = (option) => {
  return option?.[props.label] ?? option?.label ?? option
}

const getSelectionLabel = (optionId) => {
  const selected = props.options.find((opt) => {
    if (typeof opt == 'string' || typeof opt == 'number') {
      return String(opt) === String(optionId)
    }
    return opt?.[props.value] == optionId
  })

  if (selected) {
    return selected?.[props.label] ?? selected?.label ?? selected
  }

  if (props.taggable) {
    return optionId
  }

  return null
}

const getOptionKey = (option) => {
  if (typeof option == 'object') {
    return option?.[props.value] ?? option?.value ?? option
  } else if (typeof option == 'string' || typeof option == 'number') {
    return option
  }

  return ''
}

const toggleDropdown = () => {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  emit(isOpen.value ? 'open' : 'close')
}

const isSelected = (option) => {
  const val = getOptionKey(option)
  if (props.multiple || props.taggable) {
    return selectedItems.value.some((o) => getOptionKey(o) === val)
  }
  return getOptionKey(selectedItems.value) === val
}

const selectOption = (option) => {
  if (props.multiple || props.taggable) {
    if (isSelected(option)) {
      emit('option:deselecting', option)
      const newSelection = selectedItems.value.filter(
        (o) => getOptionKey(o) !== getOptionKey(option),
      )
      emit('update:modelValue', newSelection)
      emit('option:deselected', option)
    } else {
      emit('option:selecting', option)
      const newSelection = [...selectedItems.value, getOptionKey(option)]
      emit('update:modelValue', newSelection)
      emit('option:selected', option)
    }
  } else {
    emit('option:selected', option)
    if (typeof props.modelValue == 'object' && props.modelValue) {
      emit('update:modelValue', option)
    } else {
      emit('update:modelValue', getOptionKey(option))
    }
  }
  isOpen.value = false
  emit('close')

  emit('input', option)
  search.value = ''
}

const removeItem = (option) => {
  // if (!props.multiple || !props.taggable) return
  const newSelection = selectedItems.value.filter((o) => getOptionKey(o) !== getOptionKey(option))
  emit('update:modelValue', newSelection)
  emit('option:deselected', option)
}

const filteredOptions = computed(() => {
  const term = search.value.toLowerCase()
  if (!props.searchable || !term) return props.options
  if (typeof props.filterBy == 'function') return props.filterBy(props.options, term)
  return props.options.filter((opt) => getOptionLabel(opt).toLowerCase().includes(term))
})

async function calculatePosition(dropdownOpen) {
  if (dropdownOpen && props.position === 'auto') {
    await nextTick()
    const trigger = dropdownRef.value
    const dropdown = dropdownMenuRef.value
    if (trigger && dropdown) {
      console.log({ cm: props.containment })

      const triggerRect = trigger.getBoundingClientRect()
      const dropdownHeight = dropdown.offsetHeight
      const spaceBelow =
        (props.containment.innerHeight || props.containment.clientHeight) - triggerRect.bottom
      const spaceAbove = triggerRect.top

      console.log({ triggerRect, dropdownHeight, spaceBelow, spaceAbove })

      if (spaceAbove < dropdownHeight) {
        dropdownPosition.value = 'bottom'
      } else {
        dropdownPosition.value =
          spaceBelow < dropdownHeight && spaceAbove > dropdownHeight ? 'top' : 'bottom'
      }
    }
  } else {
    dropdownPosition.value = props.position
  }
}

const searchedItem = computed(() => {
  return filteredOptions.value.find(
    (opt) => getOptionLabel(opt).toLowerCase() === search.value.toLowerCase(),
  )
})

function handleTagBackspace(_event) {
  if (search.value.length === 0 && props.taggable && Array.isArray(props.modelValue)) {
    const items = [...props.modelValue]
    items.pop()
    emit('update:modelValue', items)
  }
}

function handleTagEnter(event) {
  event.preventDefault()

  if (!props.taggable || !search.value.trim()) return

  if (!searchedItem.value) {
    const newOption = props.createOption ? props.createOption(search.value) : search.value.trim()
    emit('option:created', newOption)
    emit('option:selected', newOption)
    emit('input', newOption)
    emit('update:modelValue', [...props.modelValue, newOption])
  } else {
    selectOption(searchedItem.value)
  }
  search.value = ''
  event.target.focus()
}

watch(isOpen, calculatePosition)
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
