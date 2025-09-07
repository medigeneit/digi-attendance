<script setup lang="ts">
import { useSortable } from '@vueuse/integrations/useSortable'
import { shallowRef, useTemplateRef, watch } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  handle: String,
  idKey: { type: String, default: 'id' },
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
  (newItems, oldItems) => {
    if (!isEqual(newItems, oldItems)) {
      emit('itemsUpdate', [...newItems])
    }
  },
  { deep: true },
)

function isEqual(a: any, b: any): boolean {
  if (a === b) return true

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false

    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false
    }
    return true
  }

  if (typeof a === 'object' && a !== null && b !== null) {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)

    if (keysA.length !== keysB.length) return false

    for (let key of keysA) {
      if (!keysB.includes(key)) return false
      if (!isEqual(a[key], b[key])) return false
    }

    return true
  }

  return false
}

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
    <template
      v-for="(item, index) in _items"
      :key="(typeof item == 'object' ? item[idKey] : item) || index"
    >
      <div>
        <slot name="item" :item="item" :index="index"></slot>
      </div>
    </template>
  </div>
</template>
