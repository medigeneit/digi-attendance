<script setup>
import LeaveApprovalModal from '@/components/LeaveApprovalModal.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import HeaderWithButtons from '@/components/common/HeaderWithButtons.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { useLeaveApprovalStore } from '@/stores/leave-approval'
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const router = useRouter()
const approvalType = computed(() =>
  router.currentRoute.value.name === 'LeaveApprovalList' ? 'leave' : 'other'
)

const leaveApprovalStore = useLeaveApprovalStore()
const toast = useToast()

const showLeaveApprovalModal = ref(false)
const showDeleteModal = ref(false)
const selectedLeaveApproval = ref(null)

const search = ref('')

// ✅ sticky toolbar height calculation (so department header sticks under it)
const toolbarRef = ref(null)
const toolbarH = ref(0)

const measureToolbar = async () => {
  await nextTick()
  toolbarH.value = toolbarRef.value
    ? Math.ceil(toolbarRef.value.getBoundingClientRect().height)
    : 0
}

const filteredApprovals = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = leaveApprovalStore.leaveApprovals || []
  if (!q) return list

  return list.filter((a) => {
    const hay = [
      a?.name,
      a?.department?.name,
      a?.in_charge_user?.name,
      a?.coordinator_user?.name,
      a?.operational_admin_user?.name,
      a?.recommend_by_user?.name,
      a?.approved_by_user?.name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return hay.includes(q)
  })
})

const groupedApprovals = computed(() => {
  const list = filteredApprovals.value || []
  const groups = list.reduce((acc, approval) => {
    const departmentName = approval?.department?.name || 'Unassigned Department'
    if (!acc[departmentName]) acc[departmentName] = []
    acc[departmentName].push(approval)
    return acc
  }, {})

  // Optional: Unassigned Department last (feel free to remove)
  const entries = Object.entries(groups)
  entries.sort((a, b) => {
    if (a[0] === 'Unassigned Department') return 1
    if (b[0] === 'Unassigned Department') return -1
    return a[0].localeCompare(b[0])
  })

  return entries.map(([department, approvals]) => ({ department, approvals }))
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
    toast.error('Invalid leave approval selected for deletion!')
    return
  }

  try {
    await leaveApprovalStore.deleteLeaveApproval(selectedLeaveApproval.value.id)
    toast.success('Leave approval deleted successfully!')
  } catch (error) {
    toast.error('Failed to delete leave approval!')
    console.error('Error deleting leave approval:', error)
  } finally {
    closeDeleteModal()
  }
}

const handleSave = async (leaveApproval) => {
  if (!leaveApproval.id) {
    leaveApproval = { ...leaveApproval, type: approvalType.value }
  }

  const action = leaveApproval.id ? 'updateLeaveApproval' : 'createLeaveApproval'
  const successMessage = leaveApproval.id
    ? 'Leave approval updated successfully!'
    : 'Leave approval added successfully!'

  try {
    await leaveApprovalStore[action](leaveApproval.id || leaveApproval, leaveApproval)
    toast.success(successMessage)
  } catch (error) {
    toast.error('Failed to save leave approval!')
    console.error('Error saving leave approval:', error)
  } finally {
    closeLeaveApprovalModal()
  }
}

onMounted(async () => {
  // fetch
  leaveApprovalStore.fetchLeaveApprovals({ type: approvalType.value })

  // measure sticky toolbar height
  await measureToolbar()
  window.addEventListener('resize', measureToolbar)
})

onUnmounted(() => {
  window.removeEventListener('resize', measureToolbar)
})
</script>

