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
const explicitMatrix    = ref({})   // user_feature_permissions DB rows only — no auto-access
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
  'Forward',
  'Delete',
  'Permissions',
  'View All Companies Data',
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
  Forward: 'text-indigo-700 bg-indigo-50 border-indigo-100',
  Delete: 'text-red-700 bg-red-50 border-red-100',
  Permissions: 'text-violet-700 bg-violet-50 border-violet-100',
  'View All Companies Data': 'text-purple-700 bg-purple-50 border-purple-100',
}

// Forwarding requires an explicit user grant; privileged-role bypass is ignored.
const EXPLICIT_ONLY_ACTIONS = ['Forward']

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
    forward: 'Forward',
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
const normalizeMatrix = (effective = {}, permissions = {}) => {
  const matrix = { ...effective }
  catalogKeys.value.forEach((k) => {
    if (!Object.prototype.hasOwnProperty.call(matrix, k)) matrix[k] = true
  })
  hydratingMatrix.value = true
  featureMatrix.value  = matrix
  explicitMatrix.value = { ...permissions }   // raw DB rows — undefined = not granted
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
  normalizeMatrix(data?.effective || {}, data?.permissions || {})
}

const loadRolePermissions = async (role) => {
  if (!role) return
  savedOk.value = false
  dirty.value = false
  const data = await userPermissionStore.fetchRoleFeaturePermissions(role)
  selectedConfigured.value = !!data?.configured
  normalizeMatrix(data?.effective || {}, data?.permissions || {})
}

// Forward keys are explicit-only — super_admin auto-access does NOT apply.
const EXPLICIT_ONLY_KEYS = computed(() =>
  (featureCatalog.value || [])
    .flatMap((m) => m.items || [])
    .filter((item) => EXPLICIT_ONLY_ACTIONS.includes(inferActionFromKey(item.key)))
    .map((item) => item.key)
)

// Explicit items grouped with module context, for the Explicit Grants panel
const explicitItems = computed(() =>
  (featureCatalog.value || []).flatMap((mod) =>
    (mod.items || [])
      .filter((item) => EXPLICIT_ONLY_ACTIONS.includes(inferActionFromKey(item.key)))
      .map((item) => ({
        key: item.key,
        label: item.label,
        action: inferActionFromKey(item.key),
        module: mod.label,
        moduleKey: mod.key,
      }))
  )
)

