<script setup>
import LeaveApprovalModal from '@/components/LeaveApprovalModal.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import HeaderWithButtons from '@/components/common/HeaderWithButtons.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { useLeaveApprovalStore } from '@/stores/leave-approval'
import apiClient from '@/axios'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const route = useRoute()
const router = useRouter()
const leaveApprovalStore = useLeaveApprovalStore()
const toast = useToast()

const fallbackApplicationTypes = [
  { name: 'Leave',              code: 'leave',              approval_group: 'leave',  sort_order: 1 },
  { name: 'Short Leave',        code: 'short_leave',        approval_group: 'other',  sort_order: 2 },
  { name: 'Manual Attendance',  code: 'manual_attendance',  approval_group: 'other',  sort_order: 3 },
  { name: 'Overtime',           code: 'overtime',           approval_group: 'other',  sort_order: 4 },
  { name: 'Offboarding',        code: 'offboarding',        approval_group: 'other',  sort_order: 5 },
  { name: 'Shift Exchange',     code: 'shift',              approval_group: 'other',  sort_order: 6 },
  { name: 'Offday Exchange',    code: 'offday',             approval_group: 'other',  sort_order: 7 },
]

const routeApplicationCode = () => {
  const type = String(route.params.type || route.query.type || '').trim()
  if (type) return type

  return route.name === 'LeaveApprovalList' ? 'leave' : 'short_leave'
}

const selectedApplicationCode = ref(routeApplicationCode())
const showLeaveApprovalModal = ref(false)
const showDeleteModal = ref(false)
const showResetModal = ref(false)
const selectedLeaveApproval = ref(null)
const activeInlineCell = ref(null)
const activeAssignment = ref(null)
const inlineSearch = ref('')
const approvalUsers = ref([])
const inlinePopoverPosition = ref({ top: 0, left: 0 })

const search = ref('')
const selectedCompanyId = ref(route.query.company_id || '')
const selectedDepartmentId = ref(route.query.department_id || '')

const toolbarRef = ref(null)
const toolbarH = ref(0)
const showApprovalRulesHelp = ref(false)
let approvalRulesHelpTimer = null

const toggleApprovalRulesHelp = () => {
  if (approvalRulesHelpTimer) clearTimeout(approvalRulesHelpTimer)
  approvalRulesHelpTimer = null

  showApprovalRulesHelp.value = !showApprovalRulesHelp.value
  if (!showApprovalRulesHelp.value) return

  approvalRulesHelpTimer = setTimeout(() => {
    showApprovalRulesHelp.value = false
    approvalRulesHelpTimer = null
  }, 8000)
}

const applicationTypes = computed(() => {
  const apiTypes = leaveApprovalStore.applicationTypes || []
  const itemsByCode = new Map()

  fallbackApplicationTypes.forEach((type) => {
    itemsByCode.set(type.code, type)
  })

  apiTypes.forEach((type) => {
    if (type?.code) {
      itemsByCode.set(type.code, type)
    }
  })

  return [...itemsByCode.values()].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
})

const selectedApplicationType = computed(() => {
  const storeType = leaveApprovalStore.applicationType
  return (storeType?.code === selectedApplicationCode.value ? storeType : null)
    || applicationTypes.value.find((item) => item.code === selectedApplicationCode.value)
    || fallbackApplicationTypes[0]
})

const approvalGroup = computed(() => {
  const group = selectedApplicationType.value?.approval_group
  if (!group || group === 'other') return selectedApplicationCode.value
  return group
})

// Backend type field only accepts 'leave' or 'other' — not the specific code
const backendType = computed(() => {
  const group = selectedApplicationType.value?.approval_group
  if (!group || group === 'other') return 'other'
  return group  // 'leave'
})
const pageTitle = computed(() => `${selectedApplicationType.value?.name || 'Approval'} Approval Rules`)

// All possible step definitions (canonical order)
const ALL_APPROVER_COLUMNS = [
  { key: 'in_charge',         field: 'in_charge_user_id',         label: 'In Charge' },
  { key: 'coordinator',       field: 'coordinator_user_id',       label: 'Co-ordinator' },
  { key: 'operational_admin', field: 'operational_admin_user_id', label: 'Operational Admin' },
  { key: 'recommend_by',      field: 'recommend_by_user_id',      label: 'Recommend By' },
  { key: 'approved_by',       field: 'approved_by_user_id',       label: 'Approved By' },
]

