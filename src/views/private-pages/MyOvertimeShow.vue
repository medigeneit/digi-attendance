<script setup>
import ApprovalItem from '@/components/applications/ApprovalItem.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import DisplayFormattedWorkingHours from '@/components/overtime/DisplayFormattedWorkingHours.vue'
import { useAuthStore } from '@/stores/auth'
import { useOvertimeStore } from '@/stores/overtime'
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const overtimeStore = useOvertimeStore()
const authStore = useAuthStore()

const loading = computed(() => overtimeStore.loading)
const overtime = computed(() => overtimeStore.overtime)

onMounted(async () => {
  const { id } = route.params
  try {
    await overtimeStore.fetchOvertimeById(id)
  } catch (err) {
    console.error('Failed to fetch overtime details:', err)
  }
})

const goBack = () => router.go(-1)

function print() {
  window.print()
}

const onAction = async () => {
  overtimeStore.fetchOvertimeById(route.params.id)
}
</script>

<template>
  <div class="my-container max-w-2xl space-y-6">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-lg text-center">Overtime Details</h1>
      <div>
        <button class="btn-2" @click="print">
          <i class="far fa-print"></i>
          Print
        </button>
      </div>
    </div>

    <LoaderView v-if="loading" />

    <div v-else-if="overtime" class="card-bg p-4 md:p-8">
      <h2 class="title-md">Overtime Request</h2>
      <div class="grid grid-cols-2 gap-2">
        <div class="text-sm space-y-0.5">
          <div v-if="overtime?.date">
            <span class="text-gray-500 mr-1">Date:</span>
            <b>{{
              new Date(overtime?.date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            }}</b>
          </div>
          <div>
            <span class="text-gray-500 mr-1">Duty Type:</span>
            <b>{{ overtime?.duty_type }}</b>
          </div>

          <div class="pt-10">
            <div>
              <hr class="w-44 border-black" />
              <p>
                <b class="text-lg text-blue-700">{{ overtime?.user.name }}</b>
              </p>
              <div class="text-sm">
                <p>
                  {{ overtime?.user?.designation?.title }}
                </p>
                <p>
                  {{ overtime?.user?.department?.name }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="text-sm space-y-1">
          <div>
            <span class="text-gray-500 mr-1">Check In:</span>
            <b>{{ overtime?.check_in || '- : -' }}</b>
          </div>
          <div>
            <span class="text-gray-500 mr-1">Check Out:</span>
            <b>{{ overtime?.check_out || '- : -' }}</b>
          </div>
          <div>
            <span class="text-gray-500 mr-1">Working Hour:</span>
            <b>
              <DisplayFormattedWorkingHours :workingHours="overtime.working_hours" />
            </b>
          </div>
          <div>
            <span class="text-gray-500 mr-1">Request hour:</span>
            <b>{{ parseInt(overtime?.request_overtime_hours) }}</b>
          </div>
          <div>
            <span class="text-gray-500 mr-1">Details:</span>
            <span class="text-sm font-semibold">{{ overtime?.work_details || 'N/A' }}</span>
          </div>
        </div>
      </div>

      <hr />

      <div class="grid md:grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div class="title-md font-semibold">
          Status:
          <span
            :class="{
              'text-yellow-500': overtime?.status === 'Pending',
              'text-green-600': overtime?.status === 'Approved',
              'text-red-500': overtime?.status === 'Rejected',
            }"
          >
            {{ overtime?.status || 'N/A' }}
          </span>
        </div>
        <template v-if="overtime?.status === 'Approved'">
          <div class="col-span-full space-x-1">
            <span>Approved overtime (hour):</span>
            <b>{{ parseInt(overtime?.approval_overtime_hours) }}</b>
          </div>
        </template>
        <template v-if="overtime?.status === 'Rejected'">
          <div class="col-span-full">
            <b>Rejected By:</b>
            {{ overtime?.rejected_by_user?.name || 'N/A' }}
          </div>
          <div class="col-span-full">
            <b>Rejection Reason:</b>
            {{ overtime?.rejection_reason || 'N/A' }}
          </div>
        </template>
      </div>

      <hr />

      <div
        v-if="overtime"
        class="grid grid-cols-2 text-sm md:text-base md:grid-cols-2 md:gap-x-4 gap-y-14 pt-14 items-end"
      >
        <ApprovalItem
          :application="overtime"
          type="overtime_applications"
          item="in_charge"
          :onAction="onAction"
        />

        <ApprovalItem
          v-if="overtime.user.type === 'executive'"
          :application="overtime"
          type="overtime_applications"
          item="coordinator"
          :onAction="onAction"
        />

        <ApprovalItem
          :application="overtime"
          type="overtime_applications"
          item="recommend_by"
          :onAction="onAction"
        />

        <ApprovalItem
          :application="overtime"
          type="overtime_applications"
          item="approved_by"
          :onAction="onAction"
        />
      </div>
    </div>
    <ShareComponent />
  </div>
</template>
