<script setup>
import UserChip from '@/components/user/UserChip.vue'
import { mapAndFilterTask } from '@/libs/task-tree'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TaskTreeViewWithSubTable from './TaskTreeViewWithSubTable.vue'

const props = defineProps({
  tasks: Array,
  selectedUserId: { type: String, default: null },
})

const route = useRoute()

const emit = defineEmits([
  'commentButtonClick',
  'editClick',
  'addClick',
  'updatePriority',
  'employeeAssignClick',
])
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
  // const taskMap = new Map(tasks.map((t) => [t.id, t]))
  // const visited = new Set()
  // const result = []

  // Step 1: Find tasks explicitly assigned to the given user
  const userTasks = tasks.filter((t) => t.users.some((u) => u.id === userId))

  return mapAndFilterTask(userTasks, { ...route.query, 'user-ids': userId })
}

const taskUsers = computed(() => {
  return users.value.map((u) => {
    // const tasks = getTreeList(getUserAllTasks(u.id), 0)
    const tasks = getUserAllTasks(u.id)
    return { ...u, tasks }
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
              class="border p-4 align-top border-green-300 bg-blue-50"
              v-if="taskIndex == 0"
              :rowspan="Math.max(taskUser.tasks.length, 1)"
            >
              <UserChip :user="taskUser" class="sticky top-[8rem]" />
            </td>

            <td
              class="py-4 px-4 border-x border-green-300 bg-blue-50"
              :class="{
                'border-t': taskIndex == 0,
                'border-b': taskUser.tasks.length - 1 === taskIndex,
              }"
            >
              <TaskTreeViewWithSubTable
                :task="task"
                class="!border-0 my-0"
                :index="taskIndex"
                @commentButtonClick="emit('commentButtonClick', item.id)"
                @editClick="(taskId) => emit('editClick', taskId)"
                @addClick="(taskId) => emit('addClick', taskId)"
                @employeeAssignClick="(taskId) => emit('employeeAssignClick', taskId)"
              />
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
