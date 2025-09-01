<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
const lineClamps = [
  '',
  ' line-clamp-1 ',
  ' line-clamp-2 ',
  ' line-clamp-3 ',
  ' line-clamp-4 ',
  ' line-clamp-5 ',
  ' line-clamp-6 ',
  ' line-clamp-7 ',
  ' line-clamp-8 ',
  ' line-clamp-9 ',
  ' line-clamp-10 ',
]
const props = defineProps({
  lineClamp: { type: [String, Number], default: 2 },
  className: { type: Object, default: () => {} },
})

const lineClampClass = ref(lineClamps[props.lineClamp])
const isOverflowing = ref(false)
const descriptionEl = ref(null)

function checkOverflow() {
  const el = descriptionEl.value
  //console.log(el)
  if (!el) return
  //console.log(`${el.scrollHeight} => ${el.clientHeight}`)

  // Check if content is taller than element’s visible height
  isOverflowing.value = el.scrollHeight > el.clientHeight
}

function handleShowMoreClick() {
  lineClampClass.value = lineClampClass.value ? '' : lineClamps[props.lineClamp]
  nextTick(() => checkOverflow())
}

let observer = null
onMounted(() => {
  checkOverflow()
  window.addEventListener('resize', () => checkOverflow())
  observer = new MutationObserver(() => checkOverflow())

  observer.observe(descriptionEl.value, {
    childList: true, // watch for added/removed nodes
    subtree: true, // watch inside children
    characterData: true, // watch text changes
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkOverflow)
  if (observer) observer.disconnect()
})
</script>
<template>
  <div>
    <p
      ref="descriptionEl"
      class="print:line-clamp-none"
      :class="lineClampClass + (props?.className?.paragraph || '')"
    >
      <slot></slot>
    </p>
    <button
      v-if="isOverflowing || lineClampClass === ''"
      class="text-blue-500 hover:text-sky-400 ml-auto text-sm print:hidden mt-2"
      :class="props?.className?.button || ''"
      @click.prevent="handleShowMoreClick"
    >
      <slot name="btnText" :lineClampClass="lineClampClass" :isOverflowing="isOverflowing">
        {{ lineClampClass ? 'Show More' : 'Show Less' }}
      </slot>
    </button>
  </div>
</template>
