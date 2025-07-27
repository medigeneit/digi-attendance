<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import OvertimeDataList from '@/components/overtime/OvertimeDataList.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { useOvertimeStore } from '@/stores/overtime'
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

const overtimeStore = useOvertimeStore()
const notificationStore = useNotificationStore()
const authStore = useAuthStore()

const selectedUser = computed(() => {
  return overtimeStore.overtimes?.[0]?.user
})

const applicationIds = computed(() => {
  return overtimeStore.overtimes?.map((overtime) => overtime.id) || []
})

onMounted(async () => {
  fetchOvertimeListData()
})

const fetchOvertimeListData = async () => {
  if(!overtimeStore.loading) {
    await overtimeStore.fetchUserOvertimesByApplicationId(route.params.id)

    await notificationStore.fetchApprovalPermissionsByUserApplicationIds(
      'overtime_applications',
      applicationIds.value,
    )
  }

  await notificationStore.fetchCountNotifications()
}

const goBack = () => {
  router.go(-1)
}

// watch(
//   () => overtimeStore.selectedMonth,
//   (newMonth) => {
//     if (newMonth) {
//       overtimeStore.fetchUserOvertimes({ month: newMonth })
//     }
//   },
// )
</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <button class="btn-3 py-1" @click="goBack">
          <i class="far fa-arrow-left"></i>
          <span class="hidden md:flex">Back</span>
        </button>

        <div>
          <button @click="fetchOvertimeListData" type="button" class="btn-3 space-x-1 py-1">
            <i class="fas fa-sync text-lg" :class="{ 'animate-spin': overtimeStore.loading }"></i>
            <span class="hidden md:inline"> Reload </span>
          </button>
        </div>
      </div>

      <h1 class="title-md md:title-lg flex-wrap text-center">
        Overtime of {{ overtimeStore.selectedMonthDisplay }}
      </h1>

      <div class="flex gap-4">
        <!-- <div>
          <input
            id="monthSelect"
            type="month"
            v-model="overtimeStore.selectedMonth"
            class="input-1"
          />
        </div> -->
      </div>
    </div>

    <div v-if="overtimeStore?.loading" class="text-center py-4">
      <LoaderView />
    </div>

    <OvertimeDataList
      v-else-if="selectedUser"
      :user="selectedUser"
      :onUpdate="fetchOvertimeListData"
    />
  </div>
</template>
