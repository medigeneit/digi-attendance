<script setup>
import { useCompanyBankAccountStore } from '@/stores/companyBankAccount'
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, ref, watch } from 'vue'

const props = defineProps({
  show:         { type: Boolean, default: false },
  bankAccount:  { type: Object,  default: null  },
  employeeRows: { type: Array,   default: () => [] },
  salaryMonth:  { type: String,  default: ''   },
})
const emit = defineEmits(['close'])

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const now = new Date()

// ─── Letter control state ─────────────────────────────────────────────────────
const selMonth = ref(now.getMonth())
const selYear  = ref(now.getFullYear())
const dateDay  = ref(String(now.getDate()).padStart(2, '0'))
const dateMon  = ref(String(now.getMonth() + 1).padStart(2, '0'))
const dateYear = ref(String(now.getFullYear()))
const serial   = ref('01')

// ─── Pad (letterhead) config — persisted in localStorage ─────────────────────
const PAD_KEY = 'salary-letter-pad'
const pad = reactive({
  headerHeight: 3.5,  // cm — empty space reserved for pre-printed header
  footerHeight: 2.5,  // cm — empty space reserved for pre-printed footer
})
const showPadConfig = ref(false)

function loadPad() {
  try {
    Object.assign(pad, JSON.parse(localStorage.getItem(PAD_KEY) || '{}'))
  } catch { /* ignore */ }
}
watch(pad, () => localStorage.setItem(PAD_KEY, JSON.stringify({ ...pad })), { deep: true })

// ─── Bank account selection ───────────────────────────────────────────────────
const bankAccStore = useCompanyBankAccountStore()
const { items: bankAccounts } = storeToRefs(bankAccStore)
const selectedBankAcc = ref(null)

const activeBankAcc = computed(() => props.bankAccount || selectedBankAcc.value)
const acName        = computed(() => activeBankAcc.value?.account_name   || '—')
const acNumber      = computed(() => activeBankAcc.value?.account_number || '—')

// Sync org name display in letter body from bank account
const orgName = computed(() => activeBankAcc.value?.account_name || '—')

watch(() => props.salaryMonth, (sm) => {
  if (!sm) return
  const [y, m] = sm.split('-').map(Number)
  if (y) selYear.value  = y
  if (m) selMonth.value = m - 1
}, { immediate: true })

// ─── Computed letter values ───────────────────────────────────────────────────
const monthLabel   = computed(() => MONTHS[selMonth.value])
const letterNo     = computed(() => `Salary ${monthLabel.value}'${selYear.value}/${String(serial.value).padStart(2,'00')}`)
const subjectMonth = computed(() => `${monthLabel.value}' ${selYear.value}`)
const letterDate   = computed(() =>
  `${String(dateDay.value).padStart(2,'0')}.${String(dateMon.value).padStart(2,'0')}.${dateYear.value}`
)
const yearOpts = computed(() => {
  const arr = []
  for (let y = 2020; y <= now.getFullYear() + 3; y++) arr.push(y)
  return arr
})

// ─── Table data ───────────────────────────────────────────────────────────────
const hasRows    = computed(() => props.employeeRows?.length > 0)
const tableRows  = computed(() => props.employeeRows || [])
const emptyCount = computed(() => hasRows.value ? 0 : 18)
const tableTotal = computed(() => tableRows.value.reduce((s, r) => s + Number(r.amount || 0), 0))

function fmtAmount(val) {
  const n = Number(val)
  return Number.isFinite(n)
    ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
    : '—'
}

// ─── Column customization ─────────────────────────────────────────────────────
const ALL_COLS = [
  { key: 'sl',         label: 'Sl',           locked: true  },
  { key: 'name',       label: 'Name',         locked: true  },
  { key: 'employeeId', label: 'Emp. ID',       locked: false },
  { key: 'accountNo',  label: 'Account No.',  locked: false },
  { key: 'amount',     label: 'Amount (BDT)', locked: false },
]
const colVis = reactive(Object.fromEntries(ALL_COLS.map(c => [c.key, c.key !== 'employeeId'])))
const activeCols = computed(() => ALL_COLS.filter(c => colVis[c.key]))

