<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useBloodDonorAdminStore } from '@/stores/bloodDonorAdmin'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import { useUserStore } from '@/stores/user'

const store = useBloodDonorAdminStore()
const userStore = useUserStore()

const {
  modalOpen,
  saving,
  formError,
  errors,
  selectedUser,
  histories,
  loadingHistories,
  historiesError,
  form,
} = storeToRefs(store)

/**
 * ✅ v-model requires writable ref (computed দিয়ে হবে না)
 * EmployeeFilter state local রাখি, select হলে store.openModalForUser() কল করবো
 */
const employeeFilters = ref({
  company_id: '',
  department_id: '',
  employee_id: '',
  line_type: 'all',
})

const userInfo = computed(() => selectedUser.value)

const closeModal = () => store.closeModal()

const onKeydown = (e) => {
  if (e.key === 'Escape') closeModal()
}

watch(
  modalOpen,
  (open) => {
    if (open) {
      window.addEventListener('keydown', onKeydown)

      // ✅ if modal opened from table row, sync EmployeeFilter employee_id
      if (selectedUser.value?.id) {
        employeeFilters.value.employee_id = String(selectedUser.value.id)
      }
    } else {
      window.removeEventListener('keydown', onKeydown)

      employeeFilters.value = {
        company_id: '',
        department_id: '',
        employee_id: '',
        line_type: 'all',
      }
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

watch(
  () => form.value.last_donation_date,
  (val) => store.setLastDonationDate(val)
)

watch(
  () => form.value.has_disease,
  (has) => {
    if (!has) form.value.disease_note = ''
  }
)

const fieldError = (field) => {
  const fieldErrors = errors.value?.[field]
  if (!fieldErrors) return ''
  if (Array.isArray(fieldErrors)) return fieldErrors[0] || ''
  return String(fieldErrors)
}

// ✅ badges for history list
const toBool = (v) => v === true || v === 1 || v === '1' || v === 'true'
const isAvailableRow = (row) => toBool(row?.is_available)

const availabilityBadge = (row) =>
  isAvailableRow(row)
    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
    : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'

const statusBadge = (status) => {
  if (status === 'active') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
  if (status === 'inactive') return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
  if (status === 'blocked') return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
  return 'bg-zinc-50 text-zinc-700 ring-1 ring-zinc-200'
}

const formatDate = (date) => {
  if (!date) return '—'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// employee change inside modal
const onEmployeePick = async (employeeId) => {
  if (!employeeId) return
  const data = await userStore.fetchUser(employeeId)
  const u = data || userStore.user
  if (!u?.id) return

  store.openModalForUser({
    id: u.id,
    name: u.name,
    phone: u.phone,
    blood_group: u.blood_group || u.blood,
    address: u.address,
    alternate_phone: u.alternate_phone,
  })
}
</script>

<template>
  <div v-if="modalOpen" class="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6 top-4">
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      @click="saving ? null : closeModal"
    ></div>

    <!-- Modal -->
    <div class="relative w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
      <!-- Header -->
      <div class="sticky top-0 z-20 flex items-start justify-between gap-3 border-b bg-white/90 px-6 py-4 backdrop-blur">
        <div class="space-y-0.5">
          <h3 class="text-base font-semibold text-zinc-900">Update Donor Profile</h3>
          <p class="text-xs text-zinc-500">Admin panel • update donor availability & donation entry</p>
        </div>

        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50"
          @click="closeModal"
          :disabled="saving"
          aria-label="Close"
          title="Close"
        >
          <i class="far fa-times"></i>
        </button>
      </div>

      <!-- Body -->
      <div class="max-h-[76vh] overflow-y-auto px-6 py-5">
        <!-- Global error -->
        <div
          v-if="formError"
          class="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {{ formError }}
        </div>

        <!-- Employee select -->
        <div class="mb-5 rounded-2xl border border-zinc-200 bg-white p-4">
          <div class="mb-2 flex items-start justify-between gap-3">
            <div>
              <h4 class="text-sm font-semibold text-zinc-900">Select employee</h4>
              <p class="text-xs text-zinc-500">Choose who you want to update</p>
            </div>

            <span
              v-if="userInfo?.blood_group"
              class="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700"
            >
              Blood: <b class="font-semibold">{{ userInfo.blood_group }}</b>
            </span>
          </div>

          <EmployeeFilter
            v-model:company_id="employeeFilters.company_id"
            v-model:department_id="employeeFilters.department_id"
            v-model:employee_id="employeeFilters.employee_id"
            v-model:line_type="employeeFilters.line_type"
            :with-type="true"
            :initial-value="employeeFilters"
            class="w-full"
            @update:employee_id="onEmployeePick"
          />
        </div>

        <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <!-- LEFT: user info + history (read only) -->
          <div class="lg:col-span-4 space-y-5">
            <!-- user card -->
            <div class="rounded-2xl border border-zinc-200 bg-white p-4">
              <div class="mb-3">
                <h4 class="text-sm font-semibold text-zinc-900">User info</h4>
              </div>

              <div v-if="userInfo" class="space-y-2 text-sm">
                <div class="flex justify-between gap-3">
                  <span class="text-zinc-500">Name</span>
                  <span class="font-medium text-zinc-900 text-right">{{ userInfo.name || 'N/A' }}</span>
                </div>
                <div class="flex justify-between gap-3">
                  <span class="text-zinc-500">Phone</span>
                  <span class="font-medium text-zinc-900">{{ userInfo.phone || 'N/A' }}</span>
                </div>
                <div class="flex justify-between gap-3">
                  <span class="text-zinc-500">Address</span>
                  <span class="font-medium text-zinc-900 text-right">{{ userInfo.address || 'N/A' }}</span>
                </div>
              </div>

              <div v-else class="text-sm text-zinc-500">Select an employee to view details.</div>
            </div>

            <!-- histories (read only) -->
            <div class="rounded-2xl border border-zinc-200 bg-white p-4">
              <div class="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h4 class="text-sm font-semibold text-zinc-900">Donation history</h4>
                </div>
                <span v-if="histories?.length" class="text-xs text-zinc-500">{{ histories.length }} items</span>
              </div>

              <div
                v-if="historiesError"
                class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700"
              >
                {{ historiesError }}
              </div>

              <div v-else-if="loadingHistories" class="space-y-2">
                <div class="h-10 w-full animate-pulse rounded-xl bg-zinc-100"></div>
                <div class="h-10 w-full animate-pulse rounded-xl bg-zinc-100"></div>
                <div class="h-10 w-full animate-pulse rounded-xl bg-zinc-100"></div>
              </div>

              <div
                v-else-if="!histories?.length"
                class="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-600"
              >
                No donation history yet.
                <div class="mt-1 text-xs text-zinc-500">Create an entry from the form to the right.</div>
              </div>

              <div v-else class="max-h-[320px] overflow-auto pr-1 space-y-2">
                <div
                  v-for="row in histories"
                  :key="row.id"
                  class="rounded-xl border border-zinc-200 p-3 hover:bg-zinc-50 transition"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="text-sm font-semibold text-zinc-900">
                        {{ formatDate(row.last_donation_date) }}
                      </div>
                      <div class="mt-0.5 text-xs text-zinc-500">
                        Available from: {{ formatDate(row.available_from) }}
                      </div>

                      <div v-if="row.availability_note" class="mt-1 line-clamp-2 text-xs text-zinc-600">
                        {{ row.availability_note }}
                      </div>
                    </div>

                    <div class="flex flex-col items-end gap-1 shrink-0">
                      <span :class="['rounded-full px-2 py-0.5 text-[11px] font-semibold', availabilityBadge(row)]">
                        {{ isAvailableRow(row) ? 'Available' : 'Not available' }}
                      </span>
                      <span :class="['rounded-full px-2 py-0.5 text-[11px] font-semibold', statusBadge(row.status)]">
                        {{ row.status || 'N/A' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT: form -->
          <div class="lg:col-span-8 space-y-5">
            <!-- Availability -->
            <div class="rounded-2xl border border-zinc-200 bg-white p-4">
              <div class="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h4 class="text-sm font-semibold text-zinc-900">Availability</h4>
                </div>
                <span v-if="form.user_id" class="text-xs text-zinc-500">User ID: {{ form.user_id }}</span>
              </div>

              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div class="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <div>
                    <div class="text-sm font-medium text-zinc-800">Available for donation</div>
                    <div class="text-xs text-zinc-500">Visible to seekers</div>
                  </div>
                  <input v-model="form.is_available" type="checkbox" class="h-5 w-5" :disabled="saving" />
                </div>

                <div class="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <div>
                    <div class="text-sm font-medium text-zinc-800">Has disease</div>
                    <div class="text-xs text-zinc-500">Optional disclosure</div>
                  </div>
                  <input v-model="form.has_disease" type="checkbox" class="h-5 w-5" :disabled="saving" />
                </div>

                <div class="space-y-1">
                  <label class="text-xs font-medium text-zinc-600">Last donation date *</label>
                  <input
                    v-model="form.last_donation_date"
                    type="date"
                    class="input-1 h-10 w-full text-sm"
                    :disabled="saving"
                  />
                  <div v-if="fieldError('last_donation_date')" class="text-xs text-rose-600">
                    {{ fieldError('last_donation_date') }}
                  </div>
                </div>

                <div class="space-y-1">
                  <label class="text-xs font-medium text-zinc-600">Available from</label>
                  <input
                    v-model="form.available_from"
                    type="date"
                    class="input-1 h-10 w-full text-sm bg-zinc-100"
                    readonly
                    :disabled="saving"
                  />
                </div>

                <div class="space-y-1 md:col-span-2">
                  <label class="text-xs font-medium text-zinc-600">Availability note</label>
                  <input v-model.trim="form.availability_note" class="input-1 h-10 w-full text-sm" :disabled="saving" />
                </div>

                <div v-if="form.has_disease" class="space-y-1 md:col-span-2">
                  <label class="text-xs font-medium text-zinc-600">Disease note</label>
                  <textarea
                    v-model.trim="form.disease_note"
                    class="input-1 min-h-[90px] w-full text-sm"
                    :disabled="saving"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- Status & Notes -->
            <div class="rounded-2xl border border-zinc-200 bg-white p-4">
              <div class="mb-3">
                <h4 class="text-sm font-semibold text-zinc-900">Status & notes</h4>
                <p class="text-xs text-zinc-500">Visibility + internal remark</p>
              </div>

              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div class="space-y-1">
                  <label class="text-xs font-medium text-zinc-600">Status</label>
                  <select v-model="form.status" class="input-1 h-10 w-full text-sm" :disabled="saving">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>

                <div class="space-y-1 md:col-span-2">
                  <label class="text-xs font-medium text-zinc-600">Notes</label>
                  <textarea v-model.trim="form.notes" class="input-1 min-h-[110px] w-full text-sm" :disabled="saving"></textarea>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="sticky bottom-0 z-20 flex items-center justify-between border-t bg-zinc-50 px-6 py-3">
        <div class="text-xs text-zinc-500">
          Press <span class="rounded bg-white px-1.5 py-0.5 ring-1 ring-zinc-200">Esc</span> to close
        </div>

        <div class="flex items-center gap-2">
          <button type="button" class="btn-3" @click="closeModal" :disabled="saving">Cancel</button>
          <button
            type="button"
            class="btn-1"
            :disabled="saving || !form.user_id || !form.last_donation_date"
            @click="store.saveHistory()"
          >
            <span v-if="saving">Saving...</span>
            <span v-else>Save</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
