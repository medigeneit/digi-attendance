<script lang="ts" setup>
import { computed } from 'vue'
type Task = {
  id: number | string
  status: string
  completed_count: number
  children_task_count: number
  children_tasks: Task[]
}
const props = defineProps<{ task: Task }>()

const completedSubTaskCount = computed(function () {
  return props.task.completed_count
})

const completedPercentage = computed<number>(() => {
  if (props.task.children_task_count === 0) {
    return props.task.status === 'COMPLETED' ? 100 : 0
  }

  return (completedSubTaskCount.value / props.task.children_task_count) * 100
})

const progressColor = computed<{ container: string; bar: string; text: string }>(() => {
  const percent: number = completedPercentage.value

  let container: string, bar: string, text: string

  if (percent === 100) {
    container = 'bg-green-50'
    bar = 'bg-green-200'
    text = 'text-green-600 '
  } else if (percent < 100) {
    container = 'bg-red-50'
    bar = 'bg-red-200'
    text = 'text-red-600 '
  }

  return {
    container,
    bar,
    text,
  }
})

defineExpose({
  completedPercentage,
  completedSubTaskCount,
})
</script>

<template>
  <div>
    <div
      class="rounded-full py-0.5 relative overflow-hidden h-6"
      :class="progressColor.container"
      v-if="task.children_task_count > 0"
    >
      <div
        class="z-10 absolute top-0 bottom-0"
        :style="`width: ${completedPercentage}%`"
        :class="progressColor.bar"
      ></div>
      <span
        class="z-20 absolute inset-0 gap-1 text-center h-full flex justify-center items-center"
        :class="progressColor.text"
      >
        <span>
          <span>{{ completedSubTaskCount }}</span> /
          <span>{{ task.children_task_count }}</span>
        </span>
      </span>
    </div>
  </div>
</template>
