<script setup lang="ts">
import { useSortable } from '@vueuse/integrations/useSortable'
import { shallowRef, useTemplateRef, watch } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  handle: String,
})

const el = useTemplateRef<HTMLElement>('el')
const list = shallowRef([...props.items])

watch(
  () => props.items,
  (val) => {
    list.value = [...val]
  },
)

const emit = defineEmits(['itemsUpdate'])
watch(
  () => list.value,
  function (val) {
    emit('itemsUpdate', val)
  },
)

useSortable(el, list, {
  animation: 150,
  ...(props.handle ? { handle: '.handle' } : {}),
})

defineExpose({
  resetItems: () => {
    list.value = [...props.items]
    emit('itemsUpdate', props.items)
  },
  list: list.value,
})
</script>

<template>
  <div ref="el">
    <template v-for="(item, index) in list" :key="item.id">
      <slot name="item" :item="item" :index="index"></slot>
    </template>
  </div>
</template>
