<script setup>
import { useAuthStore } from '@/stores/auth'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps({
  user: Object,
})

const open = ref(true)
const route = useRoute()
const router = useRouter()

const authStore = useAuthStore()
const currentRoute = computed(() => route.path)

const isAdmin = computed(() => ['admin', 'super_admin', 'developer'].includes(props.user?.role))

const logout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <aside class="bg-white sidebar h-screen overflow-auto scrollbar pb-24 z-[500]">
    <div class="space-y-1">
      <!-- Admin Mode + Toggle Menu Row -->
      <div
        class="flex items-center justify-between gap-2 px-2 py-5 sticky top-0 z-30 bg-white border-b"
      >
        <!-- Admin Toggle -->
        <div v-if="isAdmin" class="flex items-center gap-2">
          <span v-if="open" class="text-sm font-medium text-gray-600">Admin Mode</span>
          <label class="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              class="sr-only"
              :checked="authStore.adminMode"
              @change="authStore.toggleAdminMode"
            />
            <div
              class="w-11 h-6 bg-gray-200 rounded-full shadow-inner relative transition duration-200"
              :class="{ '!bg-blue-600': authStore.adminMode }"
            >
              <div
                class="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition"
                :class="{ 'translate-x-5': authStore.adminMode }"
              ></div>
            </div>
          </label>
        </div>

        <!-- Menu Toggle Button -->
        <button
          @click="open = !open"
          class="text-gray-500 hover:text-blue-600 transition"
          :title="open ? 'Minimize Menu' : 'Expand Menu'"
        >
          <i :class="['fas', 'fa-chevron-left', { 'rotate-180': !open }]"></i>
        </button>
      </div>

      <!-- Default Menus (hidden for adminMode ON + admin roles) -->
      <RouterLink
        to="/dashboard"
        class="side-menu md:py-5"
        :class="{ 'side-menu-active': currentRoute.includes('/dashboard') }"
      >
        <i class="fad fa-table py-2"></i>
        <h4 v-if="open">Dashboard</h4>
      </RouterLink>

      <template v-if="!authStore.adminMode || !isAdmin">
        <RouterLink
          to="/tasks"
          class="side-menu"
          :class="{ 'side-menu-active': currentRoute.includes('/tasks') }"
        >
          <i class="fad fa-tasks py-2"></i>
          <h4 v-if="open">Task Management</h4>
        </RouterLink>

        <RouterLink
          to="/my-profile"
          class="side-menu"
          :class="{ 'side-menu-active': currentRoute.includes('/my-profile') }"
        >
          <i class="fad fa-user py-2"></i>
          <h4 v-if="open">Profile</h4>
        </RouterLink>

        <RouterLink
          to="/my-notifications"
          class="side-menu"
          :class="{ 'side-menu-active': currentRoute.includes('/my-notifications') }"
        >
          <i class="fad fa-bells py-2"></i>
          <h4 v-if="open">Notifications</h4>
        </RouterLink>

        <RouterLink
          to="/notices"
          class="side-menu"
          :class="{ 'side-menu-active': currentRoute.includes('/notices') }"
        >
          <i class="fad fa-exclamation-triangle py-2"></i>
          <h4 v-if="open">Notices</h4>
        </RouterLink>

        <RouterLink
          to="/my-attendance"
          class="side-menu"
          :class="{ 'side-menu-active': currentRoute.includes('/my-attendance') }"
        >
          <i class="fad fa-list py-2"></i>
          <h4 v-if="open">Attendance</h4>
        </RouterLink>

        <RouterLink
          to="/my-applications"
          class="side-menu"
          :class="{ 'side-menu-active': currentRoute.includes('/my-applications') }"
        >
          <i class="fad fa-list-alt py-2"></i>
          <h4 v-if="open">Applications</h4>
        </RouterLink>
      </template>

      <!-- Admin Menus -->
      <template v-if="isAdmin && authStore.adminMode">
        <RouterLink
          to="/tasks"
          class="side-menu"
          :class="{ 'side-menu-active': currentRoute.includes('/tasks') }"
        >
          <i class="fad fa-tasks py-2"></i>
          <h4 v-if="open">Task Management</h4>
        </RouterLink>

        <RouterLink
          to="/reports"
          class="side-menu"
          :class="{ 'side-menu-active': currentRoute.includes('/reports') }"
        >
          <i class="fas fa-file-chart-line py-2"></i>
          <h4 v-if="open">Reports</h4>
        </RouterLink>

        <RouterLink
          to="/hrd"
          class="side-menu"
          :class="{ 'side-menu-active': currentRoute.includes('/hrd') }"
        >
          <i class="fas fa-users-cog py-2"></i>
          <h4 v-if="open">HR Department</h4>
        </RouterLink>

        <RouterLink
          v-if="['super_admin', 'developer'].includes(user?.role)"
          to="/settings"
          class="side-menu"
          :class="{ 'side-menu-active': currentRoute.includes('/settings') }"
        >
          <i class="fas fa-cogs py-2"></i>
          <h4 v-if="open">Settings</h4>
        </RouterLink>
      </template>

      <!-- Logout -->
      <button class="side-menu bg-rose-50 w-full hover:bg-rose-600 text-rose-700" @click="logout">
        <i class="fad fa-sign-out-alt py-2"></i>
        <h4 v-show="open">Logout</h4>
      </button>
    </div>
  </aside>
</template>
