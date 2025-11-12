<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const editor = ref(null)

const activeCommands = ref({
  bold: false,
  italic: false,
  underline: false,
  insertUnorderedList: false,
  insertOrderedList: false,
  justifyLeft: false,
  justifyCenter: false,
  justifyRight: false,
  foreColor: '',
  fontSize: '16px', // default font size
})

// Dropdown visibility states
const showAlignmentDropdown = ref(false)
const showColorDropdown = ref(false)
const showFontSizeDropdown = ref(false)

// Mapping font size values to human-readable format
const fontSizeMap = {
  1: '10px',
  2: '13px',
  3: '16px',
  4: '18px',
  5: '24px',
  6: '32px',
  7: '48px',
}

// Computed property to get the current alignment icon
const currentAlignmentIcon = computed(() => {
  if (activeCommands.value.justifyLeft) return 'fa-align-left'
  if (activeCommands.value.justifyCenter) return 'fa-align-center'
  if (activeCommands.value.justifyRight) return 'fa-align-right'
  return 'fa-align-left' // Default alignment
})

// Computed property to get the current text color
const currentTextColor = computed(() => {
  return activeCommands.value.foreColor || 'black'
})

watch(
  () => props.modelValue,
  (newVal) => {
    if (editor.value && editor.value.innerHTML !== newVal) {
      editor.value.innerHTML = newVal
    }
  },
)

const formatText = (command, value = null) => {
  document.execCommand(command, false, value)
  updateActiveCommands()
}

const onDescriptionInput = () => {
  emit('update:modelValue', editor.value.innerHTML)
}

const updateActiveCommands = () => {
  activeCommands.value = {
    bold: document.queryCommandState('bold'),
    italic: document.queryCommandState('italic'),
    underline: document.queryCommandState('underline'),
    insertUnorderedList: document.queryCommandState('insertUnorderedList'),
    insertOrderedList: document.queryCommandState('insertOrderedList'),
    justifyLeft: document.queryCommandState('justifyLeft'),
    justifyCenter: document.queryCommandState('justifyCenter'),
    justifyRight: document.queryCommandState('justifyRight'),
    foreColor: document.queryCommandValue('foreColor'),
    fontSize: fontSizeMap[document.queryCommandValue('fontSize')] || '16px',
  }
}

const handleSelectionChange = () => {
  updateActiveCommands()
}

onMounted(() => {
  document.addEventListener('selectionchange', handleSelectionChange)

  // Handle plain text paste
  editor.value.addEventListener('paste', (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  })

  editor.value.innerHTML = props.modelValue
})

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', handleSelectionChange)
})

