<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import TextEditor from '@/components/TextEditor.vue'

import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useNoticeStore } from '@/stores/notice'
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const toast = useToast()
const router = useRouter()
const route = useRoute()

const isLoading = ref(false)
const saving = ref(false)
const initializing = ref(true) // ⬅️ in-flight guard for first load

const noticeStore = useNoticeStore()
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()

const { companies } = storeToRefs(companyStore)
const { employees } = storeToRefs(departmentStore) // ref([])

// Local, derived refs for safety in template
const departmentsList = computed(() => departmentStore.departments || [])
const employeesList = computed(() => Array.isArray(employees.value) ? employees.value : [])
const companiesList = computed(() => companies.value || [])

const form = reactive({
  title: '',
  type: 1, // 1=General, 2=Policy
  description: '',
  published_at: '',
  expired_at: '',
  all_companies: false,
  all_departments: false,
  all_employees: false,
  file_url: null,
})

// Multi-select states
const selectedCompanies = ref([])
const selectedDepartments = ref([])
const selectedEmployees = ref([])

// Upload states
const selectedFile = ref(null) // Blob|null
const uploadPct = ref(0)
const isUploading = ref(false)
const showConfirm = ref(false)
let abortController = null

const fileName = computed(() => selectedFile.value?.name || '')
const fileSizeMB = computed(() =>
  selectedFile.value ? (selectedFile.value.size / (1024 * 1024)).toFixed(2) : '0.00'
)

// IDs computed
const company_ids = computed(() => selectedCompanies.value.map(c => c.id))
const department_ids = computed(() => selectedDepartments.value.map(d => d.id))
const employee_ids = computed(() => selectedEmployees.value.map(e => e.id))

/* ---------- Helpers ---------- */
const justDate = (value) => {
  if (!value) return ''
  const part = String(value).split(' ')[0]
  return part.includes('-') ? part : ''
}

const shortChips = (items, labelKey = 'name', limit = 3) => {
  const arr = Array.isArray(items) ? items : []
  const head = arr.slice(0, limit).map(x => x?.[labelKey] ?? '—')
  const more = Math.max(0, arr.length - limit)
  return { head, more }
}

const validDateRange = computed(() => {
  if (form.type === 2) return true // Policy: dates hidden/ignored
  if (!form.published_at || !form.expired_at) return true
  try {
    const p = new Date(form.published_at)
    const e = new Date(form.expired_at)
    return e >= p
  } catch {
    return true
  }
})

const canSave = computed(() =>
  !!form.title &&
  !isUploading.value &&
  validDateRange.value
)

/* ---------- Mode segmented toggles ---------- */
const modeCompanies = computed({
  get: () => (form.all_companies ? 'all' : 'custom'),
  set: (v) => {
    form.all_companies = (v === 'all')
    selectedCompanies.value = form.all_companies ? [...companiesList.value] : []
  }
})
const modeDepartments = computed({
  get: () => (form.all_departments ? 'all' : 'custom'),
  set: (v) => {
    form.all_departments = (v === 'all')
    selectedDepartments.value = form.all_departments ? [...departmentsList.value] : []
  }
})
const modeEmployees = computed({
  get: () => (form.all_employees ? 'all' : 'custom'),
  set: (v) => {
    form.all_employees = (v === 'all')
    selectedEmployees.value = form.all_employees ? [...employeesList.value] : []
  }
})

/* ---------- Dependent Loading (guarded by `initializing`) ---------- */
// Companies → Departments
watch(() => form.all_companies, async (all) => {
  if (initializing.value) return
  if (all) await departmentStore.fetchDepartments()
})
watch(company_ids, async (ids) => {
  if (initializing.value) return
  if (!form.all_companies) await departmentStore.fetchDepartments(ids)
})

// Departments → Employees
watch(() => form.all_departments, async (all) => {
  if (initializing.value) return
  if (all) await departmentStore.fetchDepartmentEmployee('all')
})
watch(department_ids, async (ids) => {
  if (initializing.value) return
  if (!form.all_departments) await departmentStore.fetchDepartmentEmployee(ids)
})

// Keep “Select All Employees” in sync with list size
watch([selectedEmployees, employees], ([sel, all]) => {
  if (initializing.value) return
  const total = Array.isArray(all) ? all.length : 0
  form.all_employees = total > 0 && sel.length === total
})

