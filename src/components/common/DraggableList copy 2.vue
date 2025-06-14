<template>
  <div class="relative">
    <div class="space-y-2">
      <template
        v-for="(item, index) in itemsWithPlaceholder"
        :key="item?.id ?? 'placeholder' + index"
      >
        <div
          v-if="item === '__placeholder__'"
          class="bg-blue-100 text-blue-500 border border-dashed border-blue-400 rounded p-2 text-center"
        >
          Drop here
        </div>
        <div
          v-else
          class="bg-white border p-2 rounded flex items-center gap-2"
          :class="{ 'opacity-30': index === dragIndex }"
          draggable="true"
          @dragstart="dragStart(index, $event)"
          @dragend="dragEnd"
          @dragover.prevent="handleDragover(index)"
          @drop.prevent="drop(index)"
        >
          <button @mousedown.stop="prepareToDrag(index)">
            <i class="fas fa-arrows-alt text-gray-500 cursor-grab"></i>
          </button>
          {{ item.name }}
        </div>
      </template>
    </div>

    <!-- Floating ghost -->
    <div
      v-if="floatingItem"
      class="fixed pointer-events-none z-50 bg-white border shadow-md p-2 rounded w-48"
      :style="{ top: mouseY + 'px', left: mouseX + 'px' }"
    >
      {{ floatingItem.name }}
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: Array,
})
const emit = defineEmits(['update:modelValue'])

const items = ref([...props.modelValue])
watch(
  () => props.modelValue,
  (val) => (items.value = [...val]),
)

const dragIndex = ref(null)
const dragOverIndex = ref(null)
const allowedDragIndex = ref(null)
const floatingItem = ref(null)
const mouseX = ref(0)
const mouseY = ref(0)

function prepareToDrag(index) {
  allowedDragIndex.value = index
}

function dragStart(index, e) {
  if (allowedDragIndex.value !== index) {
    e.preventDefault()
    return
  }

  dragIndex.value = index
  floatingItem.value = items.value[index]

  // Hide native ghost image
  const ghost = document.createElement('div')
  ghost.style.position = 'absolute'
  ghost.style.top = '-9999px'
  document.body.appendChild(ghost)
  e.dataTransfer.setDragImage(ghost, 0, 0)
}

function handleDragover(index) {
  if (index !== dragIndex.value) {
    dragOverIndex.value = index
  }
}

function drop(index) {
  if (dragIndex.value === null || dragIndex.value === index) return

  const updated = [...items.value]
  const moved = updated.splice(dragIndex.value, 1)[0]
  updated.splice(index, 0, moved)

  items.value = updated
  emit('update:modelValue', updated)
  dragEnd()
}

function dragEnd() {
  dragIndex.value = null
  dragOverIndex.value = null
  allowedDragIndex.value = null
  floatingItem.value = null
}

const itemsWithPlaceholder = computed(() => {
  if (dragOverIndex.value === null || dragIndex.value === null) return items.value

  const list = [...items.value]
  list.splice(dragOverIndex.value, 0, '__placeholder__')
  if (dragOverIndex.value < dragIndex.value) {
    list.splice(dragIndex.value + 1, 1)
  } else {
    list.splice(dragIndex.value, 1)
  }
  return list
})

// Mouse tracking
const updateMousePosition = (e) => {
  mouseX.value = e.clientX + 10
  mouseY.value = e.clientY + 10
}
onMounted(() => window.addEventListener('mousemove', updateMousePosition))
onUnmounted(() => window.removeEventListener('mousemove', updateMousePosition))
</script>
