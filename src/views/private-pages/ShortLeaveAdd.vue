<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useShortLeaveStore } from '@/stores/short-leave'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import LoaderView from '@/components/common/LoaderView.vue'

const router = useRouter()
const shortLeaveStore = useShortLeaveStore()
const userStore = useUserStore()
const authStore = useAuthStore()

const form = ref({
  date: '',
  start_time: '',
  end_time: '',
  reason: '',
  works_in_hand: '',
  handover_user_id: '',
})

const loading = ref(false)
const error = ref(null)

const submitShortLeave = async () => {
  loading.value = true
  error.value = null

  try {
    const payload = {
      user_id: authStore?.user?.id,
      ...form.value,
    }
    await shortLeaveStore.createShortLeave(payload)
    alert('Short leave application submitted successfully!')
    router.push({ name: 'MyShortLeaves' })
  } catch (err) {
    error.value = err.message || 'Failed to submit short leave application'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  userStore.fetchUsers()
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

      <h1 class="title-md md:title-lg flex-wrap text-center">Short Leave Application Form</h1>
      <div>
        <RouterLink to="/" class="btn-2">Home</RouterLink>
      </div>
    </div>

    <div v-if="loading" class="text-center">
      <LoaderView />
    </div>

    <form v-else @submit.prevent="submitShortLeave" class="space-y-4 card-bg md:p-8 p-4">
      <div>
        <label for="date" class="block text-sm font-medium">Date</label>
        <input type="date" id="date" v-model="form.date" class="input-1 w-full" required />
      </div>

      <div>
        <label for="start-time" class="block text-sm font-medium">Start Time</label>
        <input
          type="time"
          id="start-time"
          v-model="form.start_time"
          class="input-1 w-full"
          required
        />
      </div>

      <div>
        <label for="end-time" class="block text-sm font-medium">End Time</label>
        <input type="time" id="end-time" v-model="form.end_time" class="input-1 w-full" required />
      </div>

      <div>
        <label for="reason" class="block text-sm font-medium">Reason</label>
        <textarea
          id="reason"
          v-model="form.reason"
          class="input-1 w-full"
          placeholder="Enter your reason for leave"
          required
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
        <select id="handover-user" v-model="form.handover_user_id" class="input-1 w-full" required>
          <option value="">Select Handover User</option>
          <option v-for="user in userStore.users" :key="user.id" :value="user.id">
            {{ user.name }}
          </option>
        </select>
      </div>

      <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>

      <div class="flex justify-center">
        <button type="submit" class="btn-2">Submit</button>
      </div>
    </form>
  </div>
</template>
