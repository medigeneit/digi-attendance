<template>
  <div class="border rounded-md cursor-pointer relative" ref="dropdownRef">
    <!-- Control -->
    <div
      class="flex items-center justify-between px-2 h-full gap-2"
      @click="toggleDropdown"
      :class="{ 'bg-gray-100': disabled }"
      tabindex="0"
    >
      <!-- Display selected values or placeholder -->
      <div class="w-full h-full">
        <template v-if="isMultiSelection">
          <div class="flex flex-wrap items-center gap-2 w-full h-full justify-items-stretch py-1.5">
            <template v-if="Array.isArray(selectedItems) && selectedItems.length > 0">
              <slot
                name="selected-options"
                :items="selectedItems"
                :removeItem="(item) => removeItem(item)"
                :getOption="findOptionById"
                :label="getSelectionLabel"
              >
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
              </slot>
            </template>

            <span v-else-if="!taggable" class="text-gray-400">{{ placeholder || 'Select..' }}</span>
            <input
              v-model="search"
              v-if="taggable"
              ref="tagSearchInput"
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
            <!-- {{ modelValue }} - {{ getSelectionLabel(selectedItems) }} - -->
            <slot
              name="selected-option"
              :option="findOptionById(modelValue)"
              :group="selectedGroup"
            >
              <span
                v-if="getSelectionLabel(selectedItems)"
                class="line-clamp-1"
                :title="getSelectionLabel(selectedItems)"
              >
                {{ getSelectionLabel(selectedItems) }}
              </span>
              <span v-else class="text-gray-500 text-sm">{{ placeholder || 'Select...' }}</span>
            </slot>
          </div>
        </template>
      </div>
      <div class="flex items-center gap-0.5">
        <!-- Indicator -->
        <button
          v-if="props.modelValue && clearable && !props.disabled"
          @click.prevent="() => emit('update:modelValue', '')"
          class="text-gray-600 font-semibold hover:text-red-700 text-xl"
          title="Clear selection"
        >
          <slot name="clear-icon"> &times; </slot>
        </button>

        <!-- Indicator -->
        <slot name="open-indicator">
          <svg class="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </slot>
      </div>
    </div>

    <!-- Dropdown -->
    <teleport :to="teleportTarget || 'body'" :disabled="!teleportTarget">
      <div
        v-show="isOpen"
        class="fixed border rounded shadow-[0px_0px_10px_0px_rgba(0,0,0,0.25)] z-[80] border-teal-500 bg-white"
        ref="dropdownMenuRef"
        :style="dropdownStyles"
      >
        <div class="px-2 pt-2" v-if="searchable && !taggable">
          <slot name="search">
            <input
              type="text"
              v-model="search"
              ref="searchInput"
              class="w-full px-2 py-1 border rounded outline-blue-400 focus:outline-1"
              placeholder="Search..."
              @focus="$emit('search:focus')"
              @blur="$emit('search:blur')"
              @keydown.stop.enter="($event) => handleSearchEnter($event)"
            />
          </slot>
        </div>

        <slot name="list-header"></slot>

        <ul class="max-h-60 overflow-y-auto py-2">
          <template v-if="filteredOptions.length">
            <template
              v-for="(option, filteredOptionIndex) in filteredOptions"
              :key="getOptionKey(option)"
            >
              <li v-if="isOptionGroup">
                <div class="mx-2 text-sm font-semibold">
                  {{ option?.[groupLabel] }}
                </div>
                <ul class="px-2 text-sm text-gray-700">
                  <li
                    v-for="groupOption in option?.[optGroupOptionKey] || []"
                    :key="getOptionKey(groupOption)"
                    tabindex="0"
                    :class="{ 'bg-blue-50': isSelected(groupOption) }"
                    class="px-3 py-1 my-0.5 hover:bg-blue-100 focus:bg-blue-100 focus:outline-blue-500 cursor-pointer"
                    @click="selectOption(groupOption, option)"
                    @keydown.prevent.space="selectOption(groupOption, option)"
                    @keydown.prevent.enter="selectOption(groupOption, option)"
                  >
                    <slot name="option" :option="groupOption" :group="option">
                      {{ getOptionLabel(groupOption) }}
                    </slot>
                  </li>
                </ul>
              </li>
              <li
                v-else
                tabindex="0"
                :class="{
                  'bg-blue-50': isSelected(option),
                  'border border-blue-700': focusIndex === filteredOptionIndex,
                }"
                class="px-3 py-1 my-0.5 hover:bg-blue-100 focus:bg-blue-100 focus:outline-blue-500 cursor-pointer"
                @click="selectOption(option)"
                @keydown.prevent.space="selectOption(option)"
                @keydown.prevent.enter="selectOption(option)"
              >
                <slot name="option" :option="option">
                  {{ getOptionLabel(option) }}
                </slot>
              </li>
            </template>
          </template>
          <li
            v-else
            class="px-3 py-2 text-gray-500 min-h-24 flex justify-center items-center -mt-2"
          >
            <slot name="no-options">{{
              taggable ? 'No option found, Enter to add' : 'No options found'
            }}</slot>
          </li>
        </ul>

        <slot name="list-footer"></slot>
      </div>
    </teleport>
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
  clearable: { type: Boolean, default: false },
  searchable: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  searchBy: { type: Function, default: null },
  position: {
    type: String,
    default: 'auto',
    validator: (value) => ['top', 'left', 'right', 'bottom', 'auto'].includes(value),
  },
  containment: { type: Object, default: () => window },
  taggable: { type: Boolean, default: false },
  createOption: Function, // optional custom create handler
  hideSelectedValue: { type: Boolean, default: false },
  isOptionGroup: { type: Boolean, default: false },
  optGroupOptionKey: { type: String, default: 'children' },
  groupLabel: { type: String, default: 'name' },
  teleportTarget: { type: String, default: 'body' },
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
const searchInput = ref(null)
const tagSearchInput = ref(null)
const dropdownRef = ref()
const dropdownMenuRef = ref()
const dropdownPosition = ref(props.position)
const selectedGroup = ref('')
const focusIndex = ref(0)
const dropdownStyles = ref({})
const dropdownOffset = 6

