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
  <aside
    class="bg-white sidebar h-screen overflow-auto scrollbar pb-24 z-[500]"
    :class="{ 'sm:min-w-[240px]': open }"
  >
    <div class="space-y-1 pt-16 md:pt-0">
      <!-- Admin Mode + Toggle Menu Row -->
      <div
        class="flex items-center justify-between md:gap-2 px-2 py-5 sticky top-0 z-30 bg-white border-b"
      >
        <!-- Admin Toggle -->
        <div v-if="isAdmin" class="flex items-center gap-2">
          <span v-if="open" class="text-sm font-medium text-gray-600">Admin Mode</span>
          <label class="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              class="sr-only"
              :checked="authStore.isAdminMood"
              @change="authStore.toggleAdminMode"
            />
            <div
              class="w-8 md:w-11 h-5 md:h-6 bg-gray-200 rounded-full shadow-inner relative transition duration-200"
              :class="{ '!bg-blue-600': authStore.isAdminMood }"
            >
              <div
                class="dot absolute left-1 top-1 bg-white size-3 md:size-4 rounded-full transition"
                :class="{ 'translate-x-3 md:translate-x-5': authStore.isAdminMood }"
              ></div>
            </div>
          </label>
        </div>

        <!-- Menu Toggle Button -->
        <button
          @click="open = !open"
          class="text-gray-500 hover:text-blue-600 transition flex justify-center items-center"
          :title="open ? 'Minimize Menu' : 'Expand Menu'"
        >
          <i :class="['fas', 'fa-chevron-left', 'text-lg', { 'rotate-180': !open }]"></i>
        </button>
      </div>

      <!-- Default Menus (hidden for adminMode ON + admin roles) -->
      <RouterLink
        to="/dashboard"
        class="side-menu"
        :class="{
          'side-menu-active': currentRoute.includes('/dashboard'),
          'flex justify-center': !open,
        }"
      >
        <i class="fad fa-table py-2 border-red-500"></i>
        <h4 v-if="open">Dashboard</h4>
      </RouterLink>

      <template v-if="!authStore.isAdminMood || !isAdmin">
        <RouterLink
          :to="`/my-requirement-tasks?status=not-completed`"
          class="side-menu"
          :class="{
            'flex justify-center': !open,
            'side-menu-active': currentRoute.includes('/tasks'),
          }"
        >
          <i class="fad fa-tasks py-2"></i>
          <h4 v-if="open">Task List</h4>
        </RouterLink>

        <RouterLink
          to="/profile"
          class="side-menu"
          :class="{
            'flex justify-center': !open,
            'side-menu-active': currentRoute.includes('/profile'),
          }"
        >
          <i class="fad fa-user py-2"></i>
          <h4 v-if="open">Profile</h4>
        </RouterLink>

        <RouterLink
          to="/notifications"
          class="side-menu"
          :class="{
            'flex justify-center': !open,
            'side-menu-active': currentRoute.includes('/notifications'),
          }"
        >
          <i class="fad fa-bells py-2"></i>
          <h4 v-if="open">Notifications</h4>
        </RouterLink>

        <RouterLink
          to="/notices"
          class="side-menu"
          :class="{
            'flex justify-center': !open,
            'side-menu-active': currentRoute.includes('/notices'),
          }"
        >
          <i class="fad fa-exclamation-triangle py-2"></i>
          <h4 v-if="open">Notices</h4>
        </RouterLink>

        <RouterLink
          to="/attendance"
          class="side-menu"
          :class="{
            'flex justify-center': !open,
            'side-menu-active': currentRoute.includes('/attendance'),
          }"
        >
          <i class="fad fa-list py-2"></i>
          <h4 v-if="open">Attendance</h4>
        </RouterLink>

        <RouterLink
          to="/applications"
          class="side-menu"
          :class="{
            'flex justify-center': !open,
            'side-menu-active': currentRoute.includes('/applications'),
          }"
        >
          <i class="fad fa-list-alt py-2"></i>
          <h4 v-if="open">Applications</h4>
        </RouterLink>
      </template>

      <!-- Admin Menus -->
      <template v-if="isAdmin && authStore.isAdminMood">
        <RouterLink
          to="/requirements"
          class="side-menu"
          :class="{
            'flex justify-center': !open,
            'side-menu-active': currentRoute.includes('/requirements'),
          }"
        >
          <i class="fad fa-tasks py-2"></i>
          <h4 v-if="open">Requirement</h4>
        </RouterLink>
        <RouterLink
          to="/requirement-tasks"
          class="side-menu"
          :class="{
            'flex justify-center': !open,
            'side-menu-active': currentRoute.match(/requirement-tasks-*/),
          }"
        >
          <i class="fad fa-tasks py-2"></i>
          <h4 v-if="open">Task Management</h4>
        </RouterLink>

        <RouterLink
          to="/reports"
          class="side-menu"
          :class="{
            'flex justify-center': !open,
            'side-menu-active': currentRoute.includes('/reports'),
          }"
        >
          <i class="fas fa-file-chart-line py-2"></i>
          <h4 v-if="open">Reports</h4>
        </RouterLink>

        <RouterLink
          to="/kpi"
          class="side-menu"
          :class="{
            'flex justify-center': !open,
            'side-menu-active': currentRoute.includes('/kpi'),
          }"
        >
          <i class="fas fa-file-chart-line py-2"></i>
          <h4 v-if="open">KPI</h4>
        </RouterLink>

        <RouterLink
          to="/hrd"
          class="side-menu"
          :class="{
            'flex justify-center': !open,
            'side-menu-active': currentRoute.includes('/hrd'),
          }"
        >
          <i class="fas fa-users-cog py-2"></i>
          <h4 v-if="open">HR Department</h4>
        </RouterLink>

        <RouterLink
          v-if="['super_admin', 'developer'].includes(user?.role)"
          to="/employee-management"
          class="side-menu"
          :class="{
            'flex justify-center': !open,
            'side-menu-active': currentRoute.includes('/employee-management'),
          }"
        >
          <i class="fas fa-users py-2"></i>
          <h4 v-if="open">EmpManage</h4>
        </RouterLink>

        <RouterLink
          v-if="['super_admin', 'developer'].includes(user?.role)"
          to="/settings"
          class="side-menu"
          :class="{
            'flex justify-center': !open,
            'side-menu-active': currentRoute.includes('/settings'),
          }"
        >
          <i class="fas fa-cogs py-2"></i>
          <h4 v-if="open">Settings</h4>
        </RouterLink>
      </template>

      <!-- Logout -->
      <button
        :class="{ 'flex justify-center': !open }"
        class="side-menu bg-rose-50 w-full hover:bg-rose-600 text-rose-700"
        @click="logout"
      >
        <i class="fad fa-sign-out-alt py-2"></i>
        <h4 v-show="open">Logout</h4>
      </button>
    </div>
  </aside>
</template>
