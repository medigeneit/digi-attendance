<script setup>
import UserChip from '@/components/user/UserChip.vue'
import { mapAndFilterTask } from '@/libs/task-tree'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TaskTreeViewWithSubTable from './TaskTreeViewWithSubTable.vue'

const props = defineProps({
  tasks: Array,
  selectedUserId: { type: String, default: null },
  isMyTask: { Boolean, default: false },
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
  <div class="w-full">
    <table class="w-full table-fixed bg-white rounded-md">
      <tbody>
        <template v-for="taskUser in taskUsers" :key="taskUser.id">
          <tr>
            <td class="border rounded-md align-top bg-blue-50">
              <!-- :rowspan="Math.max(taskUser.tasks.length, 1)" -->
              <div>
                <div
                  class="sticky top-16 py-2 px-2 z-40 bg-blue-100/70"
                  v-if="taskUser.tasks?.length > 0"
                >
                  <UserChip :user="taskUser" class="" />
                </div>

                <div class="space-y-4 mt-4">
                  <TaskTreeViewWithSubTable
                    v-for="(task, taskIndex) in taskUser.tasks"
                    :key="task.id"
                    :task="task"
                    class="!border-0"
                    :index="taskIndex"
                    :isMyTask="isMyTask"
                    @commentButtonClick="emit('commentButtonClick', item.id)"
                    @editClick="(taskId) => emit('editClick', taskId)"
                    @addClick="(taskId) => emit('addClick', taskId)"
                    @employeeAssignClick="(taskId) => emit('employeeAssignClick', taskId)"
                  />
                </div>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
