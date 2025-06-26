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
        <!-- <i class="fas fa-exchange text-3xl"></i> -->
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
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Recent Notices -->
        <div class="lg:col-span-2 bg-white shadow-md rounded-lg p-6">
          <div class="flex justify-between items-start mb-4">
            <div class="flex items-center">
              <FileText class="mr-2 h-5 w-5" />
              <h2 class="text-xl font-semibold">Recent Notices</h2>
            </div>
            <p class="text-sm text-gray-500">Stay updated with the latest announcements</p>
          </div>
          <div class="space-y-4">
            <div
              v-for="(notice, index) in recentNotices"
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
                <AlertCircle
                  :class="[
                    'h-3 w-3',
                    notice.priority === 'high'
                      ? 'text-red-600'
                      : notice.priority === 'medium'
                        ? 'text-yellow-600'
                        : 'text-green-600',
                  ]"
                />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900">{{ notice.title }}</p>
                <p class="text-sm text-gray-500">{{ notice.description }}</p>
                <p class="text-xs text-gray-400 mt-1">{{ notice.time }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="bg-white shadow-md rounded-lg p-6">
          <div class="mb-4">
            <h2 class="text-xl font-semibold">Leave Balance</h2>
          </div>
          <div class="space-y-3">
            <button
              class="w-full justify-start p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ClipboardList class="mr-2 h-4 w-4" />
              Submit New Application
            </button>
            <button
              class="w-full justify-start p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calendar class="mr-2 h-4 w-4" />
              Mark Attendance
            </button>
            <button
              class="w-full justify-start p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FileText class="mr-2 h-4 w-4" />
              View Pay Slip
            </button>
            <button
              class="w-full justify-start p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <User class="mr-2 h-4 w-4" />
              Update Profile
            </button>
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
const { dashboardInfo, selectedDate } = storeToRefs(userStore)
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
