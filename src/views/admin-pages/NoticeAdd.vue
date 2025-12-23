<script setup>
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import TextEditor from '@/components/TextEditor.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useNoticeStore } from '@/stores/notice'
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const toast = useToast()
const router = useRouter()
const noticeStore = useNoticeStore()
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const { companies } = storeToRefs(companyStore)

/* ---------- form ---------- */
const form = reactive({
  title: '',
  type: 1, // 1=General, 2=Policy
  description: '',
  published_at: '',
  expired_at: '',
  all_companies: false,
  all_departments: false,
  all_employees: false,
  file: null,
  receiver_type: ['executive'], // doctor | executive | support_staff | academic_body
})

/* receiver type options */
const receiverTypeOptions = [
  { value: 'doctor', label: 'Doctor' },
  { value: 'executive', label: 'Executive' },
  { value: 'support_staff', label: 'Support Staff' },
  { value: 'academic_body', label: 'Academic Body' },
]
const receiverTypeList = computed(() => {
  const list = Array.isArray(form.receiver_type)
    ? form.receiver_type
    : (form.receiver_type ? [form.receiver_type] : [])
  return list.filter(Boolean)
})
const toggleReceiverType = (value) => {
  if (!value) return
  if (!Array.isArray(form.receiver_type)) {
    form.receiver_type = []
  }
  const idx = form.receiver_type.indexOf(value)
  if (idx >= 0) {
    form.receiver_type.splice(idx, 1)
  } else {
    form.receiver_type.push(value)
  }
}
const selectAllReceiverTypes = () => {
  form.receiver_type = receiverTypeOptions.map(opt => opt.value)
}
const clearReceiverTypes = () => {
  form.receiver_type = []
}

/* ---------- selections ---------- */
const selectedCompanies = ref([])
const selectedDepartments = ref([])
const selectedEmployees = ref([])

const companiesList = computed(() => companies.value || [])
const departmentsList = computed(() => departmentStore.departments || [])
const employeesList = computed(() => departmentStore.employees || [])

const company_ids = computed(() => selectedCompanies.value.map(c => c.id))
const department_ids = computed(() => selectedDepartments.value.map(d => d.id))
const employee_ids = computed(() => selectedEmployees.value.map(e => e.id))

/* ---------- ui state ---------- */
const saving = ref(false)
const errors = reactive({})
const pad = (value) => String(value).padStart(2, '0')

const buildPeriod = (value) => {
  if (!value) return null
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return null
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  }
}

const fromPeriod = (period) => {
  if (!period) return ''
  return `${period.year}-${pad(period.month)}-${pad(period.day)}`
}

const getTodayPeriod = () => {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  }
}

const defaultPublishDate = fromPeriod(getTodayPeriod())
form.published_at = defaultPublishDate

const publishPeriod = ref(buildPeriod(form.published_at))
const expirePeriod = ref(buildPeriod(form.expired_at))
const resetPeriodsForPolicy = () => {
  publishPeriod.value = null
  expirePeriod.value = null
  form.published_at = ''
  form.expired_at = ''
}

const isPolicyNotice = computed(() => form.type === 2)

/* ---------- mode (All|Custom) segmented ---------- */
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

/* ---------- lifecycle ---------- */
onMounted(async () => {
  await companyStore.fetchCompanies()
})

/* ---------- dependent loading ---------- */
watch(() => form.all_companies, async (all) => {
  if (all) {
    await departmentStore.fetchDepartments()
  } else {
    await departmentStore.fetchDepartments(company_ids.value)
  }
  departmentStore.employees = []
  selectedEmployees.value = []
})

watch(company_ids, async (ids) => {
  if (!form.all_companies) {
    await departmentStore.fetchDepartments(ids)
    departmentStore.employees = []
    selectedEmployees.value = []
  }
})

watch(
  () => form.type,
  (val, oldVal) => {
    if (val === 2) {
      resetPeriodsForPolicy()
    } else if (oldVal === 2 && val === 1) {
      if (!publishPeriod.value) {
        publishPeriod.value = getTodayPeriod()
        form.published_at = fromPeriod(publishPeriod.value)
      }
    }
  }
)

/* ---------- Departments -> Employees (depends on receiver_type) ---------- */
const effectiveDepartmentIds = computed(() => {
  return form.all_departments
    ? (departmentsList.value || []).map(d => d.id)
    : department_ids.value
})

