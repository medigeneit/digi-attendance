
<script setup>
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const router = useRouter()

const hasAccessTo = (routeName) => {
  const route = router.getRoutes().find(r => r.name === routeName)
  const allowedRoles = route?.meta?.roles
  if (!allowedRoles) return true
  return allowedRoles.includes(user.value?.role || [])
}
</script>

<template>
  <div class="grid gap-4 md:grid-cols-4 px-4">
    <RouterLink
      v-if="hasAccessTo('EmployeeAttendance')"
      :to="{ name: 'EmployeeAttendance' }"
      class="main-button"
    >
      <i class="fas fa-calendar-alt text-3xl"></i>
      Job Card
    </RouterLink>

    <RouterLink
      v-if="hasAccessTo('EmployeeAttendanceLog')"
      :to="{ name: 'EmployeeAttendanceLog' }"
      class="main-button"
    >
      <i class="fas fa-fingerprint text-3xl"></i>
      Attendance Log
    </RouterLink>

    <RouterLink
      v-if="hasAccessTo('MonthWiseApplicationLog')"
      :to="{ name: 'MonthWiseApplicationLog' }"
      class="main-button"
    >
      <i class="far fa-file-contract text-3xl"></i>
      Monthly Application Log
    </RouterLink>

    <RouterLink
      v-if="hasAccessTo('HrdAdminLeaveApplication')"
      :to="{ name: 'HrdAdminLeaveApplication' }"
      class="main-button"
    >
      <i class="far fa-file-signature text-3xl"></i>
      Annual Leave Applications
    </RouterLink>

    <RouterLink
      v-if="hasAccessTo('LeaveApplicationList')"
      :to="{ name: 'LeaveApplicationList' }"
      class="main-button"
    >
      <i class="fas fa-leaf text-3xl"></i>
      Leave Applications
    </RouterLink>

    <RouterLink
      v-if="hasAccessTo('ShortLeaveList')"
      :to="{ name: 'ShortLeaveList' }"
      class="main-button"
    >
      <i class="fab fa-pagelines text-3xl"></i>
      Short Leaves
    </RouterLink>

    <RouterLink
      v-if="hasAccessTo('ShiftExchangeList')"
      :to="{ name: 'ShiftExchangeList' }"
      class="main-button"
    >
      <i class="fad fa-repeat text-3xl"></i>
      Shift Exchanges
    </RouterLink>

    <RouterLink
      v-if="hasAccessTo('OffdayExchangeList')"
      :to="{ name: 'OffdayExchangeList' }"
      class="main-button"
    >
      <i class="fad fa-random text-3xl"></i>
      Offday Exchanges
    </RouterLink>

    <RouterLink
      v-if="hasAccessTo('ManualAttendanceList')"
      :to="{ name: 'ManualAttendanceList' }"
      class="main-button"
    >
      <i class="fas fa-fingerprint text-3xl"></i>
      Manual Attendance List
    </RouterLink>
    
    <RouterLink
      v-if="hasAccessTo('HrdAdminManualAttendanceApplication')"
      :to="{ name: 'HrdAdminManualAttendanceApplication' }"
      class="main-button"
    >
      <i class="fas fa-fingerprint text-3xl"></i>
      Admin Manual Attendance Application
    </RouterLink>

    <RouterLink
      v-if="hasAccessTo('OvertimeList')"
      :to="{ name: 'OvertimeList' }"
      class="main-button"
    >
      <i class="far fa-business-time text-3xl"></i>
      Overtime List
    </RouterLink>

    <RouterLink
      v-if="hasAccessTo('PayCutList')"
      :to="{ name: 'PayCutList' }"
      class="main-button"
    >
      <i class="far fa-business-time text-3xl"></i>
      PayCut List
    </RouterLink>

    <RouterLink
      v-if="hasAccessTo('NoticeList')"
      :to="{ name: 'NoticeList' }"
      class="main-button"
    >
      <i class="far fa-exclamation-circle text-3xl"></i>
      Notice List
    </RouterLink>

    <RouterLink
      v-if="hasAccessTo('ShiftSchedule')"
      :to="{ name: 'ShiftSchedule' }"
      class="main-button"
    >
      <i class="far fa-exclamation-circle text-3xl"></i>
      Shift Schedules
    </RouterLink>

    <RouterLink
      v-if="hasAccessTo('UserClearance')"
      :to="{ name: 'UserClearance' }"
      class="main-button"
    >
      <i class="far fa-exclamation-circle text-3xl"></i>
      User Clearances
    </RouterLink>
    <RouterLink
      v-if="hasAccessTo('BloodDonorIndex')"
      :to="{ name: 'BloodDonorIndex' }"
      class="main-button"
    >
      <i class="far fa-exclamation-circle text-3xl"></i>
      Blood Donor List
    </RouterLink>
    <RouterLink
      v-if="hasAccessTo('HrdOrganogram')"
      :to="{ name: 'HrdOrganogram' }"
      class="main-button"
    >
      <i class="far fa-exclamation-circle text-3xl"></i>
       Organogram List
    </RouterLink>
  </div>
</template>

