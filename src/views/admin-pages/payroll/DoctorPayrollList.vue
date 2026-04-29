<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import { useDoctorPayrollStore } from '@/stores/doctorPayroll'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import LoaderView from '@/components/common/LoaderView.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const doctorPayrollStore = useDoctorPayrollStore()
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()

const { list, loading, error, pagination } = storeToRefs(doctorPayrollStore)
const { companies } = storeToRefs(companyStore)
const { departments } = storeToRefs(departmentStore)
const detailModalOpen = ref(false)
const editModalOpen = ref(false)
const selectedPayroll = ref(null)
const pdfExporting = ref(false)
const printMode = ref('list')
const editSubmitting = ref(false)
const editErrors = ref({})

const blankEditForm = () => ({
  id: null,
  basic_salary: 0,
  day_honorium: 0,
  present_days: 0,
  bonus: 0,
  other_addition: 0,
  loan_deduction: 0,
  samiti_deduction: 0,
  other_deduction: 0,
  remarks: '',
})

const editForm = ref(blankEditForm())

const getCurrentMonth = () => new Date().toISOString().slice(0, 7)

const filters = ref({
  company_id: '',
  department_id: '',
  salary_month: getCurrentMonth(),
  status: '',
  page: 1,
  per_page: 20,
})

const statusOptions = ['Draft', 'Generated', 'Approved', 'Paid']

const summaryCards = computed(() => {
  const rows = list.value || []
  const payable = rows.reduce((sum, row) => sum + getPayable(row), 0)
  const addition = rows.reduce((sum, row) => sum + toNumber(row.other_addition), 0)
  const loan = rows.reduce((sum, row) => sum + toNumber(row.loan_deduction), 0)
  const samiti = rows.reduce((sum, row) => sum + toNumber(row.samiti_deduction), 0)
  const other = rows.reduce((sum, row) => sum + toNumber(row.other_deduction), 0)
  const net = rows.reduce((sum, row) => sum + toNumber(row.net_payable), 0)

  return [
    { label: 'Doctor Payrolls', value: rows.length, tone: 'border-blue-200 bg-blue-50 text-blue-800', money: false },
    { label: 'Payable', value: payable, tone: 'border-emerald-200 bg-emerald-50 text-emerald-800', money: true },
    { label: 'Other Addition', value: addition, tone: 'border-cyan-200 bg-cyan-50 text-cyan-800', money: true },
    { label: 'Deductions', value: loan + samiti + other, tone: 'border-rose-200 bg-rose-50 text-rose-800', money: true },
    { label: 'Net Payable', value: net, tone: 'border-indigo-200 bg-indigo-50 text-indigo-800', money: true },
  ]
})

const selectedCompanyName = computed(() => {
  if (!filters.value.company_id) return 'All Companies'
  return (companies.value || []).find((company) => String(company.id) === String(filters.value.company_id))?.name || '-'
})

const selectedDepartmentName = computed(() => {
  if (!filters.value.department_id) return 'All Departments'
  return (departments.value || []).find((department) => String(department.id) === String(filters.value.department_id))?.name || '-'
})

const filteredDepartments = computed(() => {
  if (!filters.value.company_id) return departments.value || []
  return (departments.value || []).filter((department) => {
    return String(department.company_id || department.company?.id || '') === String(filters.value.company_id)
  })
})

const applyRouteQueryToFilters = () => {
  const q = route.query
  filters.value = {
    company_id: String(q.company_id || ''),
    department_id: String(q.department_id || ''),
    salary_month: String(q.salary_month || getCurrentMonth()),
    status: String(q.status || ''),
    page: Number(q.page) > 0 ? Number(q.page) : 1,
    per_page: Number(q.per_page) > 0 ? Number(q.per_page) : 20,
  }
}

const cleanParams = () => {
  const params = { ...filters.value }
  Object.keys(params).forEach((key) => {
    if (params[key] === '' || params[key] === null || params[key] === undefined) delete params[key]
  })
  return params
}

async function load() {
  const params = cleanParams()
  await router.replace({ query: params })
  await doctorPayrollStore.fetchList(params)
}

const resetFilters = () => {
  filters.value = {
    company_id: '',
    department_id: '',
    salary_month: getCurrentMonth(),
    status: '',
    page: 1,
    per_page: 20,
  }
  load()
}

const approvePayroll = async (row) => {
  try {
    const updated = await doctorPayrollStore.approve(row.id)
    if (selectedPayroll.value?.id === row.id) selectedPayroll.value = updated
    toast.success('Doctor payroll approved.')
  } catch (e) {
    toast.error(e.message || 'Approve failed.')
  }
}

const markPayrollPaid = async (row) => {
  try {
    const updated = await doctorPayrollStore.markPaid(row.id)
    if (selectedPayroll.value?.id === row.id) selectedPayroll.value = updated
    toast.success('Doctor payroll marked as paid.')
  } catch (e) {
    toast.error(e.message || 'Payment update failed.')
  }
}

const openEditModal = async (row) => {
  if (row.status !== 'Draft') return toast.error('Only draft doctor payroll can be edited.')

  selectedPayroll.value = row
  editErrors.value = {}
  editModalOpen.value = true

  try {
    const payroll = await doctorPayrollStore.fetchItem(row.id)
    selectedPayroll.value = payroll
    editForm.value = {
      id: payroll.id,
      basic_salary: toNumber(payroll.basic_salary),
      day_honorium: toNumber(payroll.day_honorium),
      present_days: toNumber(payroll.present_days),
      bonus: toNumber(payroll.bonus),
      other_addition: toNumber(payroll.other_addition),
      loan_deduction: toNumber(payroll.loan_deduction),
      samiti_deduction: toNumber(payroll.samiti_deduction),
      other_deduction: toNumber(payroll.other_deduction),
      remarks: payroll.remarks || '',
    }
  } catch (e) {
    editModalOpen.value = false
    toast.error(e.message || 'Doctor payroll load failed.')
  }
}

