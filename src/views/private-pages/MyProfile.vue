<script setup>
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

const changePasswordModal = ref(false)
const clearanceOpen = ref(false)
const donorModalLoading = ref(false)
const activeTab = ref('personal')

const user = computed(() => authStore.user || {})

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
const roleLabel = computed(() => String(user.value?.role || 'employee').replace(/_/g, ' '))

const personalInfo = computed(() => [
  { label: 'Full Name', value: user.value?.name, icon: 'far fa-user' },
  { label: 'Bangla Name', value: user.value?.bn_name, icon: 'far fa-globe' },
  { label: 'Phone', value: user.value?.phone, icon: 'far fa-phone' },
  { label: 'Email', value: user.value?.email, icon: 'far fa-envelope' },
  { label: 'Blood Group', value: user.value?.blood, icon: 'far fa-tint' },
  { label: 'Address', value: user.value?.address, icon: 'far fa-map-marker-alt' },
  { label: 'Employee ID', value: user.value?.employee_id, icon: 'far fa-hashtag' },
  { label: 'Current Shift', value: user.value?.current_shift?.shift?.name, icon: 'far fa-clock' },
])

const professionalInfo = computed(() => [
  { label: 'Company', value: user.value?.company?.name, icon: 'far fa-building' },
  { label: 'Department', value: deptName.value, icon: 'far fa-sitemap' },
  { label: 'Designation', value: designation.value, icon: 'far fa-user-tie' },
  { label: 'Joining Date', value: formatDate(user.value?.joining_date), icon: 'far fa-calendar-check' },
  { label: 'Bank Name', value: user.value?.bank_name, icon: 'far fa-university' },
  { label: 'Bank Account No', value: user.value?.bank_account_no, icon: 'far fa-credit-card' },
])

const summaryCards = computed(() => [
  { label: 'Email', value: user.value?.email, icon: 'far fa-envelope' },
  { label: 'Phone', value: user.value?.phone, icon: 'far fa-phone' },
  { label: 'Department', value: deptName.value, icon: 'far fa-building' },
  { label: 'Employee ID', value: user.value?.employee_id, icon: 'far fa-hashtag' },
])