<template>
  <div class="my-container space-y-4">
    <!-- ✅ Sticky Top Toolbar (Header + Search) -->
    <div
      ref="toolbarRef"
      class="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200"
    >
      <div class="p-3 space-y-4">
        <HeaderWithButtons :title="`${approvalType} Approvals`" @add="openAddModal" />

          <div class="flex flex-col md:flex-row md:items-center gap-3">
            <div class="flex-1">
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔎</span>
                <input
                  v-model="search"
                  type="text"
                  placeholder="Search by name / dept / approver..."
                  class="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div class="flex items-center gap-2 text-sm text-gray-600">
              <button
                v-if="search"
                @click="search = ''"
                class="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
              >
                Clear
              </button>
            </div>
          </div>
      </div>
    </div>

    <!-- Content -->
    <div class="space-y-2">
      <!-- Loading -->
      <div
        v-if="leaveApprovalStore.loading"
        class="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex justify-center"
      >
        <LoaderView class="shadow-none" />
      </div>

      <!-- Groups -->
      <div v-else-if="groupedApprovals.length" class="space-y-2">
        <section
          v-for="group in groupedApprovals"
          :key="group.department"
          class="bg-white rounded-xl border border-gray-100 shadow-sm"
        >
          <!-- ✅ Sticky Department Header (stays under the toolbar) -->
          <div
            class="sticky z-40 px-4 py-1 rounded border-b border-gray-200 bg-white/95 backdrop-blur flex flex-wrap gap-3 items-center justify-between"
            :style="{ top: toolbarH + 'px' }"
          >
            <div class="min-w-0">
              <p class="text-lg font-semibold text-gray-900 truncate">
                {{ group.department }}
              </p>
            </div>
          </div>

          <!-- ✅ Keep rounded corners without breaking sticky -->
          <div class="overflow-hidden rounded-b-xl">
            <!-- Mobile Card View -->
            <div class="md:hidden px-4 py-4 space-y-3">
              <div
                v-for="(a, index) in group.approvals"
                :key="a?.id ?? `mobile-${group.department}-${index}`"
                class="bg-gray-50 rounded-xl border border-gray-100 p-4 shadow-sm"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="font-semibold text-gray-900 truncate">{{ a?.name || 'N/A' }}</div>
                    <div class="text-sm text-gray-500 truncate">
                      {{ a?.department?.name || 'N/A' }}
                    </div>
                  </div>

                  <div class="flex gap-2">
                    <button
                      @click="openEditModal(a)"
                      class="px-3 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      @click="openDeleteModal(a)"
                      class="px-3 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div class="mt-3 grid grid-cols-1 gap-2 text-sm">
                  <div class="flex justify-between gap-2">
                    <span class="text-gray-500">In-Charge</span>
                    <span class="text-gray-900">{{ a?.in_charge_user?.name || 'N/A' }}</span>
                  </div>
                  <div class="flex justify-between gap-2">
                    <span class="text-gray-500">Coordinator</span>
                    <span class="text-gray-900">{{ a?.coordinator_user?.name || 'N/A' }}</span>
                  </div>
                  <div class="flex justify-between gap-2">
                    <span class="text-gray-500">Operational Admin</span>
                    <span class="text-gray-900">{{ a?.operational_admin_user?.name || 'N/A' }}</span>
                  </div>
                  <div class="flex justify-between gap-2">
                    <span class="text-gray-500">Recommend By</span>
                    <span class="text-gray-900">{{ a?.recommend_by_user?.name || 'N/A' }}</span>
                  </div>
                  <div class="flex justify-between gap-2">
                    <span class="text-gray-500">Approved By</span>
                    <span class="text-gray-900">{{ a?.approved_by_user?.name || 'N/A' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Desktop Table View -->
            <div class="hidden md:block">
              <div class="overflow-x-auto overflow-y-visible">
                <table class="min-w-full text-sm">
                  <thead class="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                    <tr>
                      <th class="py-3 px-4 text-left w-12">#</th>
                      <th class="py-3 px-4 text-left">Name</th>
                      <!-- <th class="py-3 px-4 text-left">Department</th> -->
                      <th class="py-3 px-4 text-left">In-Charge</th>
                      <th class="py-3 px-4 text-left">Coordinator</th>
                      <th class="py-3 px-4 text-left">Operational Admin</th>
                      <th class="py-3 px-4 text-left">Recommend By</th>
                      <th class="py-3 px-4 text-left">Approved By</th>
                      <th class="py-3 px-4 text-center w-28">Actions</th>
                    </tr>
                  </thead>

                  <tbody class="divide-y divide-gray-100">
                    <tr
                      v-for="(leaveApproval, index) in group.approvals"
                      :key="leaveApproval?.id ?? `desktop-${group.department}-${index}`"
                      class="hover:bg-blue-50"
                    >
                      <td class="py-3 px-4 text-gray-700">{{ index + 1 }}</td>
                      <td class="py-3 px-4 font-medium text-gray-900">
                        {{ leaveApproval?.name || 'N/A' }}
                      </td>
                      <!-- <td class="py-3 px-4 text-gray-700">
                        {{ leaveApproval?.department?.name || 'N/A' }}
                      </td> -->
                      <td class="py-3 px-4 text-gray-700">
                        {{ leaveApproval?.in_charge_user?.name || 'N/A' }}
                      </td>
                      <td class="py-3 px-4 text-gray-700">
                        {{ leaveApproval?.coordinator_user?.name || 'N/A' }}
                      </td>
                      <td class="py-3 px-4 text-gray-700">
                        {{ leaveApproval?.operational_admin_user?.name || 'N/A' }}
                      </td>
                      <td class="py-3 px-4 text-gray-700">
                        {{ leaveApproval?.recommend_by_user?.name || 'N/A' }}
                      </td>
                      <td class="py-3 px-4 text-gray-700">
                        {{ leaveApproval?.approved_by_user?.name || 'N/A' }}
                      </td>

                      <td class="py-3 px-4">
                        <div class="flex justify-center gap-2">
                          <button
                            @click="openEditModal(leaveApproval)"
                            class="px-3 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50"
                            title="Edit"
                          >
                            ✏️
                          </button>

                          <button
                            @click="openDeleteModal(leaveApproval)"
                            class="px-3 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                            title="Delete"
                          >
                            <i class="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Empty -->
      <div
        v-else
        class="bg-white rounded-xl border border-dashed border-gray-300 shadow-sm p-6 text-center"
      >
        <div class="text-3xl">📭</div>
        <div class="mt-2 font-semibold text-gray-900">No leave approvals found</div>
        <div class="text-sm text-gray-500">
          {{ search ? 'Try adjusting your search terms.' : 'Add a leave approval using the + button.' }}
        </div>
      </div>
    </div>

    <!-- Modals -->
    <LeaveApprovalModal
      :show="showLeaveApprovalModal"
      :leaveApproval="selectedLeaveApproval"
      :approvalType="approvalType"
      @close="closeLeaveApprovalModal"
      @save="handleSave"
    />

    <DeleteModal
      :show="showDeleteModal"
      :title="`Delete ${approvalType} Approval`"
      :message="`Are you sure you want to delete ${selectedLeaveApproval?.name}?`"
      @close="closeDeleteModal"
      @confirm="handleDelete"
    />
  </div>
</template>
