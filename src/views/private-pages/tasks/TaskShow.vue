<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/useTaskStore'

const store = useTaskStore()
const route = useRoute()
const router = useRouter()

const taskId = route.params.id
const loading = ref(false)

onMounted(async () => {
  await store.fetchTask(taskId)
})
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-6">
      <!-- {{ store.task }} -->

      <div v-if="store.loading" class="text-center py-4 text-gray-500">Loading task details...</div>

      <template v-else-if="store.task">
        <section class="hover:bg-gray-50 grid grid-cols-2">
          <div class="py-2 font-medium col-span-full text-xl">{{ store.task.title }}</div>

          <div class="py-2 font-medium mb-4 col-span-full">
            <div class="text-xs mb-0.5 text-gray-600 uppercase">Assign Persons</div>
            <span
              @click="$event.stopPropagation()"
              v-for="user in store.task.users"
              :key="user.id"
              class="btn-1 !inline-flex"
            >
              <i class="fad fa-user"></i>
              {{ user?.name }}
            </span>
          </div>

          <div class="py-2">
            <div class="text-xs mb-0.5 text-gray-600 uppercase">Priority</div>
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
            </span>
          </div>
          <div class="py-2">
            <div class="text-xs mb-0.5 text-gray-600 uppercase">Status</div>
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

          <div class="px-4 py-2 flex justify-center items-center gap-2 col-span-full">
            <button @click="goToEdit(store.task?.id)" class="btn-2">Edit</button>

            <RouterLink
              :to="{ name: 'TaskUserAssign', params: { id: store.task?.id } }"
              class="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-3 py-1 rounded-full transition"
              @click="$event.stopPropagation()"
            >
              Assign Users
            </RouterLink>

            <button
              @click="openComment($event, store.task?.id)"
              class="bg-indigo-500 text-white px-3 py-1 rounded-full"
            >
              + Comment
            </button>
            <RouterLink
              :to="{
                name: 'TodoAdd',
                params: { todoable_id: store.task?.id },
              }"
              @click="$event.stopPropagation()"
              class="py-1 btn-3 ml-auto"
              >Add Todo</RouterLink
            >
            <RouterLink
              :to="{
                name: 'TaskReports',
                params: { id: store.task?.id },
              }"
              @click="$event.stopPropagation()"
              class="py-1 btn-3"
              >Reports</RouterLink
            >
          </div>
        </section>
        <router-view />
      </template>

      <div v-else class="text-center py-4 text-red-500">
        {{ store.error || 'Task not found.' }}
      </div>
    </div>
  </div>
</template>
