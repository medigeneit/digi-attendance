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
    await leaveApplicationStore.storeLeaveApplication(payload)
    alert('Leave application submitted successfully!')
    router.push({ name: 'MyLeaveApplications' })
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
</script>

<template>
  <div class="max-w-3xl mx-auto p-4 bg-white shadow-md rounded-md space-y-4">
    <h1 class="title-md text-center">Leave Application Form</h1>

    <div v-if="loading" class="text-center">
      <LoaderView />
    </div>

    <form v-else @submit.prevent="submitLeaveApplication" class="space-y-4">
      <div>
        <label for="leave-type" class="block text-sm font-medium">Leave Type</label>
        <select id="leave-type" v-model="form.leave_type_id" class="input-1 w-full" required>
          <option value="">Select Leave Type</option>
          <option v-for="type in leaveTypeStore.leaveTypes" :key="type.id" :value="type.id">
            {{ type.name }}
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
        <label for="reason" class="block text-sm font-medium">Reason (Optional)</label>
        <textarea
          id="reason"
          v-model="form.reason"
          class="input-1 w-full"
          placeholder="Enter your reason for leave"
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

      <div class="flex justify-end">
        <button type="submit" class="btn-2">Submit</button>
      </div>
    </form>
  </div>
</template>