const closeEditModal = () => {
  editModalOpen.value = false
  editErrors.value = {}
  editForm.value = blankEditForm()
}

const validateEditForm = () => {
  const errors = {}
  ;['bonus', 'other_addition', 'loan_deduction', 'other_deduction'].forEach((field) => {
    const value = Number(editForm.value[field])
    if (!Number.isFinite(value) || value < 0) errors[field] = 'Valid positive amount required.'
  })

  if (!String(editForm.value.remarks || '').trim()) {
    errors.remarks = 'Note is required.'
  }

  editErrors.value = errors
  return Object.keys(errors).length === 0
}

const submitEditPayroll = async () => {
  if (!validateEditForm()) return

  editSubmitting.value = true
  try {
    const payload = {
      bonus: toNumber(editForm.value.bonus),
      other_addition: toNumber(editForm.value.other_addition),
      loan_deduction: toNumber(editForm.value.loan_deduction),
      other_deduction: toNumber(editForm.value.other_deduction),
      remarks: String(editForm.value.remarks || '').trim(),
    }
    const updated = await doctorPayrollStore.update(editForm.value.id, payload)
    if (selectedPayroll.value?.id === updated.id) selectedPayroll.value = updated
    toast.success('Doctor payroll updated.')
    closeEditModal()
  } catch (e) {
    editErrors.value = e.errors || {}
    toast.error(e.message || 'Update failed.')
  } finally {
    editSubmitting.value = false
  }
}

const showDetails = async (row) => {
  selectedPayroll.value = row
  detailModalOpen.value = true

  try {
    selectedPayroll.value = await doctorPayrollStore.fetchItem(row.id)
  } catch (e) {
    toast.error(e.message || 'Details load failed.')
  }
}

const closeDetails = () => {
  detailModalOpen.value = false
  selectedPayroll.value = null
}

const resetPrintMode = () => {
  printMode.value = 'list'
  window.removeEventListener('afterprint', resetPrintMode)
}

const buildPdfRows = () => {
  return (list.value || []).map((row, index) => [
    (filters.value.page - 1) * filters.value.per_page + index + 1,
    row.user?.name || '-',
    row.user?.employee_id || '-',
    row.user?.designation?.title || '-',
    formatCurrency(row.basic_salary),
    formatCurrency(row.honorium_total),
    formatCurrency(row.bonus),
    formatCurrency(row.other_addition),
    formatCurrency(getPayable(row)),
    formatCurrency(row.loan_deduction),
    formatCurrency(row.samiti_deduction),
    formatCurrency(row.other_deduction),
    formatCurrency(row.net_payable),
    row.remarks || '',
  ])
}

const exportPdf = () => {
  if (!list.value.length) return

  pdfExporting.value = true
  try {
    const month = filters.value.salary_month || getCurrentMonth()
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })

    doc.setFontSize(14)
    doc.text('Doctor Payroll Report', 40, 34)
    doc.setFontSize(9)
    doc.text(`Company: ${selectedCompanyName.value}`, 40, 52)
    doc.text(`Department: ${selectedDepartmentName.value}`, 280, 52)
    doc.text(`Salary Month: ${month}`, 520, 52)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 66)

    autoTable(doc, {
      startY: 82,
      head: [[
        'S.L',
        'Dr. Name',
        'ID',
        'Designation',
        'Basic',
        'Day Honorium',
        'Bonus',
        'Other Add.',
        'Payable',
        'Loan',
        'Samiti',
        'Other Ded.',
        'Net Payable',
        'Note',
      ]],
      body: buildPdfRows(),
      styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 28 },
        1: { cellWidth: 92 },
        2: { cellWidth: 52 },
        3: { cellWidth: 76 },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right' },
        9: { halign: 'right' },
        10: { halign: 'right' },
        11: { halign: 'right' },
        12: { halign: 'right' },
        13: { cellWidth: 76 },
      },
      didDrawPage: () => {
        const pageSize = doc.internal.pageSize
        const pageHeight = pageSize.height || pageSize.getHeight()
        doc.setFontSize(8)
        doc.text(`Page ${doc.internal.getNumberOfPages()}`, 40, pageHeight - 18)
      },
    })

    doc.save(`doctor-payroll-${month}.pdf`)
  } finally {
    pdfExporting.value = false
  }
}

const printReport = () => {
  printMode.value = 'list'
  window.print()
}

const printSlip = () => {
  printMode.value = 'slip'
  window.addEventListener('afterprint', resetPrintMode)
  setTimeout(() => window.print(), 0)
}

const toNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

const getPayable = (row) =>
  toNumber(row?.basic_salary)
    + toNumber(row?.honorium_total)
    + toNumber(row?.bonus)
    + toNumber(row?.other_addition)

const getTotalDeductions = (row) =>
  toNumber(row?.loan_deduction)
    + toNumber(row?.samiti_deduction)
    + toNumber(row?.other_deduction)

const editHonoriumTotal = computed(() =>
  toNumber(editForm.value.day_honorium) * toNumber(editForm.value.present_days),
)

const editPayable = computed(() =>
  toNumber(editForm.value.basic_salary)
    + editHonoriumTotal.value
    + toNumber(editForm.value.bonus)
    + toNumber(editForm.value.other_addition),
)

