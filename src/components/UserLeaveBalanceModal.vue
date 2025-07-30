<script setup>
import { ref, watch } from 'vue'
import { useCompanyStore } from '@/stores/company'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  show: { type: Boolean, required: true },
  user: { type: Object, required: true },
})

const emit = defineEmits(['close'])
const companyStore = useCompanyStore()
const userStore = useUserStore()

const balances = ref([])
const isInitialized = ref(false)

watch(
  () => props.show,
  async (visible) => {
    if (visible && props.user?.id && !isInitialized.value) {
      await loadUserLeaveBalancesOrFallback()
      isInitialized.value = true
    }
  }
)

watch(
  () => props.user?.id,
  () => {
    isInitialized.value = false
    balances.value = []
  }
)

const loadUserLeaveBalancesOrFallback = async () => {
  try {
    const userRes = await userStore.fetchUserLeaveTypes(props.user.id)

    if (userRes?.length) {
      balances.value = userRes
    } else {
      const companyRes = await companyStore.fetchCompanyLeaveTypes(props.user.company_id)
      balances.value = companyRes.data.map((item) => ({
        id: item.id,
        name: item.name,
        annual_quota: item.annual_quota || 0,
        max_consecutive_days: item.max_consecutive_days || null,
        type: item.type || 'Paid',
      }))
    }
  } catch (err) {
    console.error('Failed to load leave balances or fallback types:', err)
  }
}

const handleSubmit = async () => {
  try {
    await userStore.saveLeaveBalances(props.user.id, balances.value)
    emit('close')
  } catch (err) {
    console.error('Failed to save leave balances:', err)
  }
}

const closeModal = () => {
  emit('close')
}
</script>

<template>
  <div
    v-if="show && user"
    class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50"
  >
    <div class="bg-white rounded-lg shadow-lg w-full max-w-3xl">
      <div class="px-6 py-4 border-b">
        <h3 class="text-lg font-bold">Set Leave Balances for {{ user.name }}</h3>
      </div>

      <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
        <table class="table-auto w-full border">
          <thead class="bg-gray-100 text-left">
            <tr>
              <th class="p-2">Leave Type</th>
              <th class="p-2">Annual Quota</th>
              <th class="p-2">Max Consecutive Days</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(balance, index) in balances" :key="index">
              <td class="p-2">
                <input type="hidden" v-model="balance.id" class="input-1 w-full" />
                <input v-model="balance.name" class="input-1 w-full" disabled />
              </td>
              <td class="p-2">
                <input
                  v-model.number="balance.annual_quota"
                  type="number"
                  min="0"
                  class="input-1 w-full"
                />
              </td>
              <td class="p-2">
                <input
                  v-model.number="balance.max_consecutive_days"
                  type="number"
                  min="0"
                  class="input-1 w-full"
                />
              </td>
            </tr>
          </tbody>
        </table>

        <div class="flex justify-end gap-2 pt-4 border-t">
          <button
            type="button"
            @click="closeModal"
            class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
