<script setup lang="ts">
import { useSortable } from '@vueuse/integrations/useSortable'
import { shallowRef, useTemplateRef, watch } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  handle: String,
})

const emit = defineEmits(['itemsUpdate'])

const el = useTemplateRef<HTMLElement>('el')
const _items = shallowRef([...props.items])

useSortable(el, _items, {
  animation: 150,
  ...(props.handle ? { handle: '.handle' } : {}),
})

watch(
  () => props.items,
  (newItems) => {
    _items.value = [...newItems]
  },
)

watch(
  () => _items.value,
  (newItems) => {
    emit('itemsUpdate', [...newItems])
  },
  { deep: true },
)

defineExpose({
  resetItems: () => {
    _items.value = [...props.items]
    emit('itemsUpdate', [...props.items])
  },
  items: _items.value,
})
</script>

<template>
  <div ref="el">
    <template v-for="(item, index) in _items" :key="item.id">
      <slot name="item" :item="item" :index="index"></slot>
    </template>
  </div>
</template>
