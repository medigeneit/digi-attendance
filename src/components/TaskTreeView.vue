<template>
  <div
    class="border rounded py-3 group px-3"
    :class="getPercentage() === 100 ? 'bg-green-50 ' : 'bg-gray-50'"
  >
    <div class="items-start grid grid-cols-3">
      <div class="">
        <RouterLink
          :to="{
            name: 'TaskShow',
            params: { id: task.id },
          }"
          class="font-medium text-gray-700 cursor-pointer hover:text-sky-700"
        >
          {{ task.title }}
        </RouterLink>

        <p class="text-sm text-gray-500 mt-2" v-if="task?.requirement">
          Requirement: {{ task?.requirement?.title }}
        </p>

        <div class="flex items-center gap-2 text-xs text-gray-500 mt-2 opacity-50">
          <span
            class="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800 border border-blue-200"
            >{{ task.status }}</span
          >
          <span class="text-xs px-2 py-0.5 rounded border" :class="priorityColor(task.priority)">
            {{ task.priority }}
          </span>
        </div>
      </div>

      <div class="flex items-start flex-wrap gap-3">
        <div
          class="flex items-center gap-2 border rounded-full px-1 py-0.5 bg-slate-100 shadow-sm"
          v-for="(item, index) in task.users"
          :key="index"
        >
          <div
            class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600"
          >
            {{ getInitials(item?.name) }}
          </div>
          <span class="text-xs text-gray-700 mr-2">{{ item?.name }}</span>
        </div>
      </div>

      <div class="flex justify-end items-center">
        <div class="text-sm">
          <!-- <span class="text-gray-400 uppercase text-xs">Status </span> -->
          <div
            class="rounded-full border py-0.5 text-xs relative overflow-hidden h-6"
            style="width: 180px"
            :class="progressColor().container"
          >
            <div
              class="z-10 absolute top-0 bottom-0"
              :style="`width: ${getPercentage()}%`"
              :class="progressColor().bar"
            ></div>
            <span
              class="z-20 absolute inset-0 gap-1 text-center h-full flex justify-center items-center"
              :class="progressColor().text"
            >
              <span>
                <span>{{ getCompletedSubTaskCount() }}</span> /
                <span>{{ task.children_tasks.length || 1 }}</span>
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-4">
      <div class="flex items-center">
        <div
          class="flex gap-3 group items-center"
          @click="task.children_tasks?.length > 0 ? (showSubTask = !showSubTask) : null"
        >
          <i
            v-if="showSubTask"
            class="fas fa-caret-down text-gray-400 group-hover:text-sky-400"
          ></i>
          <i v-else class="fas fa-caret-right text-gray-400 group-hover:text-sky-400"></i>
          <span :class="subTaskHeadingClass" class="text-xs text-gray-500">
            Sub Tasks ({{ task.children_tasks?.length }})
          </span>
        </div>
        <div class="flex gap-2 ml-auto items-center" v-if="!hideButtons">
          <RouterLink :to="{ name: 'TaskEdit', params: { id: task.id } }" class="btn-2 py-0.5"
            >Edit</RouterLink
          >

          <RouterLink
            :to="{ name: 'TaskUserAssign', params: { id: task?.id } }"
            class="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-3 py-1 rounded-full transition border-2"
          >
            Assign Users
          </RouterLink>

          <RouterLink
            :to="{ name: 'TaskAdd', query: { parent_id: task?.id } }"
            class="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-3 py-1 rounded-full transition border-2"
            @click="$event.stopPropagation()"
          >
            + Sub Task
          </RouterLink>
          <button
            class="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-3 py-1 rounded-full transition border-2"
            @click="emits('commentButtonClick', task?.id)"
          >
            + Comment
          </button>
        </div>
      </div>
      <div class="ml-6">
        <TaskTreeChildren
          v-if="showSubTask"
          :childrenTasks="task.children_tasks"
          :hide-buttons="hideButtons"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import TaskTreeChildren from '@/components/TaskTreeChildren.vue'
import { computed, ref } from 'vue'
const props = defineProps({
  task: { type: Object, required: true },
  hideButtons: { type: Boolean, default: false },
})

const emits = defineEmits(['commentButtonClick'])

const showSubTask = ref(false)

const subTaskHeadingClass = computed(() => {
  return {
    'hover:underline hover:text-sky-400 cursor-pointer': props.task?.children_tasks?.length > 0,
    'cursor-default pointer-none': props.task?.children_tasks?.length === 0,
  }
})

const getInitials = (name) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

const priorityColor = (priority) => {
  switch (priority) {
    case 'HIGH':
      return 'border-red-500 text-red-500'
    case 'MEDIUM':
      return 'border-yellow-500 text-yellow-500'
    default:
      return 'border-gray-300 text-gray-500'
  }
}

const progressColor = (priority) => {
  const percent = getPercentage()

  let container, bar, text

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
}

// function getCompletedSubTaskCount() {
//   if (props.task.children_tasks.length === 0) {
//     return props.task.status === 'COMPLETED' ? 1 : 0
//   }

//   const getChildrenCompletedCount = (childrenTasks) => {
//     let count = 0
//     let i = 0

//     for (i = 0; i < childrenTasks.length; i++) {
//       if (childrenTasks[i].children_tasks.length === 0) {
//         count = childrenTasks[i].status === 'COMPLETED' ? 1 : 0
//       } else {
//         count +=
//           childrenTasks[i].children_tasks.length ===
//           getChildrenCompletedCount(childrenTasks[i].children_tasks)
//             ? 1
//             : 0
//       }
//     }

//     return count
//   }

//   return getChildrenCompletedCount(props.task.children_tasks)
// }

function getCompletedSubTaskCount() {
  if (props.task.children_tasks.length === 0) {
    return props.task.status === 'COMPLETED' ? 1 : 0
  }

  const getChildrenCompletedCount = (childrenTasks) => {
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
}

function getPercentage() {
  if (props.task.children_tasks.length === 0) {
    return props.task.status === 'COMPLETED' ? 100 : 0
  }

  return (getCompletedSubTaskCount() / props.task.children_tasks.length) * 100
}
</script>
