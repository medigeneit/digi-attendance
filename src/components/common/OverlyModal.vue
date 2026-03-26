<script setup>
import { onBeforeUnmount, onMounted } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: true,
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true,
  },
  closeOnEscape: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['close'])

const close = () => emit('close')

const handleBackdropClick = () => {
  if (props.closeOnBackdrop) {
    close()
  }
}

const handleEscape = (event) => {
  if (props.show && props.closeOnEscape && event.key === 'Escape') {
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 sm:p-6"
    @click.self="handleBackdropClick"
  >
    <div
      class="body max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]"
      @click.stop
    >
      <slot></slot>
    </div>
  </div>
</template>
