<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  mentionableUsers: { type: Array, default: () => [] },
  mentionableTasks: { type: Array, default: () => [] },
  currentUser: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue'])

const editor = ref(null)

const focus = () => {
  editor.value?.focus()
}

defineExpose({ focus })

// Mention system state
const showMentionList = ref(false)
const showTaskList = ref(false)
const mentionSearch = ref('')
const taskSearch = ref('')
const mentionListIndex = ref(0)
const taskListIndex = ref(0)
const mentionPosition = ref({ top: 0, left: 0 })

const filteredUsers = computed(() => {
  const users = props.mentionableUsers.filter((user) => user.id !== props.currentUser?.id)
  if (!mentionSearch.value) return users
  return users.filter((user) => user.name.toLowerCase().includes(mentionSearch.value.toLowerCase()))
})

const filteredTasks = computed(() => {
  if (!taskSearch.value) return props.mentionableTasks
  return props.mentionableTasks.filter(
    (task) =>
      task.title.toLowerCase().includes(taskSearch.value.toLowerCase()) ||
      String(task.id).includes(taskSearch.value),
  )
})

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

// Mention system logic
const updateMentionPosition = () => {
  const selection = window.getSelection()
  if (!selection.rangeCount) return
  const range = selection.getRangeAt(0).cloneRange()
  range.collapse(false)

  const rects = range.getClientRects()
  if (rects.length > 0) {
    const rect = rects[0]
    // Position relative to the editor container or absolute?
    // Absolute position relative to viewport might be easier with teleports or just fixed position
    mentionPosition.value = {
      top: rect.bottom + 5,
      left: rect.left,
    }
  }
}

const handleEditorKeydown = (e) => {
  if (showMentionList.value) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      mentionListIndex.value = (mentionListIndex.value + 1) % filteredUsers.value.length
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      mentionListIndex.value =
        (mentionListIndex.value - 1 + filteredUsers.value.length) % filteredUsers.value.length
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredUsers.value[mentionListIndex.value]) {
        insertMention(filteredUsers.value[mentionListIndex.value])
      }
    } else if (e.key === 'Escape') {
      showMentionList.value = false
    }
  } else if (showTaskList.value) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      taskListIndex.value = (taskListIndex.value + 1) % filteredTasks.value.length
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      taskListIndex.value =
        (taskListIndex.value - 1 + filteredTasks.value.length) % filteredTasks.value.length
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredTasks.value[taskListIndex.value]) {
        insertTaskMention(filteredTasks.value[taskListIndex.value])
      }
    } else if (e.key === 'Escape') {
      showTaskList.value = false
    }
  }
}

const onEditorKeyUp = () => {
  const selection = window.getSelection()
  if (!selection.rangeCount) return

  const range = selection.getRangeAt(0)
  if (range.startContainer.nodeType !== Node.TEXT_NODE) {
    showMentionList.value = false
    showTaskList.value = false
    return
  }

  const textBefore = range.startContainer.textContent.substring(0, range.startOffset)

  // Handle @ User Mention
  const lastAt = textBefore.lastIndexOf('@')
  const lastHash = textBefore.lastIndexOf('#')
  const lastSpace = textBefore.lastIndexOf(' ')
  const lastNewline = textBefore.lastIndexOf('\n')
  const lastDelimiter = Math.max(lastSpace, lastNewline)

  if (lastAt !== -1 && lastAt >= lastDelimiter) {
    if (lastAt > 0 && !/\s/.test(textBefore[lastAt - 1])) {
      showMentionList.value = false
    } else {
      const search = textBefore.substring(lastAt + 1)
      if (search.includes(' ')) {
        showMentionList.value = false
      } else {
        mentionSearch.value = search
        showMentionList.value = true
        showTaskList.value = false
        mentionListIndex.value = 0
        updateMentionPosition()
        return
      }
    }
  } else {
    showMentionList.value = false
  }

  // Handle # Task Mention
  if (lastHash !== -1 && lastHash >= lastDelimiter) {
    if (lastHash > 0 && !/\s/.test(textBefore[lastHash - 1])) {
      showTaskList.value = false
    } else {
      const search = textBefore.substring(lastHash + 1)
      if (search.includes(' ')) {
        showTaskList.value = false
      } else {
        taskSearch.value = search
        showTaskList.value = true
        showMentionList.value = false
        taskListIndex.value = 0
        updateMentionPosition()
        return
      }
    }
  } else {
    showTaskList.value = false
  }
}