/* ---------- Load one notice (handles empty arrays as ALL) ---------- */
const loadNotice = async () => {
  const id = route.params.id
  try {
    const n = await noticeStore.fetchNotice(id)

    // ---------- Basic fields ----------
    form.title        = n.title ?? ''
    form.type         = Number(n.type ?? 1)
    form.published_at = justDate(n.published_at)
    form.expired_at   = justDate(n.expired_at)
    form.description  = n.description ?? ''
    form.file_url     = n.file_url || n.file || null

    // ---------- STEP 1: Companies ----------
    const hasCompanies = (n.companies_notice?.length ?? 0) > 0
    form.all_companies = !hasCompanies

    // ensure companies list is present
    if (companiesList.value.length === 0) {
      await companyStore.fetchCompanies()
    }

    selectedCompanies.value = hasCompanies
      ? n.companies_notice
      : [...companiesList.value] // all companies

    // Departments depend on companies
    if (form.all_companies) {
      await departmentStore.fetchDepartments() // all companies
    } else {
      await departmentStore.fetchDepartments(company_ids.value) // scoped
    }

    // ---------- STEP 2: Departments ----------
    const hasDepartments = (n.departments?.length ?? 0) > 0
    form.all_departments = !hasDepartments

    selectedDepartments.value = hasDepartments
      ? n.departments
      : [...departmentsList.value] // all depts for chosen companies

    // Employees depend on departments
    if (form.all_departments) {
      await departmentStore.fetchDepartmentEmployee('all')
    } else {
      await departmentStore.fetchDepartmentEmployee(department_ids.value)
    }

    // ---------- STEP 3: Employees ----------
    const hasEmployees = (n.employees?.length ?? 0) > 0
    form.all_employees = !hasEmployees

    selectedEmployees.value = hasEmployees
      ? n.employees
      : [...employeesList.value] // all employees for selected depts
  } catch (error) {
    const msg = error?.response?.data?.message || 'Failed to load notice data'
    toast.error(msg)
    router.push({ name: 'NoticeList' })
  }
}

