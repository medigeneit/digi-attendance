<script setup>
import EmpReportMultiFilter from '@/components/reports/EmpReportMultiFilter.vue'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useSmsCampaignStore } from '@/stores/smsCampaign'
import { storeToRefs } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const toast = useToast()
const router = useRouter()
const campaignStore = useSmsCampaignStore()
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const { companies } = storeToRefs(companyStore)
const { previewResult, previewLoading } = storeToRefs(campaignStore)

const form = reactive({
  name: '',
  message: '',
  employee_types: [],
  include_inactive: false,
})

const employeeTypeOptions = [
  { value: 'doctor', label: 'Doctor', icon: 'fa-user-doctor' },
  { value: 'academy_body', label: 'Academy Body', icon: 'fa-graduation-cap' },
  { value: 'executive', label: 'Executive', icon: 'fa-briefcase' },
  { value: 'support_staff', label: 'Support Staff', icon: 'fa-users' },
]

const modeOptions = [
  { value: 'internal', label: 'Internal Only', icon: 'fa-building-user' },
  { value: 'both', label: 'Both', icon: 'fa-layer-group' },
  { value: 'external', label: 'External Only', icon: 'fa-phone' },
]

const recipientMode = ref('internal')
const showInternal = computed(() => recipientMode.value !== 'external')
const showExternal = computed(() => recipientMode.value !== 'internal')

const toggleEmployeeType = (value) => {
  const idx = form.employee_types.indexOf(value)
  if (idx >= 0) form.employee_types.splice(idx, 1)
  else form.employee_types.push(value)
}

const selectedCompanyIds = ref([])
const selectedDepartmentIds = ref([])
const selectedEmployeeIds = ref([])
const externalPhonesRaw = ref('')

const externalPhonesParsed = computed(() =>
  [...new Set(
    externalPhonesRaw.value
      .split(/[\n,]+/)
      .map((p) => p.trim())
      .filter((p) => p.replace(/\D/g, '').length >= 7),
  )],
)

const companiesList = computed(() => companies.value || [])
const departmentsList = computed(() => departmentStore.departments || [])
const employeesList = computed(() => departmentStore.employees || [])

const company_ids = computed(() => selectedCompanyIds.value.map(Number).filter(Number.isInteger))
const department_ids = computed(() => selectedDepartmentIds.value.map(Number).filter(Number.isInteger))
const employee_ids = computed(() => selectedEmployeeIds.value.map(Number).filter(Number.isInteger))
const selectedCompanies = computed(() =>
  companiesList.value.filter((company) => company_ids.value.includes(Number(company.id))),
)
const selectedDepartments = computed(() =>
  departmentsList.value.filter((department) => department_ids.value.includes(Number(department.id))),
)

const effectiveDepartmentIds = computed(() =>
  department_ids.value.length ? department_ids.value : departmentsList.value.map((d) => d.id),
)

watch(company_ids, async (ids) => {
  selectedEmployeeIds.value = []
  departmentStore.employees = []
  if (ids.length) {
    await departmentStore.fetchDepartments(ids)
  } else {
    departmentStore.departments = []
  }
})

watch(
  [effectiveDepartmentIds, company_ids, () => form.include_inactive],
  async ([deptIds, companyIds, includeInactive]) => {
    selectedEmployeeIds.value = []
    if (companyIds.length && deptIds.length) {
      const fetchEmployees = includeInactive
        ? departmentStore.fetchDepartmentEmployee
        : departmentStore.fetchDepartmentActiveEmployee
      await fetchEmployees(deptIds, 'all')
    } else {
      departmentStore.employees = []
    }
  },
)

const currentFilters = computed(() => ({
  company_ids: showInternal.value ? company_ids.value : [],
  department_ids: showInternal.value ? department_ids.value : [],
  employee_types: showInternal.value ? form.employee_types : [],
  employee_ids: showInternal.value ? employee_ids.value : [],
  include_inactive: showInternal.value ? form.include_inactive : false,
  external_phones: showExternal.value ? externalPhonesParsed.value : [],
}))

const hasAnyFilter = computed(() => {
  const internalOk = showInternal.value && (
    company_ids.value.length > 0 ||
    department_ids.value.length > 0 ||
    form.employee_types.length > 0 ||
    employee_ids.value.length > 0
  )
  const externalOk = showExternal.value && externalPhonesParsed.value.length > 0
  return internalOk || externalOk
})