const tabs = [
  { key: 'personal', label: 'Personal Info', icon: 'far fa-user' },
  { key: 'professional', label: 'Professional Info', icon: 'far fa-briefcase' },
  { key: 'compensation', label: 'Compensation Overview', icon: 'far fa-wallet' },
]

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
  <div class="min-h-screen">
    <ChangePasswordModal
      v-if="changePasswordModal"
      :user="user"
      @close="() => (changePasswordModal = false)"
    />
    <UserClearanceModal :open="clearanceOpen" :user="user" :hide-trigger="true" @update:open="(v) => (clearanceOpen = v)" />
    <DonorMeModal />

    <div class="my-container space-y-5">
      <!-- Page heading -->
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">My Profile</h1>
        <p class="mt-1 text-sm text-slate-500">View your personal info, professional details, and compensation.</p>
      </div>

      <!-- ── Hero Card ── -->
      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <!-- Cover banner -->
        <div class="relative h-36 select-none overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
          <!-- decorative blobs -->
          <div class="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5"></div>
          <div class="absolute -bottom-14 right-28 h-64 w-64 rounded-full bg-white/5"></div>
          <div class="absolute right-1/3 top-6 h-24 w-24 rounded-full bg-white/5"></div>
          <!-- dot grid -->
          <div
            class="absolute inset-0 opacity-[0.08]"
            style="background-image: radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px); background-size: 22px 22px;"
          ></div>
        </div>

        <!-- Row 1: Avatar + identity -->
        <div class="px-5 sm:px-8">
          <div class="-mt-12 flex items-end gap-5 sm:-mt-14">
            <!-- Avatar -->
            <div class="relative shrink-0">
              <div class="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-800 text-white shadow-xl ring-4 ring-white">
                <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar" class="h-full w-full object-cover" />
                <span v-else class="text-3xl font-bold">{{ initials(user?.name || '') }}</span>
              </div>
              <span class="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-white"></span>
            </div>

            <!-- Name / role / designation -->
            <div class="pb-3 pt-14 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mt-1">
                <h2 class="text-xl font-extrabold leading-tight text-slate-900 truncate">{{ user?.name || '—' }}</h2>
                <span class="inline-flex shrink-0 items-center rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-blue-700">
                  {{ roleLabel }}
                </span>
              </div>
              <p class="mt-1 text-sm text-slate-500 truncate">
                {{ designation || 'No designation' }}
                <template v-if="deptName">
                  <span class="mx-2 text-slate-300">·</span>{{ deptName }}
                </template>
              </p>
            </div>
          </div>
        </div>

        <!-- Row 2: Actions bar -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3 sm:px-8">
          <p class="text-xs text-slate-400">
            <i class="far fa-id-badge mr-1.5 text-slate-300"></i>
            {{ user?.employee_id || 'N/A' }}
          </p>
          <div class="flex flex-wrap gap-2">
            <RouterLink
              to="/profile/edit"
              class="inline-flex h-8 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
            >
              <i class="far fa-edit text-xs"></i>
              Edit Profile
            </RouterLink>
            <button
              type="button"
              class="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
              @click="togglePassword"
            >
              <i class="far fa-key text-amber-500"></i>
              Password
            </button>
            <button
              type="button"
              class="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
              @click="openClearance"
            >
              <i class="far fa-clipboard-check text-blue-500"></i>
              Clearance
            </button>
            <button
              type="button"
              class="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-60"
              :disabled="donorModalLoading"
              @click="openMyDonorProfile"
            >
              <i class="far fa-tint text-rose-500"></i>
              <span v-if="donorModalLoading">Loading…</span>
              <span v-else>Donor</span>
            </button>
          </div>
        </div>

        <!-- Quick-info stat strip -->
        <div class="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 md:grid-cols-4">
          <article
            v-for="card in summaryCards"
            :key="card.label"
            class="flex items-center gap-3 bg-white px-5 py-4"
          >
            <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <i :class="card.icon" class="text-sm"></i>
            </span>
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">{{ card.label }}</p>
              <p class="mt-0.5 truncate text-sm font-bold text-slate-900">{{ card.value || '—' }}</p>
            </div>
          </article>
        </div>
      </section>

      <!-- ── Tabs + Content ── -->
      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <!-- Tab navigation -->
        <div class="flex overflow-x-auto border-b border-slate-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="relative inline-flex h-12 shrink-0 items-center gap-2 whitespace-nowrap px-5 text-sm font-semibold transition-colors"
            :class="
              activeTab === tab.key
                ? 'bg-blue-50/60 text-blue-700'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            "
            @click="activeTab = tab.key"
          >
            <i :class="tab.icon" class="text-xs"></i>
            {{ tab.label }}
            <span
              v-if="activeTab === tab.key"
              class="absolute bottom-0 inset-x-2 h-0.5 rounded-full bg-blue-600"
            ></span>
          </button>
          <RouterLink
            to="/my-personal-activity-report"
            class="ml-auto inline-flex h-12 shrink-0 items-center gap-2 whitespace-nowrap px-5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
          >
            <i class="far fa-chart-bar text-xs"></i>
            Activity (PAR)
          </RouterLink>
        </div>

        <!-- Personal tab -->
        <div v-if="activeTab === 'personal'" class="p-5 md:p-7">
          <div class="mb-6 flex items-start gap-3">
            <span class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <i class="far fa-user text-sm"></i>
            </span>
            <div>
              <h3 class="font-bold text-slate-900">Personal Information</h3>
              <p class="mt-0.5 text-xs text-slate-500">Identity, contact, and daily work assignment details.</p>
            </div>
          </div>
          <dl class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="field in personalInfo"
              :key="field.label"
              class="group flex gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3.5 transition hover:border-blue-100 hover:bg-blue-50/30"
            >
              <span class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-500 text-sm shadow-sm transition group-hover:bg-blue-50">
                <i :class="field.icon"></i>
              </span>
              <div class="min-w-0">
                <dt class="text-[10px] font-bold uppercase tracking-widest text-slate-400">{{ field.label }}</dt>
                <dd class="mt-0.5 break-words text-sm font-semibold text-slate-900">{{ field.value || '—' }}</dd>
              </div>
            </div>
          </dl>
        </div>

        <!-- Professional tab -->
        <div v-if="activeTab === 'professional'" class="space-y-6 p-5 md:p-7">
          <div>
            <div class="mb-6 flex items-start gap-3">
              <span class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <i class="far fa-briefcase text-sm"></i>
              </span>
              <div>
                <h3 class="font-bold text-slate-900">Professional Information</h3>
                <p class="mt-0.5 text-xs text-slate-500">Company, department, designation, joining, and bank details.</p>
              </div>
            </div>
            <dl class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div
                v-for="field in professionalInfo"
                :key="field.label"
                class="group flex gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3.5 transition hover:border-indigo-100 hover:bg-indigo-50/20"
              >
                <span class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-500 text-sm shadow-sm transition group-hover:bg-indigo-50">
                  <i :class="field.icon"></i>
                </span>
                <div class="min-w-0">
                  <dt class="text-[10px] font-bold uppercase tracking-widest text-slate-400">{{ field.label }}</dt>
                  <dd class="mt-0.5 break-words text-sm font-semibold text-slate-900">{{ field.value || '—' }}</dd>
                </div>
              </div>
            </dl>
          </div>
          <LifeEventUpdateCard />
        </div>

        <!-- Compensation tab -->
        <div v-if="activeTab === 'compensation'" class="p-5 md:p-7">
          <ProfileCompensationOverview :user="user" />
        </div>
      </section>
    </div>
  </div>
</template>
