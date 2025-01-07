<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRoute } from 'vue-router'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useAuthStore } from '@/stores/auth'
import LoaderView from '@/components/common/LoaderView.vue'

const authStore = useAuthStore()
const leaveApplicationStore = useLeaveApplicationStore()
const router = useRouter()
const route = useRoute()
const loading = ref(true)

const leaveApplication = computed(() => leaveApplicationStore.leaveApplication)

onMounted(async () => {
  const { id } = route.params
  try {
    await leaveApplicationStore.fetchLeaveApplicationById(id)
  } catch (error) {
    console.error('Failed to load leave application:', error)
  } finally {
    loading.value = false
  }
})

async function acceptHandoverApplication(id) {
  try {
    await leaveApplicationStore.acceptHandover(id)
    alert('Handover accepted successfully!')
  } catch (err) {
    alert(err.message)
  }
}

const goBack = () => router.go(-1)
</script>

<template>
  <div class="my-container space-y-6">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-xl flex-wrap text-center">Leave Application</h1>
      <div></div>
    </div>

    <LoaderView v-if="loading" />

    <div v-else class="card-bg p-4 md:p-8">
      <div class="flex flex-col md:flex-row justify-between">
        <div>
          <h1 class="title-md">
            {{ leaveApplication?.user?.company?.name }} Employee Leave Application
          </h1>
          <p class="">
            Application for: <b>{{ leaveApplication?.leave_type?.name }}</b>
          </p>
          <p>
            Application Status:
            <b
              :class="{
                'text-yellow-500': leaveApplication?.status === 'Pending',
                'text-green-500': leaveApplication?.status === 'Approved',
                'text-red-500': leaveApplication?.status === 'Rejected',
              }"
            >
              {{ leaveApplication?.status || 'N/A' }}
            </b>
          </p>
        </div>
      </div>
      <hr />
      <h3 class="text-lg font-semibold text-gray-700">Leave Details</h3>
      <div class="grid grid-cols-1 md:grid-cols-2">
        <li><strong>Start Date:</strong> {{ leaveApplication?.start_date }}</li>
        <li><strong>End Date:</strong> {{ leaveApplication?.end_date }}</li>
        <li><strong>Total Days:</strong> {{ leaveApplication?.total_days }}</li>
        <li><strong>Resumption Date:</strong> {{ leaveApplication?.resumption_date }}</li>
        <li>
          <strong>Reason for Leave: </strong>{{ leaveApplication?.reason || 'No reason provided' }}
        </li>
      </div>
      <hr />
      <h4 class="text-lg font-semibold text-gray-700">Handover details</h4>
      <div class="grid grid-cols-1 md:grid-cols-2">
        <li>
          <strong>Works in Hand: </strong
          >{{ leaveApplication?.works_in_hand || 'No details provided' }}
        </li>
        <li>
          <strong>Handover to: </strong
          >{{ leaveApplication?.handover_user?.name || 'Not assigned' }}
          <span v-if="leaveApplication?.status === 'Pending'">(✔)</span>
          <span
            ><button
              v-if="
                !leaveApplication?.status && leaveApplication.handover_user_id === authStore.user.id
              "
              @click="acceptHandoverApplication(leaveApplication.id)"
              class="btn-link"
            >
              Accept Handover
            </button></span
          >
        </li>
      </div>
      <hr />
      <h3 class="text-lg font-semibold text-gray-700">Applicant Details</h3>
      <div class="p-4 rounded-lg bg-gray-100 border">
        <div class="">
          <p><strong>Name:</strong> {{ leaveApplication?.user?.name }}</p>
          <p><strong>Email:</strong> {{ leaveApplication?.user?.email }}</p>
          <p><strong>Phone:</strong> {{ leaveApplication?.user?.phone }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
