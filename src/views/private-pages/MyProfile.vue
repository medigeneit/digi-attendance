<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import DonorMeModal from '@/components/DonorMeModal.vue'
import LifeEventUpdateCard from '@/components/profile/LifeEventUpdateCard.vue'
import ProfileCompensationOverview from '@/components/profile/ProfileCompensationOverview.vue'
import ChangePasswordModal from '@/components/user/ChangePasswordModal.vue'
import UserClearanceModal from '@/components/UserClearanceModal.vue'
import { useAuthStore } from '@/stores/auth'
import { useBloodDonorMeStore } from '@/stores/bloodDonorMe'
import { computed, ref } from 'vue'

const authStore = useAuthStore()
const donorMeStore = useBloodDonorMeStore()

const isLoading = ref(false)
const changePasswordModal = ref(false)
const clearanceOpen = ref(false)
const donorModalLoading = ref(false)

const user = computed(() => authStore.user || {})
const isAdmin = computed(() => ['admin', 'super_admin', 'developer'].includes(user.value?.role))

const formatDate = (date) => (date ? new Date(date).toLocaleDateString('en-GB') : 'N/A')
const initials = (name = '') =>
  String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('')

const avatarUrl = computed(() => user.value?.photo || user.value?.avatar_url || '')
const deptName = computed(() => user.value?.department?.name || '')
const designation = computed(() => user.value?.designation?.title || user.value?.post || '')

const personalInfo = computed(() => [
  { label: 'Name', value: user.value?.name },
  { label: 'Bangla Name', value: user.value?.bn_name },
  { label: 'Phone', value: user.value?.phone },
  { label: 'Email', value: user.value?.email },
  { label: 'Blood Group', value: user.value?.blood },
  { label: 'Address', value: user.value?.address },
  { label: 'Employee ID', value: user.value?.employee_id },
  { label: 'Current Shift', value: user.value?.current_shift?.shift?.name },
])

const professionalInfo = computed(() => [
  { label: 'Company', value: user.value?.company?.name },
  { label: 'Department', value: deptName.value },
  { label: 'Designation', value: designation.value },
  { label: 'Joining Date', value: formatDate(user.value?.joining_date) },
  { label: 'Bank Name', value: user.value?.bank_name },
  { label: 'Bank Account No', value: user.value?.bank_account_no },
])

const openClearance = () => {
  clearanceOpen.value = true
}

const togglePassword = () => {
  changePasswordModal.value = !changePasswordModal.value
}

const openMyDonorProfile = async () => {
  donorModalLoading.value = true
  try {
    await donorMeStore.openModal()
  } finally {
    donorModalLoading.value = false
  }
}
</script>

<template>
  <div class="bg-slate-50/60 dark:bg-slate-950">
    <ChangePasswordModal
      v-if="changePasswordModal"
      :user="user"
      @close="() => (changePasswordModal = false)"
    />

    <div class="my-container space-y-4 py-4">
      <section class="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex min-w-0 items-center gap-3">
            <div class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                alt="Avatar"
                class="h-full w-full object-cover"
              />
              <span v-else class="text-base font-semibold text-slate-600 dark:text-slate-300">
                {{ initials(user?.name || '') }}
              </span>
            </div>
            <div class="min-w-0">
              <h1 class="truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                {{ user?.name || '-' }}
              </h1>
              <div class="mt-1 flex flex-wrap items-center gap-1.5">
                <span
                  v-if="user?.employee_id"
                  class="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <i class="far fa-id-badge"></i>
                  ID: {{ user.employee_id }}
                </span>
                <span
                  v-if="deptName"
                  class="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200"
                >
                  <i class="far fa-building"></i>
                  {{ deptName }}
                </span>
                <span
                  v-if="designation"
                  class="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                >
                  <i class="far fa-user-tie"></i>
                  {{ designation }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="inline-flex h-8 items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 text-xs font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              title="View Clearance"
              @click="openClearance"
            >
              <i class="far fa-clipboard-check"></i>
              View Clearance
            </button>

            <RouterLink
              to="/profile/edit"
              class="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              title="Edit Profile"
            >
              <i class="far fa-edit"></i>
              Edit Profile
            </RouterLink>

            <button
              type="button"
              class="inline-flex h-8 items-center gap-1.5 rounded-md bg-rose-600 px-2.5 text-xs font-medium text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400"
              title="Change Password"
              @click="togglePassword"
            >
              <i class="far fa-key"></i>
              Change Password
            </button>

            <button
              type="button"
              class="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              :disabled="donorModalLoading"
              title="My Donor Profile"
              @click="openMyDonorProfile"
            >
              <i class="far fa-tint"></i>
              <span v-if="donorModalLoading">Loading...</span>
              <span v-else>My Donor Profile</span>
            </button>
          </div>
        </div>
      </section>

      <LoaderView v-if="isLoading" class="shadow-none" />

      <section v-else class="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div class="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="border-b border-slate-200 px-4 py-2 dark:border-slate-800">
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Personal Info</h2>
          </div>
          <dl class="grid grid-cols-1 divide-y divide-slate-100 text-sm dark:divide-slate-800 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div
              v-for="field in personalInfo"
              :key="field.label"
              class="grid grid-cols-[110px_minmax(0,1fr)] gap-2 px-4 py-2.5 sm:block"
            >
              <dt class="text-xs font-medium text-slate-500">{{ field.label }}</dt>
              <dd class="truncate font-medium text-slate-900 dark:text-slate-100 sm:mt-0.5">
                {{ field.value || '-' }}
              </dd>
            </div>
          </dl>
        </div>

        <div class="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="border-b border-slate-200 px-4 py-2 dark:border-slate-800">
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Professional Info</h2>
          </div>
          <dl class="grid grid-cols-1 divide-y divide-slate-100 text-sm dark:divide-slate-800 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div
              v-for="field in professionalInfo"
              :key="field.label"
              class="grid grid-cols-[110px_minmax(0,1fr)] gap-2 px-4 py-2.5 sm:block"
            >
              <dt class="text-xs font-medium text-slate-500">{{ field.label }}</dt>
              <dd class="truncate font-medium text-slate-900 dark:text-slate-100 sm:mt-0.5">
                {{ field.value || '-' }}
              </dd>
            </div>
          </dl>

          <div class="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
            <RouterLink
              to="/my-personal-activity-report"
              class="inline-flex h-8 items-center gap-1.5 rounded-md border border-sky-300 bg-sky-50 px-2.5 text-xs font-medium text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-200 dark:hover:bg-sky-900/40"
            >
              <i class="fas fa-tasks"></i> Personal Activity Report (PAR)
            </RouterLink>
          </div>
        </div>
      </section>

      <ProfileCompensationOverview :user="user" />

      <LifeEventUpdateCard />

      <UserClearanceModal v-model:open="clearanceOpen" :user="user" :hide-trigger="true" />
      <DonorMeModal />
    </div>
  </div>
</template>
