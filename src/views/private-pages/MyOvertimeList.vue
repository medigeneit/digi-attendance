<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useAuthStore } from '@/stores/auth'
import { useOvertimeStore } from '@/stores/overtime'
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const overtimeStore = useOvertimeStore()
const authStore = useAuthStore()

onMounted(() => {
  overtimeStore.fetchUserOvertimes({ month: overtimeStore.selectedMonth })
})

const goBack = () => {
  router.go(-1)
}

const myOvertimes = computed(() => {
  return overtimeStore.overtimes
})

watch(
  () => overtimeStore.selectedMonth,
  (newMonth) => {
    if (newMonth) {
      overtimeStore.fetchUserOvertimes({ month: newMonth })
    }
  },
)
</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <button class="btn-3 py-1" @click="goBack">
          <i class="far fa-arrow-left"></i>
          <span class="hidden md:flex">Back</span>
        </button>

        <RouterLink :to="{ name: 'MyOvertimeAdd' }" class="btn-2">
          <i class="far fa-plus"></i>
          <span class="hidden md:flex">Overtime</span>
        </RouterLink>
      </div>

      <h1 class="title-md md:title-lg flex-wrap text-center">
        Overtime of {{ overtimeStore.selectedMonthDisplay }}
      </h1>

      <div class="flex gap-4">
        <div>
          <input
            id="monthSelect"
            type="month"
            v-model="overtimeStore.selectedMonth"
            class="input-1"
          />
        </div>
      </div>
    </div>

    <div v-if="overtimeStore?.loading" class="text-center py-4">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div class="overflow-x-auto">
        <table
          class="min-w-full table-auto border-collapse border border-gray-200 bg-white rounded-md text-sm"
        >
          <thead>
            <tr class="bg-gray-200 *:py-1">
              <th class="border border-gray-300 px-2 text-center">#</th>
              <th class="border border-gray-300 px-2 text-center">Date</th>
              <th class="border border-gray-300 px-2 text-center">Type</th>
              <th class="border border-gray-300 px-2 text-center">Shift</th>
              <th class="border border-gray-300 px-2 text-center">Check-In</th>
              <th class="border border-gray-300 px-2 text-center">Check-Out</th>
              <th class="border border-gray-300 px-2 text-center">Working (hour)</th>
              <th class="border border-gray-300 px-2 text-center">Request (hour)</th>
              <th class="border border-gray-300 px-2 text-center">Approved (hour)</th>
              <th class="border border-gray-300 px-2 text-center">Status</th>
              <th class="border border-gray-300 px-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(overtime, index) in myOvertimes"
              :key="overtime?.id"
              class="border-b border-gray-200 hover:bg-blue-200 *:py-2"
            >
              <td class="border border-gray-300 px-2 text-center">{{ index + 1 }}</td>
              <td class="border border-gray-300 px-2 text-center">
                {{
                  new Date(overtime.date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })
                }}
              </td>
              <td class="border border-gray-300 px-2 text-center">
                {{ overtime.duty_type }}
              </td>
              <td class="border border-gray-300 px-2 text-center">
                {{ overtime.shift }}
              </td>
              <td class="border border-gray-300 px-2 text-center">
                {{ overtime.check_in || 'N/A' }}
              </td>
              <td class="border border-gray-300 px-2 text-center">
                {{ overtime.check_out || 'N/A' }}
              </td>
              <td class="border border-gray-300 px-2 text-center">
                {{ overtime.working_hours || '-' }}
              </td>
              <td class="border border-gray-300 px-2 text-center">
                {{ overtime.request_overtime_hours || '-' }}
              </td>
              <td class="border border-gray-300 px-2 text-center">
                {{ overtime.approved_overtime_hours || '-' }}
              </td>
              <td class="border border-gray-300 px-2 text-center">
                {{ overtime.status || 'Pending' }}
              </td>
              <td class="border border-gray-300 px-2 text-center"></td>
            </tr>
            <tr v-if="myOvertimes.length === 0">
              <td colspan="7" class="p-2 text-center text-red-500">No overtimes found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
