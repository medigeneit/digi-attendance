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
  { name: 'Leave', code: 'leave', approval_group: 'leave', sort_order: 1 },
  { name: 'Short Leave', code: 'short_leave', approval_group: 'other', sort_order: 2 },
  { name: 'Manual Attendance', code: 'manual_attendance', approval_group: 'other', sort_order: 3 },
  { name: 'Overtime', code: 'overtime', approval_group: 'other', sort_order: 4 },
  { name: 'Offboarding', code: 'offboarding', approval_group: 'other', sort_order: 5 },
]

const routeApplicationCode = () => {
  const type = String(route.params.type || route.query.type || '').trim()
  if (type) return type

  return route.name === 'LeaveApprovalList' ? 'leave' : 'short_leave'
}

const selectedApplicationCode = ref(routeApplicationCode())
const showLeaveApprovalModal = ref(false)
const showDeleteModal = ref(false)
const selectedLeaveApproval = ref(null)
const activeInlineCell = ref(null)
const activeAssignment = ref(null)
const inlineSearch = ref('')
const approvalUsers = ref([])
const inlinePopoverPosition = ref({ top: 0, left: 0 })

const search = ref('')
const selectedCompanyId = ref('')
const selectedDepartmentId = ref('')

const toolbarRef = ref(null)
const toolbarH = ref(0)

const applicationTypes = computed(() => {
  const items = leaveApprovalStore.applicationTypes?.length
    ? leaveApprovalStore.applicationTypes
    : fallbackApplicationTypes

  return [...items].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
})

const selectedApplicationType = computed(() => {
  const storeType = leaveApprovalStore.applicationType
  return (storeType?.code === selectedApplicationCode.value ? storeType : null)
    || applicationTypes.value.find((item) => item.code === selectedApplicationCode.value)
    || fallbackApplicationTypes[0]
})

const approvalGroup = computed(() => selectedApplicationType.value?.approval_group || 'leave')
const pageTitle = computed(() => `${selectedApplicationType.value?.name || 'Approval'} Approval Rules`)

const approverColumns = [
  { key: 'in_charge', field: 'in_charge_user_id', label: 'Incharge' },
  { key: 'coordinator', field: 'coordinator_user_id', label: 'Co-ordinator' },
  { key: 'operational_admin', field: 'operational_admin_user_id', label: 'Operational Admin' },
  { key: 'recommend_by', field: 'recommend_by_user_id', label: 'Recommendation By' },
  { key: 'approved_by', field: 'approved_by_user_id', label: 'Approved By' },
]

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

