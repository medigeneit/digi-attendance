<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useExchangeStore } from '@/stores/exchange'
import { useUserStore } from '@/stores/user'
import LoaderView from '@/components/common/LoaderView.vue'

const router = useRouter()
const exchangeStore = useExchangeStore()
const userStore = useUserStore()

const selectedUserId = ref('')

onMounted(() => {
  userStore.fetchUsers()
  exchangeStore.fetchExchanges()
})

const fetchExchangesByUser = async () => {
  if (selectedUserId.value) {
    await exchangeStore.fetchExchanges({ user_id: selectedUserId.value })
  } else {
    await exchangeStore.fetchExchanges()
  }
}

const goBack = () => {
  router.go(-1)
}

const filteredExchanges = computed(() => {
  return exchangeStore.exchanges.filter((exchange) => exchange.exchange_type === 'offday')
})
</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Offday Exchanges</h1>

      <div>
        <select
          id="user-filter"
          v-model="selectedUserId"
          class="input-1"
          @change="fetchExchangesByUser"
        >
          <option value="">All Users</option>
          <option v-for="user in userStore.users" :key="user.id" :value="user.id">
            {{ user.name }}
          </option>
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
              <th class="border border-gray-300 px-2 text-left">Current Date</th>
              <th class="border border-gray-300 px-2 text-left">Exchange Date</th>
              <th class="border border-gray-300 px-2 text-left">Status</th>
              <th class="border border-gray-300 px-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(exchange, index) in filteredExchanges"
              :key="exchange?.id"
              class="border-b border-gray-200 hover:bg-gray-100"
            >
              <td class="border border-gray-300 px-2">{{ index + 1 }}</td>
              <td class="border border-gray-300 px-2">{{ exchange?.user?.name || 'Unknown' }}</td>
              <td class="border border-gray-300 px-2">{{ exchange?.current_date }}</td>
              <td class="border border-gray-300 px-2">{{ exchange?.exchange_date }}</td>
              <td class="border border-gray-300 px-2">{{ exchange?.status || 'N/A' }}</td>
              <td class="border border-gray-300 px-2">
                <div class="flex gap-2">
                  <RouterLink
                    :to="{ name: 'ExchangeShow', params: { id: exchange?.id } }"
                    class="btn-icon"
                  >
                    <i class="far fa-eye"></i>
                  </RouterLink>
                </div>
              </td>
            </tr>
            <tr v-if="filteredExchanges.length === 0">
              <td colspan="6" class="p-2 text-center text-red-500">No exchanges found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
