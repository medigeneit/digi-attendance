<script setup>
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { useDepartmentStore } from '@/stores/department'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'

const props = defineProps({
  show: { type: Boolean, required: true },
  leaveApproval: { type: Object, default: null },
  approvalType: { type: String, default: 'leave' },
  typeName: { type: String, default: '' },
  columns: {
    type: Array,
    default: () => [
      { key: 'in_charge', field: 'in_charge_user_id', label: 'In Charge' },
      { key: 'coordinator', field: 'coordinator_user_id', label: 'Co-ordinator' },
      { key: 'operational_admin', field: 'operational_admin_user_id', label: 'Operational Admin' },
      { key: 'recommend_by', field: 'recommend_by_user_id', label: 'Recommend By' },
      { key: 'approved_by', field: 'approved_by_user_id', label: 'Approved By' },
    ],
  },
})

const emit = defineEmits(['close', 'save'])

const userStore = useUserStore()
const departmentStore = useDepartmentStore()
const { departments } = storeToRefs(departmentStore)

const isEditMode = ref(false)
const formErrors = reactive({
  name: '',
  department_id: '',
})

const selectedDepartment = ref(null)

const form = reactive({
  id: null,
  name: '',
  department_id: null,
  in_charge_user_id: null,
  coordinator_user_id: null,
  operational_admin_user_id: null,
  recommend_by_user_id: null,
  approved_by_user_id: null,
  change_note: '',
  type: props.approvalType,
})

const selectedUsers = reactive({
  in_charge_user_id: null,
  coordinator_user_id: null,
  operational_admin_user_id: null,
  recommend_by_user_id: null,
  approved_by_user_id: null,
})

const configuredStepCount = computed(() =>
  props.columns.filter((col) => selectedUsers[col.field]).length,
)

const completionPercent = computed(() => {
  if (!props.columns.length) return 0
  return Math.round((configuredStepCount.value / props.columns.length) * 100)
})

const modalTitle = computed(() => `${isEditMode.value ? 'Edit' : 'New'} Approval Rule`)

const userSubtitle = (user) => {
  if (!user) return 'No approver selected'

  return [user.employee_id, user.department?.name, user.designation?.title]
    .filter(Boolean)
    .join(' | ') || `User #${user.id}`
}

const loadSelectedUsers = () => {
  Object.keys(selectedUsers).forEach((field) => {
    selectedUsers[field] = userStore.users.find((u) => u.id === form[field]) || null
  })
}

Object.keys(selectedUsers).forEach((field) => {
  watch(
    () => selectedUsers[field],
    (newVal) => {
      form[field] = newVal ? newVal.id : null
    },
  )
})

watch(
  () => form.name,
  (value) => {
    if (value?.trim()) formErrors.name = ''
  },
)

const resetForm = () => {
  Object.assign(form, {
    id: null,
    name: '',
    department_id: null,
    in_charge_user_id: null,
    coordinator_user_id: null,
    operational_admin_user_id: null,
    recommend_by_user_id: null,
    approved_by_user_id: null,
    change_note: '',
    type: props.approvalType,
  })
  Object.assign(selectedUsers, {
    in_charge_user_id: null,
    coordinator_user_id: null,
    operational_admin_user_id: null,
    recommend_by_user_id: null,
    approved_by_user_id: null,
  })
  selectedDepartment.value = null
  formErrors.name = ''
  formErrors.department_id = ''
  isEditMode.value = false
}

const syncSelectedDepartment = async () => {
  await nextTick()
  const deptId = form.department_id || props.leaveApproval?.department_id || null
  if (!deptId) {
    selectedDepartment.value = null
    return
  }

  const found = (departments.value || []).find((d) => d.id === deptId)
  selectedDepartment.value = found || props.leaveApproval?.department || null
}

