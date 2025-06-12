<script setup>
import SubTaskList from '@/components/tasks/SubTaskList.vue'
import { useTaskTree } from '@/libs/task-tree'
import { useTaskStore } from '@/stores/useTaskStore'
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const store = useTaskStore()
const route = useRoute()
const router = useRouter()

const taskTree = useTaskTree()
const subTasks = computed(() => taskTree.getTaskListTree())

onMounted(async () => {})

const goToEdit = (id) => {
  router.push({ name: 'TaskEdit', params: { id } })
}

const backLink = computed(() => {
  if (store.task.parent_id == 0) {
    return { name: 'TaskList', params: { id: store.task?.id } }
  }
  return { name: 'TaskShow', params: { id: store.task?.parent_id } }
})

async function fetchTaskList(taskId) {
  const taskResponse = await store.fetchTask(taskId)
  taskTree.setTaskList(taskResponse.sub_tasks, store.task.id)
}

watch(() => route.params.id, fetchTaskList, {
  initial: true,
  immediate: true,
})
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="max-w-8xl min-h-64 mx-auto bg-white shadow-lg rounded-lg p-6">
      <!-- {{ store.task }} -->
      <!-- <pre>{{ subTasks }}</pre> -->

      <template v-if="store.task">
        <section class="grid grid-cols-4">
          <div class="py-2 font-medium col-span-full text-xl">{{ store.task.title }}</div>

          <div class="py-2 font-medium mb-4 col-span-full md:col-span-2">
            <div class="text-xs mb-0.5 text-gray-600 uppercase">Assigns</div>
            <div class="flex gap-2 flex-wrap">
              <span
                @click="$event.stopPropagation()"
                v-for="user in store.task.users"
                :key="user.id"
                class="btn-1 !inline-flex flex-shrink-0"
              >
                <i class="fad fa-user"></i>
                {{ user?.name }}
              </span>
            </div>
          </div>

          <div class="py-2 col-span-full md:col-span-1">
            <div class="flex items-center gap-2 text-xs text-gray-500 mt-2 opacity-80 text-left">
              <span
                class="text-xs px-2 py-0.5 rounded-full border bg-yellow-800 text-white"
                v-if="store.task?.is_important"
                >IMPORTANT</span
              >

              <span
                class="text-xs px-2 py-0.5 rounded-full border bg-red-500 text-white"
                v-if="store.task?.is_urgent"
                >URGENT</span
              >
            </div>
            <!-- <div class="text-xs mb-0.5 text-gray-600 uppercase">Priority</div>
            <span
              :class="{
                'text-green-600': store.task?.priority === 'LOW',
                'text-yellow-600': store.task?.priority === 'MEDIUM',
                'text-orange-600': store.task?.priority === 'HIGH',
                'text-red-600': store.task?.priority === 'CRITICAL',
              }"
              class="font-semibold"
            >
              {{ store.task.priority }}
            </span> -->
          </div>
          <div class="py-4 text-right col-span-full md:col-span-1">
            <span
              :class="{
                'bg-gray-200': store.task?.status === 'PENDING',
                'bg-blue-200': store.task?.status === 'IN_PROGRESS',
                'bg-green-200': store.task?.status === 'COMPLETED',
                'bg-red-200': store.task?.status === 'BLOCKED',
              }"
              class="px-3 py-0.5 rounded-full"
            >
              {{ store.task?.status }}
            </span>
          </div>

          <hr class="my-3 col-span-full" />

          <div class="py-2 flex justify-center items-center gap-2 col-span-full">
            <button @click.stop="goToEdit(store.task?.id)" class="btn-2">Edit</button>

            <RouterLink
              :to="{ name: 'TaskUserAssign', params: { id: store.task?.id } }"
              class="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-3 py-1 rounded-full transition"
              @click="$event.stopPropagation()"
            >
              <i class="fas fa-user-plus"></i> Assign Users
            </RouterLink>

            <RouterLink
              :to="backLink"
              class="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-3 py-1 rounded-full transition"
              @click="$event.stopPropagation()"
            >
              <i class="fas fa-arrow-left"></i> Back
            </RouterLink>

            <!-- 
              <button
                @click="openComment($event, store.task?.id)"
                class="bg-indigo-500 text-white px-3 py-1 rounded-full"
              >
                <i class="fas fa-plus"></i> Comment
              </button> 
            -->

            <div class="ml-auto flex gap-4">
              <RouterLink
                :to="{
                  name: 'TaskShow',
                  params: { id: store.task?.id },
                }"
                @click="$event.stopPropagation()"
                class="py-1 btn-3 ml-auto"
                :class="{ 'bg-blue-500 text-white': route.name == 'TaskShow' }"
                v-if="subTasks.length > 0"
              >
                <i class="fal fa-list-ul"></i> Sub Tasks
              </RouterLink>

              <RouterLink
                :to="{
                  name: 'TaskReports',
                  params: { id: store.task?.id },
                }"
                @click="$event.stopPropagation()"
                class="py-1 btn-3"
                :class="{ 'bg-blue-500 text-white': route.name == 'TaskReports' }"
              >
                <i class="fal fa-file-alt"></i> Reports
              </RouterLink>
            </div>
          </div>
        </section>

        <section v-if="route.name == 'TaskShow'">
          <SubTaskList
            :subTasks="subTasks"
            :parent-id="route.params.id"
            @created="fetchTaskList(route.params.id)"
            @updated="fetchTaskList(route.params.id)"
          />
        </section>

        <section v-else>
          <router-view />
        </section>
      </template>

      <div v-else-if="store.loading" class="text-center py-4 text-gray-500">
        Loading task details...
      </div>
      <div v-else class="text-center py-4 text-red-500">
        {{ store.error }}
      </div>
    </div>
    <!-- 
    <CommentModal
      :show="showCommentModal"
      :commentable-id="selectedTaskId"
      commentable-type="task"
      :user-id="userId"
      :on-close="closeComment"
      @submitted="store.fetchTasks"
    /> -->
  </div>
</template>
