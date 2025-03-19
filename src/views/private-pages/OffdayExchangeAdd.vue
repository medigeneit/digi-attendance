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
const selectUser = ref(null)
const checkUserRequired = ref(false)

const form = ref({
  exchange_type: 'offday', // Fixed to "offday"
  current_date: '',
  exchange_date: '',
  works_in_hand: '',
  handover_user_id: '',
})

watch(
  () => selectUser.value,
  (newValue) => {
    form.value.handover_user_id = newValue?.id
    checkUserRequired.value = false
  },
)

const loading = ref(false)
const error = ref(null)

const submitOffdayExchange = async () => {
  loading.value = true
  error.value = null

  try {
    const payload = {
      user_id: authStore?.user?.id,
      ...form.value,
    }

    if (!form.value.handover_user_id) {
      checkUserRequired.value = true
      return
    }
    const newExchange = await exchangeStore.createExchange(payload)

    router.push({ name: 'ExchangeOffdayShow', params: { id: newExchange.id } })
  } catch (err) {
    error.value = err.message || 'Failed to submit offday exchange request'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  userStore.fetchHandoverDepartmentWiseEmployees()
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

      <h1 class="title-md md:title-lg flex-wrap text-center">Offday Exchange Request</h1>
      <div>
        <RouterLink to="/" class="btn-2">Home</RouterLink>
      </div>
    </div>

    <div v-if="loading" class="text-center">
      <LoaderView />
    </div>

    <form v-else @submit.prevent="submitOffdayExchange" class="space-y-4 card-bg md:p-8 p-4">
      <div>
        <h4 class="title-lg text-center">{{ authStore?.user?.company?.name }}</h4>
        <p class="text-center">Offday Exchange Application</p>
      </div>

      <div>
        <label for="current-date" class="block text-sm font-medium">Holiday/Weekend (Date)</label>
        <input
          type="date"
          id="current-date"
          v-model="form.current_date"
          class="input-1 w-full"
          required
        />
      </div>

      <div>
        <label for="exchange-date" class="block text-sm font-medium">Exchange Date</label>
        <input
          type="date"
          id="exchange-date"
          v-model="form.exchange_date"
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
        <label for="handover-user" class="block text-sm font-medium">Handover User</label>
        <MultiselectDropdown
          v-model="selectUser"
          :options="userStore.handoverUsers"
          :multiple="false"
          :required="checkUserRequired"
          label="Select User"
          labelFor="user"
        />
      </div>

      <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>

      <div class="flex justify-center">
        <button type="submit" class="btn-2">Submit</button>
      </div>
    </form>
  </div>
</template>
