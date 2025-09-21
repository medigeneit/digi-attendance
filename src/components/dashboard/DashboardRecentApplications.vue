<script setup>
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'

const userStore = useUserStore()
const { userDashboard } = storeToRefs(userStore)
</script>

<template>
  <div class="bg-white shadow-md rounded-lg p-4">
    <div class="flex items-center mb-1">
      <i class="fas fa-file mr-2 h-5 w-5"></i>
      <h2 class="text-xl font-semibold">
        Applications <span class="text-xs ml-2 text-green-00">This month</span>
      </h2>
    </div>
    <hr />

    <div
      v-if="userDashboard?.current_month_leave?.length === 0"
      class="text-xs italic text-center py-4 text-gray-500 mt-2"
    >
      No Application on this month
    </div>
    <div v-else class="py-3">
      <RouterLink
        :to="{ name: 'MyLeaveApplicationShow', params: { id: leaveApplication.id } }"
        v-for="leaveApplication in userDashboard?.current_month_leave"
        :key="leaveApplication.id"
      >
        <div
          class="flex justify-between items-center py-2 rounded hover:bg-sky-50 transition-colors"
        >
          <h3 class="text-sm text-gray-800">Leave Application #{{ leaveApplication.id }}</h3>

          <p
            class="font-medium flex items-center space-x-2 whitespace-nowrap text-xs"
            :class="{
              'bg-gray-500 py-1 rounded-full px-2 text-white': leaveApplication.status === null,
              'bg-yellow-500 py-1 rounded-full px-2 text-white':
                leaveApplication.status === 'Pending',
              'bg-green-500 py-1 rounded-full px-2 text-white':
                leaveApplication.status === 'Approved',
            }"
          >
            <span v-if="leaveApplication.status === null">
              <i class="fas fa-clock mr-2"></i>
              Hanover Waiting
            </span>
            <span v-else-if="leaveApplication.status === 'Pending'">
              <i class="fas fa-hourglass-half mr-2"></i>
              Pending
            </span>
            <span v-else>
              <i class="fas fa-check-circle mr-2"></i>
              Approved
            </span>
          </p>
        </div>
      </RouterLink>
    </div>
  </div>
</template>
