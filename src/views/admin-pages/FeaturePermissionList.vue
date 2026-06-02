<script setup>
import UserChip from '@/components/user/UserChip.vue'
import { useAuthStore } from '@/stores/auth'
import { useUserPermissionStore } from '@/stores/userPermissionStore'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'

const userStore           = useUserStore()
const userPermissionStore = useUserPermissionStore()
const authStore           = useAuthStore()
const { users, isLoading: usersLoading }      = storeToRefs(userStore)
const { featureCatalog, loading: permLoading } = storeToRefs(userPermissionStore)

// ─── UI state ─────────────────────────────────────────────────────────────────
const q                 = ref('')
const selectedRole      = ref('all')
const selectedUserId    = ref(null)
const selectedConfigured= ref(false)
const featureMatrix     = ref({})
const savedOk           = ref(false)
const dirty             = ref(false)

// ─── Module icon map ──────────────────────────────────────────────────────────
const MODULE_ICONS = {
  employee:    'far fa-users-cog',
  emp_reports: 'far fa-chart-bar',
  lifecycle:   'far fa-route',
  attendance:  'far fa-clock',
  payroll:     'far fa-money-bill-wave',
  kpi:         'far fa-chart-line',
  settings:    'far fa-cog',
}

const MODULE_COLORS = {
  employee:    'bg-blue-50 text-blue-600',
  emp_reports: 'bg-violet-50 text-violet-600',
  lifecycle:   'bg-emerald-50 text-emerald-600',
  attendance:  'bg-orange-50 text-orange-600',
  payroll:     'bg-teal-50 text-teal-600',
  kpi:         'bg-indigo-50 text-indigo-600',
  settings:    'bg-slate-100 text-slate-600',
}

const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-700',
  developer:   'bg-blue-100 text-blue-700',
  admin:       'bg-indigo-100 text-indigo-700',
  employee:    'bg-slate-100 text-slate-600',
}

// ─── Super-admin auto-access ──────────────────────────────────────────────────
const AUTO_ACCESS_ROLES = ['super_admin', 'developer']
const selectedUserIsAutoAccess = computed(() =>
  AUTO_ACCESS_ROLES.includes(selectedUser.value?.role),
)

// ─── Derived state ────────────────────────────────────────────────────────────
const catalogKeys = computed(() =>
  (featureCatalog.value || []).flatMap((m) => m.items || []).map((item) => item.key),
)

const ALLOWED_ROLES = ['admin', 'super_admin', 'developer']

const userList = computed(() => {
  const list = Array.isArray(users.value) ? users.value : []
  const term = q.value.trim().toLowerCase()
  return list
    .filter((u) => {
      if (!u?.id) return false
      if (!ALLOWED_ROLES.includes(u.role)) return false
      if (selectedRole.value !== 'all' && u.role !== selectedRole.value) return false
      if (!term) return true
      return [u.name, u.email, u.employee_id, u.designation?.name, u.department?.name]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(term))
    })
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
})

const selectedUser = computed(() =>
  userList.value.find((u) => Number(u.id) === Number(selectedUserId.value)) ||
  (users.value || []).find((u) => Number(u.id) === Number(selectedUserId.value)) || null,
)

const currentUserId = computed(() => {
  if (authStore.user?.id) return authStore.user.id
  try { return JSON.parse(localStorage.getItem('user') || '{}')?.id } catch { return null }
})

const configuredCount  = computed(() => catalogKeys.value.filter((k) => featureMatrix.value[k] !== false).length)
const totalFeatureCount = computed(() => catalogKeys.value.length)

// ─── Module helpers ───────────────────────────────────────────────────────────
const moduleChecked = (mod) => {
  const items = mod?.items || []
  return items.length > 0 && items.every((i) => featureMatrix.value[i.key] !== false)
}
const modulePartial = (mod) => {
  const items = mod?.items || []
  const n = items.filter((i) => featureMatrix.value[i.key] !== false).length
  return n > 0 && n < items.length
}
const moduleAllowedCount = (mod) =>
  (mod?.items || []).filter((i) => featureMatrix.value[i.key] !== false).length

const toggleModule = (mod, value) => {
  ;(mod?.items || []).forEach((i) => { featureMatrix.value[i.key] = !!value })
}

const setAll = (value) => { catalogKeys.value.forEach((k) => { featureMatrix.value[k] = !!value }) }

function togglePermission(key) {
  featureMatrix.value[key] = featureMatrix.value[key] !== false ? false : true
}