watch(
  () => props.leaveApproval,
  async (newLeaveApproval) => {
    if (newLeaveApproval) {
      isEditMode.value = true

      // Mirrors PHP configFor(): type_configs keys override root, including explicit nulls.
      // Using ?? would treat null as "absent" and fall back to root, hiding cleared steps.
      const typeConfig = newLeaveApproval.type_configs?.[props.approvalType] ?? {}
      const effective = {
        in_charge_user_id:         newLeaveApproval.in_charge_user_id         ?? null,
        coordinator_user_id:       newLeaveApproval.coordinator_user_id       ?? null,
        operational_admin_user_id: newLeaveApproval.operational_admin_user_id ?? null,
        recommend_by_user_id:      newLeaveApproval.recommend_by_user_id      ?? null,
        approved_by_user_id:       newLeaveApproval.approved_by_user_id       ?? null,
        ...typeConfig,
      }

      Object.assign(form, {
        id: newLeaveApproval.id ?? null,
        name: newLeaveApproval.name ?? '',
        department_id: newLeaveApproval.department_id ?? newLeaveApproval.department?.id ?? null,
        in_charge_user_id:         effective.in_charge_user_id,
        coordinator_user_id:       effective.coordinator_user_id,
        operational_admin_user_id: effective.operational_admin_user_id,
        recommend_by_user_id:      effective.recommend_by_user_id,
        approved_by_user_id:       effective.approved_by_user_id,
        change_note: newLeaveApproval.change_note ?? '',
        type: newLeaveApproval.type ?? props.approvalType,
      })

      loadSelectedUsers()
      await syncSelectedDepartment()
    } else {
      resetForm()
    }
  },
  { immediate: true },
)

watch(
  () => selectedDepartment.value,
  (newDepartment) => {
    form.department_id = newDepartment?.id || null
    if (form.department_id) formErrors.department_id = ''
  },
)

watch(
  () => departments.value,
  async () => {
    if (props.leaveApproval) await syncSelectedDepartment()
  },
  { deep: true },
)

const handleSubmit = () => {
  formErrors.name = ''
  formErrors.department_id = ''

  if (!form.name?.trim()) {
    formErrors.name = 'Approval Name is required.'
  }

  if (!form.department_id) {
    formErrors.department_id = 'Department is required.'
  }

  if (formErrors.name || formErrors.department_id) {
    return
  }

  emit('save', { ...form, type: form.type || props.approvalType })
  closeModal()
}

watch(
  () => props.approvalType,
  (newType) => {
    if (!props.leaveApproval) {
      form.type = newType
    }
  },
)

const closeModal = () => {
  resetForm()
  emit('close')
}