/* ---------- File Upload (confirm + progress + cancel) ---------- */
const onPickFile = (e) => {
  const f = e?.target?.files?.[0]
  if (!f) return
  // basic guard
  const ok = [
    'image/jpeg','image/jpg','image/png',
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  if (!ok.includes(f.type)) {
    toast.error('Unsupported file type. Allowed: jpg, jpeg, png, pdf, doc, docx.')
    return
  }
  if (f.size > 2 * 1024 * 1024) {
    toast.error('File size must be ≤ 2MB.')
    return
  }
  selectedFile.value = f
  showConfirm.value = true
}

const startUpload = async () => {
  try {
    const id = route.params.id
    if (!(selectedFile.value instanceof Blob)) return

    uploadPct.value = 0
    isUploading.value = true
    abortController = new AbortController()

    const notice = await noticeStore.updateNoticeFile(
      id,
      selectedFile.value,
      {
        onProgress: (pct) => (uploadPct.value = pct),
        signal: abortController.signal,
      }
    )

    form.file_url = notice?.file_url || notice?.file || form.file_url
    toast.success('File uploaded successfully.')
  } catch (err) {
    if (err?.name === 'CanceledError' || err?.message === 'canceled') {
      toast.info('Upload canceled.')
    } else {
      const msg = err?.response?.data?.message || err?.message || 'Upload failed.'
      toast.error(msg)
    }
  } finally {
    isUploading.value = false
    showConfirm.value = false
    selectedFile.value = null
    abortController = null
  }
}

const cancelUpload = () => {
  if (abortController) abortController.abort()
}

/* ---------- Update (JSON only) ---------- */
const updateNotice = async () => {
  if (!validDateRange.value) {
    toast.error('Expire date must be the same or after Publish date.')
    return
  }
  try {
    saving.value = true
    const id = route.params.id

    const payload = {
      title: form.title,
      type: form.type,
      description: form.description,
      published_at: form.type === 2 ? null : (form.published_at || null),
      expired_at: form.type === 2 ? null : (form.expired_at || null),

      all_companies: !!form.all_companies,
      all_departments: !!form.all_departments,
      all_employees: !!form.all_employees,

      company_ids: company_ids.value,
      department_ids: department_ids.value,
      employee_ids: employee_ids.value,
    }

    await noticeStore.updateNotice(id, payload)
    toast.success('Notice updated successfully')
    router.push({ name: 'NoticeShow', params: { id } })
  } catch (error) {
    const msg = error?.response?.data?.message || error?.message || 'Failed to update notice'
    toast.error(msg)
  } finally {
    saving.value = false
  }
}

/* ---------- Bootstrap ---------- */
onMounted(async () => {
  isLoading.value = true
  await companyStore.fetchCompanies() // companies আগে আনাই ভালো
  await loadNotice()
  isLoading.value = false
  initializing.value = false // now watchers can react to user changes
})

/* ---------- Summary counts ---------- */
const totalCompanies = computed(() => companiesList.value.length)
const totalDepartments = computed(() => departmentsList.value.length)
const totalEmployees = computed(() => employeesList.value.length)
</script>

<template>
  <div class="my-container space-y-4">
    <div class="card-bg md:p-8 p-4 mx-4">
      <h2 class="title-lg text-center">Edit Notice</h2>

      <LoaderView v-if="isLoading" class="bg-gray-100 border shadow-none" />

      <form v-else @submit.prevent="updateNotice" class="space-y-5">
        <!-- Summary Bar -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="rounded-xl border bg-white p-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <svg viewBox="0 0 24 24" class="h-5 w-5 text-blue-600"><path fill="currentColor" d="M3 10v10h18V10H3zm9-7l9 7H3l9-7z"/></svg>
              </span>
              <div>
                <div class="text-sm text-gray-500">Companies</div>
                <div class="font-semibold">
                  {{ form.all_companies ? 'All' : selectedCompanies.length }} / {{ totalCompanies }}
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-xl border bg-white p-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                <svg viewBox="0 0 24 24" class="h-5 w-5 text-purple-600"><path fill="currentColor" d="M3 5h18v2H3V5zm3 4h12v10H6V9z"/></svg>
              </span>
              <div>
                <div class="text-sm text-gray-500">Departments</div>
                <div class="font-semibold">
                  {{ form.all_departments ? 'All' : selectedDepartments.length }} / {{ totalDepartments }}
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-xl border bg-white p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                  <svg viewBox="0 0 24 24" class="h-5 w-5 text-emerald-600"><path fill="currentColor" d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z"/></svg>
                </span>
                <div>
                  <div class="text-sm text-gray-500">Employees</div>
                  <div class="font-semibold">
                    {{ form.all_employees ? 'All' : selectedEmployees.length }} / {{ totalEmployees }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Notice Info -->
        <div class="border p-4 rounded-xl bg-white space-y-6 shadow-sm">
          <h2 class="text-lg font-semibold">Notice Information</h2>

          <!-- Type -->
          <div class="grid md:grid-cols-3 gap-4">
            <div class="w-full">
              <label for="type" class="font-medium block mb-1">Type*</label>
              <div class="inline-flex rounded-lg border overflow-hidden">
                <button
                  type="button"
                  class="px-4 py-2 text-sm"
                  :class="form.type === 1 ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'"
                  @click="form.type = 1"
                >
                  General
                </button>
                <button
                  type="button"
                  class="px-4 py-2 text-sm border-l"
                  :class="form.type === 2 ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'"
                  @click="form.type = 2"
                >
                  Policy
                </button>
              </div>
            </div>

            <div class="w-full">
              <label class="font-medium block mb-1">Publish Date</label>
              <input v-model="form.published_at" type="date" class="w-full p-2 border rounded" />
            </div>

            <div class="w-full">
              <label class="font-medium block mb-1">Expire Date</label>
              <input v-model="form.expired_at" type="date" class="w-full p-2 border rounded" />
              <p v-if="!validDateRange" class="text-xs text-red-600 mt-1">
                Expire date must be the same or after Publish date.
              </p>
            </div>
          </div>

          <!-- Companies -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="font-medium">Companies</label>
              <div class="inline-flex rounded-lg border overflow-hidden">
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs"
                  :class="modeCompanies==='all' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'"
                  @click="modeCompanies = 'all'"
                >All</button>
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs border-l"
                  :class="modeCompanies==='custom' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'"
                  @click="modeCompanies = 'custom'"
                >Custom</button>
              </div>
            </div>
            <div>
              <MultiselectDropdown
                v-model="selectedCompanies"
                :options="companiesList"
                :multiple="true"
                :searchable="true"
                placeholder="Select companies"
                track-by="id"
                label="name"
              />
            </div>
          </div>

          <!-- Departments & Employees -->
          <div class="grid md:grid-cols-2 gap-6">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <label class="font-medium">Departments</label>
                <div class="inline-flex rounded-lg border overflow-hidden">
                  <button
                    type="button"
                    class="px-3 py-1.5 text-xs"
                    :class="modeDepartments==='all' ? 'bg-purple-600 text-white' : 'bg-white hover:bg-gray-50'"
                    @click="modeDepartments = 'all'"
                  >All</button>
                  <button
                    type="button"
                    class="px-3 py-1.5 text-xs border-l"
                    :class="modeDepartments==='custom' ? 'bg-purple-600 text-white' : 'bg-white hover:bg-gray-50'"
                    @click="modeDepartments = 'custom'"
                  >Custom</button>
                </div>
              </div>
              <MultiselectDropdown
                v-model="selectedDepartments"
                :options="departmentsList"
                :multiple="true"
                :searchable="true"
                placeholder="Select departments"
                track-by="id"
                label="name"
              />
            </div>

            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <label class="font-medium">Employees</label>
                <div class="inline-flex items-center gap-3">
                  <span class="text-xs text-gray-500">
                    Selected {{ selectedEmployees.length }} / {{ totalEmployees }}
                  </span>
                  <div class="inline-flex rounded-lg border overflow-hidden">
                    <button
                      type="button"
                      class="px-3 py-1.5 text-xs"
                      :class="modeEmployees==='all' ? 'bg-emerald-600 text-white' : 'bg-white hover:bg-gray-50'"
                      @click="modeEmployees = 'all'"
                    >All</button>
                    <button
                      type="button"
                      class="px-3 py-1.5 text-xs border-l"
                      :class="modeEmployees==='custom' ? 'bg-emerald-600 text-white' : 'bg-white hover:bg-gray-50'"
                      @click="modeEmployees = 'custom'"
                    >Custom</button>
                  </div>
                </div>
              </div>
              <MultiselectDropdown
                v-model="selectedEmployees"
                :options="employeesList"
                :multiple="true"
                :searchable="true"
                placeholder="Select employee"
                track-by="id"
                label="name"
              />
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="border p-4 rounded-xl bg-white space-y-6 shadow-sm">
          <h2 class="text-lg font-semibold">Notice Content</h2>

          <div>
            <label class="font-medium block mb-1">Title*</label>
            <input v-model="form.title" type="text" class="w-full p-2 border rounded" required />
          </div>

          <!-- File -->
          <div class="space-y-2">
            <label class="font-medium block mb-1">Attachment</label>

            <!-- Existing file -->
            <div v-if="form.file_url" class="mb-2">
              <a :href="form.file_url" target="_blank" class="inline-flex items-center gap-2 text-blue-600 underline">
                <svg viewBox="0 0 24 24" class="h-4 w-4"><path fill="currentColor" d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path fill="currentColor" d="M14 3v6h6"/></svg>
                View Current File
              </a>
            </div>

            <!-- Browse (drag-like) -->
            <div
              class="w-full rounded-lg border border-dashed p-4 hover:bg-gray-50 transition"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="text-sm text-gray-600">
                  <div class="font-medium">Upload new file</div>
                  <div>JPG, JPEG, PNG, PDF, DOC, DOCX (≤ 2MB)</div>
                </div>
                <label class="inline-flex items-center">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                    @change="onPickFile"
                    class="hidden"
                    :disabled="isUploading"
                  />
                  <span class="px-4 py-2 rounded border bg-white hover:bg-gray-50 cursor-pointer">
                    Browse…
                  </span>
                </label>
              </div>

              <!-- progress -->
              <div v-if="isUploading" class="mt-3">
                <div class="h-2 bg-gray-200 rounded overflow-hidden">
                  <div class="h-2 bg-blue-600 transition-all" :style="{ width: uploadPct + '%' }"></div>
                </div>
                <div class="flex items-center justify-between mt-1 text-xs text-gray-600">
                  <span>{{ uploadPct }}%</span>
                  <button
                    type="button"
                    class="px-3 py-1 rounded border hover:bg-gray-50"
                    @click="cancelUpload"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label class="font-medium block mb-1">Description</label>
            <TextEditor v-model="form.description" class="w-full px-4 py-2" />
          </div>
        </div>

        <!-- Action bar -->
        <div class="sticky bottom-0 bg-white/90 backdrop-blur flex justify-center gap-4 p-3 rounded-xl border">
          <RouterLink
            :to="{ name: 'NoticeList' }"
            type="button"
            class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Cancel
          </RouterLink>
          <button
            :disabled="saving || isUploading || !canSave"
            type="submit"
            class="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
          >
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Confirm Modal -->
    <div v-if="showConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 class="text-lg font-semibold">Upload this file?</h3>
        <p class="text-sm text-gray-600 break-words">
          <span class="font-medium">Name:</span> {{ fileName }}<br />
          <span class="font-medium">Size:</span> {{ fileSizeMB }} MB
        </p>
        <div class="flex justify-end gap-3">
          <button
            class="px-4 py-2 rounded border hover:bg-gray-50"
            @click="showConfirm = false; selectedFile = null"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            @click="startUpload"
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
