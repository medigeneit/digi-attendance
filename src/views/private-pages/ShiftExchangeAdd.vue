<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { useAuthStore } from '@/stores/auth'
import { useExchangeStore } from '@/stores/exchange'
import { useUserStore } from '@/stores/user'
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const exchangeStore = useExchangeStore()
const userStore = useUserStore()
const authStore = useAuthStore()
const selectUser = ref('')
const currentShift = ref('')
const form = ref({
  shift_id: '',
  exchange_type: 'shift', // Fixed to "shift"
  selected_date: '', // Single date field
  works_in_hand: '',
  handover_user_id: '',
  reason: '',
})

const submitLoading = ref(false)
const shiftLoading = ref(false)
const error = ref(null)

const latestShiftRequestId = ref(0)
const dateWiseShift = async (date) => {
  if (!date) {
    latestShiftRequestId.value++
    shiftLoading.value = false
    currentShift.value = ''
    error.value = null
    return
  }

  const requestId = ++latestShiftRequestId.value
  try {
    shiftLoading.value = true
    error.value = null
    const res = await userStore.fetchUserDateWiseShift(date)
    if (requestId !== latestShiftRequestId.value) return

    if (res) {
      currentShift.value = res
    } else {
      currentShift.value = ''
      error.value = 'No shifts found for the selected date'
    }
  } catch (err) {
    error.value = err.message || 'Failed to fetch shifts for the selected date'
  } finally {
    if (requestId === latestShiftRequestId.value) shiftLoading.value = false
  }
}

const submitShiftExchange = async () => {
  submitLoading.value = true
  error.value = null

  try {
    const payload = {
      user_id: authStore?.user?.id,
      current_shift_id: authStore?.user?.current_shift?.shift_id,
      shift_id: form.value.shift_id,
      exchange_type: form.value.exchange_type,
      current_date: form.value.selected_date,
      exchange_date: form.value.selected_date, // Use the same date
      works_in_hand: form.value.works_in_hand,
      handover_user_id: form.value.handover_user_id,
      reason: form.value.reason,
    }
    const newExchange = await exchangeStore.createExchange(payload)
    router.push({ name: 'ExchangeShiftShow', params: { id: newExchange.id } })
  } catch (err) {
    error.value = err.message || 'Failed to submit shift exchange request'
  } finally {
    submitLoading.value = false
  }
}

watch(
  () => selectUser.value,
  (newValue) => {
    form.value.handover_user_id = newValue?.id
  },
)

watch(
  () => form.value.selected_date,
  (newDate) => {
    dateWiseShift(newDate)
  },
)

onMounted(() => {
  userStore.fetchTypeWiseEmployees({ except: 'auth' })
  authStore.fetchUser()
})

const goBack = () => {
  router.go(-1)
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-4 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Shift Exchange Request</h1>
      <div>
        <RouterLink to="/" class="btn-2">Home</RouterLink>
      </div>
    </div>

    <div v-if="submitLoading" class="text-center">
      <LoaderView />
    </div>

    <form v-else @submit.prevent="submitShiftExchange" class="space-y-4 card-bg md:p-8 p-4">
      <p class="block text-sm font-medium">
        Current Shift:
        <span v-if="shiftLoading">Loading...</span>
        <span v-else>
          {{ currentShift?.name || authStore?.user?.current_shift?.shift?.name }}
        </span>
      </p>

      <div>
        <label for="shift_id" class="block text-sm font-medium">Exchange Shift</label>
        <select id="shift_id" v-model="form.shift_id" class="input-1 w-full" required>
          <option value="" disabled>- Select Shift -</option>
          <option
            v-for="shift in authStore?.user?.company?.shifts"
            :key="shift.id"
            :value="shift.id"
          >
            {{ shift?.name }}
          </option>
        </select>
      </div>

      <div>
        <label for="selected-date" class="block text-sm font-medium">Select Date</label>
        <input
          type="date"
          id="selected-date"
          v-model="form.selected_date"
          class="input-1 w-full"
          required
        />
      </div>

      <div>
        <label for="works-in-hand" class="block text-sm font-medium">Reason</label>
        <textarea
          id="works-in-hand"
          v-model="form.reason"
          class="input-1 w-full"
          placeholder="Enter details of reason"
        ></textarea>
      </div>

      <div>
        <label for="works-in-hand" class="block text-sm font-medium"
          >Works in Hand (Optional)</label
        >
        <textarea
          id="works-in-hand"
          v-model="form.works_in_hand"
          class="input-1 w-full"
          placeholder="Enter details of works in hand"
        ></textarea>
      </div>

      <div>
        <MultiselectDropdown
          v-model="selectUser"
          :options="userStore.users"
          :multiple="false"
          :required="false"
          label="label"
          top-label="Handover User"
          placeholder="Select user"
        />
      </div>

      <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>

      <div class="flex justify-center">
        <button type="submit" class="btn-2">Submit</button>
      </div>
    </form>
  </div>
</template>
