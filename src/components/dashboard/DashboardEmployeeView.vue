<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DailyTask from '../tasks/monthly-task-view/DailyTask.vue'
import DashboardLeaveBalance from './DashboardLeaveBalance.vue'
import DashboardMyTodoList from './DashboardMyTodoList.vue'
import DashboardRecentApplications from './DashboardRecentApplications.vue'
import DashboardRecentNotices from './DashboardRecentNotices.vue'

const mainSection = ref('todos')
const route = useRoute()
const router = useRouter()

watch(
  () => mainSection.value,
  function (section) {
    if (section !== 'todos') {
      router.replace({
        query: Object.keys(route.query)
          .filter((q) => !q.match(/^todos\[/))
          .reduce((newQueries, key) => {
            newQueries[key] = route.query[key]
            return newQueries
          }, {}),
      })
    }
  },
)
</script>

<template>
  <div class="w-full px-4 py-4 sm:px-6">
    <div class="grid items-start gap-6 xl:grid-cols-[minmax(0,2.2fr)_minmax(350px,0.95fr)]">
      <div class="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
        <div class="flex flex-wrap items-center justify-center gap-3 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
          <button
            @click.prevent="mainSection = 'todos'"
            class="min-w-[96px] !py-0.5 text-sm"
            :class="{
              'btn-2': mainSection == 'todos',
              'btn-3 hover:bg-gray-200 hover:text-blue-500': mainSection != 'todos',
            }"
          >
            Todos
          </button>
          <button
            @click.prevent="mainSection = 'tasks'"
            class="min-w-[96px] !py-0.5 text-sm"
            :class="{
              'btn-2': mainSection == 'tasks',
              'btn-3 hover:bg-gray-200 hover:text-blue-500': mainSection != 'tasks',
            }"
          >
            Tasks
          </button>
        </div>

        <DashboardMyTodoList v-if="mainSection == 'todos'" />
        <DailyTask v-if="mainSection == 'tasks'" />
      </div>

      <div class="grid items-start gap-6 md:grid-cols-2 xl:sticky xl:top-[88px] xl:grid-cols-1">
        <div class="card-bg gap-0 shadow-md border border-gray-300">
          <DashboardRecentApplications />
        </div>

        <div class="card-bg gap-0 shadow-md border border-gray-300">
          <DashboardRecentNotices />
        </div>

        <div class="card-bg gap-0 shadow-md border border-gray-300">
          <DashboardLeaveBalance />
        </div>
      </div>
    </div>
  </div>
</template>
