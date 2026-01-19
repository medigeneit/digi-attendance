<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: null },
  options: { type: Array, default: () => [] },
  label: { type: String, default: 'title' },
  value: { type: String, default: 'id' },
  placeholder: { type: String, default: 'Select or type...' },
})

const emit = defineEmits(['update:modelValue', 'update:inputValue'])

const searchText = ref('')
const isOpen = ref(false)
const inputRef = ref(null)
const dropdownRef = ref(null)

// For floating position
const dropdownStyle = ref({
  top: '0px',
  left: '0px',
  width: '0px',
})

const filteredOptions = computed(() => {
  if (!searchText.value) return props.options
  const lower = searchText.value.toLowerCase()
  return props.options.filter((opt) => {
    const val = opt[props.label]
    return val && String(val).toLowerCase().includes(lower)
  })
})

function updatePosition() {
  if (inputRef.value) {
    const rect = inputRef.value.getBoundingClientRect()
    dropdownStyle.value = {
      // Since we use position: fixed, we use viewport coordinates directly
      // No need to add window.scrollY/X
      top: `${rect.bottom}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
    }
  }
}

function selectOption(option) {
  searchText.value = option[props.label]
  emit('update:modelValue', option[props.value])
  emit('update:inputValue', option[props.label])
  isOpen.value = false
}

function onInput() {
  isOpen.value = true
  // Update position when typing as layout might shift or just to be safe
  updatePosition()

  emit('update:inputValue', searchText.value)

  // Try to find exact match
  const match = props.options.find(
    (opt) => opt[props.label]?.toLowerCase() === searchText.value.toLowerCase(),
  )
  if (match) {
    emit('update:modelValue', match[props.value])
  } else {
    emit('update:modelValue', null)
  }
}

function onFocus() {
  isOpen.value = true
  updatePosition()
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      const opt = props.options.find((o) => o[props.value] == val)
      if (opt) {
        searchText.value = opt[props.label]
        emit('update:inputValue', opt[props.label])
      }
    }
  },
  { immediate: true },
)

watch(
  () => props.options,
  () => {
    if (props.modelValue) {
      const opt = props.options.find((o) => o[props.value] == props.modelValue)
      if (opt) {
        searchText.value = opt[props.label]
        emit('update:inputValue', opt[props.label])
      }
    }
  },
)

watch(isOpen, (val) => {
  if (val) {
    nextTick(() => updatePosition())
  }
})

function handleClickOutside(event) {
  // Check if click is inside input
  if (inputRef.value && inputRef.value.contains(event.target)) return
  // Check if click is inside dropdown (which is teleported)
  if (dropdownRef.value && dropdownRef.value.contains(event.target)) return

  isOpen.value = false
}

function handleScroll() {
  if (isOpen.value) updatePosition()
}

function handleResize() {
  if (isOpen.value) updatePosition()
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('scroll', handleScroll, true) // capture=true for scrolling parents
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', handleScroll, true)
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="relative">
    <input
      ref="inputRef"
      type="text"
      v-model="searchText"
      @input="onInput"
      @focus="onFocus"
      class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
      :placeholder="placeholder"
    />

    <Teleport to="body">
      <ul
        v-if="isOpen && filteredOptions.length > 0"
        ref="dropdownRef"
        class="fixed z-[9999] bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto mt-1"
        :style="dropdownStyle"
      >
        <li
          v-for="opt in filteredOptions"
          :key="opt[value]"
          @click="selectOption(opt)"
          class="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 block text-left"
        >
          {{ opt[label] }}
        </li>
      </ul>
    </Teleport>
  </div>
</template>
