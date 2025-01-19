<script setup>
import { onMounted, ref, watch, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useLeaveTypeStore } from '@/stores/leave-type'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import LoaderView from '@/components/common/LoaderView.vue'

const router = useRouter()
const leaveApplicationStore = useLeaveApplicationStore()
const leaveTypeStore = useLeaveTypeStore()
const userStore = useUserStore()
const authStore = useAuthStore()

const form = ref({
  leave_type_id: '',
  start_date: '',
  end_date: '',
  reason: '',
  works_in_hand: '',
  handover_user_id: '',
})

const loading = ref(false)
const error = ref(null)

const submitLeaveApplication = async () => {
  loading.value = true
  error.value = null

  try {
    const payload = {
      user_id: authStore?.user?.id,
      ...form.value,
    }

    const newApplication = await leaveApplicationStore.storeLeaveApplication(payload)

    router.push({ name: 'LeaveApplicationShow', params: { id: newApplication.id } })
  } catch (err) {
    error.value = err.message || 'Failed to submit leave application'
  } finally {
    loading.value = false
  }
}

// WatchEffect to ensure companyId-based filtering
onMounted(() => {
  watchEffect(() => {
    const companyId = authStore?.user?.company_id
    if (companyId) {
      leaveTypeStore.fetchLeaveTypes(companyId)
    }
  }),
    userStore.fetchUsers()
})

const goBack = () => {
  router.go(-1)
}
</script>

<template>
  <div class="my-container max-w-3xl space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Leave Application Form</h1>
      <div>
        <RouterLink to="/my-applications" class="btn-2">Home</RouterLink>
      </div>
    </div>

    <LoaderView v-if="loading" />

    <form v-else @submit.prevent="submitLeaveApplication" class="space-y-4 card-bg p-4 md:p-8">
      <div>
        <label for="leave-type" class="block text-sm font-medium">Leave Type</label>
        <select id="leave-type" v-model="form.leave_type_id" class="input-1 w-full" required>
          <option value="">Select Leave Type</option>
          <option v-for="type in leaveTypeStore.leaveTypes" :key="type.id" :value="type.id">
            {{ type?.name }}
          </option>
        </select>
      </div>

      <div>
        <label for="start-date" class="block text-sm font-medium">Start Date</label>
        <input
          type="date"
          id="start-date"
          v-model="form.start_date"
          class="input-1 w-full"
          required
        />
      </div>

      <div>
        <label for="end-date" class="block text-sm font-medium">End Date</label>
        <input type="date" id="end-date" v-model="form.end_date" class="input-1 w-full" required />
      </div>

      <div>
        <label for="reason" class="block text-sm font-medium">Reason</label>
        <textarea
          id="reason"
          v-model="form.reason"
          class="input-1 w-full"
          placeholder="Enter your reason for leave"
        ></textarea>
      </div>

      <div>
        <label for="works-in-hand" class="block text-sm font-medium">Works in Hand</label>
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
            {{ user?.name }}
          </option>
        </select>
      </div>

      <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>

      <div class="flex justify-end">
        <button type="submit" class="btn-2">Submit</button>
      </div>
    </form>
  </div>
</template>
