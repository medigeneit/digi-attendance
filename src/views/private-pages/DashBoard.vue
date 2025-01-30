<template>
  <div class="my-container">
    <div class="card-bg p-4 md:p-8">
      <div v-if="user">
        <p>
          Hello <span class="title-md">{{ user.name }}!</span>
        </p>
        <h1 class="title-xl">Welcome back</h1>
        <p>
          Your phone number is <span class="title-md">{{ user.phone }}</span>
        </p>
      </div>
      <div v-else>
        <p>Loading...</p>
      </div>
    </div>

    <div
      class="grid gap-4 md:grid-cols-3 mt-4"
      v-if="['admin', 'super_admin', 'developer'].includes(user?.role)"
    >
      <RouterLink :to="{ name: 'TodayAttendanceReport' }" class="main-button">
        <!-- LeaveReport -->
        <!-- <i class="fas fa-calendar-alt text-3xl"></i> -->
        <span class="text-3xl">
          {{ dashboardInfo?.totalUsers }}
        </span>
        Total Employees
      </RouterLink>
      <RouterLink
        :to="{ name: 'TodayAttendanceReport', query: { search: 'present' } }"
        class="main-button"
      >
        <span class="text-3xl">
          {{ dashboardInfo?.todayPresents }}
        </span>
        Today Present
      </RouterLink>
      <RouterLink
        :to="{ name: 'TodayAttendanceReport', query: { search: 'absent' } }"
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
      <RouterLink :to="{ name: 'ShortLeaveList' }" class="main-button">
        <span class="text-3xl">
          {{ dashboardInfo?.todayShortLeaves }}
        </span>
        Today Short Leaves
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
const authStore = useAuthStore()
const userStore = useUserStore()
// const user = ref(authStore.user)
const { dashboardInfo } = storeToRefs(userStore)
const { user } = storeToRefs(authStore)

onMounted(async () => {
  if (!user.value) {
    await authStore.fetchUser()
  }
  if (['admin', 'super_admin', 'developer'].includes(user?.value?.role)) {
    await userStore.fetchUserDashboardData()
  }
})
</script>
