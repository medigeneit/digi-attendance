<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  user: Object,
})
const open = ref(true)
const route = useRoute()
const router = useRouter()

const authStore = useAuthStore()
const currentRoute = computed(() => route.path)

const logout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <aside class="bg-white sidebar h-screen overflow-auto scrollbar pb-24">
    <div class="space-y-1">
      <div @click="open = !open" class="side-menu md:py-7 sticky top-0 z-20">
        <button>
          <i :class="['fad fa-chevron-double-right', { 'rotate-180': open }]"></i>
        </button>
        <h4 v-show="open">Dashboard</h4>
      </div>

      <RouterLink
        to="/dashboard"
        class="side-menu"
        :class="{ 'side-menu-active': currentRoute.includes('/dashboard') }"
      >
        <i class="fad fa-table py-2"></i>
        <h4 v-if="open">Dashboard</h4>
      </RouterLink>

      <RouterLink
        to="/my-profile"
        class="side-menu"
        :class="{ 'side-menu-active': currentRoute.includes('/my-profile') }"
      >
        <i class="fad fa-user py-2"></i>
        <h4 v-if="open">My Profile</h4>
      </RouterLink>

      <RouterLink
        to="/my-notifications"
        class="side-menu"
        :class="{ 'side-menu-active': currentRoute.includes('/my-notifications') }"
      >
        <i class="fad fa-bells py-2"></i>
        <h4 v-if="open">My Notifications</h4>
      </RouterLink>

      <RouterLink
        to="/my-attendance"
        class="side-menu"
        :class="{ 'side-menu-active': currentRoute.includes('/my-attendance') }"
      >
        <i class="fad fa-list py-2"></i>
        <h4 v-if="open">My Attendance</h4>
      </RouterLink>

      <RouterLink
        to="/my-applications"
        class="side-menu"
        :class="{ 'side-menu-active': currentRoute.includes('/my-applications') }"
      >
        <i class="fad fa-list-alt py-2"></i>
        <h4 v-if="open">My Applications</h4>
      </RouterLink>

      <RouterLink
        v-if="['admin', 'super_admin', 'developer'].includes(user?.role)"
        to="/reports"
        class="side-menu"
        :class="{ 'side-menu-active': currentRoute.includes('/reports') }"
      >
        <i class="fas fa-file-chart-line py-2"></i>
        <h4 v-if="open">Reports</h4>
      </RouterLink>

      <RouterLink
        v-if="['admin', 'super_admin', 'developer'].includes(user?.role)"
        to="/hrd"
        class="side-menu"
        :class="{ 'side-menu-active': currentRoute.includes('/hrd') }"
      >
        <i class="fas fa-users-cog py-2"></i>
        <h4 v-if="open">HR Department</h4>
      </RouterLink>

      <RouterLink
        v-if="['admin', 'super_admin', 'developer'].includes(user?.role)"
        to="/settings"
        class="side-menu"
        :class="{ 'side-menu-active': currentRoute.includes('/settings') }"
      >
        <i class="fas fa-cogs py-2"></i>
        <h4 v-if="open">Settings</h4>
      </RouterLink>

      <button class="side-menu bg-rose-50 w-full hover:bg-rose-600 text-rose-700" @click="logout">
        <i class="fad fa-sign-out-alt py-2"></i>
        <h4 v-show="open">Logout</h4>
      </button>
    </div>
  </aside>
</template>
