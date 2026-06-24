<script setup>
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useSmsCampaignStore } from '@/stores/smsCampaign'
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, ref, watch } from 'vue'
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

const toggleEmployeeType = (value) => {
  const idx = form.employee_types.indexOf(value)
  if (idx >= 0) {
    form.employee_types.splice(idx, 1)
  } else {
    form.employee_types.push(value)
  }
}

const selectedCompanies = ref([])
const selectedDepartments = ref([])
const selectedEmployees = ref([])

const companiesList = computed(() => companies.value || [])
const departmentsList = computed(() => departmentStore.departments || [])
const employeesList = computed(() => departmentStore.employees || [])

const company_ids = computed(() => selectedCompanies.value.map((c) => c.id))
const department_ids = computed(() => selectedDepartments.value.map((d) => d.id))
const employee_ids = computed(() => selectedEmployees.value.map((e) => e.id))

const effectiveDepartmentIds = computed(() =>
  department_ids.value.length ? department_ids.value : departmentsList.value.map((d) => d.id),
)

onMounted(async () => {
  await companyStore.fetchCompanies()
})

watch(company_ids, async (ids) => {
  selectedDepartments.value = []
  selectedEmployees.value = []
  departmentStore.employees = []

  if (ids.length) {
    await departmentStore.fetchDepartments(ids)
  } else {
    departmentStore.departments = []
  }
})

watch([effectiveDepartmentIds, company_ids], async ([deptIds, companyIds]) => {
  selectedEmployees.value = []

  if (companyIds.length && deptIds.length) {
    await departmentStore.fetchDepartmentActiveEmployee(deptIds, 'all')
  } else {
    departmentStore.employees = []
  }
})

const currentFilters = computed(() => ({
  company_ids: company_ids.value,
  department_ids: department_ids.value,
  employee_types: form.employee_types,
  employee_ids: employee_ids.value,
  include_inactive: form.include_inactive,
}))

const hasAnyFilter = computed(
  () =>
    company_ids.value.length > 0 ||
    department_ids.value.length > 0 ||
    form.employee_types.length > 0 ||
    employee_ids.value.length > 0,
)

const filterSummary = computed(() => {
  const chips = []
  selectedCompanies.value.forEach((c) => chips.push({ key: `c${c.id}`, label: c.name, icon: 'fa-building', group: 'company' }))
  selectedDepartments.value.forEach((d) => chips.push({ key: `d${d.id}`, label: d.name, icon: 'fa-sitemap', group: 'department' }))
  form.employee_types.forEach((t) => {
    const opt = employeeTypeOptions.find((o) => o.value === t)
    chips.push({ key: `t${t}`, label: opt?.label || t, icon: opt?.icon || 'fa-id-badge', group: 'type' })
  })
  if (employee_ids.value.length) {
    chips.push({ key: 'emp', label: `${employee_ids.value.length} specific employee(s)`, icon: 'fa-user-check', group: 'employee' })
  }
  return chips
})

// dirty flag so preview results don't look "current" after filters change
const previewDirty = ref(false)
watch(currentFilters, () => { previewDirty.value = true; campaignStore.previewResult = null }, { deep: true })

const previewRecipients = async () => {
  if (!hasAnyFilter.value) {
    toast.error('Select at least one company, department, employee type, or employee.')
    return
  }
  try {
    await campaignStore.previewRecipients(currentFilters.value)
    previewDirty.value = false
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed to preview recipients.')
  }
}

// ---------- SMS segment counter ----------
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
  if (smsSegments.value <= 1) return `${messageLength.value}/${charLimit.value} characters · 1 SMS`
  return `${messageLength.value} characters · ${smsSegments.value} SMS parts (${isGsm7.value ? 'GSM' : 'Unicode'})`
})

const errors = reactive({})

const validate = () => {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (!form.name?.trim()) errors.name = 'Campaign name is required'
  if (!form.message?.trim()) errors.message = 'Message is required'
  if (!hasAnyFilter.value) errors.filters = 'Select at least one recipient filter'
  return Object.keys(errors).length === 0
}