const filterSummary = computed(() => {
  const chips = []
  if (showInternal.value) {
    selectedCompanies.value.forEach((c) => chips.push({ key: `c${c.id}`, label: c.name, icon: 'fa-building' }))
    selectedDepartments.value.forEach((d) => chips.push({ key: `d${d.id}`, label: d.name, icon: 'fa-sitemap' }))
    form.employee_types.forEach((t) => {
      const opt = employeeTypeOptions.find((o) => o.value === t)
      chips.push({ key: `t${t}`, label: opt?.label || t, icon: opt?.icon || 'fa-id-badge' })
    })
    if (employee_ids.value.length)
      chips.push({ key: 'emp', label: `${employee_ids.value.length} specific employee(s)`, icon: 'fa-user-check' })
  }
  if (showExternal.value && externalPhonesParsed.value.length)
    chips.push({ key: 'ext', label: `${externalPhonesParsed.value.length} external number(s)`, icon: 'fa-phone' })
  return chips
})

const previewDirty = ref(false)
const excludedRecipientKeys = ref([])
const previewRecipientList = computed(() => previewResult.value?.recipients || [])
const recipientKey = (recipient) => recipient.id != null
  ? `user:${recipient.id}`
  : `phone:${recipient.phone}`
const isRecipientSelected = (recipient) => !excludedRecipientKeys.value.includes(recipientKey(recipient))
const selectedRecipientCount = computed(() =>
  previewRecipientList.value.filter(isRecipientSelected).length,
)
const allPreviewRecipientsSelected = computed(() =>
  previewRecipientList.value.length > 0 && selectedRecipientCount.value === previewRecipientList.value.length,
)
const somePreviewRecipientsSelected = computed(() =>
  selectedRecipientCount.value > 0 && !allPreviewRecipientsSelected.value,
)
const excludedRecipients = computed(() =>
  previewRecipientList.value.filter(recipient => !isRecipientSelected(recipient)),
)
const excludedUserIds = computed(() =>
  excludedRecipients.value
    .filter(recipient => recipient.id != null)
    .map(recipient => Number(recipient.id)),
)
const excludedPhones = computed(() =>
  excludedRecipients.value
    .filter(recipient => recipient.id == null)
    .map(recipient => recipient.phone),
)

const togglePreviewRecipient = (recipient) => {
  const key = recipientKey(recipient)
  excludedRecipientKeys.value = excludedRecipientKeys.value.includes(key)
    ? excludedRecipientKeys.value.filter(item => item !== key)
    : [...excludedRecipientKeys.value, key]
}

const toggleAllPreviewRecipients = () => {
  excludedRecipientKeys.value = allPreviewRecipientsSelected.value
    ? previewRecipientList.value.map(recipientKey)
    : []
}

watch(currentFilters, () => {
  previewDirty.value = true
  excludedRecipientKeys.value = []
  campaignStore.previewResult = null
}, { deep: true })

const previewRecipients = async () => {
  if (!hasAnyFilter.value) {
    toast.error('Select at least one recipient filter.')
    return
  }
  try {
    await campaignStore.previewRecipients(currentFilters.value)
    excludedRecipientKeys.value = []
    previewDirty.value = false
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed to preview recipients.')
  }
}

const GSM7_REGEX = /^[A-Za-z0-9 \r\n@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\[~\]|€]*$/
const isGsm7 = computed(() => GSM7_REGEX.test(form.message))
const charLimit = computed(() => (isGsm7.value ? 160 : 70))
const multiLimit = computed(() => (isGsm7.value ? 153 : 67))
const messageLength = computed(() => form.message.length)
const smsSegments = computed(() => {
  if (messageLength.value === 0) return 0
  if (messageLength.value <= charLimit.value) return 1
  return Math.ceil(messageLength.value / multiLimit.value)
})
const segmentLabel = computed(() => {
  if (smsSegments.value <= 1) return `${messageLength.value}/${charLimit.value} chars · 1 SMS`
  return `${messageLength.value} chars · ${smsSegments.value} parts (${isGsm7.value ? 'GSM' : 'Unicode'})`
})