const buildApprovalPayload = (approval, column, user) => ({
  name: approval.name,
  type: approval.type || approvalGroup.value,
  department_id: approval.department_id || approval.department?.id || null,
  in_charge_user_id: approval.in_charge_user_id || null,
  coordinator_user_id: approval.coordinator_user_id || null,
  operational_admin_user_id: approval.operational_admin_user_id || null,
  recommend_by_user_id: approval.recommend_by_user_id || null,
  approved_by_user_id: approval.approved_by_user_id || null,
  change_note: approval.change_note || '',
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

const openDeleteModal = (leaveApproval) => {
  selectedLeaveApproval.value = leaveApproval
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
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
    type: leaveApproval.type || approvalGroup.value,
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
  () => [route.name, route.params.type, route.query.type],
  async () => {
    const nextCode = routeApplicationCode()
    if (selectedApplicationCode.value === nextCode) return

    selectedApplicationCode.value = nextCode
    await loadRules()
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
})
</script>

<template>
  <div class="space-y-4 p-2 md:p-4">
    <div ref="toolbarRef" class="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
      <div class="p-3 space-y-6">
        <HeaderWithButtons title="Approval Rules" @add="openAddModal" />

        <div class="flex flex-wrap gap-2">
          <button
            v-for="type in applicationTypes"
            :key="type.code"
            type="button"
            class="px-3 py-2 rounded border text-sm font-medium"
            :class="selectedApplicationCode === type.code
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'"
            @click="selectApplication(type.code)"
          >
            {{ type.name }}
          </button>
        </div>

        <!-- <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">{{ pageTitle }}</h2>
            <span
              v-if="approvalGroup === 'other'"
              class="inline-flex mt-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700"
            >
              Using existing Other approval rules
            </span>
          </div>

          <input
            v-model="search"
            type="text"
            placeholder="Search rules or approvers"
            class="w-full md:w-72 rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div> -->

        <EmployeeFilter
          v-model:company_id="selectedCompanyId"
          v-model:department_id="selectedDepartmentId"
          :with-type="false"
          :with-employee="false"
          @filter-change="onEmployeeFilterChange"
        />
      </div>
    </div>

    <div v-if="leaveApprovalStore.loading" class="bg-white rounded-lg p-6 border border-gray-100 shadow-sm flex justify-center">
      <LoaderView class="shadow-none" />
    </div>

    <div v-else-if="filteredApprovals.length" class="bg-white rounded-lg border border-gray-300 shadow-sm">
      <div class="overflow-x-auto overflow-y-visible">
        <table class="min-w-[980px] w-full border-collapse text-sm">
          <thead>
            <tr class="bg-gray-50 text-gray-800">
              <th class="border border-gray-400 px-3 py-2 text-left font-semibold">Department</th>
              <th class="border border-gray-400 px-3 py-2 text-left font-semibold">Rule Name</th>
              <th
                v-for="column in approverColumns"
                :key="column.key"
                class="border border-gray-400 px-3 py-2 text-center font-semibold"
              >
                {{ column.label }}
              </th>
              <th class="border border-gray-400 px-3 py-2 text-left font-semibold">Last Update</th>
              <th class="border border-gray-400 px-3 py-2 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="approval in filteredApprovals"
              :key="approval.id"
              class="hover:bg-blue-50"
              :title="`${approval?.name || 'Approval rule'} | Updated ${formatDateTime(approval?.updated_at)} by ${updatedByName(approval)}`"
            >
              <td class="border border-gray-400 px-3 py-2 font-medium text-gray-900">
                {{ approval?.department?.name || 'Unassigned Department' }}
              </td>
              <td class="border border-gray-400 px-3 py-2 text-gray-800">
                {{ approval?.name || 'Unnamed rule' }}
              </td>
              <td
                v-for="column in approverColumns"
                :key="`${approval.id}-${column.key}`"
                class="relative border border-gray-400 px-3 py-2 text-center text-gray-800"
              >
                <span v-if="approverName(approval, column.key)">
                  {{ approverName(approval, column.key) }}
                </span>
                <template v-else>
                  <button
                    type="button"
                    class="inline-flex rounded border border-red-400 px-4 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    :title="`Add ${column.label}`"
                    @click.stop="openInlineAssign(approval, column, $event)"
                  >
                    Add
                  </button>
                </template>
              </td>
              <td class="border border-gray-400 px-3 py-2 text-gray-800">
                <div class="whitespace-nowrap text-sm">
                  {{ formatDateTime(approval?.updated_at) }}
                </div>
                <div class="mt-1 text-xs text-gray-500">
                  by {{ updatedByName(approval) }}
                </div>
              </td>
              <td class="border border-gray-400 px-3 py-2">
                <div class="flex justify-center gap-2">
                  <button class="rounded border border-blue-200 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50" @click="openEditModal(approval)">
                    Edit
                  </button>
                  <button class="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50" @click="openDeleteModal(approval)">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else class="bg-white rounded-lg border border-dashed border-gray-300 shadow-sm p-6 text-center">
      <div class="font-semibold text-gray-900">No approval rules found</div>
      <div class="text-sm text-gray-500">Add an approval rule or adjust the filters.</div>
    </div>

    <LeaveApprovalModal
      :show="showLeaveApprovalModal"
      :leaveApproval="selectedLeaveApproval"
      :approvalType="approvalGroup"
      @close="closeLeaveApprovalModal"
      @save="handleSave"
    />

    <DeleteModal
      :show="showDeleteModal"
      title="Delete Approval Rule"
      :message="`Are you sure you want to delete ${selectedLeaveApproval?.name}?`"
      @close="closeDeleteModal"
      @confirm="handleDelete"
    />

    <Teleport to="body">
      <div
        v-if="activeAssignment"
        class="fixed inset-0 z-[9999]"
        @click="closeInlineAssign"
      >
        <div
          class="absolute w-[340px] rounded-lg border border-gray-200 bg-white p-2 text-left shadow-xl"
          :style="{ top: `${inlinePopoverPosition.top}px`, left: `${inlinePopoverPosition.left}px` }"
          @click.stop
        >
          <div class="mb-2 flex items-center justify-between gap-2">
            <div class="min-w-0">
              <div class="truncate text-xs font-semibold text-gray-700">
                Add {{ activeAssignment.column.label }}
              </div>
              <div class="truncate text-[11px] text-gray-400">
                {{ activeAssignment.approval.department?.name || 'Unassigned Department' }} - {{ activeAssignment.approval.name }}
              </div>
            </div>
            <button
              type="button"
              class="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
              @click="closeInlineAssign"
            >
              Cancel
            </button>
          </div>

          <input
            v-model="inlineSearch"
            type="text"
            class="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Search name, ID, department"
            autofocus
            @keydown.esc="closeInlineAssign"
          />

          <div class="mt-2 max-h-64 overflow-y-auto rounded border border-gray-100">
            <button
              v-for="user in filteredInlineUsers"
              :key="user.id"
              type="button"
              class="block w-full border-b border-gray-100 px-3 py-2 text-left hover:bg-blue-50 last:border-b-0"
              @click="assignApprover(activeAssignment.approval, activeAssignment.column, user)"
            >
              <div class="truncate text-sm font-medium text-gray-900">
                {{ user.name }}
              </div>
              <div class="truncate text-xs text-gray-500">
                {{ userMeta(user) || `#${user.id}` }}
              </div>
            </button>

            <div v-if="!filteredInlineUsers.length" class="px-3 py-3 text-center text-sm text-gray-500">
              No user found
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
