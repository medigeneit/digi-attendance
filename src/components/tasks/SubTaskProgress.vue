<script lang="ts" setup>
import { computed } from 'vue'
type Task = { id: number | string; status: string; children_tasks: Task[] }
const props = defineProps<{ task: Task }>()

const completedSubTaskCount = computed(function () {
  if (props.task.children_tasks.length === 0) {
    return props.task.status === 'COMPLETED' ? 1 : 0
  }

  const getChildrenCompletedCount = (childrenTasks: Task[]) => {
    let count = 0

    for (let i = 0; i < childrenTasks.length; i++) {
      const child = childrenTasks[i]

      if (child.children_tasks.length === 0) {
        if (child.status === 'COMPLETED') count += 1
      } else {
        // Recursive call
        const total = child.children_tasks.length
        const completed = getChildrenCompletedCount(child.children_tasks)
        if (completed === total) count += 1
      }
    }

    return count
  }

  return getChildrenCompletedCount(props.task.children_tasks)
})

const completedPercentage = computed<number>(() => {
  if (props.task.children_tasks.length === 0) {
    return props.task.status === 'COMPLETED' ? 100 : 0
  }

  return (completedSubTaskCount.value / props.task.children_tasks.length) * 100
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
  completedPercentage: completedPercentage.value,
  completedSubTaskCount: completedSubTaskCount.value,
})
</script>

<template>
  <div>
    <div
      class="rounded-full border py-0.5 relative overflow-hidden h-6"
      style="width: 180px"
      :class="progressColor.container"
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
          <span>{{ task.children_tasks.length || 1 }}</span>
        </span>
      </span>
    </div>
  </div>
</template>
