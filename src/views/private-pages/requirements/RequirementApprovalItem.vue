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

const allApprovals = computed(() => {
  return {
    from_in_charge: !!(props.requirement?.status && props.requirement?.submission_date),
    from_coordinator: !!props.requirement?.from_coordinator,
    to_in_charge: !!props.requirement?.to_incharge,
    to_coordinator: !!props.requirement?.to_coordinator,
  }
})

const departmentUsers = computed(() => {
  return {
    from_in_charge: props.requirement?.from_department?.in_charge,
    from_coordinator: props.requirement?.from_department?.coordinator,
    to_in_charge: props.requirement?.to_department?.in_charge,
    to_coordinator: props.requirement?.to_department?.coordinator,
  }
})

const previousApproverApproved = computed(() => {
  const approvalKeys = Object.keys(allApprovals.value)
  const currentIndex = approvalKeys.indexOf(props.approvalType)
  let approve = true
  for (let i = currentIndex - 1; i >= 0; i--) {
    const approvalKey = approvalKeys[i]
    approve =
      approve && (departmentUsers.value[approvalKey] ? allApprovals.value?.[approvalKey] : true)
  }

  return approve
})

const approvalData = computed(() => {
  let department = null

  let approval_user = null
  let userType = ''
  let approval_note = ''

  if (props.approvalType === 'from_in_charge') {
    department = props.requirement?.from_department
    approval_user = props.requirement?.from_department?.in_charge
    userType = 'In Charge'
    approval_note = props.requirement?.from_incharge_note
  }

  if (props.approvalType === 'from_coordinator') {
    department = props.requirement?.from_department
    approval_user = props.requirement?.from_coordinator
    userType = 'Coordinator'
    approval_note = props.requirement?.from_coordinator_note
  }

  if (props.approvalType === 'to_in_charge') {
    department = props.requirement?.to_department
    approval_user = props.requirement?.to_in_charge
    userType = 'In Charge'
    approval_note = props.requirement?.to_incharge_note
  }

  if (props.approvalType === 'to_coordinator') {
    department = props.requirement?.to_department
    approval_user = props.requirement?.to_coordinator
    userType = 'Coordinator'
    approval_note = props.requirement?.to_coordinator_note
  }

  return {
    department,
    department_user: departmentUsers.value?.[props.approvalType],
    approved: allApprovals.value?.[props.approvalType],
    approval_user,
    userType,
    approval_note,
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
  <div class="flex flex-col items-center gax-x-1 justify-between">
    <div v-if="approvalData.department_user">
      <UserChip :user="approvalData.department_user" avatar-size="xsmall" />
    </div>
    <div v-else>
      <span class="italic text-xs text-gray-400">N/A</span>
    </div>
    <div class="text-sm text-gray-600">{{ approvalData.approval_note }}</div>

    <hr class="my-2 border-gray-600 w-64" />

    <div class="text-base text-gray-900 font-semibold">
      <span>
        {{ approvalData.department?.short_name || approvalData.department?.name }}
      </span>
      <span class="ml-2">{{ approvalData.userType }}</span>

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
          !approvalData.approved &&
          previousApproverApproved &&
          authStore.user?.id == approvalData?.department_user?.id
        "
      />
    </div>
  </div>
</template>