const errors = reactive({})

const validate = () => {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (!form.name?.trim()) errors.name = 'Event name is required'
  if (!form.message?.trim()) errors.message = 'Message is required'
  if (!hasAnyFilter.value) errors.filters = 'Select at least one recipient filter'
  if (previewResult.value && !previewDirty.value && selectedRecipientCount.value === 0) {
    errors.filters = 'Select at least one preview recipient'
  }
  return Object.keys(errors).length === 0
}

const saving = computed(() => campaignStore.saving)
const canSave = computed(() =>
  !saving.value
  && !!form.name?.trim()
  && !!form.message?.trim()
  && hasAnyFilter.value
  && (!previewResult.value || previewDirty.value || selectedRecipientCount.value > 0),
)

const saveCampaign = async () => {
  if (!validate()) {
    toast.error('Please fix the errors and try again.')
    return
  }
  try {
    const created = await campaignStore.createCampaign({
      ...currentFilters.value,
      ...form,
      excluded_user_ids: excludedUserIds.value,
      excluded_phones: excludedPhones.value,
    })
    toast.success('Event created successfully.')
    router.replace(`/sms-campaigns/${created.id}`)
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed to create event.')
  }
}
</script>

<template>
  <div class="pb-24">
    <div class="mx-auto max-w-4xl px-4 md:px-6 py-6 space-y-5">

      <!-- Page header -->
      <div>
        <RouterLink to="/sms-campaigns" class="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mb-2">
          <i class="far fa-arrow-left text-[10px]"></i> Back to Campaigns
        </RouterLink>
        <h1 class="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">New Bulk SMS Event</h1>
        <p class="text-sm text-gray-400 mt-0.5">Fields marked <span class="text-red-500">*</span> are required.</p>
      </div>

      <form @submit.prevent="saveCampaign" class="space-y-5">

        <!-- Step 1: Compose -->
        <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div class="flex items-center gap-3 pb-1">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-purple-600 text-xs font-bold shrink-0">1</span>
            <h3 class="text-sm font-semibold text-slate-700 uppercase tracking-wide">Compose Message</h3>
          </div>

          <div>
            <label class="block font-medium mb-1.5 text-slate-700 text-sm">
              Event Name <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.name"
              type="text"
              placeholder="e.g. Holiday Notice – June 2026"
              class="w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none"
              :class="errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200'"
            />
            <p v-if="errors.name" class="text-red-500 text-xs mt-1 flex items-center gap-1">
              <i class="far fa-circle-xmark"></i>{{ errors.name }}
            </p>
          </div>

          <div>
            <div class="flex items-start justify-between mb-1.5 gap-2">
              <label class="block font-medium text-slate-700 text-sm">
                SMS Message <span class="text-red-500">*</span>
              </label>
              <span
                class="text-xs font-mono px-2 py-0.5 rounded-full shrink-0"
                :class="smsSegments > 1 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'"
              >{{ segmentLabel }}</span>
            </div>
            <textarea
              v-model="form.message"
              rows="5"
              maxlength="2000"
              placeholder="Type the SMS message that will be sent to all selected recipients..."
              class="w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none resize-none"
              :class="errors.message ? 'border-red-300 bg-red-50' : 'border-slate-200'"
            ></textarea>
            <div class="flex items-center justify-between mt-1 min-h-[16px]">
              <p v-if="errors.message" class="text-red-500 text-xs flex items-center gap-1">
                <i class="far fa-circle-xmark"></i>{{ errors.message }}
              </p>
              <p v-if="smsSegments > 1" class="text-xs text-amber-600 ml-auto flex items-center gap-1">
                <i class="far fa-triangle-exclamation"></i>Long messages may be split by the carrier.
              </p>
            </div>
          </div>
        </section>

        <!-- Step 2: Recipients -->
        <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
          <div class="flex items-center gap-3 pb-1">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold shrink-0">2</span>
            <h3 class="text-sm font-semibold text-slate-700 uppercase tracking-wide">Recipients</h3>
          </div>

          <!-- Mode toggle -->
          <div class="space-y-2">
            <p class="text-xs text-slate-400 font-medium uppercase tracking-wide">Who should receive this SMS?</p>
            <div class="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
              <button
                v-for="opt in modeOptions"
                :key="opt.value"
                type="button"
                @click="recipientMode = opt.value"
                class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                :class="
                  recipientMode === opt.value
                    ? 'bg-white shadow-sm text-blue-600 border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
                "
              >
                <i class="fas text-xs" :class="opt.icon"></i>
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Internal employee filters -->
          <template v-if="showInternal">
            <div class="space-y-4 rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <i class="fas fa-building-user text-blue-400"></i> Internal Employees
              </p>

              <EmpReportMultiFilter
                v-model:company-ids="selectedCompanyIds"
                v-model:department-ids="selectedDepartmentIds"
                v-model:employee-ids="selectedEmployeeIds"
                :employees="employeesList"
                :employees-loading="departmentStore.loading"
                :show-employees="true"
                :horizontal="true"
              />

              <div class="space-y-1.5">
                <label class="block text-xs font-medium text-slate-600">Employee Line Type</label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="opt in employeeTypeOptions"
                    :key="opt.value"
                    type="button"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition"
                    :class="
                      form.employee_types.includes(opt.value)
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                    "
                    @click="toggleEmployeeType(opt.value)"
                  >
                    <i class="fas" :class="opt.icon"></i>
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <label class="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                <input type="checkbox" v-model="form.include_inactive" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                Include inactive employees
                <span class="text-xs text-slate-400">(requires permission)</span>
              </label>
            </div>
          </template>

          <!-- External phone numbers -->
          <template v-if="showExternal">
            <div class="space-y-2 rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <i class="fas fa-phone text-emerald-400"></i> External Numbers
              </p>
              <div class="relative">
                <textarea
                  v-model="externalPhonesRaw"
                  rows="4"
                  placeholder="01XXXXXXXXX&#10;01XXXXXXXXX&#10;(one per line, or comma-separated)"
                  class="w-full px-3 py-2.5 border border-slate-200 bg-white rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none resize-none"
                ></textarea>
                <div
                  v-if="externalPhonesParsed.length"
                  class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold pointer-events-none"
                >
                  {{ externalPhonesParsed.length }} parsed
                </div>
              </div>
              <p class="text-[11px] text-slate-400">
                <i class="far fa-circle-info mr-1"></i>Contacts not in the system – clients, vendors, etc.
              </p>
            </div>
          </template>

          <!-- Filter summary chips -->
          <div v-if="filterSummary.length || errors.filters" class="space-y-2">
            <div v-if="filterSummary.length" class="flex flex-wrap gap-1.5">
              <span
                v-for="chip in filterSummary"
                :key="chip.key"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[11px] text-blue-700 font-medium"
              >
                <i class="fas text-[10px] text-blue-400" :class="chip.icon"></i>
                {{ chip.label }}
              </span>
            </div>
            <p v-if="errors.filters" class="text-red-500 text-xs flex items-center gap-1">
              <i class="far fa-circle-xmark"></i>{{ errors.filters }}
            </p>
          </div>
        </section>

        <!-- Step 3: Preview -->
        <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div class="flex items-center gap-3 pb-1">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold shrink-0">3</span>
            <h3 class="text-sm font-semibold text-slate-700 uppercase tracking-wide">Preview Recipients</h3>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              @click="previewRecipients"
              :disabled="previewLoading || !hasAnyFilter"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
              :class="hasAnyFilter
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-slate-200 bg-slate-50 text-slate-400'"
            >
              <i class="far" :class="previewLoading ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'"></i>
              {{ previewLoading ? 'Checking...' : 'Preview Recipients' }}
            </button>

            <div v-if="previewResult && !previewDirty" class="flex items-center gap-2">
              <span class="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                <i class="fas fa-users text-sm"></i>
              </span>
              <div class="leading-tight">
                <div class="text-xl font-bold text-slate-900">{{ selectedRecipientCount }}</div>
                <div class="text-[11px] text-slate-400">
                  recipient(s) selected
                  <span v-if="excludedRecipientKeys.length" class="text-amber-600">
                    · {{ excludedRecipientKeys.length }} skipped
                  </span>
                </div>
              </div>
            </div>

            <div v-else-if="previewResult && previewDirty" class="inline-flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg">
              <i class="far fa-triangle-exclamation"></i> Filters changed — run preview again
            </div>
          </div>

          <!-- Preview table -->
          <div v-if="previewRecipientList.length && !previewDirty" class="rounded-xl border border-slate-200 overflow-hidden">
            <div class="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2">
              <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  :checked="allPreviewRecipientsSelected"
                  :indeterminate="somePreviewRecipientsSelected"
                  @change="toggleAllPreviewRecipients"
                />
                Select all recipients
              </label>
              <span class="text-[11px] text-slate-400">
                {{ selectedRecipientCount }} / {{ previewResult.recipient_count }} selected
              </span>
            </div>
            <div class="max-h-80 overflow-y-auto">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th class="w-10 px-4 py-2.5"></th>
                  <th class="px-4 py-2.5">Name / Number</th>
                  <th class="px-4 py-2.5">Phone</th>
                  <th class="px-4 py-2.5">Type</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="r in previewRecipientList"
                  :key="recipientKey(r)"
                  class="hover:bg-slate-50 transition"
                  :class="!isRecipientSelected(r) ? 'bg-slate-50 opacity-55' : ''"
                >
                  <td class="px-4 py-2.5">
                    <input
                      type="checkbox"
                      class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      :checked="isRecipientSelected(r)"
                      :aria-label="`Include ${r.name || r.phone}`"
                      @change="togglePreviewRecipient(r)"
                    />
                  </td>
                  <td class="px-4 py-2.5 text-slate-700 font-medium">{{ r.name }}</td>
                  <td class="px-4 py-2.5 font-mono text-xs text-slate-500">{{ r.phone }}</td>
                  <td class="px-4 py-2.5">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize"
                      :class="r.type ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'"
                    >
                      {{ r.type ? r.type.replace('_', ' ') : 'External' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>

          <!-- Empty state -->
          <div v-else-if="!hasAnyFilter" class="rounded-xl border border-dashed border-slate-200 py-8 text-center text-slate-400">
            <i class="far fa-users-slash text-2xl mb-2 block"></i>
            <p class="text-sm">Add recipient filters above to preview.</p>
          </div>
        </section>

      </form>
    </div>

    <!-- Sticky footer bar -->
    <div class="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-[0_-1px_8px_rgba(0,0,0,0.06)]">
      <div class="mx-auto max-w-4xl px-4 md:px-6 py-3 flex items-center justify-between gap-4">

        <!-- Left: live status -->
        <div class="flex items-center gap-2 text-sm min-w-0">
          <template v-if="previewResult && !previewDirty">
            <span class="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shrink-0">
              <i class="fas fa-users text-xs"></i>
            </span>
            <span class="text-slate-500 truncate">
              <strong class="text-slate-800">{{ selectedRecipientCount }}</strong> recipient(s) selected
              <span v-if="excludedRecipientKeys.length"> ({{ excludedRecipientKeys.length }} skipped)</span>
            </span>
          </template>
          <template v-else-if="previewResult && previewDirty">
            <i class="far fa-triangle-exclamation text-amber-500 shrink-0"></i>
            <span class="text-amber-600 text-xs truncate">Preview is outdated — run again</span>
          </template>
          <template v-else>
            <span class="text-xs text-slate-400">Preview recipients before saving</span>
          </template>
        </div>

        <!-- Right: actions -->
        <div class="flex items-center gap-2 shrink-0">
          <RouterLink
            to="/sms-campaigns"
            class="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm text-slate-600 transition"
          >
            Cancel
          </RouterLink>
          <button
            type="button"
            @click="previewRecipients"
            :disabled="previewLoading || !hasAnyFilter"
            class="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
            :class="hasAnyFilter
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'border-slate-200 text-slate-400'"
          >
            <i class="far" :class="previewLoading ? 'fa-spinner fa-spin' : 'fa-eye'"></i>
            Preview
          </button>
          <button
            type="button"
            :disabled="!canSave"
            @click="saveCampaign"
            class="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-white text-sm font-semibold shadow-sm transition"
            :class="canSave ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300 cursor-not-allowed'"
          >
            <i class="far fa-paper-plane"></i>
            {{ saving ? 'Saving...' : 'Save Event' }}
          </button>
        </div>

      </div>
    </div>
  </div>
</template>
