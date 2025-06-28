<template>
  <div class="my-container">
    <div class="card-bg p-4 md:p-8">
      <div v-if="user">
        <p>
          Hello <span class="title-md">{{ user.name }}!</span>
        </p>
        <h1 class="title-xl">Welcome back</h1>
        <p>
          <i class="fas fa-phone mr-2"></i>
          Your phone number is <span class="title-md">{{ user.phone }}</span>
        </p>
      </div>
      <div v-else>
        <p>Loading...</p>
      </div>
    </div>
    <div class="grid gap-4 md:grid-cols-3 mt-4" v-if="isAdmin && authStore.adminMode">
      <RouterLink
        :to="{ name: 'TodayAttendanceReport', query: { search: 'all' } }"
        class="main-button"
      >
        <!-- LeaveReport -->
        <!-- <i class="fas fa-calendar-alt text-3xl"></i> -->
        <span class="text-3xl">
          {{ dashboardInfo?.totalUsers }}
        </span>
        Total Employees
      </RouterLink>
      <RouterLink
        :to="{ name: 'TodayAttendanceReport', query: { search: 'Present' } }"
        class="main-button"
      >
        <span class="text-3xl">
          {{ dashboardInfo?.todayPresents }}
        </span>
        Today Present
      </RouterLink>
      <RouterLink
        :to="{ name: 'TodayAttendanceReport', query: { search: 'Absent' } }"
        class="main-button"
      >
        <span class="text-3xl">
          {{ dashboardInfo?.todayAbsents }}
        </span>
        Today Absent
      </RouterLink>
      <RouterLink
        :to="{ name: 'LeaveApplicationList', query: { search: 'today' } }"
        class="main-button"
      >
        <span class="text-3xl">
          {{ dashboardInfo?.todayLeaves }}
        </span>
        Today Leave
      </RouterLink>
      <RouterLink
        :to="{ name: 'LeaveApplicationList', query: { search: 'tomorrow' } }"
        class="main-button"
      >
        <span class="text-3xl">
          {{ dashboardInfo?.tomorrowLeaves }}
        </span>
        Tomorrow Leave
      </RouterLink>
      <RouterLink
        :to="{ name: 'ShortLeaveList', query: { search: selectedDate } }"
        class="main-button"
      >
        <span class="text-3xl">
          {{ dashboardInfo?.todayShortLeaves }}
        </span>
        Today Short Leaves
      </RouterLink>
    </div>
    <div class="w-full mt-4" v-else>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white shadow-md rounded-lg p-4">
          <div class="space-y-2">
            <div class="flex items-center">
              <i class="fas fa-file mr-2 h-5 w-5"></i>
              <h2 class="text-xl font-semibold">Recent Applications</h2>
            </div>

            <RouterLink
              :to="{ name: 'MyLeaveApplicationShow', params: { id: leaveApplication.id } }"
              v-for="leaveApplication in userDashboard?.current_month_leave"
              :key="leaveApplication.id"
            >
              <div
                class="flex justify-between items-center px-4 py-2 rounded hover:bg-gray-50 transition-colors"
              >
                <h3 class="font-semibold text-gray-800">
                  Leave Application #{{ leaveApplication.id }}
                </h3>
                <p
                  class="text-sm font-medium flex items-center space-x-2"
                  :class="{
                    'bg-gray-500 py-1.5 rounded-full px-4 text-white':
                      leaveApplication.status === null,
                    'bg-yellow-500 py-1.5 rounded-full px-4 text-white':
                      leaveApplication.status === 'Pending',
                    'bg-green-500 py-1.5 rounded-full px-4 text-white':
                      leaveApplication.status === 'approved',
                  }"
                >
                  <span v-if="leaveApplication.status === null">
                    <i class="fas fa-clock mr-2"></i>
                    Wait for Hanover
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

          <div class="flex justify-between items-start mb-4">
            <div class="flex items-center">
              <i class="fas fa-file mr-2 h-5 w-5"></i>
              <h2 class="text-xl font-semibold">Recent Notices</h2>
            </div>
          </div>
          <div class="space-y-4">
            <div
              v-for="(notice, index) in userDashboard.notices"
              :key="index"
              class="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div
                :class="[
                  'p-1 rounded-full',
                  notice.priority === 'high'
                    ? 'bg-red-100'
                    : notice.priority === 'medium'
                      ? 'bg-yellow-100'
                      : 'bg-green-100',
                ]"
              >
                <span
                  :class="[
                    'h-4 w-4',
                    notice.priority === 'high'
                      ? 'bg-red-600'
                      : notice.priority === 'medium'
                        ? 'bg-yellow-600'
                        : 'bg-green-600',
                    'rounded-full inline-block',
                  ]"
                ></span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900">{{ notice.title }}</p>
                <p class="text-xs text-gray-400 mt-1">{{ notice.published_at }}</p>
              </div>
              <RouterLink
                :to="
                  notice.type === 1
                    ? `/notice-details/${notice.id}`
                    : `/policy-details/${notice.id}`
                "
                class="text-blue-500 hover:text-blue-700 font-semibold"
              >
                View Details
              </RouterLink>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="bg-white shadow-md rounded-lg">
          <h2 class="text-xl font-semibold py-3 px-4">Leave Balance</h2>
          <div class="overflow-x-auto shadow-md sm:rounded-lg min-h-max">
            <table class="min-w-full text-sm text-left text-gray-500">
              <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3">Type</th>
                  <th scope="col" class="px-6 py-3">Total Days</th>
                  <th scope="col" class="px-6 py-3">Used Days</th>
                  <th scope="col" class="px-6 py-3">Remaining Days</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="leave_balance in userDashboard?.leave_balance"
                  :key="leave_balance.id"
                  class="border-b hover:bg-gray-100"
                >
                  <td class="px-6 py-4 font-medium text-gray-900">
                    {{ leave_balance.leave_type }}
                  </td>
                  <td class="px-6 py-4">{{ leave_balance.total_leave_days }}</td>
                  <td class="px-6 py-4">{{ leave_balance.used_days }}</td>
                  <td class="px-6 py-4">{{ leave_balance.remaining_days }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'
const authStore = useAuthStore()
const userStore = useUserStore()
const { dashboardInfo, selectedDate, userDashboard } = storeToRefs(userStore)
const { user } = storeToRefs(authStore)

const isAdmin = computed(() => ['admin', 'super_admin', 'developer'].includes(user?.value?.role))

onMounted(async () => {
  if (!user.value) {
    await authStore.fetchUser()
  }
  await userStore.fetchUserDashboardData()
  if (isAdmin.value) {
    await userStore.fetchAdminDashboardData()
  }
})
</script>
