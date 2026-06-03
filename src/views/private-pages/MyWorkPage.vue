<script setup>
import OverlyModal from '@/components/common/OverlyModal.vue'
import DashboardLeaveBalance from '@/components/dashboard/DashboardLeaveBalance.vue'
import DashboardMyTodoList from '@/components/dashboard/DashboardMyTodoList.vue'
import DailyTask from '@/components/tasks/monthly-task-view/DailyTask.vue'
import TodoAddForm from '@/components/todo/TodoAddForm.vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { userDashboard } = storeToRefs(userStore)
const showTodoForm = ref(false)

const activeTab = computed(() => (route.query.tab === 'tasks' ? 'tasks' : 'todos'))
const todoDate = computed(() => route.query.date || new Date().toISOString().substring(0, 10))
const lists = computed(() => userDashboard.value?.lists || {})
const notices = computed(() => userDashboard.value?.notices || [])
const actionGroups = computed(() => [
  {
    key: 'applications',
    title: 'Applications',
    subtitle: 'Leave applications from this month',
    icon: 'far fa-file-alt',
    route: 'MyLeaveApplications',
    count: pendingCount(lists.value.current_month_leave),
    badge: 'Latest',
  },
  {
    key: 'short_leave',
    title: 'Short Leave',
    subtitle: 'Quick leave requests and approvals',
    icon: 'fas fa-walking',
    route: 'MyShortLeaves',
    count: pendingCount(lists.value.short_leave),
  },
  {
    key: 'exchange',
    title: 'Exchange',
    subtitle: 'Shift and offday exchange requests',
    icon: 'fas fa-exchange-alt',
    route: 'MyShiftExchangeList',
    count: pendingCount(lists.value.exchange),
    chips: [
      { label: 'Shift', route: 'MyShiftExchangeList' },
      { label: 'Offday', route: 'MyOffdayExchangeList' },
    ],
  },
  {
    key: 'manual_attendance',
    title: 'Manual Attendance',
    subtitle: 'Manual check-in and check-out requests',
    icon: 'fas fa-user-check',
    route: 'MyManualAttendanceList',
    count: pendingCount(lists.value.manual_attendance),
  },
])

function pendingCount(items = []) {
  return (items || []).filter((item) => !item.status || item.status === 'Pending').length
}

function setActiveTab(tab) {
  router.push({
    name: 'MyWork',
    query: {
      ...route.query,
      tab,
    },
  })
}

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

onMounted(() => {
  userStore.fetchUserDashboardData()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 px-4 py-4 sm:px-6 lg:px-8">
    <section class="mx-auto grid max-w-[1600px] gap-4 xl:grid-cols-[minmax(0,1fr)_472px]">
      <div class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <header class="relative flex min-h-[68px] items-center justify-center border-b border-slate-200 bg-white px-4 py-3">
          <div class="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2">
            <button
              v-if="activeTab === 'todos'"
              type="button"
              class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-blue-200 bg-white px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              @click="showTodoForm = true"
            >
              <i class="fas fa-plus text-xs"></i>
              Add Todo
            </button>

            <RouterLink
              v-if="activeTab === 'tasks'"
              :to="{ name: 'TaskAdd', query: { started_at: todoDate } }"
              class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-blue-200 bg-white px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              <i class="fas fa-plus text-xs"></i>
              Add Task
            </RouterLink>
          </div>

          <div class="inline-flex rounded-full border border-blue-200 bg-white p-1">
            <button
              class="h-8 min-w-28 rounded-full px-8 text-sm font-semibold transition"
              :class="activeTab === 'todos' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-700 hover:bg-blue-50'"
              @click="setActiveTab('todos')"
            >
              Todos
            </button>
            <button
              class="h-8 min-w-28 rounded-full px-8 text-sm font-semibold transition"
              :class="activeTab === 'tasks' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-700 hover:bg-blue-50'"
              @click="setActiveTab('tasks')"
            >
              Tasks
            </button>
          </div>
        </header>

        <div class="bg-white">
          <DashboardMyTodoList v-if="activeTab === 'todos'" :key="route.fullPath" />
          <DailyTask v-else />
        </div>
      </div>

      <aside class="space-y-6">
        <section class="rounded-lg border border-slate-200 bg-white p-4 shadow-md">
          <div class="space-y-4">
            <div
              v-for="action in actionGroups"
              :key="action.key"
              class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/40 px-3 py-3"
            >
              <span class="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <i :class="action.icon"></i>
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <p class="truncate text-base font-semibold text-slate-900">{{ action.title }}</p>
                  <span v-if="action.badge" class="rounded-full border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                    <i class="far fa-clock mr-1"></i>{{ action.badge }}
                  </span>
                </div>
                <p class="truncate text-xs text-slate-500">{{ action.subtitle }}</p>
              </div>
              <span class="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                {{ action.count }}
              </span>
              <template v-if="action.chips">
                <RouterLink
                  v-for="chip in action.chips"
                  :key="chip.label"
                  :to="{ name: chip.route }"
                  class="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                >
                  {{ chip.label }}
                </RouterLink>
              </template>
              <RouterLink
                v-else
                :to="{ name: action.route }"
                class="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
              >
                See all
              </RouterLink>
              <i class="fas fa-chevron-down text-xs text-slate-400"></i>
            </div>
          </div>
        </section>

        <section class="rounded-lg border border-slate-200 bg-white shadow-md">
          <header class="flex items-center gap-3 px-4 py-4">
            <span class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <i class="fas fa-bell"></i>
            </span>
            <div>
              <h2 class="text-lg font-semibold text-slate-900">Notices</h2>
              <p class="text-xs text-slate-500">Recent announcements and policies</p>
            </div>
          </header>
          <div class="mx-4 border-t border-slate-200"></div>
          <div v-if="notices.length" class="divide-y divide-slate-100">
            <RouterLink
              v-for="notice in notices.slice(0, 3)"
              :key="notice.id"
              :to="notice.type === 1 ? `/notice-details/${notice.id}` : `/policy-details/${notice.id}`"
              class="block px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              {{ notice.title || 'Untitled notice' }}
            </RouterLink>
          </div>
          <div v-else class="px-4 py-12 text-center text-sm italic text-slate-500">
            No pending notice found
          </div>
        </section>

        <DashboardLeaveBalance />
      </aside>
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
