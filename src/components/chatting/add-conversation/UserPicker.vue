<!-- add-conversation/UserPicker.vue -->
<script setup>
import UserAvatar from '@/components/UserAvatar.vue'
import { computed, onMounted, ref, watch } from 'vue'
import CompanyDepartmentFilter from './CompanyDepartmentFilter.vue'

import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  /** 'direct' | 'group' */
  mode: { type: String, required: true },

  /**
   * Optional external users (fallback হিসেবে থাকবে)।
   * না দিলে store থেকে users আসবে।
   */
  users: { type: Array, default: () => [] },

  /** v-model bindings */
  companyId: { type: [String, Number], default: '' },
  departmentId: { type: [String, Number], default: '' },
  selectedUserIds: { type: Array, default: () => [] },
  alreadyAddedUserIds: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:companyId', 'update:departmentId', 'update:selectedUserIds'])

/** ---- Stores ---- */
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const userStore = useUserStore()

/** ---- v-model proxies ---- */
const modelCompanyId = computed({
  get: () => props.companyId,
  set: (v) => emit('update:companyId', v),
})
const modelDepartmentId = computed({
  get: () => props.departmentId,
  set: (v) => emit('update:departmentId', v),
})
const modelSelectedUserIds = computed({
  get: () => props.selectedUserIds,
  set: (v) => emit('update:selectedUserIds', v),
})

/** ---- Lists ---- */
const companies = computed(() => companyStore.companies || [])
const departments = computed(() => departmentStore.departments || [])
const storeUsers = computed(() => userStore.users || [])
const rawUsers = computed(() => (props.users?.length ? props.users : storeUsers.value))

/** ---- Local search (client-side) ---- */
const q = ref('')

const filtered = computed(() => {
  if (!q.value.trim()) return rawUsers.value
  const s = q.value.trim().toLowerCase()
  return rawUsers.value.filter((user) => {
    const name = (user.name || '').toLowerCase()
    const employeeId = String(user.employee_id || '').toLowerCase()
    const phone = String(user.phone || '').toLowerCase()
    const email = String(user.email || '').toLowerCase()
    return name.includes(s) || employeeId.includes(s) || phone.includes(s) || email.includes(s)
  })
})

/** ---- Disabled: কোম্পানি সিলেক্ট না করলে লিস্ট দেখাবো না ---- */
const disabled = computed(() => !modelCompanyId.value)

/** ---- Helpers ---- */
function toggle(user) {
  let next = [...modelSelectedUserIds.value]
  const idx = next.indexOf(user.id)

  if (props.mode === 'direct') {
    // single-select: same user হলে deselect, না হলে replace
    next = idx >= 0 ? [] : [user.id]
  } else {
    if (idx >= 0) next.splice(idx, 1)
    else next.push(user.id)
  }
  modelSelectedUserIds.value = next
}

function getUserLabelById(userId) {
  const findUser = rawUsers.value?.find((u) => parseInt(u.id) == parseInt(userId))
  return findUser ? findUser.name || findUser.employee_id || findUser.id : ''
}

/** ---- Effects: company / department change হলে ফেচ ---- */
watch(
  () => modelCompanyId.value,
  async (val, oldVal) => {
    if (val === oldVal) return
    // reset
    modelDepartmentId.value = ''
    modelSelectedUserIds.value = []

    if (val) {
      await departmentStore.fetchDepartments(val)
    }
    // কোম্পানি সিলেক্ট করা হলে কোম্পানি-স্কোপড ইউজার লোড
    await userStore.fetchUsers({ company_id: val || null, department_id: null })
  },
)

watch(
  () => modelDepartmentId.value,
  async (dep, oldVal) => {
    if (dep === oldVal) return
    modelSelectedUserIds.value = []

    // কোম্পানি সিলেক্ট থাকা বাধ্যতামূলক
    if (modelCompanyId.value) {
      await userStore.fetchUsers({
        company_id: modelCompanyId.value,
        department_id: dep || null,
      })
    }
  },
)

/** ---- Init ---- */
onMounted(async () => {
  if (!companies.value.length && companyStore.fetchCompanies) {
    await companyStore.fetchCompanies()
  }

  // যদি parent থেকে already company/department দেওয়া থাকে
  if (modelCompanyId.value) {
    await departmentStore.fetchDepartments(modelCompanyId.value)
    await userStore.fetchUsers({
      company_id: modelCompanyId.value,
      department_id: modelDepartmentId.value || null,
    })
  }
})
</script>

<template>
  <!-- ✅ Filter এখন UserPicker-এর ভিতরে -->
  <CompanyDepartmentFilter
    v-model:company-id="modelCompanyId"
    v-model:department-id="modelDepartmentId"
    :companies="companies"
    :departments="departments"
  />

  <div class="grid gap-2">
    <!-- Chips (group mode) -->
    <div v-if="mode === 'group' && selectedUserIds.length" class="flex flex-wrap gap-2">
      <span
        v-for="uid in selectedUserIds"
        :key="uid"
        class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
      >
        <span class="font-medium">
          {{ getUserLabelById(uid) }}
        </span>
        <button
          type="button"
          class="text-red-600"
          @click="modelSelectedUserIds = selectedUserIds.filter((x) => x !== uid)"
        >
          ✕
        </button>
      </span>
    </div>

    <!-- Search + List -->
    <div>
      <div class="flex items-center gap-2">
        <input
          v-model="q"
          type="search"
          :disabled="disabled"
          class="flex-1 px-3 py-2 border rounded-lg rounded-b-none focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60"
          placeholder="Search by Name / Employee ID / Phone"
        />
      </div>

      <div class="max-h-72 overflow-y-auto rounded-lg rounded-t-none border">
        <div v-if="disabled" class="p-4 text-gray-500 text-center">Company নির্বাচন করুন।</div>

        <template v-else>
          <div v-if="!filtered.length" class="p-4 text-center text-gray-600">
            কোন ইউজার পাওয়া যায়নি।
          </div>

          <div v-else class="divide-y">
            <label
              v-for="user in filtered"
              :key="user.id"
              :for="`userId${user.id}`"
              class="flex items-center justify-between gap-3 p-3 hover:bg-gray-50"
            >
              <div class="w-full grow flex items-center gap-3">
                <div class="border rounded-full" :title="user.name">
                  <UserAvatar :user="user" size="medium" />
                </div>
                <div class="leading-tight">
                  <div class="font-medium text-sm md:text-base">
                    {{ user.name || 'User #' + (user.employee_id ?? user.id) }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ user.employee_id || user.phone || user.email || '' }}
                  </div>
                </div>
              </div>

              <div class="w-14 md:w-auto md:shrink-0 inline-flex justify-center items-center text-right">
                <span v-if="alreadyAddedUserIds.includes(user.id)" class="text-gray-500 text-xs text-center">
                  Already Added
                </span>
                <input
                  v-else
                  :id="`userId${user.id}`"
                  :type="mode === 'direct' ? 'radio' : 'checkbox'"
                  :name="mode === 'direct' ? 'direct-user' : 'group-users'"
                  :checked="selectedUserIds.includes(user.id)"
                  @change="toggle(user)"
                  class="size-5"
                />
              </div>
            </label>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
