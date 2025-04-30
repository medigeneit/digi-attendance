<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { useExchangeStore } from '@/stores/exchange'
import { useUserStore } from '@/stores/user'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const exchangeStore = useExchangeStore()
const userStore = useUserStore()
const type = 'shift'
const selectedUser = ref(null)
const selectedUserId = computed(() => selectedUser.value?.id)
const selectedMonth = ref(route.query.date || exchangeStore.selectedMonth)

// Fetch all users and exchanges
onMounted(() => {
  userStore.fetchUsers()
  exchangeStore.fetchAllExchanges({
    type: type,
    selectedMonth: selectedMonth.value,
    selectedStatus: exchangeStore.selectedStatus,
  })
  selectedUser.value = userStore.users.find((user) => user.id == route?.query?.user_id)
})

const fetchOffDayExchangeByUser = async () => {
  if (selectedUserId.value) {
    await exchangeStore.fetchAllExchanges({
      user_id: selectedUserId.value,
      type: type,
      selectedMonth: selectedMonth.value,
      selectedStatus: exchangeStore.selectedStatus,
    })
  } else {
    // Fetch all short leaves if no user is selected
    await exchangeStore.fetchAllExchanges({
      type: type,
      selectedMonth: selectedMonth.value,
      selectedStatus: exchangeStore.selectedStatus,
    })
  }
}

watch([selectedUserId], fetchOffDayExchangeByUser)

watch(selectedUserId, (user) => {
  router.replace({
    query: {
      ...route.query,
      user_id: user,
    },
  })
})

watch(selectedMonth, (date) => {
  router.replace({
    query: {
      ...route.query,
      date: date,
    },
  })
})

const goBack = () => {
  router.go(-1)
}

const deleteApplication = async (applicationId) => {
  if (confirm('Are you sure to delete this application?')) {
    exchangeStore.deleteExchange(applicationId)
  }
}
</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Shift Exchanges</h1>
      <div></div>
    </div>
    <div class="flex gap-4">
      <div style="width: 300px">
        <MultiselectDropdown
          v-model="selectedUser"
          :options="userStore.users"
          :multiple="false"
          label="name"
          placeholder="Select user"
        />
      </div>
      <div>
        <input
          id="monthSelect"
          type="month"
          v-model="selectedMonth"
          @change="fetchOffDayExchangeByUser"
          class="input-1"
        />
      </div>
      <div>
        <select
          v-model="exchangeStore.selectedStatus"
          @change="fetchOffDayExchangeByUser"
          class="input-1"
        >
          <option value="" selected>All</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>
    </div>

    <div v-if="exchangeStore.loading" class="text-center py-4">
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
              <th class="border border-gray-300 px-2 text-left">Employee Name</th>
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
              v-for="(exchange, index) in exchangeStore?.all_exchanges"
              :key="exchange?.id"
              class="border-b border-gray-200 hover:bg-blue-200"
            >
              <td class="border border-gray-300 px-2">{{ index + 1 }}</td>
              <td class="border border-gray-300 px-2">{{ exchange?.user?.name || 'Unknown' }}</td>
              <td class="border border-gray-300 px-2">{{ exchange?.exchange_date }}</td>
              <td class="border border-gray-300 px-2">{{ exchange?.user?.shift?.name }}</td>
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
                  <button @click="deleteApplication(exchange?.id)" class="btn-icon text-red-500">
                    <i class="far fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="exchangeStore?.all_exchanges?.length === 0">
              <td colspan="6" class="p-2 text-center text-red-500">No shift exchanges found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
