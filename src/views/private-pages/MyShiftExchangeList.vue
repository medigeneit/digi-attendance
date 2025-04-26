<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useAuthStore } from '@/stores/auth'
import { useExchangeStore } from '@/stores/exchange'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const exchangeStore = useExchangeStore()
const authStore = useAuthStore()
const type = 'shift'
onMounted(() => {
  exchangeStore.fetchExchanges({
    payload: {
      type,
      date: exchangeStore.selectedMonth,
    },
  })
})

function deleteApplication(id) {
  const confirmed = confirm('Are you sure you want to delete this application?')
  if (confirmed) {
    exchangeStore.deleteExchange(id)
  }
}

const goBack = () => {
  router.go(-1)
}
</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">My Shift Exchanges</h1>
      <div>
        <RouterLink :to="{ name: 'ShiftExchangeAdd' }" class="btn-2"
          >Request Shift Exchange</RouterLink
        >
      </div>
    </div>

    <div v-if="exchangeStore?.loading" class="text-center py-4">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div class="overflow-x-auto">
        <table
          class="min-w-full table-auto border-collapse border border-gray-200 bg-white rounded-md text-sm"
        >
          <thead>
            <tr class="bg-gray-200">
              <th class="border border-gray-300 px-2 text-left">#</th>
              <th class="border border-gray-300 px-2 text-left">Exchange Date</th>
              <th class="border border-gray-300 px-2 text-left">Current Shift</th>
              <th class="border border-gray-300 px-2 text-left">Exchange Shift</th>
              <th class="border border-gray-300 px-2 text-left">Attachment</th>
              <th class="border border-gray-300 px-2 text-left">Status</th>
              <th class="border border-gray-300 px-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(exchange, index) in exchangeStore?.exchanges"
              :key="exchange?.id"
              class="border-b border-gray-200 hover:bg-blue-200"
            >
              <td class="border border-gray-300 px-2">{{ index + 1 }}</td>
              <td class="border border-gray-300 px-2">{{ exchange?.exchange_date }}</td>
              <td class="border border-gray-300 px-2">
                {{ exchange?.current_shift?.name || authStore?.user?.current_shift?.shift?.name }}
              </td>
              <td class="border border-gray-300 px-2">{{ exchange?.shift?.name }}</td>
              <td class="border border-gray-300 px-2 text-center">
                <a
                  v-if="exchange.attachment"
                  :href="exchange?.attachment"
                  target="_blank"
                  class="text-blue-500 underline"
                >
                  <i class="fad fa-link"></i>
                </a>
              </td>
              <td class="border border-gray-300 px-2">{{ exchange?.status || 'N/A' }}</td>
              <td class="border border-gray-300 px-2">
                <div class="flex gap-2">
                  <RouterLink
                    :to="{ name: 'ExchangeShiftShow', params: { id: exchange?.id } }"
                    class="btn-icon"
                  >
                    <i class="far fa-eye"></i>
                  </RouterLink>
                  <button
                    type="button"
                    @click="deleteApplication(exchange?.id)"
                    class="btn-icon"
                    v-if="!exchange.status"
                  >
                    <i class="far fa-trash text-red-600"></i>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="exchangeStore?.exchanges?.length === 0">
              <td colspan="5" class="p-2 text-center text-red-500">No shift exchanges found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