// Per-type column definitions — controls both the table columns and the modal fields
const TYPE_COLUMNS = {
  leave: [
    'in_charge', 'coordinator', 'operational_admin', 'recommend_by', 'approved_by',
  ],
  short_leave: [
    'in_charge', 'coordinator', 'operational_admin', 'recommend_by', 'approved_by',
  ],
  manual_attendance: [
    'in_charge', 'coordinator', 'operational_admin', 'recommend_by', 'approved_by',
  ],
  overtime: [
    'in_charge', 'coordinator', 'operational_admin', 'recommend_by', 'approved_by',
  ],
  offboarding: [
    'in_charge', 'coordinator', 'operational_admin', 'approved_by',
  ],
  shift: [
    'in_charge', 'coordinator', 'operational_admin', 'recommend_by', 'approved_by',
  ],
  offday: [
    'in_charge', 'coordinator', 'operational_admin', 'recommend_by', 'approved_by',
  ],
}

const approverColumns = computed(() => {
  const keys = TYPE_COLUMNS[selectedApplicationCode.value] || TYPE_COLUMNS.leave
  return ALL_APPROVER_COLUMNS.filter((col) => keys.includes(col.key))
})

const formatDateTime = (value) => {
  if (!value) return 'Not updated yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not updated yet'

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const updatedByName = (approval) => approval?.updated_by_user?.name || 'System / unknown'

const approverName = (approval, key) => {
  const step = approval?.approval_steps?.find((item) => item.key === key)
  return step?.user?.name || ''
}

const inlineCellKey = (approval, column) => `${approval.id}-${column.key}`

const openInlineAssign = (approval, column, event) => {
  const rect = event?.currentTarget?.getBoundingClientRect()
  const popoverWidth = 340
  const left = rect
    ? Math.min(Math.max(12, rect.left + rect.width / 2 - popoverWidth / 2), window.innerWidth - popoverWidth - 12)
    : 12
  const top = rect ? rect.bottom + 8 : 80

  activeInlineCell.value = inlineCellKey(approval, column)
  activeAssignment.value = { approval, column }
  inlineSearch.value = ''
  inlinePopoverPosition.value = { top, left }
}

const closeInlineAssign = () => {
  activeInlineCell.value = null
  activeAssignment.value = null
  inlineSearch.value = ''
}

const filteredInlineUsers = computed(() => {
  const q = inlineSearch.value.trim().toLowerCase()
  const users = approvalUsers.value || []

  if (!q) return users.slice(0, 8)

  return users
    .filter((user) => {
      const hay = [
        user?.name,
        user?.employee_id,
        user?.department?.name,
        user?.designation?.title,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return hay.includes(q)
    })
    .slice(0, 12)
})

const userMeta = (user) => {
  return [user?.employee_id, user?.department?.name, user?.designation?.title]
    .filter(Boolean)
    .join(' | ')
}

const fetchApprovalUsers = async () => {
  const response = await apiClient.get('/users')
  approvalUsers.value = response.data || []
}

// Inline single-field assign: only send the ONE field being changed.
// Sending all fields would copy inherited ROOT values into type_configs[code].
const buildApprovalPayload = (approval, column, user) => ({
  name: approval.name,
  type: backendType.value,
  application_code: selectedApplicationCode.value,
  department_id: approval.department_id || approval.department?.id || null,
  [column.field]: user?.id || null,
})

const assignApprover = async (approval, column, user) => {
  if (!approval?.id || !user?.id) return

  try {
    await leaveApprovalStore.updateLeaveApproval(
      approval.id,
      buildApprovalPayload(approval, column, user),
    )
    toast.success(`${column.label} assigned successfully.`)
    closeInlineAssign()
    await loadRules()
  } catch (error) {
    toast.error(`Failed to assign ${column.label}.`)
    console.error('Error assigning approval user:', error)
  }
}

const measureToolbar = async () => {
  await nextTick()
  toolbarH.value = toolbarRef.value
    ? Math.ceil(toolbarRef.value.getBoundingClientRect().height)
    : 0
}

const loadRules = async () => {
  await leaveApprovalStore.fetchApprovalRules({
    application_code: selectedApplicationCode.value,
    department_id: selectedDepartmentId.value || undefined,
  })
  await measureToolbar()
}

const onEmployeeFilterChange = async (payload = {}) => {
  selectedCompanyId.value = payload.company_id || ''
  selectedDepartmentId.value = payload.department_id || ''
  await router.replace({
    name: route.name,
    params: route.params,
    query: {
      ...route.query,
      company_id: selectedCompanyId.value || undefined,
      department_id: selectedDepartmentId.value || undefined,
    },
  })
  await loadRules()
}

const selectApplication = async (code) => {
  selectedApplicationCode.value = code
  await router.replace({
    name: route.name,
    params: {
      ...route.params,
      type: code,
    },
    query: route.query,
  })
  await loadRules()
}

const filteredApprovals = computed(() => {
  const q = search.value.trim().toLowerCase()
  let list = [...(leaveApprovalStore.leaveApprovals || [])]

  if (selectedCompanyId.value) {
    list = list.filter((a) => String(a?.department?.company_id || '') === String(selectedCompanyId.value))
  }

  if (!q) return list

  return list.filter((a) => {
    const hay = [
      a?.name,
      a?.department?.name,
      ...(a?.approval_steps || []).map((step) => step?.user?.name),
      a?.updated_by_user?.name,
      a?.change_note,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return hay.includes(q)
  })
})

const groupedApprovals = computed(() => {
  const groups = filteredApprovals.value.reduce((acc, approval) => {
    const departmentName = approval?.department?.name || 'Unassigned Department'
    if (!acc[departmentName]) acc[departmentName] = []
    acc[departmentName].push(approval)
    return acc
  }, {})

  return Object.entries(groups)
    .sort((a, b) => {
      if (a[0] === 'Unassigned Department') return 1
      if (b[0] === 'Unassigned Department') return -1
      return a[0].localeCompare(b[0])
    })
    .map(([department, approvals]) => ({ department, approvals }))
})

const openAddModal = () => {
  selectedLeaveApproval.value = null
  showLeaveApprovalModal.value = true
}

const openEditModal = (leaveApproval) => {
  selectedLeaveApproval.value = { ...leaveApproval }
  showLeaveApprovalModal.value = true
}

const closeLeaveApprovalModal = () => {
  showLeaveApprovalModal.value = false
}

const isLeaveTab = computed(() => selectedApplicationCode.value === 'leave')

// A rule is "empty" when it has no approver assigned anywhere —
// neither in root fields nor in any type_configs override.
// Empty rules are safe to delete from any tab.
const isRuleEmpty = (approval) => {
  const hasRoot = ALL_APPROVER_COLUMNS.some((col) => approval[col.field])
  const hasType = Object.values(approval.type_configs || {}).some((cfg) =>
    ALL_APPROVER_COLUMNS.some((col) => cfg?.[col.field]),
  )
  return !hasRoot && !hasType
}

const openDeleteModal = (leaveApproval) => {
  selectedLeaveApproval.value = leaveApproval
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
}

const openResetModal = (leaveApproval) => {
  selectedLeaveApproval.value = leaveApproval
  showResetModal.value = true
}

const closeResetModal = () => {
  showResetModal.value = false
}

const handleReset = async () => {
  if (!selectedLeaveApproval.value?.id) return
  try {
    await leaveApprovalStore.resetTypeConfig(
      selectedLeaveApproval.value.id,
      selectedApplicationCode.value,
    )
    toast.success(`${selectedApplicationType.value?.name} override cleared — now falls back to root approvers.`)
    await loadRules()
  } catch {
    toast.error('Failed to reset type config.')
  } finally {
    closeResetModal()
  }
}

const handleDelete = async () => {
  if (!selectedLeaveApproval.value?.id) {
    toast.error('Invalid approval rule selected for deletion.')
    return
  }

  try {
    await leaveApprovalStore.deleteLeaveApproval(selectedLeaveApproval.value.id)
    toast.success('Approval rule deleted successfully.')
    await loadRules()
  } catch (error) {
    toast.error('Failed to delete approval rule.')
    console.error('Error deleting approval rule:', error)
  } finally {
    closeDeleteModal()
  }
}

const handleSave = async (leaveApproval) => {
  const payload = {
    ...leaveApproval,
    type: backendType.value,
    application_code: selectedApplicationCode.value,
  }

  const action = payload.id ? 'updateLeaveApproval' : 'createLeaveApproval'
  const successMessage = payload.id
    ? 'Approval rule updated successfully.'
    : 'Approval rule added successfully.'

  try {
    await leaveApprovalStore[action](payload.id || payload, payload)
    toast.success(successMessage)
    await loadRules()
  } catch (error) {
    toast.error('Failed to save approval rule.')
    console.error('Error saving approval rule:', error)
  } finally {
    closeLeaveApprovalModal()
  }
}

watch(
  () => [route.name, route.params.type, route.query.type, route.query.company_id, route.query.department_id],
  async ([, , , companyId, deptId]) => {
    const nextCode = routeApplicationCode()
    let changed = false

    if (selectedApplicationCode.value !== nextCode) {
      selectedApplicationCode.value = nextCode
      changed = true
    }

    const nextCompany = companyId || ''
    const nextDept = deptId || ''
    if (selectedCompanyId.value !== nextCompany || selectedDepartmentId.value !== nextDept) {
      selectedCompanyId.value = nextCompany
      selectedDepartmentId.value = nextDept
      changed = true
    }

    if (changed) await loadRules()
  },
)

onMounted(async () => {
  await Promise.all([
    leaveApprovalStore.fetchApplicationTypes(),
    fetchApprovalUsers(),
  ])
  await loadRules()
  window.addEventListener('resize', measureToolbar)
})

onUnmounted(() => {
  window.removeEventListener('resize', measureToolbar)
  if (approvalRulesHelpTimer) clearTimeout(approvalRulesHelpTimer)
})

const TAB_ICONS = {
  leave:               'fas fa-file-alt',
  short_leave:         'fas fa-clock',
  manual_attendance:   'fas fa-user-clock',
  overtime:            'fas fa-hourglass-half',
  offboarding:         'fas fa-sign-out-alt',
  shift:               'fas fa-exchange-alt',
  offday:              'fas fa-calendar-times',
}
const tabIcon = (code) => TAB_ICONS[code] || 'fas fa-circle'

const configuredCount = (approval) =>
  approverColumns.value.filter((col) => approverName(approval, col.key)).length
</script>

<template>
  <div class="pb-8">

    <!-- ── Sticky toolbar ── -->
    <div ref="toolbarRef" class="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">

      <!-- Page header -->
      <div class="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <h1 class="title-lg leading-tight">Approval Rules</h1>
          <p class="text-xs text-gray-400 mt-0.5">
            <i class="fas fa-layer-group mr-1"></i>{{ pageTitle }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 text-blue-600 transition-colors hover:bg-blue-50"
            :aria-expanded="showApprovalRulesHelp"
            aria-label="Show how approval rules work"
            title="How Approval Rules Work"
            @click="toggleApprovalRulesHelp"
          >
            <i class="fas fa-info-circle"></i>
          </button>
          <button class="btn-2 py-1.5" @click="openAddModal">
            <i class="fas fa-plus text-xs"></i>
            <span class="hidden sm:inline">Add New</span>
          </button>
        </div>
      </div>

      <!-- Tab bar -->
      <div class="flex overflow-x-auto scrollbar-hide border-t border-gray-100 px-2 gap-0.5">
        <button
          v-for="type in applicationTypes"
          :key="type.code"
          type="button"
          class="shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-150 whitespace-nowrap"
          :class="selectedApplicationCode === type.code
            ? 'border-blue-600 text-blue-700'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          @click="selectApplication(type.code)"
        >
          <i :class="tabIcon(type.code)" class="text-[11px]"></i>
          {{ type.name }}
        </button>
      </div>

      <!-- Filters -->
      <div class="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <EmployeeFilter
          v-model:company_id="selectedCompanyId"
          v-model:department_id="selectedDepartmentId"
          :with-type="false"
          :with-employee="false"
          @filter-change="onEmployeeFilterChange"
        />
      </div>
    </div>

    <!-- ── Body ── -->
    <div class="px-2 md:px-4 pt-4 space-y-4">

      <!-- How it works note -->
      <div v-if="showApprovalRulesHelp" class="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-800 space-y-1.5">
        <p class="font-semibold text-blue-900 flex items-center gap-1.5">
          <i class="fas fa-info-circle text-blue-500"></i>
          How Approval Rules Work
        </p>
        <ul class="space-y-1 pl-4 list-disc text-blue-700">
          <li>
            <strong>Snapshot at submission:</strong> When an application is submitted, the current approvers are <em>captured (snapshot)</em>.
            Changing a rule later does <strong>not</strong> affect already-submitted applications.
          </li>
          <li>
            <strong>Per-type override:</strong> Short Leave, Manual Attendance, Overtime, Shift Exchange, and Offday Exchange each store
            their own approver set inside the same shared rule record. Editing one tab only changes that type's approvers.
          </li>
          <li>
            <strong>Root vs. type-specific:</strong> If no per-type override is set, the application falls back to the rule's root approvers.
            Set an override here to give a type its own distinct approval chain.
          </li>
          <li>
            <strong>Shift / Offday Exchange:</strong> Use the <em>Shift Exchange</em> and <em>Offday Exchange</em> tabs above to configure
            separate approvers for each exchange type within the same rule.
          </li>
        </ul>
      </div>

      <!-- Loading -->
      <div v-if="leaveApprovalStore.loading" class="flex justify-center py-16">
        <LoaderView class="shadow-none" />
      </div>

      <!-- Table -->
      <div v-else-if="filteredApprovals.length" class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div class="overflow-x-auto overflow-y-visible">
          <table class="min-w-[980px] w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-200">
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 w-36">Department</th>
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Rule Name</th>
                <th
                  v-for="col in approverColumns"
                  :key="col.key"
                  class="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                >
                  {{ col.label }}
                </th>
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 w-40">Last Update</th>
                <th class="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500 w-24">Actions</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="approval in filteredApprovals"
                :key="approval.id"
                class="hover:bg-blue-50/30 transition-colors group"
              >
                <!-- Department -->
                <td class="px-4 py-2.5">
                  <span class="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
                    {{ approval?.department?.name || '—' }}
                  </span>
                </td>

                <!-- Rule name + completeness -->
                <td class="px-4 py-2.5">
                  <p class="font-medium text-gray-900 leading-tight">{{ approval?.name || 'Unnamed rule' }}</p>
                  <p class="text-[10px] text-gray-400 mt-0.5">
                    <i class="fas fa-check-circle text-emerald-400 mr-0.5"></i>
                    {{ configuredCount(approval) }}/{{ approverColumns.length }} configured
                  </p>
                </td>

                <!-- Approver cells -->
                <td
                  v-for="col in approverColumns"
                  :key="`${approval.id}-${col.key}`"
                  class="relative px-3 py-2.5 text-center"
                >
                  <span
                    v-if="approverName(approval, col.key)"
                    class="inline-flex items-center gap-1 text-xs font-medium text-gray-800"
                  >
                    <i class="fas fa-user-check text-emerald-500 text-[9px] shrink-0"></i>
                    {{ approverName(approval, col.key) }}
                  </span>
                  <button
                    v-else
                    type="button"
                    class="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2.5 py-0.5 text-[11px] text-gray-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    :title="`Assign ${col.label}`"
                    @click.stop="openInlineAssign(approval, col, $event)"
                  >
                    <i class="fas fa-plus text-[9px]"></i> Add
                  </button>
                </td>

                <!-- Last update -->
                <td class="px-4 py-2.5">
                  <p class="text-xs text-gray-700 whitespace-nowrap">{{ formatDateTime(approval?.updated_at) }}</p>
                  <p class="text-[10px] text-gray-400 mt-0.5 truncate max-w-[140px]">by {{ updatedByName(approval) }}</p>
                </td>

                <!-- Actions -->
                <td class="px-4 py-2.5">
                  <div class="flex items-center justify-center gap-1.5">
                    <button
                      class="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                      @click="openEditModal(approval)"
                      title="Edit"
                    >
                      <i class="far fa-edit text-[10px]"></i>
                      <span>Edit</span>
                    </button>

                    <!-- Delete: rule has no approvers at all (safe to remove from any tab) -->
                    <button
                      v-if="isRuleEmpty(approval)"
                      class="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                      @click="openDeleteModal(approval)"
                      title="Delete empty rule"
                    >
                      <i class="fas fa-trash text-[10px]"></i>
                    </button>

                    <!-- Reset: non-leave tab + rule has approvers — clears type-specific override -->
                    <button
                      v-else-if="!isLeaveTab"
                      class="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                      @click="openResetModal(approval)"
                      :title="`Reset ${selectedApplicationType?.name} override to root defaults`"
                    >
                      <i class="fas fa-undo text-[10px]"></i>
                      <span>Reset</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center shadow-sm">
        <div class="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <i class="fas fa-shield-alt text-2xl text-gray-300"></i>
        </div>
        <p class="font-semibold text-gray-800">No rules for {{ selectedApplicationType?.name }}</p>
        <p class="mt-1 text-sm text-gray-400">Configure who approves these applications.</p>
        <button class="btn-2 mt-5 py-1.5" @click="openAddModal">
          <i class="fas fa-plus text-xs"></i> Add Rule
        </button>
      </div>

    </div>

    <!-- ── Modals (logic unchanged) ── -->
    <LeaveApprovalModal
      :show="showLeaveApprovalModal"
      :leaveApproval="selectedLeaveApproval"
      :approvalType="approvalGroup"
      :typeName="selectedApplicationType?.name"
      :columns="approverColumns"
      @close="closeLeaveApprovalModal"
      @save="handleSave"
    />

    <DeleteModal
      :show="showDeleteModal"
      title="Delete Approval Rule"
      :message="`Are you sure you want to delete '${selectedLeaveApproval?.name}'?`"
      @close="closeDeleteModal"
      @confirm="handleDelete"
    />

    <!-- Reset type-config confirmation -->
    <DeleteModal
      :show="showResetModal"
      title="Reset Type Override"
      :message="`Reset the '${selectedApplicationType?.name}' override for '${selectedLeaveApproval?.name}'? It will fall back to the rule's root approvers. Already-submitted applications are not affected.`"
      @close="closeResetModal"
      @confirm="handleReset"
    />

    <!-- ── Inline assign popover ── -->
    <Teleport to="body">
      <div
        v-if="activeAssignment"
        class="fixed inset-0 z-[9999]"
        @click="closeInlineAssign"
      >
        <div
          class="absolute w-[340px] rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden"
          :style="{ top: `${inlinePopoverPosition.top}px`, left: `${inlinePopoverPosition.left}px` }"
          @click.stop
        >
          <!-- Popover header -->
          <div class="flex items-center justify-between gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-100">
            <div class="min-w-0">
              <p class="truncate text-xs font-semibold text-gray-800">
                <i class="fas fa-user-plus text-blue-500 mr-1"></i>
                Assign {{ activeAssignment.column.label }}
              </p>
              <p class="truncate text-[11px] text-gray-400 mt-0.5">
                {{ activeAssignment.approval.department?.name || '—' }} · {{ activeAssignment.approval.name }}
              </p>
            </div>
            <button
              type="button"
              class="shrink-0 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 transition-colors"
              @click="closeInlineAssign"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Search -->
          <div class="px-3 pt-2.5 pb-1.5">
            <input
              v-model="inlineSearch"
              type="text"
              class="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              placeholder="Search by name, ID or department…"
              autofocus
              @keydown.esc="closeInlineAssign"
            />
          </div>

          <!-- User list -->
          <div class="max-h-60 overflow-y-auto">
            <button
              v-for="user in filteredInlineUsers"
              :key="user.id"
              type="button"
              class="flex items-center gap-2.5 w-full border-b border-gray-50 px-3 py-2 text-left hover:bg-blue-50 transition-colors last:border-b-0"
              @click="assignApprover(activeAssignment.approval, activeAssignment.column, user)"
            >
              <div class="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                {{ (user.name || '?')[0].toUpperCase() }}
              </div>
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-gray-900">{{ user.name }}</p>
                <p class="truncate text-[11px] text-gray-400">{{ userMeta(user) || `#${user.id}` }}</p>
              </div>
            </button>

            <div v-if="!filteredInlineUsers.length" class="px-4 py-6 text-center text-sm text-gray-400">
              <i class="fas fa-search mb-2 text-gray-300 text-lg block"></i>
              No user found
            </div>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
