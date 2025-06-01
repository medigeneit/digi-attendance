<!-- DraggableList.vue -->
<template>
  <div class="list">
    <div
      v-for="(item, index) in items"
      :key="item.id"
      class="list-item"
      draggable="true"
      @dragstart="dragStart(index)"
      @dragover.prevent
      @drop="drop(index)"
    >
      {{ item.name }}
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

let dragIndex = null

function dragStart(index) {
  dragIndex = index
}

function drop(dropIndex) {
  if (dragIndex === null || dragIndex === dropIndex) return

  const updated = [...items.value]
  const movedItem = updated.splice(dragIndex, 1)[0]
  updated.splice(dropIndex, 0, movedItem)

  items.value = updated
  emit('update:modelValue', updated)

  dragIndex = null
}
</script>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.list-item {
  padding: 10px;
  background: #f0f0f0;
  border: 1px dashed #ccc;
  cursor: grab;
}
</style>