watch(
  [effectiveDepartmentIds, receiverTypeList],
  async ([ids, receiverTypes]) => {
    const selectedTypes = Array.isArray(receiverTypes) ? receiverTypes : []
    if (!selectedTypes.length) {
      departmentStore.employees = []
      selectedEmployees.value = []
      return
    }

    if (Array.isArray(ids) && ids.length > 0) {
      selectedEmployees.value = []
      let mergedEmployees = []
      for (const type of selectedTypes) {
        const list = await departmentStore.fetchDepartmentActiveEmployee(ids, type)
        if (Array.isArray(list)) {
          list.forEach(emp => {
            if (!mergedEmployees.some(existing => existing?.id === emp?.id)) {
              mergedEmployees.push(emp)
            }
          })
        }
      }
      departmentStore.employees = mergedEmployees
      if (form.all_employees && Array.isArray(mergedEmployees)) {
        selectedEmployees.value = [...mergedEmployees]
      }
    } else {
      departmentStore.employees = []
      selectedEmployees.value = []
    }
  },
  { immediate: true }
)

watch(publishPeriod, (value) => {
  if (!value) return
  const normalized = fromPeriod(value)
  if (form.published_at !== normalized) {
    form.published_at = normalized
  }
})

watch(expirePeriod, (value) => {
  if (!value) return
  const normalized = fromPeriod(value)
  if (form.expired_at !== normalized) {
    form.expired_at = normalized
  }
})

watch(
  () => form.published_at,
  (value) => {
    if (!value) {
      publishPeriod.value = null
      return
    }
    const parsed = buildPeriod(value)
    if (!parsed) return
    if (
      !publishPeriod.value ||
      publishPeriod.value.year !== parsed.year ||
      publishPeriod.value.month !== parsed.month ||
      publishPeriod.value.day !== parsed.day
    ) {
      publishPeriod.value = parsed
    }
  }
)

watch(
  () => form.expired_at,
  (value) => {
    if (!value) {
      expirePeriod.value = null
      return
    }
    const parsed = buildPeriod(value)
    if (!parsed) return
    if (
      !expirePeriod.value ||
      expirePeriod.value.year !== parsed.year ||
      expirePeriod.value.month !== parsed.month ||
      expirePeriod.value.day !== parsed.day
    ) {
      expirePeriod.value = parsed
    }
  }
)

/* ---------- keep all_* in sync ---------- */
watch(departmentsList, (list) => {
  if (form.all_departments) {
    selectedDepartments.value = [...list]
  }
})
watch(employeesList, (list) => {
  if (form.all_employees) {
    selectedEmployees.value = [...list]
  }
})

watch(selectedCompanies, list => {
  form.all_companies =
    list.length === companiesList.value.length && list.length > 0
})
watch(selectedDepartments, list => {
  form.all_departments =
    list.length === departmentsList.value.length && list.length > 0
})
watch([selectedEmployees, employeesList], ([sel, all]) => {
  const total = Array.isArray(all) ? all.length : 0
  form.all_employees = total > 0 && sel.length === total
})

/* ---------- file drop/browse ---------- */
const dropActive = ref(false)

const onFilePick = (e) => {
  const f = e?.target?.files?.[0]
  handleFile(f)
}
const onDrop = (e) => {
  e.preventDefault()
  dropActive.value = false
  const f = e.dataTransfer?.files?.[0]
  handleFile(f)
}
const onDragOver = (e) => { e.preventDefault(); dropActive.value = true }
const onDragLeave = () => { dropActive.value = false }