function moduleIcon(key) { return MODULE_ICONS[key] || 'far fa-puzzle-piece' }
function moduleColor(key) { return MODULE_COLORS[key] || 'bg-slate-100 text-slate-600' }
function roleColor(role) { return ROLE_COLORS[role] || 'bg-slate-100 text-slate-600' }

// ─── Data operations ──────────────────────────────────────────────────────────
const normalizeMatrix = (effective = {}) => {
  const matrix = { ...effective }
  catalogKeys.value.forEach((k) => {
    if (!Object.prototype.hasOwnProperty.call(matrix, k)) matrix[k] = true
  })
  featureMatrix.value = matrix
}

const loadUserPermissions = async (userId) => {
  if (!userId) return
  savedOk.value = false
  dirty.value   = false
  const data = await userPermissionStore.fetchUserFeaturePermissions(userId)
  selectedConfigured.value = !!data?.configured
  normalizeMatrix(data?.effective || {})
}

const saveFeatureAccess = async () => {
  if (!selectedUser.value?.id) return
  const payload = catalogKeys.value.map((k) => ({ key: k, allowed: featureMatrix.value[k] !== false }))
  const data = await userPermissionStore.updateUserFeaturePermissions(selectedUser.value.id, payload)
  selectedConfigured.value = !!data?.configured
  normalizeMatrix(data?.effective || featureMatrix.value)
  if (Number(selectedUser.value.id) === Number(currentUserId.value)) {
    await authStore.fetchFeaturePermissions(true)
  }
  savedOk.value = true
  dirty.value   = false
  setTimeout(() => { savedOk.value = false }, 3000)
}

// ─── Dirty tracking ───────────────────────────────────────────────────────────
watch(featureMatrix, () => { dirty.value = true }, { deep: true })
watch(selectedUserId, (id) => { loadUserPermissions(id) })

