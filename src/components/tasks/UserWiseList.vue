<script setup>
import TaskTreeView from '@/components/TaskTreeView.vue'
import UserChip from '@/components/user/UserChip.vue'
import { getTreeList } from '@/libs/task-tree.js'
import { computed } from 'vue'

const props = defineProps({
  tasks: Array,
  selectedUserId: { type: String, default: null },
})

const emit = defineEmits(['commentButtonClick', 'editClick', 'addClick', 'updatePriority'])
const users = computed(() => {
  return props.tasks
    .reduce((users, task) => {
      users.push(...task.users.filter((tu) => !users.find((u) => u.id == tu.id && tu.id)))

      return users
    }, [])
    .filter((u) => {
      if (props.selectedUserId) {
        return u.id == props.selectedUserId
      }
      return true
    })
})

const getUserAllTasks = (userId) => {
  const tasks = props.tasks
  const taskMap = new Map(tasks.map((t) => [t.id, t]))
  const visited = new Set()
  const result = []

  // Step 1: Find tasks explicitly assigned to the given user
  const userTasks = tasks.filter((t) => t.users.some((u) => u.id === userId))

  for (const task of userTasks) {
    if (!visited.has(task.id)) {
      visited.add(task.id)
      result.push(task)
    }

    // Step 2: Climb up the tree and include parent tasks (even if from another user)
    let parentId = task.parent_id
    while (parentId && taskMap.has(parentId) && !visited.has(parentId)) {
      const parentTask = taskMap.get(parentId)
      visited.add(parentTask.id)
      result.push(parentTask)
      parentId = parentTask.parent_id
    }
  }

  return result
}

const taskUsers = computed(() => {
  return users.value.map((u) => {
    const tasks = getTreeList(getUserAllTasks(u.id), 0)
    return { ...u, ...{ tasks } }
  })
})
</script>

<template>
  <div>
    <table class="w-full bg-white rounded">
      <tbody>
        <template v-for="taskUser in taskUsers" :key="taskUser.id">
          <tr v-for="(task, taskIndex) in taskUser.tasks" :key="task.id">
            <td
              class="border p-4 align-top"
              v-if="taskIndex == 0"
              :rowspan="Math.max(taskUser.tasks.length, 1)"
            >
              <UserChip :user="taskUser" class="sticky top-[80px]" />
            </td>

            <td class="">
              <TaskTreeView
                :task="task"
                class="!border-0"
                :index="taskIndex"
                @commentButtonClick="emit('commentButtonClick', item.id)"
                @editClick="(taskId) => emit('editClick', taskId)"
                @addClick="(taskId) => emit('addClick', taskId)"
              >
                <template #item-override="{ task, level }">{{ { task, level } }} </template>
              </TaskTreeView>
              <!-- #{{ task.id }} - {{ task.title }} -->
            </td>
            <!-- <td class="border p-4">
              {{ task.parent_id }}
            </td>
            <td class="border p-4">
              {{ task.users.find((tu) => tu.id == taskUser.id)?.name }}
            </td>
            <td class="border p-4"></td>
            <td class="border p-4"></td> -->
          </tr>
        </template>
      </tbody>
    </table>
  </div>
  <!-- <pre>{{ userTasks }}</pre>
  <pre>{{ users }}</pre>
  <pre>{{ tasks }}</pre> -->
</template>
