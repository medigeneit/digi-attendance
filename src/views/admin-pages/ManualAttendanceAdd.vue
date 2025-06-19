<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import Multiselect from '@/components/MultiselectDropdown.vue'
import { useManualAttendanceStore } from '@/stores/manual-attendance'
import { useUserStore } from '@/stores/user' // Assuming you have one
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
const selectedEmployee = ref(null)
const router = useRouter()
const manualAttendanceStore = useManualAttendanceStore()
const userStore = useUserStore()
const todayDate = new Date().toISOString().split('T')[0]
const selectedUserId = ref(null)
const { users } = storeToRefs(userStore)
const forms = ref([
  {
    date: todayDate,
    type: '',
    check_in: '',
    check_out: '',
    description: '',
    punch_type: '',
  },
])
onMounted(async () => {
  await userStore.fetchUsers() // Load user list
})

const addForm = () => {
  forms.value.push({
    date: todayDate,
    type: '',
    check_in: '',
    check_out: '',
    description: '',
    punch_type: '',
  })
}

const removeForm = (index) => {
  if (forms.value.length > 1) {
    forms.value.splice(index, 1)
  }
}

const loading = ref(false)
const error = ref(null)

const submitManualAttendance = async () => {
  loading.value = true
  error.value = null

  if (!selectedEmployee.value?.id) {
    error.value = 'Please select an employee.'
    loading.value = false
    return
  }

  try {
    const payload = forms.value.map((form) => ({
      user_id: selectedEmployee.value?.id,
      ...form,
      check_in: form.check_in ? `${form.date} ${form.check_in}:00` : null,
      check_out: form.check_out ? `${form.date} ${form.check_out}:00` : null,
    }))

    await manualAttendanceStore.createBulkManualAttendance(payload)

    router.push({ name: 'ManualAttendanceList' })
  } catch (err) {
    error.value = err.message || 'Failed to submit manual attendance requests.'
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.go(-1)
}
</script>

<template>
  <div class="max-w-4xl mx-auto p-4 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-lg text-center">Manual Attendance Request (Multiple Dates)</h1>
      <RouterLink to="/" class="btn-2">Home</RouterLink>
    </div>

    <div v-if="loading" class="text-center">
      <LoaderView />
    </div>

    <form v-else @submit.prevent="submitManualAttendance" class="space-y-6">
      <div>
        <label class="block text-sm font-medium mb-1">Select Employee</label>
        <Multiselect
          v-model="selectedEmployee"
          :options="users"
          :multiple="false"
          label="label"
          placeholder="Select employee"
        />
      </div>
      <div
        v-for="(form, index) in forms"
        :key="index"
        class="card-bg p-4 md:p-6 rounded border border-gray-300 space-y-4"
      >
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold">Entry {{ index + 1 }}</h2>
          <button type="button" class="text-red-600 text-sm" @click="removeForm(index)">
            <i class="far fa-trash-alt"></i> Remove
          </button>
        </div>

        <div class="flex justify-between flex-wrap gap-4">
          <div class="flex-1">
            <label class="block text-sm font-medium">Date</label>
            <input type="date" v-model="form.date" class="input-1 w-full" required />
          </div>

          <div class="flex-1">
            <label class="block text-sm font-medium">Type</label>
            <select v-model="form.type" class="input-1 w-full" required>
              <option value="">Select Type</option>
              <option value="Home Office">Home Office</option>
              <option value="Remote Work">Remote Work</option>
              <option value="Forget Punch">Forget Punch</option>
            </select>
          </div>

          <div class="flex-1" v-if="form.type === 'Forget Punch'">
            <label class="block text-sm font-medium">Forget Punch Type</label>
            <select v-model="form.punch_type" class="input-1 w-full" required>
              <option value="">Select One</option>
              <option value="entry">Entry</option>
              <option value="exit">Exit</option>
              <option value="both">Both</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-if="
              form.type !== 'Forget Punch' ||
              form.punch_type === 'both' ||
              form.punch_type === 'entry'
            "
          >
            <label class="block text-sm font-medium">Check-In</label>
            <input type="time" v-model="form.check_in" class="input-1 w-full" />
          </div>

          <div
            v-if="
              form.type !== 'Forget Punch' ||
              form.punch_type === 'both' ||
              form.punch_type === 'exit'
            "
          >
            <label class="block text-sm font-medium">Check-Out</label>
            <input type="time" v-model="form.check_out" class="input-1 w-full" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium">Description</label>
          <textarea v-model="form.description" class="input-1 w-full" required></textarea>
        </div>
      </div>

      <div class="flex justify-end">
        <button type="button" class="btn-1" @click="addForm">+ Add Another Day</button>
      </div>

      <div v-if="error" class="text-red-500 text-sm text-center">{{ error }}</div>

      <div class="flex justify-center">
        <button type="submit" class="btn-2">Submit All</button>
      </div>
    </form>
  </div>
</template>