onMounted(async () => {
  await Promise.all([
    userStore.fetchUsers({ is_active: 1 }),
    userPermissionStore.fetchFeatureCatalog(),
  ])
  if (!selectedUserId.value && userList.value.length) {
    selectedUserId.value = userList.value[0].id
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 px-3 py-3 md:px-5">
    <section class="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">

      <!-- ── Page header ──────────────────────────────────────────────────── -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <div class="text-[10px] font-bold uppercase tracking-[0.24em] text-blue-700">Settings</div>
          <h1 class="mt-0.5 text-xl font-semibold text-slate-950">Feature Permissions</h1>
          <p class="mt-0.5 text-xs text-slate-500">
            Control module/action access per user — separate from data scope.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {{ userList.length }} users
          </span>
          <span class="rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
            {{ totalFeatureCount }} actions
          </span>
          <span
            class="rounded-md px-2.5 py-1 text-[11px] font-semibold"
            :class="selectedConfigured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
          >
            <i :class="selectedConfigured ? 'far fa-shield-check' : 'far fa-unlock'" class="mr-1"></i>
            {{ selectedConfigured ? 'Configured' : 'Legacy open' }}
          </span>
        </div>
      </div>

      <!-- ── Two-panel layout ─────────────────────────────────────────────── -->
      <div class="flex min-h-[700px] flex-col lg:flex-row lg:divide-x lg:divide-slate-100">

        <!-- Left: User list ──────────────────────────────────────────────── -->
        <aside class="w-full shrink-0 bg-slate-50/50 lg:w-72 xl:w-80">

          <!-- Search + role filter -->
          <div class="space-y-2 border-b border-slate-100 p-3">
            <div class="relative">
              <i class="far fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400"></i>
              <input
                v-model="q"
                type="search"
                placeholder="Search name, ID, department…"
                class="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <select
              v-model="selectedRole"
              class="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="all">All roles</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
              <option value="developer">Developer</option>
            </select>
          </div>

          <!-- User rows -->
          <div class="max-h-[620px] overflow-y-auto p-2 space-y-1">
            <div v-if="usersLoading" class="py-8 text-center text-xs text-slate-400">
              <i class="far fa-spinner fa-spin mr-1"></i> Loading users…
            </div>
            <div v-else-if="!userList.length" class="py-8 text-center text-xs text-slate-400">
              No users found.
            </div>

            <button
              v-for="user in userList"
              :key="user.id"
              type="button"
              class="group w-full rounded-md border px-3 py-2 text-left transition"
              :class="Number(selectedUserId) === Number(user.id)
                ? 'border-blue-400 bg-blue-50 shadow-sm'
                : 'border-transparent bg-white hover:border-slate-200 hover:bg-white'"
              @click="selectedUserId = user.id"
            >
              <div class="flex items-center gap-2.5">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold uppercase text-slate-600">
                  {{ (user.name || '?').slice(0, 2) }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <span class="truncate text-[12px] font-semibold text-slate-900">{{ user.name }}</span>
                    <span
                      class="shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                      :class="roleColor(user.role)"
                    >{{ user.role }}</span>
                  </div>
                  <div class="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span v-if="user.employee_id" class="font-mono">{{ user.employee_id }}</span>
                    <span v-if="user.department?.name" class="truncate">· {{ user.department.name }}</span>
                  </div>
                </div>
                <span
                  class="h-1.5 w-1.5 shrink-0 rounded-full"
                  :class="Number(selectedUserId) === Number(user.id) ? 'bg-blue-500' : 'bg-slate-200 group-hover:bg-slate-300'"
                ></span>
              </div>
            </button>
          </div>
        </aside>

        <!-- Right: Permission matrix ─────────────────────────────────────── -->
        <main class="min-w-0 flex-1">

          <!-- No selection state -->
          <div v-if="!selectedUser" class="flex h-full items-center justify-center p-10 text-center">
            <div>
              <i class="far fa-user-lock text-3xl text-slate-300"></i>
              <p class="mt-3 text-sm font-medium text-slate-500">Select a user to configure feature access.</p>
            </div>
          </div>

          <template v-else>
            <!-- Sticky action bar -->
            <div class="sticky top-0 z-10 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
              <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">

                <!-- User info -->
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-bold uppercase text-slate-600">
                    {{ (selectedUser.name || '?').slice(0, 2) }}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-semibold text-slate-900">{{ selectedUser.name }}</span>
                      <span
                        class="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                        :class="roleColor(selectedUser.role)"
                      >{{ selectedUser.role }}</span>
                    </div>
                    <div class="text-[10px] text-slate-400">
                      {{ selectedUser.designation?.title ?? selectedUser.designation?.name ?? 'No designation' }}
                      <span v-if="selectedUser.department?.name"> · {{ selectedUser.department.name }}</span>
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex flex-wrap items-center gap-2">
                  <!-- Progress pill -->
                  <div class="flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1">
                    <div class="relative h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                      <div
                        class="absolute inset-y-0 left-0 rounded-full bg-emerald-500 transition-all"
                        :style="{ width: `${totalFeatureCount ? (configuredCount / totalFeatureCount) * 100 : 0}%` }"
                      ></div>
                    </div>
                    <span class="text-[11px] font-semibold text-slate-600">
                      {{ configuredCount }}/{{ totalFeatureCount }}
                    </span>
                  </div>

                  <template v-if="!selectedUserIsAutoAccess">
                    <button
                      class="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                      @click="setAll(true)"
                    >
                      <i class="far fa-check-double mr-1"></i>Allow all
                    </button>
                    <button
                      class="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                      @click="setAll(false)"
                    >
                      <i class="far fa-ban mr-1"></i>Block all
                    </button>
                    <button
                      class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold text-white transition disabled:opacity-50"
                      :class="savedOk ? 'bg-emerald-600' : dirty ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 hover:bg-slate-700'"
                      :disabled="permLoading"
                      @click="saveFeatureAccess"
                    >
                      <i :class="permLoading ? 'far fa-spinner fa-spin' : savedOk ? 'far fa-check' : 'far fa-save'"></i>
                      {{ permLoading ? 'Saving…' : savedOk ? 'Saved' : dirty ? 'Save changes' : 'Save access' }}
                    </button>
                  </template>
                  <span
                    v-else
                    class="rounded-md bg-purple-50 px-2.5 py-1.5 text-[11px] font-semibold text-purple-600"
                  >
                    <i class="far fa-crown mr-1"></i>Auto full access
                  </span>
                </div>
              </div>

              <!-- Auto-access banner for super_admin / developer -->
              <div
                v-if="selectedUserIsAutoAccess"
                class="flex items-center gap-2 border-t border-purple-100 bg-purple-50 px-4 py-2 text-[11px] text-purple-700"
              >
                <i class="far fa-crown text-sm"></i>
                <span>
                  <strong>{{ selectedUser.role === 'developer' ? 'Developer' : 'Super Admin' }}</strong>
                  — this role automatically has full access to all features. Configuration matrix is not applied.
                </span>
              </div>

              <!-- Status strip (admin users only) -->
              <div
                v-else
                class="flex items-center gap-2 border-t px-4 py-1.5 text-[11px]"
                :class="savedOk
                  ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                  : dirty
                    ? 'border-blue-100 bg-blue-50 text-blue-700'
                    : selectedConfigured
                      ? 'border-slate-100 bg-white text-slate-500'
                      : 'border-amber-100 bg-amber-50 text-amber-700'"
              >
                <i :class="savedOk ? 'far fa-check-circle' : dirty ? 'far fa-circle-dot' : selectedConfigured ? 'far fa-shield-check' : 'far fa-triangle-exclamation'"></i>
                <span v-if="savedOk">Feature permissions saved successfully.</span>
                <span v-else-if="dirty">You have unsaved changes.</span>
                <span v-else-if="selectedConfigured">Explicit permissions active — this user's access is configured.</span>
                <span v-else>Legacy open mode: all features are allowed until you explicitly save a matrix.</span>
              </div>
            </div>

            <!-- Module permission cards -->
            <div
              class="grid gap-3 p-4 xl:grid-cols-2"
              :class="selectedUserIsAutoAccess ? 'pointer-events-none opacity-60' : ''"
            >
              <section
                v-for="mod in featureCatalog"
                :key="mod.key"
                class="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"
                :class="moduleChecked(mod) ? 'border-emerald-200' : ''"
              >
                <!-- Module header -->
                <div class="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-3 py-2.5">
                  <span
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm"
                    :class="moduleColor(mod.key)"
                  >
                    <i :class="moduleIcon(mod.key)"></i>
                  </span>

                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="text-[13px] font-semibold text-slate-900">{{ mod.label }}</span>
                      <code class="rounded bg-slate-100 px-1 py-0.5 text-[9px] text-slate-400">{{ mod.key }}</code>
                    </div>
                    <div class="mt-1 flex items-center gap-2">
                      <div class="relative h-1 w-20 overflow-hidden rounded-full bg-slate-200">
                        <div
                          class="absolute inset-y-0 left-0 rounded-full transition-all"
                          :class="moduleChecked(mod) ? 'bg-emerald-500' : modulePartial(mod) ? 'bg-amber-400' : 'bg-slate-300'"
                          :style="{ width: `${mod.items?.length ? (moduleAllowedCount(mod) / mod.items.length) * 100 : 0}%` }"
                        ></div>
                      </div>
                      <span class="text-[10px] text-slate-400">{{ moduleAllowedCount(mod) }}/{{ mod.items?.length || 0 }}</span>
                    </div>
                  </div>

                  <!-- Module-level toggle -->
                  <button
                    class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none"
                    :class="moduleChecked(mod) ? 'bg-emerald-500' : modulePartial(mod) ? 'bg-amber-400' : 'bg-slate-200'"
                    :title="moduleChecked(mod) ? 'Block all in module' : 'Allow all in module'"
                    @click="toggleModule(mod, !moduleChecked(mod))"
                  >
                    <span
                      class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                      :class="moduleChecked(mod) ? 'translate-x-4' : 'translate-x-0.5'"
                    ></span>
                  </button>
                </div>

                <!-- Permission rows -->
                <div class="divide-y divide-slate-50">
                  <div
                    v-for="item in mod.items"
                    :key="item.key"
                    class="flex cursor-pointer items-center gap-3 px-3 py-2 transition hover:bg-slate-50"
                    :class="featureMatrix[item.key] === false ? 'opacity-60' : ''"
                    @click="togglePermission(item.key)"
                  >
                    <span
                      class="h-2 w-2 shrink-0 rounded-full transition-colors"
                      :class="featureMatrix[item.key] !== false ? 'bg-emerald-400' : 'bg-slate-300'"
                    ></span>
                    <div class="min-w-0 flex-1">
                      <div class="text-[12px] font-medium text-slate-800">{{ item.label }}</div>
                      <code class="text-[10px] text-slate-400">{{ item.key }}</code>
                    </div>
                    <span
                      class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      :class="featureMatrix[item.key] !== false
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-400'"
                    >
                      {{ featureMatrix[item.key] !== false ? 'Allowed' : 'Blocked' }}
                    </span>
                    <button
                      class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none"
                      :class="featureMatrix[item.key] !== false ? 'bg-emerald-500' : 'bg-slate-200'"
                      @click.stop="togglePermission(item.key)"
                    >
                      <span
                        class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                        :class="featureMatrix[item.key] !== false ? 'translate-x-4' : 'translate-x-0.5'"
                      ></span>
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </template>
        </main>
      </div>
    </section>
  </div>
</template>