function handleOutsideClick(event) {
  const clickedInsideTrigger = dropdownRef.value?.contains(event.target)
  const clickedInsideMenu = dropdownMenuRef.value?.contains(event.target)

  if (!clickedInsideTrigger && !clickedInsideMenu && isOpen.value) {
    isOpen.value = false
    emit('close')
  }
}

function findOptionById(optionId) {
  const options = props.isOptionGroup
    ? getSelectedGroupByModelValue(optionId)?.[props.optGroupOptionKey] || []
    : props.options

  return options.find((opt) => opt?.[props.value] == optionId)
}

function handleKeydown(e) {
  console.log(`handleKeydown:${e.key}`)

  if (!isOpen.value || props.isOptionGroup) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (focusIndex.value < filteredOptions.value.length) {
      focusIndex.value++
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (focusIndex.value > 0) {
      focusIndex.value--
    }
  }
}

const handleContainmentScroll = () => calculatePosition(isOpen.value)
const handleWindowResize = () => calculatePosition(isOpen.value)

const handleSearchEnter = (e) => {
  if (!isOpen.value || props.isOptionGroup) return

  if (focusIndex.value >= 0 && e.key === 'Enter') {
    const option = filteredOptions.value[focusIndex.value]

    if (option) {
      selectOption(option)
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
  window.addEventListener('keydown', handleKeydown)
  props.containment?.addEventListener('scroll', handleContainmentScroll)
  window.addEventListener('resize', handleWindowResize)

  setTimeout(() => {
    tagSearchInput.value?.focus()
  })
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('keydown', handleKeydown)
  props.containment?.removeEventListener('scroll', handleContainmentScroll)
  window.removeEventListener('resize', handleWindowResize)
})

const isMultiSelection = computed(() => props.multiple || props.taggable)

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
  let options = []

  if (props.isOptionGroup) {
    const selectedOptGroup = getSelectedGroupByModelValue(optionId)
    options = selectedOptGroup?.[props.optGroupOptionKey] || []
  } else {
    options = props.options
  }

  const selected = options.find((opt) => {
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
  if (isOpen.value) {
    setTimeout(() => {
      searchInput.value?.focus()
    }, 0)
  }
}

const isSelected = (option) => {
  const val = getOptionKey(option)
  if (props.multiple || props.taggable) {
    return selectedItems.value.some((o) => getOptionKey(o) === val)
  }
  return getOptionKey(selectedItems.value) === val
}

const selectOption = (option, parentOption = null) => {
  console.log({ parentOption })

  if (parentOption) {
    selectedGroup.value = parentOption
  }

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
  const newSelection = selectedItems.value.filter((o) => getOptionKey(o) !== getOptionKey(option))
  emit('update:modelValue', newSelection)
  emit('option:deselected', option)
}

const filteredOptions = computed(() => {
  if (!props.searchable) return props.options

  const termRaw = (search.value || '').trim()
  if (!termRaw) return itemsWithHiddenBySelected(props.options)

  const term = termRaw.toLowerCase()
  const { options, isOptionGroup, searchBy, optGroupOptionKey } = props

  // Flat list
  if (!isOptionGroup) {
    return typeof searchBy === 'function'
      ? searchBy(options, term)
      : itemsWithHiddenBySelected(options).filter((opt) => {
          const lbl = getOptionLabel(opt)
          return lbl && lbl.toLowerCase().includes(term)
        })
  }

  const result = []
  // Grouped list
  const childKey = optGroupOptionKey || 'children'

  for (let i = 0; i < options.length; i++) {
    const group = options[i]
    const children = group?.[childKey] || []

    // Apply custom filter if provided, otherwise default filter
    const filteredChildren =
      typeof searchBy === 'function'
        ? searchBy(children, term)
        : (() => {
            const out = []
            for (let j = 0; j < children.length; j++) {
              const lbl = getOptionLabel(children[j])
              if (lbl && lbl.toLowerCase().includes(term)) out.push(children[j])
            }
            return out
          })()

    // Keep group only if it has matches
    if (filteredChildren.length > 0) {
      // If nothing changed, reuse the same group object
      if (filteredChildren.length === children.length) {
        result.push(group)
      } else {
        result.push({ ...group, [childKey]: itemsWithHiddenBySelected(filteredChildren) })
      }
    }
  }

  return result
})

const itemsWithHiddenBySelected = (items) => {
  if (!Array.isArray(items)) {
    return []
  }

  if (!props.hideSelectedValue) {
    return [...items]
  }

  return items.filter((option) => {
    return !isSelected(option)
  })
}

async function calculatePosition(dropdownOpen) {
  if (!dropdownOpen) return null

  await nextTick()
  const trigger = dropdownRef.value
  const dropdown = dropdownMenuRef.value
  if (!(trigger && dropdown)) return null

  const containment = props.containment || window
  const triggerRect = trigger.getBoundingClientRect()
  const dropdownRect = dropdown.getBoundingClientRect()
  const containerRect =
    typeof containment.getBoundingClientRect === 'function'
      ? containment.getBoundingClientRect()
      : null

  const spaceBelow = (containerRect?.bottom ?? window.innerHeight) - triggerRect.bottom
  const spaceAbove = triggerRect.top - (containerRect?.top ?? 0)
  const dropdownHeight = dropdownRect.height

  if (props.position === 'auto') {
    dropdownPosition.value =
      spaceBelow < dropdownHeight && spaceAbove > dropdownHeight ? 'top' : 'bottom'
  } else {
    dropdownPosition.value = props.position
  }

  const style = {
    position: 'fixed',
    minWidth: `${triggerRect.width}px`,
    left: `${triggerRect.left}px`,
    top: `${triggerRect.bottom + dropdownOffset}px`,
  }

  if (dropdownPosition.value === 'top') {
    style.top = `${triggerRect.top - dropdownHeight - dropdownOffset}px`
  } else if (dropdownPosition.value === 'left') {
    style.left = `${triggerRect.left - dropdownRect.width - dropdownOffset}px`
    style.top = `${triggerRect.top}px`
  } else if (dropdownPosition.value === 'right') {
    style.left = `${triggerRect.right + dropdownOffset}px`
    style.top = `${triggerRect.top}px`
  }

  dropdownStyles.value = style
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

function getSelectedGroupByModelValue(value) {
  return props.options.find((group) => {
    return group?.[props.optGroupOptionKey]?.some((opt) => opt?.[props.value] == value)
  })
}

watch(
  () => props.modelValue,
  (newValue) => {
    if (props.isOptionGroup) {
      selectedGroup.value = getSelectedGroupByModelValue(newValue)
    }
  },
)

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
