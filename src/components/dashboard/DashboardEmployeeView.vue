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
  <div class="w-full px-6 py-4">
    <div class="grid lg:grid-cols-4 gap-6">
      <div
        class="card-bg gap-0 shadow-md border border-gray-300 col-span-full lg:col-span-3 lg:row-span-2"
      >
        <div class="flex items-center justify-center gap-4 py-2">
          <button
            @click.prevent="mainSection = 'todos'"
            class="!py-0.5 text-sm"
            :class="{
              'btn-2': mainSection == 'todos',
              'btn-3 hover:bg-gray-200 hover:text-blue-500': mainSection != 'todos',
            }"
          >
            Todos
          </button>
          <button
            @click.prevent="mainSection = 'tasks'"
            class="!py-0.5 text-sm"
            :class="{
              'btn-2': mainSection == 'tasks',
              'btn-3 hover:bg-gray-200 hover:text-blue-500': mainSection != 'tasks',
            }"
          >
            Tasks
          </button>
        </div>
        <DashboardMyTodoList class="mb-4" v-if="mainSection == 'todos'" />
        <DailyTask v-if="mainSection == 'tasks'" />
      </div>

      <div
        class="col-span-full lg:col-span-1 grid sm:grid-cols-2 lg:grid-cols-1 gap-6 sticky top-[80px]"
      >
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