const handleFile = (f) => {
  if (!f) { form.file = null; return }
  const ok = [
    'image/jpeg','image/jpg','image/png',
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  if (!ok.includes(f.type)) {
    toast.error('Unsupported file type. Allowed: jpg, jpeg, png, pdf, doc, docx.')
    form.file = null
    return
  }
  if (f.size > 2 * 1024 * 1024) {
    toast.error('File size must be max 2MB.')
    form.file = null
    return
  }
  form.file = f
}
const clearFile = () => { form.file = null }

/* ---------- helpers ---------- */
const shortChips = (items, labelKey = 'name', limit = 3) => {
  const arr = Array.isArray(items) ? items : []
  const head = arr.slice(0, limit).map(x => x?.[labelKey] ?? 'N/A')
  const more = Math.max(0, arr.length - limit)
  return { head, more }
}

/* ---------- validation ---------- */
const validDateRange = computed(() => {
  if (form.type === 2) return true
  if (!form.published_at || !form.expired_at) return true
  try {
    return new Date(form.expired_at) >= new Date(form.published_at)
  } catch {
    return true
  }
})

const validate = () => {
  Object.keys(errors).forEach(k => delete errors[k])

  if (!form.title?.trim()) errors.title = 'Title is required'
  if (form.type !== 2 && !form.published_at) {
    errors.published_at = 'Publish date is required'
  }
  if (!validDateRange.value) {
    errors.expired_at = 'Expired date must be on/after publish date'
  }

  if (!receiverTypeList.value.length) {
    errors.receiver_type = 'Receiver type is required'
  }

  return Object.keys(errors).length === 0
}

const canSave = computed(() =>
  !saving.value &&
  (!!form.title?.trim()) &&
  (form.type === 2 || !!form.published_at) &&
  validDateRange.value &&
  receiverTypeList.value.length > 0
)

/* ---------- submit ---------- */
const saveNotice = async () => {
  if (!validate()) {
    toast.error('Please fix the errors and try again.')
    return
  }

  const payload = {
    title: form.title,
    type: form.type,
    description: form.description,
    published_at: form.type === 2 ? null : form.published_at,
    expired_at: form.type === 2 ? null : (form.expired_at || null),
    all_companies: form.all_companies,
    all_departments: form.all_departments,
    all_employees: form.all_employees,
    company_ids: company_ids.value,
    department_ids: department_ids.value,
    employee_ids: employee_ids.value,
    file: form.file,
    receiver_type: receiverTypeList.value,
  }

  try {
    saving.value = true
    await noticeStore.createNotice(payload)
    toast.success('Notice created successfully')
    await noticeStore.fetchNotices()
    router.replace('/hrd/notice')
  } catch (e) {
    const msg = e?.response?.data?.message || 'Failed to save notice'
    toast.error(msg)
    console.error(e)
  } finally {
    saving.value = false
  }
}

/* ---------- summary counts ---------- */
const totalCompanies = computed(() => companiesList.value.length)
const totalDepartments = computed(() => departmentsList.value.length)
const totalEmployees = computed(() => employeesList.value.length)
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 md:px-6 py-6 space-y-6">
    <!-- Page header -->
    <div class="flex items-center justify-between mb-5">
      <div>
        <h1 class="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">Add Notice</h1>
        <p class="text-sm text-gray-500">Fields marked <span class="text-red-500">*</span> are required.</p>
      </div>
      <div class="hidden md:flex gap-2">
        <RouterLink
          to="/hrd/notice"
          class="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-gray-50 text-sm"
        >
          Cancel
        </RouterLink>
        <button
          :disabled="!canSave"
          @click="saveNotice"
          class="px-4 py-2 rounded-xl text-white text-sm shadow-sm"
          :class="canSave ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-400 cursor-not-allowed'"
        >
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 shadow-sm hover:shadow transition">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-blue-50">
              <svg viewBox="0 0 24 24" class="h-5 w-5 text-blue-600"><path fill="currentColor" d="M3 10v10h18V10H3zm9-7l9 7H3l9-7z"/></svg>
            </span>
            <div>
              <div class="text-[11px] uppercase tracking-wide text-gray-500">Companies</div>
              <div class="font-semibold">
                {{ form.all_companies ? 'All' : selectedCompanies.length }} / {{ totalCompanies }}
              </div>
            </div>
          </div>
          <div class="text-[11px] text-gray-500 hidden md:block" v-if="!form.all_companies && selectedCompanies.length">
            <span
              v-for="(n,i) in shortChips(selectedCompanies,'name',3).head"
              :key="'c'+i"
              class="px-2 py-0.5 rounded-full bg-gray-100 mr-1"
            >{{ n }}</span>
            <span v-if="shortChips(selectedCompanies,'name',3).more">+{{ shortChips(selectedCompanies,'name',3).more }}</span>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 shadow-sm hover:shadow transition">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 to-purple-50">
              <svg viewBox="0 0 24 24" class="h-5 w-5 text-purple-600"><path fill="currentColor" d="M3 5h18v2H3V5zm3 4h12v10H6V9z"/></svg>
            </span>
            <div>
              <div class="text-[11px] uppercase tracking-wide text-gray-500">Departments</div>
              <div class="font-semibold">
                {{ form.all_departments ? 'All' : selectedDepartments.length }} / {{ totalDepartments }}
              </div>
            </div>
          </div>
          <div class="text-[11px] text-gray-500 hidden md:block" v-if="!form.all_departments && selectedDepartments.length">
            <span
              v-for="(n,i) in shortChips(selectedDepartments,'name',3).head"
              :key="'d'+i"
              class="px-2 py-0.5 rounded-full bg-gray-100 mr-1"
            >{{ n }}</span>
            <span v-if="shortChips(selectedDepartments,'name',3).more">+{{ shortChips(selectedDepartments,'name',3).more }}</span>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 shadow-sm hover:shadow transition">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50">
              <svg viewBox="0 0 24 24" class="h-5 w-5 text-emerald-600"><path fill="currentColor" d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z"/></svg>
            </span>
            <div>
              <div class="text-[11px] uppercase tracking-wide text-gray-500">Employees</div>
              <div class="font-semibold">
                {{ form.all_employees ? 'All' : selectedEmployees.length }} / {{ totalEmployees }}
              </div>
            </div>
          </div>
          <div class="text-[11px] text-gray-500 hidden md:block" v-if="!form.all_employees && selectedEmployees.length">
            <span
              v-for="(n,i) in shortChips(selectedEmployees,'name',3).head"
              :key="'e'+i"
              class="px-2 py-0.5 rounded-full bg-gray-100 mr-1"
            >{{ n }}</span>
            <span v-if="shortChips(selectedEmployees,'name',3).more">+{{ shortChips(selectedEmployees,'name',3).more }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Form -->
    <form @submit.prevent="saveNotice" class="space-y-8">
      <section class="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold">Notice Type</h3>
          <div class="inline-flex rounded-xl border border-slate-200 overflow-hidden">
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
              class="px-4 py-2 text-sm border-l border-slate-200"
              :class="form.type === 2 ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'"
              @click="form.type = 2"
            >
              Policy
            </button>
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-2">
          Policies usually do not require publish/expire dates and remain visible until replaced.
        </p>
      </section>

      <div class="md:col-span-3 rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm">
        <div class="flex items-center justify-between mb-1">
          <label class="block font-medium">
            Send To <span class="text-red-500">*</span>
          </label>
          <div class="inline-flex gap-1 text-xs">
            <button type="button" class="px-2 py-1 rounded border text-gray-600 hover:bg-gray-50" @click="selectAllReceiverTypes">
              Select All
            </button>
            <button type="button" class="px-2 py-1 rounded border text-gray-600 hover:bg-gray-50" @click="clearReceiverTypes">
              Clear
            </button>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="opt in receiverTypeOptions"
            :key="opt.value"
            type="button"
            class="px-3 py-1.5 rounded-full border text-xs"
            :class="receiverTypeList.includes(opt.value)
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 hover:bg-gray-50'"
            @click="toggleReceiverType(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
        <p v-if="errors.receiver_type" class="text-red-500 text-xs mt-1">
          {{ errors.receiver_type }}
        </p>
      </div>

      <section class="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold">Audience & Scope</h3>
          <span class="text-xs text-gray-500">Define who should see this notice</span>
        </div>

        <div class="grid md:grid-cols-3 gap-6">
          <div class="md:col-span-3 flex justify-between gap-4">
            <div class="w-full flex gap-2">
              <div>
                <FlexibleDatePicker
                  v-model="publishPeriod"
                  :show-year="false"
                  :show-month="false"
                  :show-date="true"
                  :disabled="isPolicyNotice"
                  label="Publish Date *"
                />
                <p v-if="errors.published_at" class="text-red-500 text-xs mt-1">{{ errors.published_at }}</p>
                <p v-else-if="isPolicyNotice" class="text-xs text-gray-500 mt-1">Policies skip publish date.</p>
              </div>
              <div>
                <FlexibleDatePicker
                  v-model="expirePeriod"
                  :show-year="false"
                  :show-month="false"
                  :show-date="true"
                  :disabled="isPolicyNotice"
                  label="Expire Date *"
                />
                <p v-if="errors.expired_at" class="text-red-500 text-xs mt-1">{{ errors.expired_at }}</p>
                <p v-else-if="isPolicyNotice" class="text-xs text-gray-500 mt-1">Policies remain active until replaced.</p>
              </div>
            </div>
          </div>

          <div class="space-y-2 md:col-span-3">
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <label> Companies </label>
                <div class="inline-flex rounded-lg border border-slate-200 overflow-hidden">
                  <button
                    type="button"
                    class="px-3 py-1.5 text-xs"
                    :class="modeCompanies==='all' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'"
                    @click="modeCompanies = 'all'"
                  >All</button>
                  <button
                    type="button"
                    class="px-3 py-1.5 text-xs border-l border-slate-200"
                    :class="modeCompanies==='custom' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'"
                    @click="modeCompanies = 'custom'"
                  >Custom</button>
                </div>
              </div>
              <MultiselectDropdown
                v-model="selectedCompanies"
                :options="companiesList"
                :multiple="true"
                :searchable="true"
                track-by="id"
                label="name"
                top-label="Select Companies"
                placeholder="Select companies"
              />
            </div>

            <div class="space-y-2">
              <div class="flex items-center gap-2">
                 <label> Departments </label>
                <div class="inline-flex rounded-lg border border-slate-200 overflow-hidden">
                  <button
                    type="button"
                    class="px-3 py-1.5 text-xs"
                    :class="modeDepartments==='all' ? 'bg-purple-600 text-white' : 'bg-white hover:bg-gray-50'"
                    @click="modeDepartments = 'all'"
                  >All</button>
                  <button
                    type="button"
                    class="px-3 py-1.5 text-xs border-l border-slate-200"
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
                track-by="id"
                label="name"
                top-label="Select Departments"
                placeholder="Select departments"
              />
            </div>
          </div>

          <div class="space-y-2 md:col-span-3">
            <div class="flex items-center gap-2">
              <label> Employees </label>
              <div class="inline-flex items-center gap-3">
                <div class="inline-flex rounded-lg border border-slate-200 overflow-hidden">
                  <button
                    type="button"
                    class="px-3 py-1.5 text-xs"
                    :class="modeEmployees==='all' ? 'bg-emerald-600 text-white' : 'bg-white hover:bg-gray-50'"
                    @click="modeEmployees = 'all'"
                  >All</button>
                  <button
                    type="button"
                    class="px-3 py-1.5 text-xs border-l border-slate-200"
                    :class="modeEmployees==='custom' ? 'bg-emerald-600 text-white' : 'bg-white hover:bg-gray-50'"
                    @click="modeEmployees = 'custom'"
                  >Custom</button>
                </div>
                <span class="text-xs text-gray-500">Selected {{ selectedEmployees.length }} / {{ totalEmployees }}</span>
              </div>
            </div>
            <MultiselectDropdown
              v-model="selectedEmployees"
              :options="employeesList"
              :multiple="true"
              :searchable="true"
              track-by="id"
              label="name"
              top-label="Select Employees"
              placeholder="Select employees"
            />
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold">Notice Content</h3>
          <span class="text-xs text-gray-500">Craft the headline and attach relevant docs</span>
        </div>

        <div>
          <label class="block font-medium mb-1 text-slate-700">Title <span class="text-red-500">*</span></label>
          <input v-model="form.title" type="text" class="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <p v-if="errors.title" class="text-red-500 text-xs mt-1">{{ errors.title }}</p>
        </div>

        <div class="grid md:grid-cols-2 gap-4 items-start">
          <div class="space-y-2">
            <label class="block font-medium text-slate-700">Attachment</label>

            <div
              class="rounded-xl border border-dashed border-slate-200 p-5 transition relative"
              :class="dropActive ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'"
              @dragover="onDragOver"
              @dragleave="onDragLeave"
              @drop="onDrop"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="text-sm text-gray-600">
                  <div class="font-medium">Drag and drop or click to upload</div>
                  <div>JPG, JPEG, PNG, PDF, DOC, DOCX (max 2MB)</div>
                </div>
                <label class="inline-flex items-center">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                    @change="onFilePick"
                    class="hidden"
                  />
                  <span class="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-gray-50 cursor-pointer text-sm">
                    Browse
                  </span>
                </label>
              </div>

              <div v-if="form.file" class="mt-3 flex items-center justify-between bg-white rounded-lg border border-slate-200 p-2.5">
                <span class="text-sm truncate">
                  <span class="text-gray-500 mr-1">Selected:</span>
                  <span class="font-medium">{{ form.file?.name }}</span>
                </span>
                <button type="button" class="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-gray-50 text-sm" @click="clearFile">
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label class="block font-medium mb-1 text-slate-700">Description</label>
          <TextEditor v-model="form.description" class="w-full" />
        </div>
      </section>

      <div class="sticky bottom-0 z-10 bg-white/90 backdrop-blur flex justify-end gap-2 p-3 rounded-2xl border border-slate-200 shadow-sm md:hidden">
        <RouterLink
          to="/hrd/notice"
          class="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-gray-50 text-sm"
        >
          Cancel
        </RouterLink>
        <button
          :disabled="!canSave"
          type="submit"
          class="px-4 py-2 rounded-xl text-white text-sm shadow-sm"
          :class="canSave ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-400 cursor-not-allowed'"
        >
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </div>

      <div class="hidden md:flex items-center justify-end gap-2">
        <RouterLink
          to="/hrd/notice"
          class="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-gray-50 text-sm"
        >
          Cancel
        </RouterLink>
        <button
          :disabled="!canSave"
          type="submit"
          class="px-4 py-2 rounded-xl text-white text-sm shadow-sm"
          :class="canSave ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-400 cursor-not-allowed'"
        >
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </form>
  </div>
</template>