// Close dropdowns when clicking outside
const handleClickOutside = (event) => {
  if (
    !event.target.closest('.alignment-dropdown') &&
    !event.target.closest('.color-dropdown') &&
    !event.target.closest('.font-size-dropdown')
  ) {
    showAlignmentDropdown.value = false
    showColorDropdown.value = false
    showFontSizeDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="w-full mx-auto">
    <div class="flex items-center gap-2 flex-wrap bg-gray-100 p-2">
      <button
        type="button"
        @click.stop.prevent="formatText('bold')"
        :class="{
          'bg-blue-200 text-blue-700': activeCommands.bold,
          'hover:bg-gray-200': !activeCommands.bold,
        }"
        class="p-2 flex items-center justify-center transition"
      >
        <i class="fas fa-bold"></i>
      </button>
      <button
        type="button"
        @click.stop.prevent="formatText('italic')"
        :class="{
          'bg-blue-200 text-blue-700': activeCommands.italic,
          'hover:bg-gray-200': !activeCommands.italic,
        }"
        class="p-2 rounded flex items-center justify-center transition"
      >
        <i class="fas fa-italic"></i>
      </button>
      <button
        type="button"
        @click.stop.prevent="formatText('underline')"
        :class="{
          'bg-blue-200 text-blue-700': activeCommands.underline,
          'hover:bg-gray-200': !activeCommands.underline,
        }"
        class="p-2 rounded flex items-center justify-center transition"
      >
        <i class="fas fa-underline"></i>
      </button>
      <button
        type="button"
        @click.stop.prevent="formatText('insertUnorderedList')"
        :class="{
          'bg-blue-200 text-blue-700': activeCommands.insertUnorderedList,
          'hover:bg-gray-200': !activeCommands.insertUnorderedList,
        }"
        class="p-2 rounded flex items-center justify-center transition"
      >
        <i class="fas fa-list-ul"></i>
      </button>
      <button
        type="button"
        @click.stop.prevent="formatText('insertOrderedList')"
        :class="{
          'bg-blue-200 text-blue-700': activeCommands.insertOrderedList,
          'hover:bg-gray-200': !activeCommands.insertOrderedList,
        }"
        class="p-2 rounded flex items-center justify-center transition"
      >
        <i class="fas fa-list-ol"></i>
      </button>

      <!-- Alignment Dropdown -->
      <div class="relative alignment-dropdown">
        <button
          @click.stop.prevent="showAlignmentDropdown = !showAlignmentDropdown"
          class="p-2 rounded flex gap-2 items-center justify-center transition hover:bg-gray-200"
        >
          <i :class="`fas ${currentAlignmentIcon}`"></i>
          <i class="fas fa-chevron-down ml-1"></i>
        </button>
        <div
          v-if="showAlignmentDropdown"
          class="absolute flex bg-white border border-gray-300 rounded mt-1 z-10"
        >
          <button
            @click.stop.prevent="formatText('justifyLeft')"
            :class="{
              'bg-blue-200 text-blue-700': activeCommands.justifyLeft,
              'hover:bg-gray-200': !activeCommands.justifyLeft,
            }"
            class="p-2 flex items-center justify-center"
          >
            <i class="fas fa-align-left"></i>
          </button>
          <button
            @click.stop.prevent="formatText('justifyCenter')"
            :class="{
              'bg-blue-200 text-blue-700': activeCommands.justifyCenter,
              'hover:bg-gray-200': !activeCommands.justifyCenter,
            }"
            class="p-2 flex items-center justify-center"
          >
            <i class="fas fa-align-center"></i>
          </button>
          <button
            @click.stop.prevent="formatText('justifyRight')"
            :class="{
              'bg-blue-200 text-blue-700': activeCommands.justifyRight,
              'hover:bg-gray-200': !activeCommands.justifyRight,
            }"
            class="p-2 flex items-center justify-center"
          >
            <i class="fas fa-align-right"></i>
          </button>
        </div>
      </div>

      <!-- Text Color Dropdown -->
      <div class="relative color-dropdown">
        <button
          @click.stop.prevent="showColorDropdown = !showColorDropdown"
          class="p-2 rounded flex gap-2 items-center justify-center transition hover:bg-gray-200"
        >
          <span :style="{ color: currentTextColor }">
            <i class="fas fa-palette"></i>
          </span>
          <i class="fas fa-chevron-down ml-1"></i>
        </button>
        <div
          v-if="showColorDropdown"
          class="absolute bg-white border border-gray-300 rounded mt-1 z-10 p-2 flex gap-1"
        >
          <button
            @click.stop.prevent="formatText('foreColor', 'black')"
            class="size-4"
            style="background: black"
          ></button>
          <button
            @click.stop.prevent="formatText('foreColor', 'red')"
            class="size-4"
            style="background: red"
          ></button>
          <button
            @click.stop.prevent="formatText('foreColor', 'green')"
            class="size-4"
            style="background: green"
          ></button>
          <button
            @click.stop.prevent="formatText('foreColor', 'blue')"
            class="size-4"
            style="background: blue"
          ></button>
        </div>
      </div>

      <!-- Font Size Dropdown -->
      <div class="relative font-size-dropdown">
        <button
          @click.stop.prevent="showFontSizeDropdown = !showFontSizeDropdown"
          class="p-2 rounded flex gap-2 items-center justify-center transition hover:bg-gray-200"
        >
          {{ activeCommands.fontSize }}
          <i class="fas fa-chevron-down ml-1"></i>
        </button>
        <div
          v-if="showFontSizeDropdown"
          class="absolute bg-white border border-gray-300 rounded mt-1 z-10"
        >
          <button @click.stop.prevent="formatText('fontSize', '1')" class="p-2">10px</button>
          <button @click.stop.prevent="formatText('fontSize', '2')" class="p-2">13px</button>
          <button @click.stop.prevent="formatText('fontSize', '3')" class="p-2">16px</button>
          <button @click.stop.prevent="formatText('fontSize', '4')" class="p-2">18px</button>
          <button @click.stop.prevent="formatText('fontSize', '5')" class="p-2">24px</button>
          <button @click.stop.prevent="formatText('fontSize', '6')" class="p-2">32px</button>
          <button @click.stop.prevent="formatText('fontSize', '7')" class="p-2">48px</button>
        </div>
      </div>
    </div>
    <div
      ref="editor"
      contenteditable="true"
      @input="onDescriptionInput"
      class="editable-div border border-gray-300 p-4 rounded-md min-h-[200px] focus:outline-sky-600 max-h-[1000px] bg-white overflow-auto resize-y whitespace-normal"
      placeholder="Description"
    ></div>
  </div>
</template>

<style>
[contenteditable='true'] ul,
[contenteditable='true'] ol {
  padding-left: 20px;
}

[contenteditable='true'] ul {
  list-style-type: disc;
}

[contenteditable='true'] ol {
  list-style-type: decimal;
}

.size-4 {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}

/* Allow resizing and show scrollbar when needed */
.editable-div {
  resize: vertical; /* allows vertical resizing */
  overflow: auto; /* scrolls when content exceeds max height */
}
</style>
