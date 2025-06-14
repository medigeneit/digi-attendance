<template>
  <div class="list">
    <div
      v-for="(item, index) in items"
      :key="item.id"
      draggable="true"
      :class="{
        //dragging: index === dragIndex,
        //'drag-over': index === dragOverIndex && dragIndex !== index,
      }"
      @dragstart="dragStart(index, $event)"
      @dragend="dragEnd"
      @dragover.prevent="handleDragover(index)"
      @drop="drop(index)"
    >
      <!-- <div class="drag-handle" @mousedown.stop="prepareToDrag(index)">
        <slot name="handle" :item="item" :index="index">☰</slot>
      </div> -->

      <button @mousedown.stop="prepareToDrag(index)">
        <i class="fas fa-arrows-alt text-gray-500 cursor-grab"></i>
      </button>
      <slot
        name="item"
        :item="item"
        :dragging="index === dragIndex"
        :dragOver="index === dragOverIndex && dragIndex !== index"
        :index="index"
        :handleDragging="() => prepareToDrag(index)"
        >{{ index }}</slot
      >
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: Array,
})
const emit = defineEmits(['update:modelValue'])

const items = ref([...props.modelValue])

watch(
  () => props.modelValue,
  (val) => {
    items.value = [...val]
  },
)

const dragIndex = ref(null)
const dragOverIndex = ref(null)
const allowedDragIndex = ref(null)

function prepareToDrag(index) {
  allowedDragIndex.value = index
}

function dragStart(index, e) {
  e.stopPropagation()

  if (allowedDragIndex.value !== index) {
    e.preventDefault()
    return
  }
  dragIndex.value = index
  dragOverIndex.value = null
}

function handleDragover(index) {
  dragOverIndex.value = index
}

function drop(dropIndex) {
  if (dragIndex.value === null || dragIndex.value === dropIndex) return

  const updated = [...items.value]
  const movedItem = updated.splice(dragIndex.value, 1)[0]
  updated.splice(dropIndex, 0, movedItem)

  items.value = updated
  emit('update:modelValue', updated)

  dragIndex.value = null
  dragOverIndex.value = null
  allowedDragIndex.value = null
}

function dragEnd() {
  dragIndex.value = null
  dragOverIndex.value = null
  allowedDragIndex.value = null
}
</script>
