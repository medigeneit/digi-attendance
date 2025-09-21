<script setup>
import DailyTask from '../tasks/monthly-task-view/DailyTask.vue'
import DashboardLeaveBalance from './DashboardLeaveBalance.vue'
import DashboardRecentApplications from './DashboardRecentApplications.vue'
import DashboardRecentNotices from './DashboardRecentNotices.vue'
</script>

<template>
  <div class="w-full px-6 py-4">
    <div class="grid lg:grid-cols-4 gap-6">
      <div
        class="card-bg gap-0 shadow-md border border-gray-300 col-span-full lg:col-span-3 lg:row-span-2"
      >
        <DailyTask />
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
