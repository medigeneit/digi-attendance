<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import ChangePasswordModal from '@/components/user/ChangePasswordModal.vue'
import UserClearanceModal from '@/components/UserClearanceModal.vue'
import { useAuthStore } from '@/stores/auth'
import { computed, ref } from 'vue'

const authStore = useAuthStore()

const isLoading = ref(false)
const changePasswordModal = ref(false)
const clearanceOpen = ref(false)

// Logged-in user
const user = computed(() => authStore.user || {})
const isAdmin = computed(() => ['admin', 'super_admin', 'developer'].includes(user.value?.role))

// Helpers
const formatDate = (date) => (date ? new Date(date).toLocaleDateString('en-GB') : 'N/A')
const initials = (name = '') =>
  String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('')

// Avatar
const avatarUrl = computed(() => user.value?.photo || user.value?.avatar_url || '')

// Badges
const deptName = computed(() => user.value?.department?.name || '')
const designation = computed(() => user.value?.designation?.title || user.value?.post || '')

// Actions
const openClearance = () => {
  clearanceOpen.value = true
}
const togglePassword = () => {
  changePasswordModal.value = !changePasswordModal.value
}
</script>

<template>
  <ChangePasswordModal
    v-if="changePasswordModal"
    :user="user"
    @close="() => (changePasswordModal = false)"
  />

  <div class="my-container space-y-6">
    <!-- Header Card -->
    <section
      class="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <!-- subtle gradient -->
      <div
        class="absolute inset-0 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 pointer-events-none"
      ></div>

      <div class="relative px-6 py-6">
        <div class="flex flex-col md:flex-row md:items-center gap-6">
          <!-- Avatar -->
          <div class="flex items-center gap-4">
            <div
              class="h-20 w-20 rounded-2xl ring-4 ring-white shadow-md overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
            >
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                alt="Avatar"
                class="h-full w-full object-cover"
              />
              <span v-else class="text-xl font-semibold text-slate-600 dark:text-slate-300">{{
                initials(user?.name || '')
              }}</span>
            </div>
            <div>
              <h1
                class="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
              >
                {{ user?.name || '—' }}
              </h1>
              <div class="mt-1 flex flex-wrap items-center gap-2">
                <span
                  v-if="user?.employee_id"
                  class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium text-slate-700 bg-white/80 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                >
                  <i class="far fa-id-badge"></i>
                  ID: {{ user.employee_id }}
                </span>
                <span
                  v-if="deptName"
                  class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800"
                >
                  <i class="far fa-building"></i>
                  {{ deptName }}
                </span>
                <span
                  v-if="designation"
                  class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800"
                >
                  <i class="far fa-user-tie"></i>
                  {{ designation }}
                </span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="md:ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-xs md:text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              @click="openClearance"
              title="View Clearance"
            >
              <i class="far fa-clipboard-check"></i>
              View Clearance
            </button>

            <RouterLink
              to="/profile/edit"
              class="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs md:text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:text-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"
              title="Edit Profile"
            >
              <i class="far fa-edit"></i>
              Edit Profile
            </RouterLink>

            <button
              type="button"
              @click="togglePassword"
              class="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-xs md:text-sm font-medium text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400"
              title="Change Password"
            >
              <i class="far fa-key"></i>
              Change Password
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Loading -->
    <LoaderView v-if="isLoading" class="shadow-none" />

    <!-- Info Sections -->
    <section v-else class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Personal Info -->
      <div
        class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="border-b border-slate-200 px-6 py-3 dark:border-slate-800">
          <h2 class="text-base font-semibold text-slate-900 dark:text-white">Personal Info</h2>
        </div>
        <div class="px-6 py-4">
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt class="text-slate-500">Name</dt>
              <dd class="mt-1 font-medium text-slate-900 dark:text-slate-100">
                {{ user?.name || '-' }}
              </dd>
            </div>
            <div>
              <dt class="text-slate-500">Bangla Name</dt>
              <dd class="mt-1 font-medium text-slate-900 dark:text-slate-100">
                {{ user?.bn_name || '-' }}
              </dd>
            </div>
            <div>
              <dt class="text-slate-500">Phone</dt>
              <dd class="mt-1 font-medium text-slate-900 dark:text-slate-100">
                {{ user?.phone || '-' }}
              </dd>
            </div>
            <div>
              <dt class="text-slate-500">Email</dt>
              <dd class="mt-1 font-medium text-slate-900 dark:text-slate-100">
                {{ user?.email || '-' }}
              </dd>
            </div>
            <div>
              <dt class="text-slate-500">Blood Group</dt>
              <dd class="mt-1 font-medium text-slate-900 dark:text-slate-100">
                {{ user?.blood || '-' }}
              </dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-slate-500">Address</dt>
              <dd class="mt-1 font-medium text-slate-900 dark:text-slate-100">
                {{ user?.address || '-' }}
              </dd>
            </div>
            <div>
              <dt class="text-slate-500">Employee ID</dt>
              <dd class="mt-1 font-medium text-slate-900 dark:text-slate-100">
                {{ user?.employee_id || '-' }}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- Professional Info -->
      <div
        class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="border-b border-slate-200 px-6 py-3 dark:border-slate-800">
          <h2 class="text-base font-semibold text-slate-900 dark:text-white">Professional Info</h2>
        </div>
        <div class="px-6 py-4">
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt class="text-slate-500">Company</dt>
              <dd class="mt-1 font-medium text-slate-900 dark:text-slate-100">
                {{ user?.company?.name || '-' }}
              </dd>
            </div>
            <div>
              <dt class="text-slate-500">Department</dt>
              <dd class="mt-1 font-medium text-slate-900 dark:text-slate-100">
                {{ deptName || '-' }}
              </dd>
            </div>
            <div>
              <dt class="text-slate-500">Designation</dt>
              <dd class="mt-1 font-medium text-slate-900 dark:text-slate-100">
                {{ designation || '-' }}
              </dd>
            </div>
            <div>
              <dt class="text-slate-500">Joining Date</dt>
              <dd class="mt-1 font-medium text-slate-900 dark:text-slate-100">
                {{ formatDate(user?.joining_date) }}
              </dd>
            </div>
          </dl>

          <!-- Quick Links -->
          <div class="mt-6 flex flex-wrap gap-2">
            <RouterLink
              to="/my-personal-activity-report"
              class="inline-flex items-center gap-2 rounded-md border border-sky-300 px-3 py-2 text-sm text-sky-700 bg-sky-50 hover:bg-sky-100 dark:border-sky-800 dark:text-sky-200 dark:bg-sky-900/20 dark:hover:bg-sky-900/40"
            >
              <i class="fas fa-tasks"></i> Personal Activity Report (PAR)
            </RouterLink>

            <RouterLink
              v-if="isAdmin"
              :to="{ name: 'UserList', query: { action: 'clearance' } }"
              class="inline-flex items-center gap-2 rounded-md border border-indigo-300 px-3 py-2 text-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-800 dark:text-indigo-200 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40"
            >
              <i class="far fa-clipboard-check"></i> User Clearance
            </RouterLink>

            <!-- <RouterLink
              v-if="authStore.isAdminMood"
              to="/tasks"
              class="inline-flex items-center gap-2 rounded-md border border-emerald-300 px-3 py-2 text-sm text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-200 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40"
            >
              <i class="fas fa-clipboard-list"></i> Task Management
            </RouterLink> -->
          </div>
        </div>
      </div>
    </section>

    <!-- Clearance Modal -->
    <UserClearanceModal v-model:open="clearanceOpen" :user="user" :hide-trigger="true" />
  </div>
</template>