const editNetPayable = computed(() =>
  editPayable.value
    - toNumber(editForm.value.loan_deduction)
    - toNumber(editForm.value.samiti_deduction)
    - toNumber(editForm.value.other_deduction),
)

const formatCurrency = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

const formatMoney = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0.00'

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

const formatMonth = (value) => {
  if (!value) return '-'
  const raw = String(value)
  const date = /^\d{4}-\d{2}$/.test(raw)
    ? new Date(`${raw}-01T00:00:00`)
    : new Date(`${raw.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return raw.slice(0, 7)

  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

const numberToWords = (value) => {
  const n = Math.floor(Math.abs(toNumber(value)))
  if (!n) return 'Zero Only'

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const chunkToWords = (num) => {
    let out = ''
    const hundred = Math.floor(num / 100)
    const rest = num % 100

    if (hundred) {
      out += `${ones[hundred]} Hundred`
      if (rest) out += ' '
    }

    if (rest >= 20) {
      out += tens[Math.floor(rest / 10)]
      if (rest % 10) out += ` ${ones[rest % 10]}`
    } else if (rest >= 10) {
      out += teens[rest - 10]
    } else if (rest > 0) {
      out += ones[rest]
    }

    return out
  }

  const parts = []
  const crore = Math.floor(n / 10000000)
  const lakh = Math.floor((n % 10000000) / 100000)
  const thousand = Math.floor((n % 100000) / 1000)
  const remainder = n % 1000

  if (crore) parts.push(`${chunkToWords(crore)} Crore`)
  if (lakh) parts.push(`${chunkToWords(lakh)} Lakh`)
  if (thousand) parts.push(`${chunkToWords(thousand)} Thousand`)
  if (remainder) parts.push(chunkToWords(remainder))

  return `${parts.join(' ')} Only`
}

const statusClass = (status) => {
  const value = String(status || '').toLowerCase()
  if (value === 'paid') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (value === 'approved') return 'bg-blue-50 text-blue-700 border-blue-200'
  if (value === 'generated') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-slate-50 text-slate-600 border-slate-200'
}

const detailRows = computed(() => {
  const row = selectedPayroll.value
  if (!row) return []

  return [
    { label: 'Doctor Name', value: row.user?.name || '-' },
    { label: 'Employee ID', value: row.user?.employee_id || '-' },
    { label: 'Company', value: row.user?.company?.name || '-' },
    { label: 'Department', value: row.user?.department?.name || '-' },
    { label: 'Designation', value: row.user?.designation?.title || '-' },
    { label: 'Salary Month', value: row.salary_month || '-' },
    { label: 'Present Days', value: row.present_days ?? 0 },
    { label: 'Day Honorium Rate', value: formatCurrency(row.day_honorium) },
    { label: 'Basic Salary', value: formatCurrency(row.basic_salary) },
    { label: 'Day Honorium', value: formatCurrency(row.honorium_total) },
    { label: 'Bonus', value: formatCurrency(row.bonus) },
    { label: 'Other Addition', value: formatCurrency(row.other_addition) },
    { label: 'Payable', value: formatCurrency(getPayable(row)) },
    { label: 'Loan Deduction', value: formatCurrency(row.loan_deduction) },
    { label: 'Samiti Deduction', value: formatCurrency(row.samiti_deduction) },
    { label: 'Other Deduction', value: formatCurrency(row.other_deduction) },
    { label: 'Net Payable', value: formatCurrency(row.net_payable) },
    { label: 'Status', value: row.status || 'Draft' },
    { label: 'Note', value: row.remarks || '-' },
  ]
})

const slipCompanyName = computed(() => selectedPayroll.value?.user?.company?.name || selectedCompanyName.value || '-')
const slipEmployeeName = computed(() => selectedPayroll.value?.user?.name || '-')
const slipEmployeeId = computed(() => selectedPayroll.value?.user?.employee_id || '-')
const slipDesignation = computed(() => selectedPayroll.value?.user?.designation?.title || selectedPayroll.value?.user?.designation?.name || '-')
const slipDepartment = computed(() => selectedPayroll.value?.user?.department?.name || '-')
const slipJoiningDate = computed(() => selectedPayroll.value?.user?.joining_date || null)
const slipEarningsRows = computed(() => {
  const row = selectedPayroll.value || {}
  return [
    { label: 'Basic Salary', amount: toNumber(row.basic_salary) },
    { label: 'Day Honorium', amount: toNumber(row.honorium_total) },
    { label: 'Bonus', amount: toNumber(row.bonus) },
    { label: 'Other Addition', amount: toNumber(row.other_addition) },
  ]
})
const slipDeductionRows = computed(() => {
  const row = selectedPayroll.value || {}
  return [
    { label: 'Loan', amount: toNumber(row.loan_deduction) },
    { label: 'Samiti', amount: toNumber(row.samiti_deduction) },
    { label: 'Other Deduction', amount: toNumber(row.other_deduction) },
  ]
})
const slipTotalEarnings = computed(() => getPayable(selectedPayroll.value))
const slipTotalDeductions = computed(() =>
  toNumber(selectedPayroll.value?.loan_deduction)
    + toNumber(selectedPayroll.value?.samiti_deduction)
    + toNumber(selectedPayroll.value?.other_deduction),
)
const slipNetPay = computed(() => toNumber(selectedPayroll.value?.net_payable))
const slipRowCount = computed(() => Math.max(slipEarningsRows.value.length, slipDeductionRows.value.length))

watch(() => filters.value.company_id, async () => {
  filters.value.department_id = ''
  await departmentStore.fetchDepartments(filters.value.company_id || null)
})

onMounted(async () => {
  applyRouteQueryToFilters()
  await Promise.all([
    companyStore.fetchCompanies(),
    departmentStore.fetchDepartments(filters.value.company_id || null),
    load(),
  ])
})
</script>

<template>
  <div class="space-y-4 p-4 md:p-6 min-w-0 w-full max-w-full overflow-x-hidden" :class="`print-mode-${printMode}`">
    <div class="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-emerald-50 p-5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="title-md md:title-lg">Doctor Payrolls</h1>
          <p class="mt-1 text-sm text-slate-500">Separate doctor payroll report with honorium, additions, loan, Samiti and other deduction.</p>
        </div>
        <div class="flex flex-wrap gap-2 no-print">
          <button class="btn-3" @click="router.push({ name: 'PayrollList' })">
            <i class="far fa-list"></i> Others Payroll
          </button>
          <button class="btn-3" @click="printReport" :disabled="loading || !list.length">
            <i class="far fa-print"></i> Print
          </button>
          <button class="btn-3" @click="exportPdf" :disabled="loading || pdfExporting || !list.length">
            <i class="far" :class="pdfExporting ? 'fa-spinner fa-spin' : 'fa-file-pdf'"></i> PDF
          </button>
          <button class="btn-2" @click="router.push({ name: 'PayrollBatchGenerate', query: { line_type: 'doctor' } })">
            <i class="far fa-plus"></i> Generate
          </button>
        </div>
      </div>
    </div>

    <div class="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm no-print">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1.2fr_0.9fr_0.9fr_auto] items-end">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Company</label>
          <select
            v-model="filters.company_id"
            @change="() => { filters.page = 1; load() }"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Companies</option>
            <option v-for="company in companies" :key="company.id" :value="company.id">{{ company.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Department</label>
          <select
            v-model="filters.department_id"
            @change="() => { filters.page = 1; load() }"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Departments</option>
            <option v-for="department in filteredDepartments" :key="department.id" :value="department.id">{{ department.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Salary Month</label>
          <input
            v-model="filters.salary_month"
            type="month"
            @change="() => { filters.page = 1; load() }"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            v-model="filters.status"
            @change="() => { filters.page = 1; load() }"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Statuses</option>
            <option v-for="status in statusOptions" :key="status" :value="status">{{ status }}</option>
          </select>
        </div>
        <button class="btn-3 h-[42px]" @click="resetFilters">
          <i class="far fa-undo"></i> Reset
        </button>
      </div>
    </div>

    <div class="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4 no-print">
      <div
        v-for="card in summaryCards"
        :key="card.label"
        class="rounded-2xl border p-3 shadow-sm"
        :class="card.tone"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">{{ card.label }}</p>
        <p class="mt-1 text-lg font-bold">{{ card.money ? formatCurrency(card.value) : card.value }}</p>
      </div>
    </div>

    <LoaderView v-if="loading" />

    <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-center gap-2">
      <i class="fas fa-exclamation-circle"></i> {{ error }}
    </div>

    <div v-else-if="!list.length" class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
      <i class="fas fa-user-md text-4xl text-gray-300 mb-3"></i>
      <p class="text-lg font-medium text-gray-500">No doctor payrolls found</p>
      <p class="text-sm text-gray-400 mt-1">Generate doctor payrolls for the selected month.</p>
    </div>

    <div v-else class="print-area min-w-0 w-full max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="print-only border-b border-slate-200 px-4 py-3">
        <h2 class="text-base font-semibold text-slate-900">Doctor Payroll Report</h2>
        <div class="mt-1 grid gap-1 text-xs text-slate-700 sm:grid-cols-3">
          <p><span class="font-semibold">Company:</span> {{ selectedCompanyName }}</p>
          <p><span class="font-semibold">Department:</span> {{ selectedDepartmentName }}</p>
          <p><span class="font-semibold">Salary Month:</span> {{ filters.salary_month || '-' }}</p>
        </div>
      </div>

      <div class="border-b border-slate-100 px-4 py-3 no-print">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-semibold text-slate-900">Detailed Doctor Payroll Report</h2>
            <p class="text-sm text-slate-500">Reference-style breakdown for each doctor.</p>
          </div>
          <p class="text-xs text-slate-400">Rows: {{ pagination.total || list.length }}</p>
        </div>
      </div>

      <div class="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
        <table class="doctor-payroll-table min-w-[1540px] w-full table-fixed border-collapse text-[10px] leading-tight">
          <colgroup>
            <col class="w-[38px]" />
            <col class="w-[170px]" />
            <col class="w-[82px]" />
            <col class="w-[116px]" />
            <col class="w-[60px]" />
            <col class="w-[50px]" />
            <col class="w-[84px]" />
            <col class="w-[70px]" />
            <col class="w-[70px]" />
            <col class="" />
            <col class="w-[80px]" />
            <col class="w-[60px]" />
            <col class="w-[84px]" />
            <col class="w-[82px]" />
            <col class="w-[92px]" />
            <col class="w-[50]" />
            <col class="w-[100px]" />
            <col class="w-[88px] no-print" />
            <col class="w-[98px] no-print" />
          </colgroup>
          <thead class="sticky top-0 z-10 text-slate-800">
            <tr>
              <th rowspan="2" class="border border-slate-200 bg-slate-50 px-1.5 py-1.5 text-center">#</th>
              <th rowspan="2" class="border border-slate-200 bg-slate-50 px-1.5 py-1.5 text-left">Doctor</th>
              <th rowspan="2" class="border border-slate-200 bg-slate-50 px-1.5 py-1.5 text-left">Emp ID</th>
              <th rowspan="2" class="border border-slate-200 bg-slate-50 px-1.5 py-1.5 text-left">Designation</th>
              <th rowspan="2" class="border border-slate-200 bg-slate-50 px-1.5 py-1.5 text-center">Month</th>
              <th rowspan="2" class="border border-slate-200 bg-slate-50 px-1.5 py-1.5 text-center">P</th>
              <th colspan="5" class="border border-emerald-200 bg-emerald-50 px-1.5 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-emerald-900">Earnings</th>
              <th colspan="4" class="border border-rose-200 bg-rose-50 px-1.5 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-rose-900">Deductions</th>
              <th rowspan="2" class="border border-slate-200 bg-slate-50 px-1.5 py-1.5 text-right">Net Payable</th>
              <th rowspan="2" class="border border-slate-200 bg-slate-50 px-1.5 py-1.5 text-left">Note</th>
              <th rowspan="2" class="border border-slate-200 bg-slate-50 px-1.5 py-1.5 text-center no-print">Status</th>
              <th rowspan="2" class="border border-slate-200 bg-slate-50 px-1.5 py-1.5 text-center no-print">Actions</th>
            </tr>
            <tr>
              <th class="border border-slate-200 bg-slate-50 px-1.5 py-1 text-right">Basic</th>
              <th class="border border-slate-200 bg-slate-50 px-1.5 py-1 text-right">Day Honorium</th>
              <th class="border border-slate-200 bg-slate-50 px-1.5 py-1 text-right">Bonus</th>
              <th class="border border-slate-200 bg-slate-50 px-1.5 py-1 text-right">Other Add.</th>
              <th class="border border-slate-200 bg-slate-50 px-1.5 py-1 text-right">E.Total</th>
              <th class="border border-slate-200 bg-slate-50 px-1.5 py-1 text-right">Loan</th>
              <th class="border border-slate-200 bg-slate-50 px-1.5 py-1 text-right">Samiti</th>
              <th class="border border-slate-200 bg-slate-50 px-1.5 py-1 text-right">Other</th>
              <th class="border border-slate-200 bg-slate-50 px-1.5 py-1 text-right">D.Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in list" :key="row.id" class="odd:bg-white even:bg-slate-50/40 hover:bg-blue-50/40 transition-colors">
              <td class="border border-slate-200 px-1.5 py-1.5 text-center text-slate-500">{{ (filters.page - 1) * filters.per_page + index + 1 }}</td>
              <td class="border border-slate-200 px-1.5 py-1.5">
                <div class="truncate font-semibold text-slate-900" :title="row.user?.name || '-'">{{ row.user?.name || '-' }}</div>
                <div class="mt-0.5 truncate text-[10px] text-blue-600" :title="row.user?.department?.name || '-'">{{ row.user?.department?.name || '-' }}</div>
              </td>
              <td class="border border-slate-200 px-1.5 py-1.5 text-slate-700">{{ row.user?.employee_id || '-' }}</td>
              <td class="border border-slate-200 px-1.5 py-1.5 text-slate-700">{{ row.user?.designation?.title || '-' }}</td>
              <td class="border border-slate-200 px-1.5 py-1.5 text-center text-slate-700">{{ row.salary_month || '-' }}</td>
              <td class="border border-slate-200 px-1.5 py-1.5 text-center font-mono text-slate-700">{{ row.present_days || 0 }}</td>
              <td class="border border-slate-200 px-1.5 py-1.5 text-right font-mono">{{ formatCurrency(row.basic_salary) }}</td>
              <td class="border border-slate-200 px-1.5 py-1.5 text-right font-mono">{{ formatCurrency(row.honorium_total) }}</td>
              <td class="border border-slate-200 px-1.5 py-1.5 text-right font-mono">{{ formatCurrency(row.bonus) }}</td>
              <td class="border border-slate-200 px-1.5 py-1.5 text-right font-mono text-cyan-700">{{ formatCurrency(row.other_addition) }}</td>
              <td class="border border-slate-200 px-1.5 py-1.5 text-right font-mono font-semibold text-emerald-700">{{ formatCurrency(getPayable(row)) }}</td>
              <td class="border border-slate-200 px-1.5 py-1.5 text-right font-mono text-rose-600">{{ formatCurrency(row.loan_deduction) }}</td>
              <td class="border border-slate-200 px-1.5 py-1.5 text-right font-mono text-rose-600">{{ formatCurrency(row.samiti_deduction) }}</td>
              <td class="border border-slate-200 px-1.5 py-1.5 text-right font-mono text-rose-600">{{ formatCurrency(row.other_deduction) }}</td>
              <td class="border border-slate-200 px-1.5 py-1.5 text-right font-mono font-semibold text-rose-700">{{ formatCurrency(getTotalDeductions(row)) }}</td>
              <td class="border border-slate-200 px-1.5 py-1.5 text-right font-mono font-bold text-blue-800">{{ formatCurrency(row.net_payable) }}</td>
              <td class="border border-slate-200 px-1.5 py-1.5 text-slate-600">
                <span class="block truncate" :title="row.remarks || ''">{{ row.remarks || '-' }}</span>
              </td>
              <td class="border border-slate-200 px-1.5 py-1.5 text-center no-print">
                <div class="flex flex-wrap items-center justify-center gap-1">
                  <span class="inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold" :class="statusClass(row.status)">
                    {{ row.status || 'Draft' }}
                  </span>
                  <button
                    v-if="row.status === 'Draft' || row.status === 'Generated'"
                    class="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-50"
                    @click="approvePayroll(row)"
                  >
                    Approve
                  </button>
                  <button
                    v-if="row.status === 'Approved' || row.status === 'Generated'"
                    class="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50"
                    @click="markPayrollPaid(row)"
                  >
                    Paid
                  </button>
                </div>
              </td>
              <td class="border border-slate-200 px-1.5 py-1.5 text-center no-print">
                <div class="flex flex-wrap items-center justify-center gap-1">
                  <button
                    v-if="row.status === 'Draft'"
                    class="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-50"
                    @click="openEditModal(row)"
                  >
                    <i class="far fa-edit"></i> Edit
                  </button>
                  <button
                    class="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-50"
                    @click="showDetails(row)"
                  >
                    <i class="far fa-eye"></i> Show
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="no-print">
      <PaginationBar
        v-if="pagination.total > 0"
        :page="pagination.current_page || filters.page"
        :per-page="pagination.per_page || filters.per_page"
        :total="pagination.total || list.length"
        :last-page="pagination.last_page || 1"
        @page-change="(page) => { filters.page = page; load() }"
      />
    </div>

    <div
      v-if="detailModalOpen"
      class="doctor-slip-modal fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      @click.self="closeDetails"
    >
      <div class="w-full max-w-[900px] overflow-hidden rounded-2xl bg-white shadow-xl">
        <div class="no-print flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-3">
          <div>
            <h2 class="text-base font-semibold text-slate-900">Doctor Payroll Details</h2>
            <p class="mt-1 text-sm text-slate-500">
              {{ selectedPayroll?.user?.name || '-' }} · {{ selectedPayroll?.salary_month || '-' }}
            </p>
          </div>
          <button class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700" @click="closeDetails">
            <i class="far fa-times"></i>
          </button>
        </div>

        <div class="max-h-[76vh] overflow-y-auto bg-slate-50 px-4 py-5 print:max-h-none print:overflow-visible print:bg-white print:p-0">
          <div class="doctor-slip-paper mx-auto bg-white shadow-xl ring-1 ring-slate-300 print:shadow-none print:ring-0">
            <div class="slip-paper-inner">
              <div class="text-center">
                <div class="mt-1 text-[15px] font-medium text-slate-700">{{ slipCompanyName }}</div>
                <div class="mt-1 text-[13px] text-slate-600">System generated payslip</div>
              </div>

              <div class="slip-info-grid mt-8 text-[14px] text-slate-800">
                <div class="space-y-1">
                  <div class="flex gap-2">
                    <span class="w-36 text-slate-600">Date of Joining</span>
                    <span>: {{ formatDate(slipJoiningDate) }}</span>
                  </div>
                  <div class="flex gap-2">
                    <span class="w-36 text-slate-600">Pay Period</span>
                    <span>: {{ formatMonth(selectedPayroll?.salary_month) }}</span>
                  </div>
                  <div class="flex gap-2">
                    <span class="w-36 text-slate-600">Employee ID</span>
                    <span>: {{ slipEmployeeId }}</span>
                  </div>
                </div>
                <div class="space-y-1">
                  <div class="flex gap-2">
                    <span class="w-36 text-slate-600">Employee name</span>
                    <span>: {{ slipEmployeeName }}</span>
                  </div>
                  <div class="flex gap-2">
                    <span class="w-36 text-slate-600">Designation</span>
                    <span>: {{ slipDesignation }}</span>
                  </div>
                  <div class="flex gap-2">
                    <span class="w-36 text-slate-600">Department</span>
                    <span>: {{ slipDepartment }}</span>
                  </div>
                </div>
              </div>

              <div class="mt-6 overflow-hidden border border-slate-700">
                <table class="slip-table w-full border-collapse text-[13px]">
                  <thead>
                    <tr class="bg-slate-100 text-slate-900">
                      <th class="border border-slate-700 px-3 py-2 text-center font-semibold">Earnings</th>
                      <th class="border border-slate-700 px-3 py-2 text-center font-semibold">Amount</th>
                      <th class="border border-slate-700 px-3 py-2 text-center font-semibold">Deductions</th>
                      <th class="border border-slate-700 px-3 py-2 text-center font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="index in slipRowCount" :key="index">
                      <td class="border border-slate-700 px-3 py-2">{{ slipEarningsRows[index - 1]?.label || '' }}</td>
                      <td class="border border-slate-700 px-3 py-2 text-right font-mono font-semibold">
                        {{ slipEarningsRows[index - 1] ? formatMoney(slipEarningsRows[index - 1].amount) : '' }}
                      </td>
                      <td class="border border-slate-700 px-3 py-2">{{ slipDeductionRows[index - 1]?.label || '' }}</td>
                      <td class="border border-slate-700 px-3 py-2 text-right font-mono font-semibold">
                        {{ slipDeductionRows[index - 1] ? formatMoney(slipDeductionRows[index - 1].amount) : '' }}
                      </td>
                    </tr>
                    <tr class="font-semibold">
                      <td class="border border-slate-700 px-3 py-2 text-right">Total Earnings</td>
                      <td class="border border-slate-700 px-3 py-2 text-right font-mono">{{ formatMoney(slipTotalEarnings) }}</td>
                      <td class="border border-slate-700 px-3 py-2 text-right">Total Deductions</td>
                      <td class="border border-slate-700 px-3 py-2 text-right font-mono">{{ formatMoney(slipTotalDeductions) }}</td>
                    </tr>
                    <tr class="font-semibold">
                      <td class="border border-slate-700 px-3 py-2 text-right" colspan="3">Net Pay</td>
                      <td class="border border-slate-700 px-3 py-2 text-right font-mono">{{ formatMoney(slipNetPay) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="mt-5">
                <div class="slip-amount-box">
                  <div class="text-[15px] font-semibold text-slate-800">{{ numberToWords(slipNetPay) }}</div>
                  <div class="mt-1 text-[16px] font-bold text-slate-600">{{ formatMoney(slipNetPay) }}</div>
                </div>
              </div>

              <div class="slip-signature-grid mt-14">
                <div>
                  <div class="signature-line"></div>
                  <div class="mt-2 text-center text-sm text-slate-700">Doctor's Signature</div>
                </div>
                <div>
                  <div class="signature-line"></div>
                  <div class="mt-2 text-center text-sm text-slate-700">Authorized Signature</div>
                </div>
              </div>

              <div v-if="selectedPayroll?.remarks" class="mt-8 border-t border-slate-200 pt-3 text-center text-sm text-slate-600">
                Note: {{ selectedPayroll.remarks }}
              </div>
            </div>
          </div>

          <div class="hidden mb-4 grid gap-3 md:grid-cols-4">
            <div class="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Payable</p>
              <p class="mt-1 font-mono text-lg font-bold text-emerald-800">{{ formatCurrency(getPayable(selectedPayroll)) }}</p>
            </div>
            <div class="rounded-xl border border-rose-100 bg-rose-50 p-3">
              <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">Loan</p>
              <p class="mt-1 font-mono text-lg font-bold text-rose-800">{{ formatCurrency(selectedPayroll?.loan_deduction) }}</p>
            </div>
            <div class="rounded-xl border border-cyan-100 bg-cyan-50 p-3">
              <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700">Other Add.</p>
              <p class="mt-1 font-mono text-lg font-bold text-cyan-800">{{ formatCurrency(selectedPayroll?.other_addition) }}</p>
            </div>
            <div class="rounded-xl border border-amber-100 bg-amber-50 p-3">
              <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Samiti</p>
              <p class="mt-1 font-mono text-lg font-bold text-amber-800">{{ formatCurrency(selectedPayroll?.samiti_deduction) }}</p>
            </div>
            <div class="rounded-xl border border-rose-100 bg-rose-50 p-3">
              <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">Other Ded.</p>
              <p class="mt-1 font-mono text-lg font-bold text-rose-800">{{ formatCurrency(selectedPayroll?.other_deduction) }}</p>
            </div>
            <div class="rounded-xl border border-blue-100 bg-blue-50 p-3">
              <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">Net Payable</p>
              <p class="mt-1 font-mono text-lg font-bold text-blue-800">{{ formatCurrency(selectedPayroll?.net_payable) }}</p>
            </div>
          </div>

          <div class="hidden grid gap-3 md:grid-cols-2">
            <div
              v-for="detail in detailRows"
              :key="detail.label"
              class="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{{ detail.label }}</p>
              <p class="mt-1 break-words text-sm font-semibold text-slate-800">{{ detail.value }}</p>
            </div>
          </div>
        </div>

        <div class="no-print flex justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3">
          <button class="btn-3" @click="closeDetails">Close</button>
          <button
            v-if="selectedPayroll?.status === 'Draft'"
            class="btn-3"
            @click="openEditModal(selectedPayroll)"
          >
            <i class="far fa-edit"></i> Edit
          </button>
          <button class="btn-3" @click="printSlip">
            <i class="far fa-print"></i> Print Slip
          </button>
          <button
            v-if="selectedPayroll?.status === 'Draft' || selectedPayroll?.status === 'Generated'"
            class="btn-2"
            @click="approvePayroll(selectedPayroll)"
          >
            Approve
          </button>
          <button
            v-if="selectedPayroll?.status === 'Approved' || selectedPayroll?.status === 'Generated'"
            class="btn-2"
            @click="markPayrollPaid(selectedPayroll)"
          >
            Mark Paid
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="editModalOpen"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 no-print"
      @click.self="closeEditModal"
    >
      <div class="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div class="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 class="text-base font-semibold text-slate-900">Edit Doctor Payroll</h2>
            <p class="mt-1 text-sm text-slate-500">
              {{ selectedPayroll?.user?.name || '-' }} · {{ selectedPayroll?.salary_month || '-' }}
            </p>
          </div>
          <button class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700" @click="closeEditModal">
            <i class="far fa-times"></i>
          </button>
        </div>

        <form class="max-h-[75vh] overflow-y-auto p-5" @submit.prevent="submitEditPayroll">
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 class="text-sm font-semibold text-slate-800">Fixed Payroll Info</h3>
            <div class="mt-3 grid gap-4 md:grid-cols-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Basic Salary</label>
                <input v-model.number="editForm.basic_salary" type="number" readonly class="w-full cursor-not-allowed border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-slate-600" />
                <p v-if="editErrors.basic_salary" class="mt-1 text-xs text-red-600">{{ editErrors.basic_salary }}</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Day Honorium Rate</label>
                <input v-model.number="editForm.day_honorium" type="number" readonly class="w-full cursor-not-allowed border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-slate-600" />
                <p v-if="editErrors.day_honorium" class="mt-1 text-xs text-red-600">{{ editErrors.day_honorium }}</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Present Days</label>
                <input v-model.number="editForm.present_days" type="number" readonly class="w-full cursor-not-allowed border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-slate-600" />
                <p v-if="editErrors.present_days" class="mt-1 text-xs text-red-600">{{ editErrors.present_days }}</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Samiti Deduction</label>
                <input v-model.number="editForm.samiti_deduction" type="number" readonly class="w-full cursor-not-allowed border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-slate-600" />
                <p v-if="editErrors.samiti_deduction" class="mt-1 text-xs text-red-600">{{ editErrors.samiti_deduction }}</p>
              </div>
            </div>
          </div>

          <div class="mt-4 grid gap-4 md:grid-cols-2">
            <div class="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <h3 class="text-sm font-semibold text-emerald-800">Additions</h3>
              <div class="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Bonus</label>
                  <input v-model.number="editForm.bonus" type="number" min="0" step="0.01" class="w-full border border-gray-300 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  <p v-if="editErrors.bonus" class="mt-1 text-xs text-red-600">{{ editErrors.bonus }}</p>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Other Addition</label>
                  <input v-model.number="editForm.other_addition" type="number" min="0" step="0.01" class="w-full border border-gray-300 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  <p v-if="editErrors.other_addition" class="mt-1 text-xs text-red-600">{{ editErrors.other_addition }}</p>
                </div>
              </div>
            </div>

            <div class="rounded-xl border border-rose-100 bg-rose-50 p-4">
              <h3 class="text-sm font-semibold text-rose-800">Deductions</h3>
              <div class="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Loan Deduction</label>
                  <input v-model.number="editForm.loan_deduction" type="number" min="0" step="0.01" class="w-full border border-gray-300 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
                  <p v-if="editErrors.loan_deduction" class="mt-1 text-xs text-red-600">{{ editErrors.loan_deduction }}</p>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Other Deduction</label>
                  <input v-model.number="editForm.other_deduction" type="number" min="0" step="0.01" class="w-full border border-gray-300 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
                  <p v-if="editErrors.other_deduction" class="mt-1 text-xs text-red-600">{{ editErrors.other_deduction }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-4">
            <label class="block text-xs font-medium text-gray-600 mb-1">Note <span class="text-red-500">*</span></label>
            <textarea v-model.trim="editForm.remarks" rows="3" required class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"></textarea>
            <p v-if="editErrors.remarks" class="mt-1 text-xs text-red-600">{{ editErrors.remarks }}</p>
          </div>

          <div class="mt-5 grid gap-3 md:grid-cols-4">
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Day Honorium</p>
              <p class="mt-1 font-mono text-base font-bold text-slate-800">{{ formatCurrency(editHonoriumTotal) }}</p>
            </div>
            <div class="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Payable</p>
              <p class="mt-1 font-mono text-base font-bold text-emerald-800">{{ formatCurrency(editPayable) }}</p>
            </div>
            <div class="rounded-xl border border-rose-100 bg-rose-50 p-3">
              <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">Deductions</p>
              <p class="mt-1 font-mono text-base font-bold text-rose-800">{{ formatCurrency(toNumber(editForm.loan_deduction) + toNumber(editForm.samiti_deduction) + toNumber(editForm.other_deduction)) }}</p>
            </div>
            <div class="rounded-xl border border-blue-100 bg-blue-50 p-3">
              <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">Net Payable</p>
              <p class="mt-1 font-mono text-base font-bold text-blue-800">{{ formatCurrency(editNetPayable) }}</p>
            </div>
          </div>

          <div class="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" class="btn-3" :disabled="editSubmitting" @click="closeEditModal">Cancel</button>
            <button type="submit" class="btn-2" :disabled="editSubmitting">
              <i class="far" :class="editSubmitting ? 'fa-spinner fa-spin' : 'fa-save'"></i>
              {{ editSubmitting ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.doctor-payroll-table {
  table-layout: fixed;
}

.doctor-payroll-table th,
.doctor-payroll-table td {
  line-height: 1.15;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.print-only {
  display: none;
}

.doctor-slip-paper {
  width: min(178mm, 100%);
  min-height: 238mm;
  color: #111827;
}

.slip-paper-inner {
  padding: 12mm 18mm 10mm;
}

.slip-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 10mm;
}

.slip-table {
  table-layout: fixed;
}

.slip-table th,
.slip-table td {
  word-break: break-word;
}

.slip-amount-box {
  width: 75%;
  text-align: left;
}

.slip-signature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10mm;
}

.signature-line {
  border-top: 1px solid #6b7280;
  margin-top: 4rem;
}

@media print {
  @page {
    size: A4;
    margin: 10mm;
  }

  :global(body) {
    background: #fff !important;
  }

  :global(body *) {
    visibility: hidden;
  }

  .print-area,
  .print-area * {
    visibility: visible;
  }

  .print-mode-slip .print-area,
  .print-mode-slip .print-area * {
    visibility: hidden !important;
  }

  .print-mode-list .doctor-slip-modal {
    display: none !important;
    visibility: hidden !important;
  }

  .print-mode-slip .doctor-slip-paper,
  .print-mode-slip .doctor-slip-paper * {
    visibility: visible !important;
  }

  .print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }

  .no-print {
    display: none !important;
    visibility: hidden !important;
  }

  .print-only {
    display: block !important;
  }

  .print-area {
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    overflow: visible !important;
  }

  .doctor-payroll-table {
    min-width: 0 !important;
    width: 100% !important;
    font-size: 9px !important;
  }

  .doctor-payroll-table th,
  .doctor-payroll-table td {
    padding: 4px !important;
    white-space: normal !important;
    color: #000 !important;
  }

  .doctor-payroll-table col.no-print {
    display: none !important;
  }

  .print-mode-slip .doctor-slip-modal {
    position: static !important;
    display: block !important;
    background: #fff !important;
    padding: 0 !important;
  }

  .print-mode-slip .doctor-slip-paper {
    position: absolute;
    left: 0;
    top: 0;
    width: auto;
    min-height: auto;
    box-shadow: none !important;
  }

  .print-mode-slip .slip-paper-inner {
    padding: 0;
  }

  .print-mode-slip .slip-info-grid,
  .print-mode-slip .slip-signature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
