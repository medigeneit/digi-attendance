<template>
  <DashboardAdminView v-if="isAdmin && authStore.isAdminMood" />
  <DashboardEmployeeView v-else />
</template>

<script setup>
import DashboardAdminView from '@/components/dashboard/DashboardAdminView.vue'
import DashboardEmployeeView from '@/components/dashboard/DashboardEmployeeView.vue'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'

const authStore = useAuthStore()
const userStore = useUserStore()
const { user } = storeToRefs(authStore)

const isAdmin = computed(() => ['admin', 'super_admin', 'developer'].includes(user?.value?.role))

onMounted(async () => {
  if (!user.value) {
    await authStore.fetchUser()
  }
  await userStore.fetchUserDashboardData()
})
</script>
