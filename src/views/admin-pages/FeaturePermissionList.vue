<script setup>
import UserChip from '@/components/user/UserChip.vue'
import { useAuthStore } from '@/stores/auth'
import { useUserPermissionStore } from '@/stores/userPermissionStore'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, nextTick, onMounted, ref, watch } from 'vue'

const userStore           = useUserStore()
const userPermissionStore = useUserPermissionStore()
const authStore           = useAuthStore()
const { users, isLoading: usersLoading }      = storeToRefs(userStore)
const { featureCatalog, featureRoles, loading: permLoading } = storeToRefs(userPermissionStore)

// ─── UI state ─────────────────────────────────────────────────────────────────
const q                 = ref('')
const permissionQ       = ref('')
const mode              = ref('role')
const roleFilter        = ref('all')
const selectedRole      = roleFilter
const selectedRoleKey   = ref('admin')
const selectedUserId    = ref(null)
const selectedConfigured= ref(false)
const featureMatrix     = ref({})
const savedOk           = ref(false)
const dirty             = ref(false)
const expandedModules   = ref({})
const hydratingMatrix   = ref(false)

// ─── Module icon map ──────────────────────────────────────────────────────────
const MODULE_ICONS = {
  hr_department:'far fa-users-cog',
  empmanage:    'far fa-users',
  reports:      'far fa-chart-bar',
  careers:      'far fa-briefcase',
  employee:    'far fa-users-cog',
  employee_management: 'far fa-users-cog',
  empmanage_reports: 'far fa-chart-bar',
  employee_lifecycle: 'far fa-route',
  emp_reports: 'far fa-chart-bar',
  lifecycle:   'far fa-route',
  attendance:  'far fa-clock',
  payroll:     'far fa-money-bill-wave',
  kpi:         'far fa-chart-line',
  settings:    'far fa-cog',
}

const MODULE_COLORS = {
  hr_department:'bg-blue-50 text-blue-600',
  empmanage:    'bg-cyan-50 text-cyan-600',
  reports:      'bg-violet-50 text-violet-600',
  careers:      'bg-indigo-50 text-indigo-600',
  employee:    'bg-blue-50 text-blue-600',
  employee_management: 'bg-blue-50 text-blue-600',
  empmanage_reports: 'bg-violet-50 text-violet-600',
  employee_lifecycle: 'bg-emerald-50 text-emerald-600',
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
  hr:          'bg-teal-100 text-teal-700',
  accounts:    'bg-amber-100 text-amber-700',
  employee:    'bg-slate-100 text-slate-600',
}

const ACTION_ORDER = [
  'View',
  'Create',
  'Edit',
  'Create/Edit',
  'Update',
  'Manage',
  'Approve',
  'Generate',
  'Review',
  'Reports',
  'Adjust',
  'Export',
  'Delete',
  'Permissions',
]

const ACTION_COLORS = {
  View: 'text-blue-700 bg-blue-50 border-blue-100',
  Create: 'text-emerald-700 bg-emerald-50 border-emerald-100',
  Edit: 'text-emerald-700 bg-emerald-50 border-emerald-100',
  'Create/Edit': 'text-emerald-700 bg-emerald-50 border-emerald-100',
  Update: 'text-emerald-700 bg-emerald-50 border-emerald-100',
  Manage: 'text-emerald-700 bg-emerald-50 border-emerald-100',
  Export: 'text-emerald-700 bg-emerald-50 border-emerald-100',
  Generate: 'text-amber-700 bg-amber-50 border-amber-100',
  Approve: 'text-amber-700 bg-amber-50 border-amber-100',
  Review: 'text-amber-700 bg-amber-50 border-amber-100',
  Reports: 'text-indigo-700 bg-indigo-50 border-indigo-100',
  Adjust: 'text-orange-700 bg-orange-50 border-orange-100',
  Delete: 'text-red-700 bg-red-50 border-red-100',
  Permissions: 'text-violet-700 bg-violet-50 border-violet-100',
}

