<script setup>
import ApproveAndReject from '@/components/task-notifications/ApproveAndReject.vue'
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

const emit = defineEmits(['updateApproval'])

const authStore = useAuthStore()

const approvalData = computed(() => {
  let department = null
  let department_user = null
  let approval_user = null
  let userType = ''
  let approved = false

  if (props.approvalType === 'from_in_charge') {
    department = props.requirement?.from_department
    department_user = props.requirement?.from_department?.in_charge
    approval_user = props.requirement?.from_department?.in_charge
    userType = 'In Charge'
    approved = !!(props.requirement?.status && props.requirement?.submission_date)
  }

  if (props.approvalType === 'from_coordinator') {
    department = props.requirement?.from_department
    department_user = props.requirement?.from_department?.coordinator
    approval_user = props.requirement?.from_coordinator
    approved = !!props.requirement?.from_coordinator
    userType = 'Coordinator'
  }

  if (props.approvalType === 'to_in_charge') {
    department = props.requirement?.to_department
    department_user = props.requirement?.to_department?.in_charge
    approval_user = props.requirement?.to_in_charge
    approved = !!props.requirement?.to_incharge
    userType = 'In Charge'
  }

  if (props.approvalType === 'to_coordinator') {
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

function onSuccess() {
  emit('updateApproval')
}

// const userIsApprobate = computed(() => {
//   return authStore.user?.id == approvalData?.value?.department_user?.id
// })
</script>

<template>
  <div class="flex flex-col items-center gax-x-1 justify-between pt-16">
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
      <!-- <span class="fas fa-check-circle ml-2 text-green-500" v-if="approvalData.approved"></span>
      <span class="fas fa-check ml-2 text-green-500" v-else></span> -->

      <template v-if="approvalData.department_user">
        <span v-if="approvalData.approved" class="text-green-600 ml-2">(✔)</span>
        <span v-else class="ml-2 text-yellow-700">
          <i class="fad fa-spinner"></i>
        </span>
      </template>

      <!-- @loading="(isLoading) => (loading = isLoading)" -->
      <ApproveAndReject
        class="ml-auto z-[5000000]"
        notificationType="pending-requirements"
        :applicationId="props.requirement?.id"
        :onSuccess="onSuccess"
        :variant="1"
        v-if="
          props.requirement?.status !== 'approved' &&
          approvalData.department_user &&
          !approvalData.approved &&
          authStore.user?.id == approvalData?.department_user?.id
        "
      />
    </div>
  </div>
</template>
