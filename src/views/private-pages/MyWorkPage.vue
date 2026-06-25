<script setup>
import OverlyModal from '@/components/common/OverlyModal.vue'
import DashboardMyTodoList from '@/components/dashboard/DashboardMyTodoList.vue'
import TodoAddForm from '@/components/todo/TodoAddForm.vue'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const showTodoForm = ref(false)

const todoDate = computed(() => {
  if (route.query.date) return route.query.date

  const year = Number(route.query['todos[year]'])
  const month = Number(route.query['todos[month]'])
  const day = Number(route.query['todos[day]'])

  if (year && month && day) {
    return [year, month, day].map((part) => String(part).padStart(2, '0')).join('-')
  }

  return new Date().toISOString().substring(0, 10)
})

function handleTodoAdded() {
  showTodoForm.value = false
  router.replace({
    name: 'MyWork',
    query: {
      ...route.query,
      tab: 'todos',
      refresh: Date.now(),
    },
  })
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 px-4 py-4 sm:px-6 lg:px-8">
    <section class="mx-auto max-w-[1600px]">
      <div class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <header class="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="min-w-0">
              <div class="flex items-center gap-3">
                <span class="inline-flex h-10 w-10 flex-none items-center justify-center rounded-md bg-blue-50 text-blue-700">
                  <i class="fas fa-clipboard-check"></i>
                </span>
                <div class="min-w-0">
                  <h1 class="truncate text-xl font-semibold text-slate-950">My Todo Tasks</h1>
                  <p class="mt-0.5 text-sm text-slate-500">Plan, track, and update personal todo work.</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              @click="showTodoForm = true"
            >
              <i class="fas fa-plus text-xs"></i>
              Add Todo
            </button>
          </div>
        </header>

        <div class="bg-white pb-2">
          <DashboardMyTodoList :key="route.fullPath" />
        </div>
      </div>
    </section>

    <OverlyModal v-if="showTodoForm" @close="showTodoForm = false">
      <TodoAddForm
        :date="todoDate"
        userRole="employee"
        @update="handleTodoAdded"
        @cancelClick="showTodoForm = false"
      />
    </OverlyModal>
  </div>
</template>