// ─── Super-admin auto-access ──────────────────────────────────────────────────
const AUTO_ACCESS_ROLES = ['super_admin', 'developer']
const selectedUserIsAutoAccess = computed(() =>
  AUTO_ACCESS_ROLES.includes(selectedUser.value?.role),
)
const selectedRoleIsAutoAccess = computed(() =>
  AUTO_ACCESS_ROLES.includes(selectedRoleKey.value),
)
const selectedAutoAccess = computed(() =>
  mode.value === 'role' ? selectedRoleIsAutoAccess.value : selectedUserIsAutoAccess.value,
)

// ─── Derived state ────────────────────────────────────────────────────────────
const catalogKeys = computed(() =>
  [...new Set((featureCatalog.value || []).flatMap((m) => m.items || []).map((item) => item.key))],
)

const userList = computed(() => {
  const list = Array.isArray(users.value) ? users.value : []
  const term = q.value.trim().toLowerCase()
  return list
    .filter((u) => {
      if (!u?.id) return false
      if (roleFilter.value !== 'all' && u.role !== roleFilter.value) return false
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

const roleList = computed(() => {
  const counts = (users.value || []).reduce((map, user) => {
    if (user?.role) map[user.role] = (map[user.role] || 0) + 1
    return map
  }, {})

  return (featureRoles.value || []).map((role) => ({
    ...role,
    count: counts[role.key] || 0,
  }))
})

const selectedRoleItem = computed(() =>
  roleList.value.find((role) => role.key === selectedRoleKey.value) || null,
)

const selectedTitle = computed(() =>
  mode.value === 'role' ? (selectedRoleItem.value?.label || selectedRoleKey.value) : (selectedUser.value?.name || ''),
)

const selectedSubtitle = computed(() => {
  if (mode.value === 'role') {
    return 'Role template - applies to everyone with this role'
  }
  const role = selectedUser.value?.role || 'role'
  return selectedConfigured.value
    ? `Custom user override - starts from ${role}`
    : `Inherits ${role} role template`
})

const selectedInitials = computed(() => {
  if (mode.value === 'role') return (selectedRoleItem.value?.label || selectedRoleKey.value || '?').slice(0, 2)
  return (selectedUser.value?.name || '?').slice(0, 2)
})

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
const expandAll = () => {
  ;(featureCatalog.value || []).forEach((mod) => { expandedModules.value[mod.key] = true })
}
const collapseAll = () => {
  ;(featureCatalog.value || []).forEach((mod) => { expandedModules.value[mod.key] = false })
}

function togglePermission(key) {
  featureMatrix.value[key] = featureMatrix.value[key] !== false ? false : true
}

function moduleIcon(key) { return MODULE_ICONS[key] || 'far fa-puzzle-piece' }
function moduleColor(key) { return MODULE_COLORS[key] || 'bg-slate-100 text-slate-600' }
function roleColor(role) { return ROLE_COLORS[role] || 'bg-slate-100 text-slate-600' }
function actionColor(action) { return ACTION_COLORS[action] || 'text-slate-700 bg-slate-50 border-slate-100' }
function toggleModuleExpanded(key) {
  expandedModules.value[key] = !expandedModules.value[key]
}

function prettifyToken(value = '') {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

function inferActionFromKey(key = '') {
  const suffix = String(key).split('.').pop()
  const map = {
    view: 'View',
    create: 'Create',
    edit: 'Edit',
    update: 'Update',
    manage: 'Manage',
    approve: 'Approve',
    generate: 'Generate',
    review: 'Review',
    report: 'Reports',
    reports: 'Reports',
    adjust: 'Adjust',
    export: 'Export',
    delete: 'Delete',
    permissions: 'Permissions',
  }
  return map[suffix] || prettifyToken(suffix)
}

function parsePermissionItem(item, mod) {
  const label = item?.label || item?.key || ''
  if (label.includes(':')) {
    const [rowLabel, actionLabel] = label.split(':').map((part) => part.trim())
    return {
      rowLabel: rowLabel || mod.label,
      action: actionLabel || inferActionFromKey(item.key),
    }
  }

  const parts = String(item?.key || '').split('.')
  if (parts.length > 2) {
    return {
      rowLabel: prettifyToken(parts.slice(1, -1).join(' ')),
      action: inferActionFromKey(item.key),
    }
  }

  return {
    rowLabel: mod.label,
    action: label || inferActionFromKey(item.key),
  }
}

function permissionRows(mod) {
  const rowsByLabel = new Map()
  ;(mod?.items || []).forEach((item) => {
    const parsed = parsePermissionItem(item, mod)
    if (!rowsByLabel.has(parsed.rowLabel)) {
      rowsByLabel.set(parsed.rowLabel, {
        label: parsed.rowLabel,
        code: String(item.key || '').split('.').slice(0, -1).join('.') || mod.key,
        actions: {},
      })
    }
    rowsByLabel.get(parsed.rowLabel).actions[parsed.action] = item
  })
  return Array.from(rowsByLabel.values())
}

function moduleActions(mod) {
  const actions = new Set()
  permissionRows(mod).forEach((row) => {
    Object.keys(row.actions).forEach((action) => actions.add(action))
  })
  return Array.from(actions).sort((a, b) => {
    const ai = ACTION_ORDER.indexOf(a)
    const bi = ACTION_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

function filteredRows(mod) {
  const term = permissionQ.value.trim().toLowerCase()
  const rows = permissionRows(mod)
  if (!term) return rows
  return rows.filter((row) =>
    [row.label, row.code, ...Object.values(row.actions).flatMap((item) => [item.key, item.label])]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term)),
  )
}

const visibleModules = computed(() => {
  const term = permissionQ.value.trim().toLowerCase()
  return (featureCatalog.value || []).filter((mod) => {
    if (!term) return true
    return String(mod.label || '').toLowerCase().includes(term) || filteredRows(mod).length > 0
  })
})

function rowAllowedCount(row) {
  return Object.values(row.actions).filter((item) => featureMatrix.value[item.key] !== false).length
}

function setRow(row, value) {
  Object.values(row.actions).forEach((item) => { featureMatrix.value[item.key] = !!value })
}

// ─── Data operations ──────────────────────────────────────────────────────────
const normalizeMatrix = (effective = {}) => {
  const matrix = { ...effective }
  catalogKeys.value.forEach((k) => {
    if (!Object.prototype.hasOwnProperty.call(matrix, k)) matrix[k] = true
  })
  hydratingMatrix.value = true
  featureMatrix.value = matrix
  dirty.value = false
  nextTick(() => {
    hydratingMatrix.value = false
    dirty.value = false
  })
}

const loadUserPermissions = async (userId) => {
  if (!userId) return
  savedOk.value = false
  dirty.value   = false
  const data = await userPermissionStore.fetchUserFeaturePermissions(userId)
  selectedConfigured.value = !!data?.configured
  normalizeMatrix(data?.effective || {})
}

const loadRolePermissions = async (role) => {
  if (!role) return
  savedOk.value = false
  dirty.value = false
  const data = await userPermissionStore.fetchRoleFeaturePermissions(role)
  selectedConfigured.value = !!data?.configured
  normalizeMatrix(data?.effective || {})
}

const saveFeatureAccess = async () => {
  const payload = catalogKeys.value.map((k) => ({ key: k, allowed: featureMatrix.value[k] !== false }))

  if (mode.value === 'role') {
    if (!selectedRoleKey.value) return
    const data = await userPermissionStore.updateRoleFeaturePermissions(selectedRoleKey.value, payload)
    selectedConfigured.value = !!data?.configured
    normalizeMatrix(data?.effective || featureMatrix.value)
    savedOk.value = true
    dirty.value = false
    setTimeout(() => { savedOk.value = false }, 3000)
    return
  }

  if (!selectedUser.value?.id) return
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
watch(featureMatrix, () => {
  if (!hydratingMatrix.value) dirty.value = true
}, { deep: true })
watch(selectedUserId, (id) => {
  if (mode.value === 'user') loadUserPermissions(id)
})
watch(selectedRoleKey, (role) => {
  if (mode.value === 'role') loadRolePermissions(role)
})
watch(mode, (nextMode) => {
  savedOk.value = false
  dirty.value = false
  if (nextMode === 'role') {
    loadRolePermissions(selectedRoleKey.value)
  } else if (selectedUserId.value) {
    loadUserPermissions(selectedUserId.value)
  }
})

onMounted(async () => {
  await Promise.all([
    userStore.fetchUsers({ is_active: 1 }),
    userPermissionStore.fetchFeatureCatalog(),
  ])
  expandAll()
  if (!selectedRoleKey.value && roleList.value.length) {
    selectedRoleKey.value = roleList.value[0].key
  }
  if (!selectedUserId.value && userList.value.length) {
    selectedUserId.value = userList.value[0].id
  }
  await loadRolePermissions(selectedRoleKey.value)
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
            Assign role templates or customize individual user feature access.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {{ roleList.length }} roles
          </span>
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

          <div class="border-b border-slate-100 p-3">
            <div class="grid grid-cols-2 rounded-md border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                class="rounded px-3 py-1.5 text-xs font-semibold transition"
                :class="mode === 'role' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
                @click="mode = 'role'"
              >
                By Role
              </button>
              <button
                type="button"
                class="rounded px-3 py-1.5 text-xs font-semibold transition"
                :class="mode === 'user' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
                @click="mode = 'user'"
              >
                By User
              </button>
            </div>
          </div>

          <div v-if="mode === 'role'" class="max-h-[620px] space-y-1 overflow-y-auto p-2">
            <button
              v-for="role in roleList"
              :key="role.key"
              type="button"
              class="group w-full rounded-md border px-3 py-2 text-left transition"
              :class="selectedRoleKey === role.key
                ? 'border-blue-400 bg-blue-50 shadow-sm'
                : 'border-transparent bg-white hover:border-slate-200 hover:bg-white'"
              @click="selectedRoleKey = role.key"
            >
              <div class="flex items-center gap-2.5">
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold uppercase"
                  :class="roleColor(role.key)"
                >
                  {{ role.label.slice(0, 2) }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="truncate text-[12px] font-semibold text-slate-900">{{ role.label }}</div>
                  <div class="text-[10px] text-slate-400">{{ role.count }} users inherit this template</div>
                </div>
                <span
                  class="h-1.5 w-1.5 shrink-0 rounded-full"
                  :class="selectedRoleKey === role.key ? 'bg-blue-500' : 'bg-slate-200 group-hover:bg-slate-300'"
                ></span>
              </div>
            </button>
          </div>

          <!-- Search + role filter -->
          <div v-if="mode === 'user'" class="space-y-2 border-b border-slate-100 p-3">
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
              <option v-for="role in roleList" :key="role.key" :value="role.key">{{ role.label }}</option>
            </select>
          </div>

          <!-- User rows -->
          <div v-if="mode === 'user'" class="max-h-[620px] overflow-y-auto p-2 space-y-1">
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
          <div v-if="mode === 'user' && !selectedUser" class="flex h-full items-center justify-center p-10 text-center">
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
                    {{ selectedInitials }}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-semibold text-slate-900">{{ selectedTitle }}</span>
                      <span
                        v-if="mode === 'user'"
                        class="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                        :class="roleColor(selectedUser.role)"
                      >{{ selectedUser.role }}</span>
                    </div>
                    <div class="text-[10px] text-slate-400">
                      {{ selectedSubtitle }}
                      <span v-if="mode === 'user' && selectedUser.department?.name"> · {{ selectedUser.department.name }}</span>
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

                  <template v-if="!selectedAutoAccess">
                    <button
                      class="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                      @click="expandAll"
                    >
                      <i class="far fa-list mr-1"></i>Expand
                    </button>
                    <button
                      class="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                      @click="collapseAll"
                    >
                      <i class="far fa-compress-alt mr-1"></i>Collapse
                    </button>
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
                v-if="selectedAutoAccess"
                class="flex items-center gap-2 border-t border-purple-100 bg-purple-50 px-4 py-2 text-[11px] text-purple-700"
              >
                <i class="far fa-crown text-sm"></i>
                <span>
                  <strong>{{ mode === 'role' ? selectedTitle : (selectedUser.role === 'developer' ? 'Developer' : 'Super Admin') }}</strong>
                  has automatic full access. Configuration matrix is not applied.
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
                <span v-else-if="selectedConfigured && mode === 'role'">Role template is configured. Users with this role inherit it.</span>
                <span v-else-if="selectedConfigured">User override active. This user differs from the role template.</span>
                <span v-else-if="mode === 'role'">Legacy open role: all features are allowed until you save this role template.</span>
                <span v-else>User inherits role template. Save here only for user-specific customization.</span>
              </div>

              <div class="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                <div class="relative max-w-md">
                  <i class="far fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400"></i>
                  <input
                    v-model="permissionQ"
                    type="search"
                    placeholder="Search menu item, action, or permission key..."
                    class="w-full rounded-md border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              </div>
            </div>

            <!-- Module permission cards -->
            <div
              class="space-y-3 p-4"
              :class="selectedAutoAccess ? 'pointer-events-none opacity-60' : ''"
            >
              <section
                v-for="mod in visibleModules"
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

                  <span class="hidden rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500 sm:inline-flex">
                    {{ moduleAllowedCount(mod) }}/{{ mod.items?.length || 0 }} allowed
                  </span>

                  <button
                    class="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
                    @click="toggleModuleExpanded(mod.key)"
                  >
                    <i :class="expandedModules[mod.key] ? 'far fa-chevron-up' : 'far fa-chevron-down'" class="mr-1"></i>
                    {{ expandedModules[mod.key] ? 'Hide' : 'Expand' }}
                  </button>

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

                <!-- Permission matrix -->
                <div v-if="expandedModules[mod.key]" class="overflow-x-auto">
                  <table class="min-w-full border-collapse text-left">
                    <thead class="bg-white">
                      <tr class="border-b border-slate-100">
                        <th class="sticky left-0 z-[1] min-w-[230px] bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Menu item
                        </th>
                        <th
                          v-for="action in moduleActions(mod)"
                          :key="action"
                          class="min-w-[96px] px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide"
                        >
                          <span
                            class="inline-flex rounded-full border px-2 py-1"
                            :class="actionColor(action)"
                          >
                            {{ action }}
                          </span>
                        </th>
                        <th class="min-w-[90px] px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Row
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      <tr
                        v-for="row in filteredRows(mod)"
                        :key="row.label"
                        class="transition hover:bg-slate-50"
                      >
                        <td class="sticky left-0 z-[1] bg-white px-4 py-3 align-middle">
                          <div class="flex items-center gap-2">
                            <span
                              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[12px]"
                              :class="moduleColor(mod.key)"
                            >
                              <i :class="moduleIcon(mod.key)"></i>
                            </span>
                            <div class="min-w-0">
                              <div class="truncate text-[12px] font-semibold text-slate-900">{{ row.label }}</div>
                              <code class="block truncate text-[10px] text-slate-400">{{ row.code }}</code>
                            </div>
                          </div>
                        </td>
                        <td
                          v-for="action in moduleActions(mod)"
                          :key="`${row.label}-${action}`"
                          class="px-3 py-3 text-center align-middle"
                        >
                          <button
                            v-if="row.actions[action]"
                            type="button"
                            class="inline-flex h-5 w-5 items-center justify-center rounded border transition"
                            :class="featureMatrix[row.actions[action].key] !== false
                              ? action === 'Delete'
                                ? 'border-red-600 bg-red-600 text-white'
                                : 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-slate-300 bg-white text-transparent hover:border-slate-400'"
                            :title="`${row.label} - ${action}`"
                            @click="togglePermission(row.actions[action].key)"
                          >
                            <i class="far fa-check text-[10px]"></i>
                          </button>
                          <span v-else class="inline-flex h-5 w-5 items-center justify-center rounded border border-transparent text-[11px] text-slate-300">
                            -
                          </span>
                        </td>
                        <td class="px-3 py-3 text-right align-middle">
                          <button
                            type="button"
                            class="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                            @click="setRow(row, rowAllowedCount(row) !== Object.keys(row.actions).length)"
                          >
                            {{ rowAllowedCount(row) }}/{{ Object.keys(row.actions).length }}
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div
                    v-if="!filteredRows(mod).length"
                    class="border-t border-slate-100 px-4 py-8 text-center text-xs text-slate-400"
                  >
                    No permissions match your search.
                  </div>
                </div>
              </section>

              <div
                v-if="!visibleModules.length"
                class="rounded-md border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400"
              >
                No modules match your search.
              </div>
            </div>
          </template>
        </main>
      </div>
    </section>
  </div>
</template>