const insertMention = (user) => {
  const selection = window.getSelection()
  if (!selection.rangeCount) return
  const range = selection.getRangeAt(0)

  const textNode = range.startContainer
  const textBefore = textNode.textContent.substring(0, range.startOffset)
  const lastAt = textBefore.lastIndexOf('@')

  if (lastAt !== -1) {
    range.setStart(textNode, lastAt)
    range.deleteContents()

    const mentionSpan = document.createElement('span')
    mentionSpan.className = 'mention-item text-blue-600 font-semibold'
    mentionSpan.dataset.userId = user.id
    mentionSpan.textContent = `@${user.name}`
    mentionSpan.contentEditable = 'false'

    range.insertNode(mentionSpan)

    const space = document.createTextNode('\u00A0')
    mentionSpan.after(space)

    range.setStartAfter(space)
    range.setEndAfter(space)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  showMentionList.value = false
  onDescriptionInput()
}

const insertTaskMention = (task) => {
  const selection = window.getSelection()
  if (!selection.rangeCount) return
  const range = selection.getRangeAt(0)

  const textNode = range.startContainer
  const textBefore = textNode.textContent.substring(0, range.startOffset)
  const lastHash = textBefore.lastIndexOf('#')

  if (lastHash !== -1) {
    range.setStart(textNode, lastHash)
    range.deleteContents()

    const taskSpan = document.createElement('span')
    taskSpan.className = 'task-mention text-amber-600 font-semibold cursor-pointer underline'
    taskSpan.dataset.taskId = task.id
    taskSpan.textContent = `#${task.id}`
    taskSpan.title = task.title
    taskSpan.contentEditable = 'false'

    range.insertNode(taskSpan)

    const space = document.createTextNode('\u00A0')
    taskSpan.after(space)

    range.setStartAfter(space)
    range.setEndAfter(space)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  showTaskList.value = false
  onDescriptionInput()
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

  // Close mention list if clicking outside editor
  if (editor.value && !editor.value.contains(event.target)) {
    showMentionList.value = false
    showTaskList.value = false
  }
}

const handleGlobalKeydown = (event) => {
  if (event.key === 'Escape') {
    showMentionList.value = false
    showTaskList.value = false
    showAlignmentDropdown.value = false
    showColorDropdown.value = false
    showFontSizeDropdown.value = false
  }
}

const handleScroll = () => {
  if (showMentionList.value || showTaskList.value) {
    updateMentionPosition()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('scroll', handleScroll, true) // Capture scroll events from any element
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('scroll', handleScroll, true)
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
      @keyup="onEditorKeyUp"
      @keydown="handleEditorKeydown"
      class="editable-div border border-gray-300 p-4 rounded-md min-h-[200px] focus:outline-sky-600 max-h-[1000px] bg-white overflow-auto resize-y whitespace-normal"
      placeholder="Description"
    ></div>

    <!-- Mention List -->
    <Teleport to="body">
      <div
        v-if="showMentionList && filteredUsers.length"
        class="fixed z-[9999] bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto min-w-[200px]"
        :style="{
          top: `${mentionPosition.top}px`,
          left: `${mentionPosition.left}px`,
        }"
      >
        <div
          v-for="(user, index) in filteredUsers"
          :key="user.id"
          @mousedown.prevent="insertMention(user)"
          :class="[
            'px-4 py-2 cursor-pointer flex items-center gap-2 hover:bg-blue-50 border-b last:border-0',
            { 'bg-blue-100': index === mentionListIndex },
          ]"
        >
          <img
            v-if="user.photo"
            :src="user.photo"
            class="w-6 h-6 rounded-full object-cover"
            alt=""
          />
          <div
            v-else
            class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] uppercase text-gray-500 font-bold border border-gray-300"
          >
            {{ user.name.charAt(0) }}
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-medium">{{ user.name }}</span>
            <span v-if="user.department" class="text-[10px] text-gray-500 leading-none">
              {{ user.department.short_name || user.department.name }}
            </span>
          </div>
        </div>
      </div>

      <!-- Task List -->
      <div
        v-if="showTaskList && filteredTasks.length"
        class="fixed z-[9999] bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto min-w-[250px]"
        :style="{
          top: `${mentionPosition.top}px`,
          left: `${mentionPosition.left}px`,
        }"
      >
        <div
          v-for="(task, index) in filteredTasks"
          :key="task.id"
          @mousedown.prevent="insertTaskMention(task)"
          :class="[
            'px-4 py-2 cursor-pointer flex flex-col hover:bg-amber-50 border-b last:border-0',
            { 'bg-amber-100': index === taskListIndex },
          ]"
        >
          <div class="flex items-center justify-between gap-2 w-full">
            <span class="text-sm font-medium text-gray-800 truncate">{{ task.title }}</span>
            <span class="text-[10px] font-bold text-amber-600 shrink-0">#{{ task.id }}</span>
          </div>
          <div class="flex items-center gap-2 mt-0.5">
            <span
              class="text-[9px] uppercase font-bold px-1 rounded bg-gray-100 text-gray-500 border border-gray-200"
            >
              {{ task.status }}
            </span>
          </div>
        </div>
      </div>
    </Teleport>
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

.mention-item {
  display: inline-block;
  background-color: #e0f2fe;
  color: #0284c7;
  padding: 0 4px;
  border-radius: 4px;
  margin: 0 1px;
}

.task-mention {
  display: inline-block;
  background-color: #fef3c7;
  color: #b45309;
  padding: 0 4px;
  border-radius: 4px;
  margin: 0 1px;
}
</style>