const saving = computed(() => campaignStore.saving)
const canSave = computed(() => !saving.value && !!form.name?.trim() && !!form.message?.trim() && hasAnyFilter.value)

const saveCampaign = async () => {
  if (!validate()) {
    toast.error('Please fix the errors and try again.')
    return
  }

  try {
    const created = await campaignStore.createCampaign({ ...currentFilters.value, ...form })
    toast.success('Campaign created successfully.')
    router.replace(`/sms-campaigns/${created.id}`)
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed to create campaign.')
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 md:px-6 py-6 space-y-6">
    <div class="flex items-center justify-between mb-2">
      <div>
        <RouterLink to="/sms-campaigns" class="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mb-1">
          <i class="far fa-arrow-left"></i> Back to Campaigns
        </RouterLink>
        <h1 class="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">New Bulk SMS Campaign</h1>
        <p class="text-sm text-gray-500">Fields marked <span class="text-red-500">*</span> are required.</p>
      </div>
      <div class="hidden md:flex gap-2">
        <RouterLink to="/sms-campaigns" class="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-gray-50 text-sm">
          Cancel
        </RouterLink>
        <button
          :disabled="!canSave"
          @click="saveCampaign"
          class="px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-sm"
          :class="canSave ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300 cursor-not-allowed'"
        >
          <i class="far fa-paper-plane mr-1"></i>{{ saving ? 'Saving...' : 'Save Campaign' }}
        </button>
      </div>
    </div>

    <form @submit.prevent="saveCampaign" class="space-y-6">
      <section class="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm space-y-6">
        <div class="flex items-center gap-2">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <i class="fas fa-users text-sm"></i>
          </span>
          <h3 class="text-base font-semibold text-slate-800">Recipients</h3>
        </div>

        <div class="grid md:grid-cols-2 gap-6">
          <div class="space-y-2">
            <label class="block font-medium text-slate-700 text-sm">Companies</label>
            <MultiselectDropdown
              v-model="selectedCompanies"
              :options="companiesList"
              :multiple="true"
              :searchable="true"
              track-by="id"
              label="name"
              top-label="Select Companies"
              placeholder="Any company"
            />
          </div>

          <div class="space-y-2">
            <label class="block font-medium text-slate-700 text-sm">Departments</label>
            <MultiselectDropdown
              v-model="selectedDepartments"
              :options="departmentsList"
              :multiple="true"
              :searchable="true"
              :disabled="!company_ids.length"
              track-by="id"
              label="name"
              top-label="Select Departments"
              :placeholder="company_ids.length ? 'Any department in selected companies' : 'Select a company first'"
            />
          </div>
        </div>

        <div class="space-y-2">
          <label class="block font-medium text-slate-700 text-sm">Employee Line Type</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in employeeTypeOptions"
              :key="opt.value"
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition"
              :class="
                form.employee_types.includes(opt.value)
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-700 border-slate-200 hover:bg-gray-50'
              "
              @click="toggleEmployeeType(opt.value)"
            >
              <i class="fas" :class="opt.icon"></i>
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <label class="block font-medium text-slate-700 text-sm">Specific Employees</label>
          <MultiselectDropdown
            v-model="selectedEmployees"
            :options="employeesList"
            :multiple="true"
            :searchable="true"
            :disabled="!company_ids.length"
            track-by="id"
            label="name"
            top-label="Select Employees"
            :placeholder="company_ids.length ? 'Add specific employees (combined with the filters above)' : 'Select a company first'"
          />
          <p class="text-xs text-gray-500">
            <i class="far fa-circle-info mr-1"></i>Selected employees are always included, in addition to anyone matching the filters above.
          </p>
        </div>

        <label class="inline-flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" v-model="form.include_inactive" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          Include inactive employees <span class="text-xs text-gray-400">(requires permission)</span>
        </label>

        <!-- Filter summary chips -->
        <div v-if="filterSummary.length" class="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
          <span
            v-for="chip in filterSummary"
            :key="chip.key"
            class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600"
          >
            <i class="fas text-slate-400" :class="chip.icon"></i>
            {{ chip.label }}
          </span>
        </div>

        <p v-if="errors.filters" class="text-red-500 text-xs">{{ errors.filters }}</p>

        <!-- Preview -->
        <div class="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <button
                type="button"
                @click="previewRecipients"
                :disabled="previewLoading || !hasAnyFilter"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i class="far" :class="previewLoading ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'"></i>
                {{ previewLoading ? 'Checking...' : 'Preview Recipients' }}
              </button>
              <div v-if="previewResult" class="flex items-center gap-2">
                <span class="flex items-center justify-center h-9 w-9 rounded-full bg-emerald-100 text-emerald-700">
                  <i class="fas fa-users text-sm"></i>
                </span>
                <div class="leading-tight">
                  <div class="text-lg font-bold text-slate-900">{{ previewResult.recipient_count }}</div>
                  <div class="text-[11px] text-gray-500" :class="previewDirty ? 'text-amber-600' : ''">
                    {{ previewDirty ? 'Filters changed — preview again' : 'recipient(s) will receive this message' }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="previewResult?.sample?.length" class="rounded-xl border border-slate-200 overflow-hidden bg-white">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 text-left text-[11px] uppercase text-slate-500">
                <tr>
                  <th class="px-3 py-2">Name</th>
                  <th class="px-3 py-2">Phone</th>
                  <th class="px-3 py-2">Type</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in previewResult.sample" :key="r.id" class="border-t border-slate-100">
                  <td class="px-3 py-2">{{ r.name }}</td>
                  <td class="px-3 py-2 font-mono text-xs">{{ r.phone }}</td>
                  <td class="px-3 py-2 capitalize">{{ (r.type || '-').replace('_', ' ') }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="previewResult.recipient_count > previewResult.sample.length" class="px-3 py-2 text-xs text-gray-500 border-t border-slate-100">
              Showing {{ previewResult.sample.length }} of {{ previewResult.recipient_count }}.
            </p>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm space-y-4">
        <div class="flex items-center gap-2">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
            <i class="fas fa-message text-sm"></i>
          </span>
          <h3 class="text-base font-semibold text-slate-800">Message</h3>
        </div>

        <div>
          <label class="block font-medium mb-1 text-slate-700 text-sm">Campaign Name <span class="text-red-500">*</span></label>
          <input
            v-model="form.name"
            type="text"
            placeholder="e.g. Holiday Notice - June 2026"
            class="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</p>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block font-medium text-slate-700 text-sm">SMS Message <span class="text-red-500">*</span></label>
          </div>
          <textarea
            v-model="form.message"
            rows="4"
            maxlength="2000"
            placeholder="Type the SMS message that will be sent to all selected recipients..."
            class="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
          <p v-if="errors.message" class="text-red-500 text-xs mt-1">{{ errors.message }}</p>
          <div class="flex items-center justify-between mt-1">
            <p class="text-xs text-gray-500">{{ segmentLabel }}</p>
            <p v-if="smsSegments > 1" class="text-xs text-amber-600">
              <i class="far fa-triangle-exclamation mr-1"></i>Long messages may be split into multiple SMS by the carrier.
            </p>
          </div>
        </div>
      </section>

      <div class="flex md:hidden justify-end gap-2">
        <RouterLink to="/sms-campaigns" class="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-gray-50 text-sm">
          Cancel
        </RouterLink>
        <button
          :disabled="!canSave"
          type="submit"
          class="px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-sm"
          :class="canSave ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300 cursor-not-allowed'"
        >
          {{ saving ? 'Saving...' : 'Save Campaign' }}
        </button>
      </div>
    </form>
  </div>
</template>