onMounted(async () => {
  await Promise.all([userStore.fetchUsers(), departmentStore.fetchDepartments()])
  await syncSelectedDepartment()
})
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm"
  >
    <div class="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-md bg-white shadow-2xl ring-1 ring-slate-900/10">
      <div class="border-b border-slate-200 bg-white px-4 py-2.5">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div class="flex min-w-0 items-center gap-2.5">
            <span class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded bg-blue-600 text-white">
              <i class="fas fa-route text-xs"></i>
            </span>
            <div class="min-w-0">
              <h3 class="truncate text-sm font-bold leading-tight text-slate-950">
                {{ modalTitle }}
              </h3>
              <p class="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
                <span v-if="typeName" class="inline-flex items-center gap-1">
                  <i class="fas fa-layer-group text-blue-500"></i>{{ typeName }}
                </span>
                <span v-if="selectedDepartment" class="inline-flex items-center gap-1">
                  <i class="fas fa-building text-slate-400"></i>{{ selectedDepartment.name }}
                </span>
                <span class="inline-flex items-center gap-1">
                  <i class="fas fa-check-circle text-emerald-500"></i>{{ configuredStepCount }}/{{ columns.length }} configured
                </span>
              </p>
            </div>
          </div>

          <div class="w-full md:w-56">
            <div class="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>Workflow</span>
              <span class="text-blue-700">{{ completionPercent }}%</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                class="h-full rounded-full bg-blue-600 transition-all"
                :style="{ width: `${completionPercent}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="flex min-h-0 flex-1 flex-col">
        <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div class="space-y-3">
            <section class="rounded-md border border-slate-200 bg-white px-3 py-2">
              <div class="grid gap-2 md:grid-cols-[minmax(0,1.45fr)_minmax(270px,0.75fr)] md:items-end">
                <div class="min-w-0">
                  <div class="mb-1 flex items-center justify-between gap-2">
                    <label for="name" class="text-[11px] font-bold uppercase tracking-wide text-slate-500">Approval Name</label>
                    <span class="hidden text-[11px] font-medium text-slate-400 sm:inline">{{ form.id ? `Rule #${form.id}` : 'New rule' }}</span>
                  </div>
                  <input
                    id="name"
                    v-model.trim="form.name"
                    type="text"
                    class="h-9 w-full rounded border border-slate-300 bg-white px-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    :class="formErrors.name ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''"
                    placeholder="Enter approval name"
                    required
                  />
                  <p v-if="formErrors.name" class="mt-1 text-xs font-medium text-red-600">
                    {{ formErrors.name }}
                  </p>
                </div>

                <div class="min-w-0">
                  <div class="compact-department-picker">
                    <MultiselectDropdown
                      v-model="selectedDepartment"
                      :multiple="false"
                      label="name"
                      top-label=""
                      label-text="Department"
                      :options="departments"
                      placeholder="Choose department"
                      size="sm"
                    />
                  </div>
                  <p v-if="formErrors.department_id" class="mt-1 text-xs font-medium text-red-600">
                    {{ formErrors.department_id }}
                  </p>
                </div>
              </div>
            </section>

            <section class="overflow-visible rounded-md border border-slate-200 bg-white">
              <div class="grid grid-cols-[42px_170px_minmax(0,1fr)] border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <span>Step</span>
                <span>Role</span>
                <span>Approver</span>
              </div>

              <div class="hidden items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
                <h4 class="text-xs font-bold uppercase tracking-wide text-slate-600">Approval Matrix</h4>
                <span class="text-[11px] font-semibold text-slate-500">{{ columns.length }} steps</span>
              </div>

              <div class="divide-y divide-slate-100">
                <div
                  v-for="(col, index) in columns"
                  :key="col.field"
                  class="grid gap-2 px-3 py-2 transition hover:bg-blue-50/30 md:grid-cols-[42px_170px_minmax(0,1fr)] md:items-center"
                >
                  <div class="flex items-center gap-2">
                    <span
                      class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-bold"
                      :class="selectedUsers[col.field]
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'"
                    >
                      {{ index + 1 }}
                    </span>
                    <span
                      class="h-2 w-2 rounded-full md:hidden"
                      :class="selectedUsers[col.field] ? 'bg-emerald-500' : 'bg-slate-300'"
                    ></span>
                  </div>

                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-slate-800">{{ col.label }}</p>
                    <p
                      v-if="selectedUsers[col.field]"
                      class="truncate text-[11px] text-slate-400"
                    >
                      {{ userSubtitle(selectedUsers[col.field]) }}
                    </p>
                    <p v-else class="truncate text-[11px] text-slate-400">Not assigned</p>
                  </div>

                  <div class="min-w-0">
                    <div class="approver-picker">
                      <MultiselectDropdown
                        v-model="selectedUsers[col.field]"
                        :multiple="false"
                        label="name"
                        top-label=""
                        label-prefix="employee_id"
                        :options="userStore.users"
                        placeholder="Search and select employee"
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <label for="change_note" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Change Note
              </label>
              <textarea
                id="change_note"
                v-model.trim="form.change_note"
                rows="2"
                maxlength="1000"
                class="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Reason for creating or changing this rule"
              ></textarea>
            </section>
          </div>
        </div>

        <div class="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-xs text-slate-400">
            {{ typeName || form.type || 'Approval' }} | {{ selectedDepartment?.name || 'No department selected' }}
          </p>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-3" @click="closeModal">Cancel</button>
            <button type="submit" class="btn-2">
              <i class="fas fa-save text-xs"></i>
              {{ isEditMode ? 'Update Rule' : 'Create Rule' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.approver-picker :deep(.mb-2) {
  margin-bottom: 0;
}

.approver-picker :deep(.top-label) {
  display: none;
}

.approver-picker :deep(.smart-multi.multiselect) {
  min-height: 34px;
  border-radius: 6px;
}

.approver-picker :deep(.smart-multi .multiselect__tags) {
  min-height: 32px;
  padding-top: 4px;
}

.approver-picker :deep(.smart-multi .multiselect__content-wrapper) {
  z-index: 70;
}

.approver-picker :deep(.smart-multi .multiselect__single),
.approver-picker :deep(.smart-multi .multiselect__input) {
  margin-bottom: 0;
  min-height: 22px;
  font-size: 13px;
}

.compact-department-picker :deep(.mb-2) {
  margin-bottom: 4px;
}

.compact-department-picker :deep(.mb-2 p) {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.025em;
  line-height: 1;
  text-transform: uppercase;
}

.compact-department-picker :deep(.top-label) {
  display: none;
}

.compact-department-picker :deep(.smart-multi.multiselect) {
  min-height: 36px;
  border-radius: 4px;
}

.compact-department-picker :deep(.smart-multi .multiselect__tags) {
  min-height: 34px;
  padding-top: 5px;
}

.compact-department-picker :deep(.smart-multi .multiselect__single),
.compact-department-picker :deep(.smart-multi .multiselect__input) {
  margin-bottom: 0;
  min-height: 22px;
  font-size: 13px;
}
</style>