const saveFeatureAccess = async () => {
  const payload = catalogKeys.value.map((k) => ({
    key: k,
    // Explicit-only actions are user grants. Role-level grants must never imply
    // that a user can perform these sensitive actions.
    allowed: EXPLICIT_ONLY_KEYS.value.includes(k)
      ? mode.value === 'user' && explicitMatrix.value[k] === true
      : featureMatrix.value[k] !== false,
  }))

  if (mode.value === 'role') {
    if (!selectedRoleKey.value) return
    const data = await userPermissionStore.updateRoleFeaturePermissions(selectedRoleKey.value, payload)
    selectedConfigured.value = !!data?.configured
    normalizeMatrix(data?.effective || featureMatrix.value, data?.permissions || {})
    savedOk.value = true
    dirty.value = false
    setTimeout(() => { savedOk.value = false }, 3000)
    return
  }

  if (!selectedUser.value?.id) return
  const data = await userPermissionStore.updateUserFeaturePermissions(selectedUser.value.id, payload)
  selectedConfigured.value = !!data?.configured
  normalizeMatrix(data?.effective || featureMatrix.value, data?.permissions || {})
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
  <!-- Full-viewport split layout -->
  <div class="flex h-screen overflow-hidden bg-slate-100">

    <!-- ══ LEFT SIDEBAR ══════════════════════════════════════════════════════ -->
    <aside class="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">

      <!-- Header -->
      <div class="border-b border-slate-100 px-3 py-2.5">
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Settings</p>
        <h1 class="text-sm font-bold text-slate-900">Feature Permissions</h1>
      </div>

      <!-- Mode toggle -->
      <div class="border-b border-slate-100 px-3 py-2">
        <div class="grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-100 p-0.5">
          <button type="button"
            class="rounded-md py-1.5 text-[11px] font-semibold transition"
            :class="mode === 'role' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
            @click="mode = 'role'">By Role</button>
          <button type="button"
            class="rounded-md py-1.5 text-[11px] font-semibold transition"
            :class="mode === 'user' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
            @click="mode = 'user'">By User</button>
        </div>
      </div>

      <!-- Search (user mode) -->
      <div v-if="mode === 'user'" class="border-b border-slate-100 px-3 py-2 space-y-1.5">
        <div class="relative">
          <i class="far fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400"></i>
          <input v-model="q" type="search" placeholder="Search…"
            class="w-full rounded border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-400" />
        </div>
        <select v-model="selectedRole"
          class="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-400">
          <option value="all">All roles</option>
          <option v-for="r in roleList" :key="r.key" :value="r.key">{{ r.label }}</option>
        </select>
      </div>

      <!-- List -->
      <div class="flex-1 overflow-y-auto py-1">

        <!-- Role list -->
        <template v-if="mode === 'role'">
          <button v-for="role in roleList" :key="role.key" type="button"
            class="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-slate-50"
            :class="selectedRoleKey === role.key ? 'bg-blue-50' : ''"
            @click="selectedRoleKey = role.key">
            <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase"
              :class="roleColor(role.key)">{{ role.label.slice(0, 2) }}</div>
            <div class="min-w-0 flex-1">
              <div class="truncate text-[12px] font-semibold" :class="selectedRoleKey === role.key ? 'text-blue-700' : 'text-slate-800'">{{ role.label }}</div>
              <div class="text-[10px] text-slate-400">{{ role.count }} users</div>
            </div>
            <div v-if="selectedRoleKey === role.key" class="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
          </button>
        </template>

        <!-- User list -->
        <template v-else>
          <div v-if="usersLoading" class="py-6 text-center text-[11px] text-slate-400">
            <i class="far fa-spinner fa-spin mr-1"></i>Loading…
          </div>
          <button v-for="user in userList" :key="user.id" type="button"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left transition hover:bg-slate-50"
            :class="Number(selectedUserId) === Number(user.id) ? 'bg-blue-50' : ''"
            @click="selectedUserId = user.id">
            <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold uppercase text-slate-600">
              {{ (user.name || '?').slice(0, 2) }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1">
                <span class="truncate text-[11px] font-semibold" :class="Number(selectedUserId) === Number(user.id) ? 'text-blue-700' : 'text-slate-800'">{{ user.name }}</span>
                <span class="shrink-0 rounded px-1 text-[8px] font-bold uppercase" :class="roleColor(user.role)">{{ user.role }}</span>
              </div>
              <div class="truncate text-[10px] text-slate-400">
                {{ user.employee_id || '' }}{{ user.department?.name ? ` · ${user.department.name}` : '' }}
              </div>
            </div>
          </button>
        </template>
      </div>

      <!-- Footer stats -->
      <div class="border-t border-slate-100 px-3 py-2 flex items-center gap-2 text-[10px] text-slate-400">
        <span>{{ roleList.length }} roles</span>
        <span>·</span>
        <span>{{ userList.length }} users</span>
        <span>·</span>
        <span class="text-blue-500 font-semibold">{{ totalFeatureCount }} actions</span>
      </div>
    </aside>

    <!-- ══ RIGHT PANEL ═══════════════════════════════════════════════════════ -->
    <main class="flex flex-1 flex-col overflow-hidden">

      <!-- No selection -->
      <div v-if="mode === 'user' && !selectedUser" class="flex flex-1 items-center justify-center">
        <div class="text-center">
          <i class="far fa-user-lock text-4xl text-slate-200"></i>
          <p class="mt-3 text-sm text-slate-400">Select a user to configure permissions.</p>
        </div>
      </div>

      <template v-else>

        <!-- ── Compact header bar ─────────────────────────────────────────── -->
        <div class="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">

          <!-- Avatar + name -->
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold uppercase text-slate-600">
            {{ selectedInitials }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="text-[13px] font-bold text-slate-900">{{ selectedTitle }}</span>
              <span v-if="mode === 'user'" class="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase" :class="roleColor(selectedUser.role)">
                {{ selectedUser.role }}
              </span>
              <span v-if="selectedAutoAccess" class="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                <i class="far fa-crown text-[9px]"></i> Auto full access
              </span>
              <span v-else-if="selectedConfigured" class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <i class="far fa-shield-check text-[9px]"></i> Configured
              </span>
              <span v-else class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                <i class="far fa-unlock text-[9px]"></i> Legacy open
              </span>
            </div>
            <div class="text-[10px] text-slate-400">
              {{ selectedSubtitle }}
              <span v-if="mode === 'user' && selectedUser.department?.name"> · {{ selectedUser.department.name }}</span>
            </div>
          </div>

          <!-- Progress + save -->
          <div class="flex items-center gap-2 shrink-0">
            <div class="flex items-center gap-1.5">
              <div class="relative h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                <div class="absolute inset-y-0 left-0 rounded-full bg-emerald-500 transition-all"
                  :style="{ width: `${totalFeatureCount ? (configuredCount / totalFeatureCount) * 100 : 0}%` }"></div>
              </div>
              <span class="text-[11px] font-semibold text-slate-600">{{ configuredCount }}/{{ totalFeatureCount }}</span>
            </div>
            <button
              v-if="mode === 'user' || !selectedAutoAccess"
              :disabled="permLoading || !dirty"
              class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition disabled:opacity-40"
              :class="savedOk ? 'bg-emerald-600' : dirty ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300'"
              @click="saveFeatureAccess">
              <i :class="permLoading ? 'far fa-spinner fa-spin' : savedOk ? 'far fa-check' : 'far fa-save'"></i>
              {{ permLoading ? 'Saving…' : savedOk ? 'Saved' : 'Save' }}
            </button>
          </div>
        </div>

        <!-- ── Scrollable body ────────────────────────────────────────────── -->
        <div class="flex-1 overflow-y-auto">

          <!-- ── Explicit Grants (user mode only) ──────────────────────── -->
          <div v-if="explicitItems.length && mode === 'user'"
            class="border-b border-slate-200 bg-indigo-50/40 px-4 py-3">
            <div class="mb-2 flex items-center gap-1.5">
              <i class="far fa-lock text-[11px] text-indigo-600"></i>
              <span class="text-[11px] font-bold text-indigo-800">Explicit Grants</span>
              <span class="text-[10px] text-slate-400">— bypasses role & auto-access, must be granted per user</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <div v-for="item in explicitItems" :key="item.key"
                class="flex items-center gap-2 rounded-lg border px-3 py-1.5 transition"
                :class="explicitMatrix[item.key] === true
                  ? 'border-indigo-300 bg-indigo-100'
                  : 'border-slate-200 bg-white hover:border-slate-300'">
                <div>
                  <span class="text-[9px] font-bold uppercase" :class="actionColor(item.action)">{{ item.action }}</span>
                  <span class="ml-1 text-[10px] text-slate-500">{{ (item.label.split(':')[0] || item.label).trim() }}</span>
                  <span class="ml-1 text-[9px] text-slate-400">{{ item.module }}</span>
                </div>
                <button type="button"
                  class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
                  :class="explicitMatrix[item.key] === true ? 'bg-indigo-600' : 'bg-slate-300'"
                  @click="explicitMatrix[item.key] = !(explicitMatrix[item.key] === true); dirty = true">
                  <span class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition"
                    :class="explicitMatrix[item.key] === true ? 'translate-x-4' : 'translate-x-0'"></span>
                </button>
              </div>
            </div>
          </div>

          <!-- ── Auto-access notice ─────────────────────────────────────── -->
          <div v-if="selectedAutoAccess"
            class="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3">
            <i class="far fa-crown text-lg text-purple-500"></i>
            <div>
              <p class="text-[12px] font-bold text-purple-900">Automatic Full Access</p>
              <p class="text-[11px] text-purple-600">{{ selectedTitle }} inherits all {{ totalFeatureCount }} feature permissions automatically. The matrix below is not applied.</p>
            </div>
          </div>

          <!-- ── Permission matrix ──────────────────────────────────────── -->
          <template v-if="!selectedAutoAccess">

            <!-- Matrix toolbar -->
            <div class="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
              <div class="relative">
                <i class="far fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400"></i>
                <input v-model="permissionQ" type="search" placeholder="Search…"
                  class="w-48 rounded border border-slate-200 bg-slate-50 py-1 pl-7 pr-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
              <button class="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50" @click="expandAll">Expand all</button>
              <button class="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50" @click="collapseAll">Collapse</button>
              <button class="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100" @click="setAll(true)">Allow all</button>
              <button class="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-100" @click="setAll(false)">Block all</button>
            </div>

            <!-- Module sections -->
            <div class="space-y-0 divide-y divide-slate-100">
              <section v-for="mod in visibleModules" :key="mod.key">

                <!-- Module row -->
                <div class="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 cursor-pointer"
                  @click="toggleModuleExpanded(mod.key)">
                  <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px]" :class="moduleColor(mod.key)">
                    <i :class="moduleIcon(mod.key)"></i>
                  </span>
                  <span class="flex-1 text-[12px] font-semibold text-slate-800">{{ mod.label }}</span>

                  <!-- Progress bar -->
                  <div class="flex items-center gap-1.5">
                    <div class="relative h-1 w-16 overflow-hidden rounded-full bg-slate-200">
                      <div class="absolute inset-y-0 left-0 rounded-full transition-all"
                        :class="moduleChecked(mod) ? 'bg-emerald-500' : modulePartial(mod) ? 'bg-amber-400' : 'bg-slate-300'"
                        :style="{ width: `${mod.items?.length ? (moduleAllowedCount(mod) / mod.items.length) * 100 : 0}%` }"></div>
                    </div>
                    <span class="text-[10px] text-slate-400">{{ moduleAllowedCount(mod) }}/{{ mod.items?.length || 0 }}</span>
                  </div>

                  <!-- Module toggle -->
                  <button type="button"
                    class="relative inline-flex h-4 w-8 shrink-0 items-center rounded-full transition-colors"
                    :class="moduleChecked(mod) ? 'bg-emerald-500' : modulePartial(mod) ? 'bg-amber-400' : 'bg-slate-200'"
                    @click.stop="toggleModule(mod, !moduleChecked(mod))">
                    <span class="inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform"
                      :class="moduleChecked(mod) ? 'translate-x-4' : 'translate-x-0.5'"></span>
                  </button>

                  <i :class="['far text-[10px] text-slate-400 w-3', expandedModules[mod.key] ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
                </div>

                <!-- Permission table -->
                <div v-if="expandedModules[mod.key]" class="overflow-x-auto border-t border-slate-100 bg-slate-50/40">
                  <table class="min-w-full border-collapse text-left">
                    <thead>
                      <tr class="border-b border-slate-100 bg-white">
                        <th class="sticky left-0 z-[1] min-w-[200px] bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Menu Item</th>
                        <th v-for="action in moduleActions(mod)" :key="action"
                          class="min-w-[80px] px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide">
                          <span class="inline-flex rounded-full border px-1.5 py-0.5 text-[9px]" :class="actionColor(action)">{{ action }}</span>
                        </th>
                        <th class="min-w-[60px] px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">Row</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      <tr v-for="row in filteredRows(mod)" :key="row.label" class="hover:bg-white transition">
                        <td class="sticky left-0 z-[1] bg-transparent px-4 py-2 align-middle">
                          <div class="text-[11px] font-semibold text-slate-800">{{ row.label }}</div>
                          <code class="text-[9px] text-slate-400">{{ row.code }}</code>
                        </td>
                        <td v-for="action in moduleActions(mod)" :key="`${row.label}-${action}`"
                          class="px-2 py-2 text-center align-middle">
                          <!-- Explicit-only -->
                          <button v-if="row.actions[action] && EXPLICIT_ONLY_ACTIONS.includes(action)"
                            type="button" :disabled="mode !== 'user'"
                            class="inline-flex h-4 w-4 items-center justify-center rounded border transition"
                            :class="mode === 'user' && explicitMatrix[row.actions[action].key] === true
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : mode === 'user' ? 'border-slate-300 bg-white text-transparent hover:border-indigo-400'
                              : 'cursor-not-allowed border-slate-200 bg-slate-50'"
                            :title="explicitMatrix[row.actions[action].key] === true ? 'Explicitly granted' : 'Click to grant explicitly'"
                            @click="explicitMatrix[row.actions[action].key] = !(explicitMatrix[row.actions[action].key] === true); dirty = true">
                            <i class="far fa-check text-[8px]"></i>
                          </button>
                          <!-- Regular -->
                          <button v-else-if="row.actions[action]"
                            type="button"
                            class="inline-flex h-4 w-4 items-center justify-center rounded border transition"
                            :class="featureMatrix[row.actions[action].key] !== false
                              ? action === 'Delete' ? 'border-red-500 bg-red-500 text-white' : 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-slate-300 bg-white text-transparent hover:border-slate-400'"
                            @click="togglePermission(row.actions[action].key)">
                            <i class="far fa-check text-[8px]"></i>
                          </button>
                          <span v-else class="text-[11px] text-slate-200">—</span>
                        </td>
                        <td class="px-2 py-2 text-right align-middle">
                          <button type="button"
                            class="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 hover:bg-slate-50"
                            @click="setRow(row, rowAllowedCount(row) !== Object.keys(row.actions).length)">
                            {{ rowAllowedCount(row) }}/{{ Object.keys(row.actions).length }}
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div v-if="!filteredRows(mod).length" class="py-4 text-center text-[11px] text-slate-400">
                    No matches.
                  </div>
                </div>
              </section>

              <div v-if="!visibleModules.length" class="px-4 py-8 text-center text-[11px] text-slate-400">
                No modules match your search.
              </div>
            </div>
          </template>

        </div><!-- scrollable body end -->
      </template>
    </main>
  </div>
</template>