function cellValue(col, emp, idx) {
  switch (col.key) {
    case 'sl':         return idx + 1
    case 'name':       return emp.name       ?? '—'
    case 'employeeId': return emp.employeeId ?? '—'
    case 'accountNo':  return emp.accountNo  ?? '—'
    case 'amount':     return fmtAmount(emp.amount)
    default:           return '—'
  }
}
function blankCellValue(col, n) { return col.key === 'sl' ? n : '' }

function doPrint() { window.print() }

onMounted(async () => {
  loadPad()
  if (!bankAccounts.value.length) await bankAccStore.fetchCompanyBankAccounts()
  if (!props.bankAccount && !selectedBankAcc.value && bankAccounts.value.length) {
    selectedBankAcc.value = bankAccounts.value.find(b => String(b.status).toLowerCase() === 'active') || bankAccounts.value[0]
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[9999] overflow-y-auto bg-gray-100 print:bg-white">

      <!-- ── Control bar (hidden on print) ──────────────────────────────────── -->
      <div class="print:hidden sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">

        <!-- Main row -->
        <div class="flex flex-wrap items-end gap-2 px-4 py-2">

          <!-- Label -->
          <div class="shrink-0 self-center pr-3 border-r border-slate-200 mr-1">
            <p class="text-[10px] font-bold uppercase tracking-wider text-blue-600">Transfer Letter</p>
            <p class="text-[11px] text-slate-400">{{ hasRows ? `${tableRows.length} employees` : 'Blank table' }}</p>
          </div>

          <!-- Bank account selector (only when prop not provided) -->
          <div v-if="!bankAccount">
            <label class="block text-[10px] text-slate-500 mb-0.5">From Account</label>
            <select
              v-model="selectedBankAcc"
              class="h-8 max-w-[200px] rounded border border-blue-300 bg-blue-50 px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option :value="null" disabled>— Select account —</option>
              <option v-for="ba in bankAccounts" :key="ba.id" :value="ba">
                {{ ba.account_name }} · {{ ba.account_number }}
              </option>
            </select>
          </div>

          <!-- Month -->
          <div>
            <label class="block text-[10px] text-slate-500 mb-0.5">Month</label>
            <select v-model="selMonth" class="h-8 rounded border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
              <option v-for="(m,i) in MONTHS" :key="i" :value="i">{{ m }}</option>
            </select>
          </div>

          <!-- Year -->
          <div>
            <label class="block text-[10px] text-slate-500 mb-0.5">Year</label>
            <select v-model="selYear" class="h-8 rounded border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
              <option v-for="y in yearOpts" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>

          <!-- Date -->
          <div>
            <label class="block text-[10px] text-slate-500 mb-0.5">Date (DD . MM . YYYY)</label>
            <div class="flex items-center gap-1">
              <input v-model="dateDay"  type="number" min="1" max="31"   class="h-8 w-10 rounded border border-slate-200 px-1 text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
              <span class="text-slate-300">.</span>
              <input v-model="dateMon"  type="number" min="1" max="12"   class="h-8 w-10 rounded border border-slate-200 px-1 text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
              <span class="text-slate-300">.</span>
              <input v-model="dateYear" type="number" min="2020" max="2099" class="h-8 w-16 rounded border border-slate-200 px-1 text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
          </div>

          <!-- Serial -->
          <div>
            <label class="block text-[10px] text-slate-500 mb-0.5">Serial</label>
            <input v-model="serial" type="text" maxlength="4" class="h-8 w-14 rounded border border-slate-200 px-2 text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
          </div>

          <!-- Column toggles -->
          <div>
            <label class="block text-[10px] text-slate-500 mb-0.5">Columns</label>
            <div class="flex items-center gap-1">
              <button
                v-for="col in ALL_COLS" :key="col.key"
                type="button"
                class="inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold transition"
                :class="colVis[col.key] ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-400'"
                :disabled="col.locked"
                @click="!col.locked && (colVis[col.key] = !colVis[col.key])"
              >
                <i class="text-[8px]" :class="colVis[col.key] ? 'fas fa-check' : 'fas fa-times'"></i>
                {{ col.label }}
              </button>
            </div>
          </div>

          <!-- Spacer -->
          <div class="flex-1"></div>

          <!-- Total -->
          <span v-if="hasRows" class="shrink-0 self-center text-[11px] text-slate-500">
            Total: <strong>{{ fmtAmount(tableTotal) }}</strong>
          </span>

          <!-- Pad config toggle -->
          <button
            type="button"
            class="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition"
            :class="showPadConfig
              ? 'border-violet-300 bg-violet-50 text-violet-700'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
            @click="showPadConfig = !showPadConfig"
          >
            <i class="far fa-image text-[11px]"></i>
            Pad
            <i class="fas text-[8px]" :class="showPadConfig ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
          </button>

          <!-- Print -->
          <button type="button"
            class="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"
            @click="doPrint"
          >
            <i class="far fa-print"></i> Print
          </button>

          <!-- Close -->
          <button type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
            @click="emit('close')"
          >
            <i class="far fa-times"></i>
          </button>
        </div>

        <!-- Pad config panel (expandable) -->
        <div v-if="showPadConfig" class="flex flex-wrap items-end gap-4 border-t border-violet-100 bg-violet-50/60 px-4 py-3">
          <p class="flex w-full items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-600">
            <i class="far fa-print"></i>
            Pre-printed pad — set empty space to match your letterhead paper
          </p>

          <!-- Header height -->
          <div>
            <label class="block text-[10px] text-slate-500 mb-0.5">
              <i class="far fa-arrow-up text-violet-400 mr-1"></i>Header space (cm)
            </label>
            <div class="flex items-center gap-1.5">
              <input
                v-model.number="pad.headerHeight"
                type="number" min="0" max="15" step="0.5"
                class="h-8 w-20 rounded border border-violet-300 bg-white px-2 text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <span class="text-xs text-slate-400">cm</span>
            </div>
          </div>

          <!-- Footer height -->
          <div>
            <label class="block text-[10px] text-slate-500 mb-0.5">
              <i class="far fa-arrow-down text-violet-400 mr-1"></i>Footer space (cm)
            </label>
            <div class="flex items-center gap-1.5">
              <input
                v-model.number="pad.footerHeight"
                type="number" min="0" max="15" step="0.5"
                class="h-8 w-20 rounded border border-violet-300 bg-white px-2 text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <span class="text-xs text-slate-400">cm</span>
            </div>
          </div>

          <!-- Visual preview hint -->
          <div class="flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2">
            <div class="flex h-16 w-10 flex-col rounded border border-slate-300 overflow-hidden text-[7px] text-slate-400">
              <div class="bg-violet-100 flex items-center justify-center" :style="`flex: ${pad.headerHeight}`">H</div>
              <div class="bg-white flex-1 flex items-center justify-center text-slate-300">content</div>
              <div class="bg-violet-100 flex items-center justify-center" :style="`flex: ${pad.footerHeight}`">F</div>
            </div>
            <div class="text-[10px] text-slate-500 leading-relaxed">
              <p class="font-semibold text-slate-700">A4 preview</p>
              <p>Header: <strong class="text-violet-700">{{ pad.headerHeight }}cm</strong></p>
              <p>Footer: <strong class="text-violet-700">{{ pad.footerHeight }}cm</strong></p>
            </div>
          </div>

          <p class="ml-auto self-end text-[10px] text-violet-500">
            <i class="far fa-save mr-0.5"></i> Auto-saved in browser
          </p>
        </div>
      </div>

      <!-- ── Letter page ─────────────────────────────────────────────────────── -->
      <div
        id="letter-print-area"
        class="mx-auto my-8 flex min-h-[1050px] w-full max-w-[760px] flex-col bg-white shadow-md print:my-0 print:min-h-screen print:max-w-none print:shadow-none"
        style="font-family: 'Times New Roman', Times, serif;"
      >
        <!-- Reserved space for pre-printed header -->
        <div :style="`height: ${pad.headerHeight}cm; min-height: ${pad.headerHeight}cm;`"></div>

        <!-- ── Letter body ── -->
        <div class="flex-1 px-10 pb-6">

          <!-- Letter No + Date -->
          <div class="mb-3 flex justify-between text-sm">
            <div>
              <span class="font-bold">Letter No: Salary </span>
              <span class="font-bold underline">{{ letterNo }}</span>
            </div>
            <div>
              <span class="font-bold">Date: </span>
              <span class="font-bold underline">{{ letterDate }}</span>
            </div>
          </div>

          <!-- Subject -->
          <div class="mb-4 text-sm font-bold leading-relaxed">
            Subject: Request for transfer of salary for the month of
            <span class="underline">{{ subjectMonth }}</span> from
            {{ acName }} A/C No. {{ acNumber }}
          </div>

          <!-- Salutation -->
          <p class="mb-4 text-sm">Dear Sir/Madam</p>

          <!-- Body -->
          <p class="mb-6 text-justify text-sm leading-relaxed">
            With reference to the above mentioned subject you are requested to transfer the
            amount in favor of the following Name and Account No. from
            <strong>{{ acName }}</strong> (AC No.<strong>{{ acNumber }}</strong>).
          </p>

          <!-- Table -->
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th
                  v-for="col in activeCols" :key="col.key"
                  class="border border-black px-3 py-2 font-semibold"
                  :class="{
                    'text-center w-10': col.key === 'sl',
                    'text-left':        col.key === 'name',
                    'text-center w-28': col.key === 'employeeId',
                    'text-center w-40': col.key === 'accountNo',
                    'text-right  w-32': col.key === 'amount',
                  }"
                >{{ col.key === 'name' ? 'Name of Officer' : col.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(emp, idx) in tableRows" :key="`emp-${idx}`">
                <td
                  v-for="col in activeCols" :key="col.key"
                  class="border border-black px-3 py-1.5"
                  :class="{
                    'text-center': col.key === 'sl' || col.key === 'employeeId' || col.key === 'accountNo',
                    'text-right':  col.key === 'amount',
                  }"
                >{{ cellValue(col, emp, idx) }}</td>
              </tr>
              <tr v-for="n in emptyCount" :key="`blank-${n}`">
                <td
                  v-for="col in activeCols" :key="col.key"
                  class="border border-black px-3 py-4"
                  :class="{ 'text-center text-slate-400': col.key === 'sl' }"
                >{{ blankCellValue(col, n) }}</td>
              </tr>
              <!-- Total row -->
              <tr class="font-bold">
                <td :colspan="activeCols.length - 1" class="border border-black px-4 py-2 text-right">Total</td>
                <td class="border border-black px-4 py-2 text-right">{{ hasRows ? fmtAmount(tableTotal) : '' }}</td>
              </tr>
            </tbody>
          </table>

          <!-- Signature -->
          <div class="mt-14 flex justify-end">
            <div class="text-center text-sm">
              <div class="mb-1 w-48 border-t border-black"></div>
              <p>Authorized Signature</p>
            </div>
          </div>
        </div>

        <!-- Reserved space for pre-printed footer -->
        <div :style="`height: ${pad.footerHeight}cm; min-height: ${pad.footerHeight}cm;`"></div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@media print {
  #letter-print-area {
    margin: 0 !important;
    box-shadow: none !important;
    min-height: 100vh !important;
  }
}
</style>
