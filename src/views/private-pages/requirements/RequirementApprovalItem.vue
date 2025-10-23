<script setup>
import UserChip from '@/components/user/UserChip.vue'
import { useAuthStore } from '@/stores/auth'
import { computed } from 'vue'

const props = defineProps({
  requirement: {
    type: Object,
    required: true,
  },
  approvalType: {
    type: String,
    required: true,
  },
})

const approvalData = computed(() => {
  let department = null
  let department_user = null
  let approval_user = null
  let userType = ''
  let approved = false

  if (props.approvalType === 'from_department_in_charge') {
    department = props.requirement?.from_department
    department_user = props.requirement?.from_department?.in_charge
    approval_user = props.requirement?.from_department?.in_charge
    userType = 'In Charge'
    approved = !!(props.requirement?.status && props.requirement?.submission_date)
  }

  if (props.approvalType === 'from_department_coordinator') {
    department = props.requirement?.from_department
    department_user = props.requirement?.from_department?.coordinator
    approval_user = props.requirement?.from_coordinator
    approved = !!props.requirement?.from_coordinator
    userType = 'Coordinator'
  }

  if (props.approvalType === 'to_department_in_charge') {
    department = props.requirement?.to_department
    department_user = props.requirement?.to_department?.in_charge
    approval_user = props.requirement?.to_in_charge
    approved = !!props.requirement?.to_incharge
    userType = 'In Charge'
  }

  if (props.approvalType === 'to_department_coordinator') {
    department = props.requirement?.to_department
    department_user = props.requirement?.to_department?.coordinator
    approval_user = props.requirement?.to_coordinator
    approved = !!props.requirement?.to_coordinator
    userType = 'Coordinator'
  }

  return {
    department,
    department_user,
    approval_user,
    userType,
    approved,
  }
})

// const userIsApprobate = computed(() => {
//   return authStore.user?.id == approvalData?.value?.department_user?.id
// })
</script>

<template>
  <div class="flex flex-col items-center gax-x-1 justify-between">
    <div v-if="approvalData.department_user">
      <UserChip :user="approvalData.department_user" avatar-size="xsmall" />
    </div>
    <div v-else>
      <span class="italic text-xs text-gray-400">N/A</span>
    </div>

    <hr class="my-2 border-gray-600 w-64" />

    <div class="text-base text-gray-900 font-semibold">
      <span>
        {{ approvalData.department?.short_name || approvalData.department?.name }}
      </span>
      <span class="ml-2">{{ approvalData.userType }}</span>
      <span class="fas fa-check-circle ml-2 text-green-500" v-if="approvalData.approved"></span>
      <!-- <span v-else>
        <button
          class="text-xs border rounded-md px-2 py-0.5 ml-2 bg-sky-500 text-white"
          v-if="userIsApprobate"
        >
          Approve
        </button>
      </span> -->
    </div>
  </div>
</template>
