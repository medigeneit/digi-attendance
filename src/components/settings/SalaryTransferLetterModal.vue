<script setup>
import { useCompanyBankAccountStore } from '@/stores/companyBankAccount'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

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
const letterDateInput = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)

// ─── Pad (letterhead) config — persisted in localStorage ─────────────────────
const PAD_KEY = 'salary-letter-pad'
const pad = reactive({
  headerHeight:  4,   // cm — empty space reserved for pre-printed header
  footerHeight:  2,   // cm — empty space reserved for pre-printed footer
  fontSize:      14,
  repeatHeader:  false, // repeat intro text on every printed page
})
const showPadConfig = ref(false)

function loadPad() {
  try {
    Object.assign(pad, JSON.parse(localStorage.getItem(PAD_KEY) || '{}'))
  } catch { /* ignore */ }
}
watch(pad, () => localStorage.setItem(PAD_KEY, JSON.stringify({ ...pad })), { deep: true })

// Inject a dynamic @page rule so header/footer space applies on every printed page
let pageStyleEl = null
function updatePageStyle() {
  if (!pageStyleEl) {
    pageStyleEl = document.createElement('style')
    pageStyleEl.id = 'letter-page-margins'
    document.head.appendChild(pageStyleEl)
  }
  let css = `@page { margin-top: ${pad.headerHeight}cm; margin-bottom: ${pad.footerHeight}cm; }`
  // position:fixed for repeat-header is applied via inline styles in handleBeforePrint
  // so no CSS injection needed here for that case
  pageStyleEl.textContent = css
}
watch(pad, updatePageStyle, { deep: true })

// ─── Bank account selection ───────────────────────────────────────────────────
const bankAccStore = useCompanyBankAccountStore()
const { items: bankAccounts } = storeToRefs(bankAccStore)
const selectedBankAcc = ref(null)

const activeBankAcc = computed(() => props.bankAccount || selectedBankAcc.value)
const acName        = computed(() => activeBankAcc.value?.account_name   || '—')
const acNumber      = computed(() => activeBankAcc.value?.account_number || '—')
const acBranch      = computed(() => activeBankAcc.value?.branch_name || '')
// Sync org name display in letter body from bank account
const orgName = computed(() => activeBankAcc.value?.account_name || '—')

watch(() => props.salaryMonth, (sm) => {
  if (!sm) return
  const [y, m] = sm.split('-').map(Number)
  if (!y || !m) return
  const currentDay = String(letterDateInput.value || '').slice(8, 10) || '01'
  letterDateInput.value = `${y}-${String(m).padStart(2, '0')}-${currentDay}`
}, { immediate: true })

// ─── Computed letter values ───────────────────────────────────────────────────
const parsedLetterDate = computed(() => {
  const [year, month, day] = String(letterDateInput.value || '').split('-').map(Number)
  if (!year || !month || !day) {
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
  }
  return { year, month, day }
})
const monthLabel   = computed(() => MONTHS[parsedLetterDate.value.month - 1])
const letterNo     = computed(() => `Salary ${monthLabel.value}'${parsedLetterDate.value.year}`)
const subjectMonth = computed(() => `${monthLabel.value}' ${parsedLetterDate.value.year}`)
const letterDate   = computed(() =>
  `${String(parsedLetterDate.value.day).padStart(2,'0')}.${String(parsedLetterDate.value.month).padStart(2,'0')}.${parsedLetterDate.value.year}`
)

// ─── Table data ───────────────────────────────────────────────────────────────
const hasRows    = computed(() => props.employeeRows?.length > 0)
const tableRows  = computed(() => props.employeeRows || [])
const emptyCount = computed(() => hasRows.value ? 0 : 18)
const tableTotal = computed(() => tableRows.value.reduce((s, r) => s + Number(r.amount || 0), 0))
const tableTotalWords = computed(() => `${toTitleCase(numberToWords(Math.round(tableTotal.value)))} taka only.`)

function fmtAmount(val) {
  const n = Number(val)
  return Number.isFinite(n)
    ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
    : '—'
}

function toTitleCase(value) {
  return String(value || '').replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}

function numberToWords(num) {
  const n = Number(num)
  if (!Number.isFinite(n) || n <= 0) return 'zero'

  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
  const belowHundred = (value) => {
    if (value < 20) return ones[value]
    return `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${ones[value % 10]}` : ''}`
  }
  const belowThousand = (value) => {
    if (value < 100) return belowHundred(value)
    return `${ones[Math.floor(value / 100)]} hundred${value % 100 ? ` ${belowHundred(value % 100)}` : ''}`
  }

  const parts = []
  let rest = Math.floor(n)
  const crore = Math.floor(rest / 10000000)
  if (crore) {
    parts.push(`${belowThousand(crore)} crore`)
    rest %= 10000000
  }
  const lac = Math.floor(rest / 100000)
  if (lac) {
    parts.push(`${belowThousand(lac)} lac`)
    rest %= 100000
  }
  const thousand = Math.floor(rest / 1000)
  if (thousand) {
    parts.push(`${belowThousand(thousand)} thousand`)
    rest %= 1000
  }
  if (rest) parts.push(belowThousand(rest))
  return parts.join(' ')
}

// ─── Column customization ─────────────────────────────────────────────────────
const ALL_COLS = [
  { key: 'sl',         label: 'SL',           locked: true  },
  { key: 'name',       label: 'Name',         locked: true  },
  { key: 'employeeId', label: 'Emp. ID',       locked: false },
  { key: 'unit',       label: 'Unit',         locked: false },
  { key: 'accountNo',  label: 'Account No.',  locked: false },
  { key: 'amount',     label: 'Amount (BDT)', locked: false },
]
const colVis = reactive(Object.fromEntries(ALL_COLS.map(c => [c.key, c.key !== 'employeeId' && c.key !== 'unit'])))
const activeCols = computed(() => ALL_COLS.filter(c => colVis[c.key]))

function cellValue(col, emp, idx) {
  switch (col.key) {
    case 'sl':         return idx + 1
    case 'name':       return emp.name       ?? '—'
    case 'employeeId': return emp.employeeId ?? '—'
    case 'unit':       return emp.unit       ?? '—'
    case 'accountNo':  return emp.accountNo  ?? '—'
    case 'amount':     return fmtAmount(emp.amount)
    default:           return '—'
  }
}
function blankCellValue(col, n) { return col.key === 'sl' ? n : '' }

function doPrint() { window.print() }

const modalRoot = ref(null)
let printInsert = null

function escHtml(val) {
  return String(val ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Returns an array of page-HTML strings. Rows are grouped so that employees
// from two different bank branches never end up sharing the same printed page —
// a branch change always forces a new page, in addition to the row-count limit.
// `includePagePadding` bakes the pad's header/footer space into each page's
// own box (needed for the PDF, which has no @page concept). Print already
// reserves that space via the injected `@page` margin rule (updatePageStyle),
// so it must stay false there to avoid doubling the spacing.
function buildLetterPages(repeatIntro = true, includePagePadding = false) {
  const PX_PER_CM = 37.795
  const A4_H = 1122.5  // 297mm at 96dpi

  const headerPadPx = pad.headerHeight * PX_PER_CM
  const footerPadPx = pad.footerHeight * PX_PER_CM
  const pageContent = A4_H - headerPadPx - footerPadPx

  // Measure rendered intro height (the <th colspan> in Mode B) + column header row
  const introThEl = document.querySelector('#letter-print-area thead th[colspan]')
  const introH = introThEl ? introThEl.getBoundingClientRect().height + 50 : 280

  // Measure a data row's rendered height
  const rowEl = document.querySelector('#letter-print-area tbody tr')
  const rowH = rowEl ? rowEl.getBoundingClientRect().height : 34

  // 10% buffer so rows don't overflow the page-break boundary
  const rowsPerPage = Math.max(5, Math.floor((pageContent - introH) * 0.90 / rowH))

  const cols = activeCols.value
  const fontSize = Number(pad.fontSize) || 14

  function thStyle(key) {
    const base = `border:1px solid black;padding:8px 12px;font-weight:600;font-size:${fontSize}px;`
    if (key === 'sl')         return base + 'text-align:center;width:40px;'
    if (key === 'name')       return base + 'text-align:left;'
    if (key === 'employeeId') return base + 'text-align:center;width:112px;'
    if (key === 'unit')       return base + 'text-align:center;width:112px;'
    if (key === 'accountNo')  return base + 'text-align:center;width:160px;'
    if (key === 'amount')     return base + 'text-align:right;width:128px;'
    return base + 'text-align:left;'
  }
  function tdStyle(key) {
    const base = `border:1px solid black;padding:6px 12px;font-size:${fontSize}px;`
    if (key === 'sl' || key === 'employeeId' || key === 'unit' || key === 'accountNo') return base + 'text-align:center;'
    if (key === 'amount') return base + 'text-align:right;'
    return base + 'text-align:left;'
  }

  const lNo  = escHtml(letterNo.value)
  const lDt  = escHtml(letterDate.value)
  const sMo  = escHtml(subjectMonth.value)
  const aNm  = escHtml(acName.value)
  const aNo  = escHtml(acNumber.value)

  const introHtml = `<div style="padding:1rem 0 0.5rem;font-size:${fontSize}px;line-height:1.6;color:#000;">
    <div style="display:flex;justify-content:space-between;margin-bottom:0.75rem;">
      <div><b>Letter No:</b> <u>${lNo}</u></div>
      <div><b>Date:</b> <u>${lDt}</u></div>
    </div>
    <div style="font-weight:bold;margin-bottom:1rem;">
      Subject: Request for transfer of salary for the month of <u>${sMo}</u> from ${aNm} A/C No. ${aNo}
    </div>
    <p style="margin-bottom:1rem;">Dear Sir/Madam</p>
    <p style="margin-bottom:1rem;text-align:justify;line-height:1.6;">
      With reference to the above mentioned subject you are requested to transfer the
      amount in favor of the following Name and Account No. from
      <b>${aNm}</b> (AC No.<b>${aNo}</b>).
    </p>
  </div>`

  const colHeadersHtml = cols.map(col =>
    `<th style="${thStyle(col.key)}">${col.key === 'name' ? 'Account Holder Name' : escHtml(col.label)}</th>`
  ).join('')

  // Group rows by bank branch first (regardless of incoming order), then
  // paginate each branch's group on its own — so a page only ever holds
  // employees from a single branch, and a branch's employees stay together
  // across as many pages as it needs (never one employee per page).
  const employees = tableRows.value
  const branchGroups = new Map()
  employees.forEach((emp) => {
    const key = emp.branch ?? ''
    if (!branchGroups.has(key)) branchGroups.set(key, [])
    branchGroups.get(key).push(emp)
  })

  const chunks = []
  branchGroups.forEach((group) => {
    if (group.length <= rowsPerPage) {
      chunks.push(group)
      return
    }
    // Spread a branch's rows evenly across the pages it needs, instead of
    // always filling each page to capacity — filling to capacity can leave
    // a near-empty trailing page (e.g. 16 rows on page 1, 1 row on page 2).
    const pagesNeeded = Math.ceil(group.length / rowsPerPage)
    const perPage = Math.ceil(group.length / pagesNeeded)
    for (let i = 0; i < group.length; i += perPage) {
      chunks.push(group.slice(i, i + perPage))
    }
  })
  if (!chunks.length) chunks.push([])

  let globalIdx = 0
  return chunks.map((chunk, ci) => {
    const isLast  = ci === chunks.length - 1
    const isFirst = ci === 0
    const introBlock = (repeatIntro || isFirst) ? introHtml : ''
    const pageTotal = chunk.reduce((sum, emp) => sum + Number(emp.amount || 0), 0)
    const pageTotalText = escHtml(fmtAmount(pageTotal))
    const pageTotalWords = escHtml(`${toTitleCase(numberToWords(Math.round(pageTotal)))} taka only.`)

    const bodyHtml = chunk.map((emp) => {
      const gi = globalIdx++
      return '<tr>' + cols.map(col =>
        `<td style="${tdStyle(col.key)}">${escHtml(cellValue(col, emp, gi))}</td>`
      ).join('') + '</tr>'
    }).join('')

    const tfoot = `<tfoot style="break-inside:avoid;page-break-inside:avoid;">
        <tr style="font-weight:bold;">
          <td colspan="${cols.length - 1}" style="border:1px solid black;padding:8px 16px;text-align:right;">Total</td>
          <td style="border:1px solid black;padding:8px 16px;text-align:right;">${pageTotalText}</td>
        </tr>
        <tr>
          <td colspan="${cols.length}" style="border:1px solid black;padding:8px 12px;font-size:${fontSize}px;line-height:1.5;">
            <b>Inwords:</b> ${pageTotalWords}
          </td>
        </tr>
      </tfoot>`

    const pageBoxStyle = includePagePadding
      ? `box-sizing:border-box;min-height:${A4_H}px;padding:${headerPadPx}px 2.5rem ${Math.max(footerPadPx, 24)}px;`
      : 'padding:0 2.5rem 1.5rem;'

    return `<div style="${isLast ? '' : 'page-break-after:always;'}${pageBoxStyle}font-family:'Times New Roman',Times,serif;color:#000;">
      ${introBlock}
      <table style="width:100%;border-collapse:collapse;font-size:${fontSize}px;">
        <thead><tr>${colHeadersHtml}</tr></thead>
        <tbody>${bodyHtml}</tbody>
        ${tfoot}
      </table>
    </div>`
  })
}

function buildRepeatHeaderInsert() {
  return buildLetterPages(true, false).join('')
}

// ─── PDF download ─────────────────────────────────────────────────────────────
const downloadingPdf = ref(false)

async function downloadLetterPDF() {
  if (downloadingPdf.value || !hasRows.value) return
  downloadingPdf.value = true
  try {
    const A4_W = 595.28
    const A4_H = 841.89
    // The downloaded PDF always repeats the letter intro on every page so each
    // page reads as a self-contained document — independent of the "First page
    // only / All pages" print preference (which only affects what's printed).
    const pages = buildLetterPages(true, true)

    const holder = document.createElement('div')
    holder.style.position = 'fixed'
    holder.style.left = '-10000px'
    holder.style.top = '0'
    holder.style.width = '794px'
    holder.style.background = '#ffffff'
    document.body.appendChild(holder)

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })

    try {
      for (let i = 0; i < pages.length; i++) {
        holder.innerHTML = pages[i]
        const canvas = await html2canvas(holder, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
        const imgData = canvas.toDataURL('image/png')
        const imgH = Math.min((canvas.height * A4_W) / canvas.width, A4_H)
        if (i > 0) doc.addPage()
        doc.addImage(imgData, 'PNG', 0, 0, A4_W, imgH)
      }
    } finally {
      holder.remove()
    }

    doc.save(`salary-transfer-letter-${props.salaryMonth || 'letter'}.pdf`)
  } finally {
    downloadingPdf.value = false
  }
}

function handleBeforePrint() {
  const el = modalRoot.value
  if (!el) return
  el.style.setProperty('position', 'static', 'important')
  el.style.setProperty('inset', 'auto', 'important')
  el.style.setProperty('overflow', 'visible', 'important')
  el.style.setProperty('height', 'auto', 'important')
  el.style.setProperty('background-color', 'white', 'important')
  el.style.setProperty('z-index', 'auto', 'important')
  const app = document.getElementById('app')
  if (app) app.style.setProperty('display', 'none', 'important')

  if (pad.repeatHeader) {
    // Build a plain-HTML multi-page document and inject it into body.
    // Each section has the full intro + N rows + page-break-after, so every
    // printed page starts with the letter intro regardless of Chrome's thead behavior.
    printInsert = document.createElement('div')
    printInsert.id = 'letter-print-insert'
    printInsert.style.background = 'white'
    printInsert.innerHTML = buildRepeatHeaderInsert()
    document.body.appendChild(printInsert)
    // Hide the Vue-rendered modal — printInsert is what Chrome will print
    el.style.setProperty('display', 'none', 'important')
  }
}

function handleAfterPrint() {
  const el = modalRoot.value
  if (!el) return
  el.style.removeProperty('position')
  el.style.removeProperty('inset')
  el.style.removeProperty('overflow')
  el.style.removeProperty('height')
  el.style.removeProperty('background-color')
  el.style.removeProperty('z-index')
  el.style.removeProperty('display')
  const app = document.getElementById('app')
  if (app) app.style.removeProperty('display')
  if (printInsert) { printInsert.remove(); printInsert = null }
}

onMounted(async () => {
  loadPad()
  updatePageStyle()
  if (!bankAccounts.value.length) await bankAccStore.fetchCompanyBankAccounts()
  if (!props.bankAccount && !selectedBankAcc.value && bankAccounts.value.length) {
    selectedBankAcc.value = bankAccounts.value.find(b => String(b.status).toLowerCase() === 'active') || bankAccounts.value[0]
  }
  window.addEventListener('beforeprint', handleBeforePrint)
  window.addEventListener('afterprint', handleAfterPrint)
})

onUnmounted(() => {
  window.removeEventListener('beforeprint', handleBeforePrint)
  window.removeEventListener('afterprint', handleAfterPrint)
  pageStyleEl?.remove()
  pageStyleEl = null
})
</script>

<template>
  <Teleport to="body">
    <div v-if="show" ref="modalRoot" class="letter-modal-root fixed inset-0 z-[9999] overflow-y-auto bg-gray-100 print:bg-white">

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

          <!-- Letter Date -->
          <div>
            <label class="block text-[10px] text-slate-500 mb-0.5">Letter Date</label>
            <input
              v-model="letterDateInput"
              type="date"
              class="h-8 rounded border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
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

          <!-- Download PDF -->
          <button type="button"
            class="inline-flex h-8 items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            :disabled="downloadingPdf || !hasRows"
            @click="downloadLetterPDF"
          >
            <i class="far text-[11px]" :class="downloadingPdf ? 'fa-spinner fa-spin' : 'fa-file-pdf'"></i>
            {{ downloadingPdf ? 'Generating…' : 'PDF' }}
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

          <!-- Font size -->
          <div>
            <label class="block text-[10px] text-slate-500 mb-0.5">
              <i class="far fa-text-size text-violet-400 mr-1"></i>Font size (px)
            </label>
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="h-8 w-8 rounded border border-violet-300 bg-white text-sm font-bold text-violet-700 hover:bg-violet-50"
                @click="pad.fontSize = Math.max(10, Number(pad.fontSize || 14) - 1)"
              >-</button>
              <input
                v-model.number="pad.fontSize"
                type="number" min="10" max="24" step="1"
                class="h-8 w-16 rounded border border-violet-300 bg-white px-2 text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <button
                type="button"
                class="h-8 w-8 rounded border border-violet-300 bg-white text-sm font-bold text-violet-700 hover:bg-violet-50"
                @click="pad.fontSize = Math.min(24, Number(pad.fontSize || 14) + 1)"
              >+</button>
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

          <!-- Repeat header toggle -->
          <div>
            <label class="block text-[10px] text-slate-500 mb-0.5">Header on</label>
            <div class="flex items-center rounded-lg border border-violet-200 overflow-hidden text-xs font-semibold">
              <button
                type="button"
                class="h-8 px-3 transition"
                :class="!pad.repeatHeader ? 'bg-violet-600 text-white' : 'bg-white text-slate-500 hover:bg-violet-50'"
                @click="pad.repeatHeader = false"
              >First page</button>
              <button
                type="button"
                class="h-8 px-3 transition border-l border-violet-200"
                :class="pad.repeatHeader  ? 'bg-violet-600 text-white' : 'bg-white text-slate-500 hover:bg-violet-50'"
                @click="pad.repeatHeader = true"
              >All pages</button>
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
        class="mx-auto my-8 flex min-h-[1050px] w-full max-w-[760px] flex-col bg-white shadow-md print:my-0 print:min-h-screen print:max-w-none print:shadow-none print:w-full"
        :style="{ fontFamily: `'Times New Roman', Times, serif`, '--letter-font-size': `${Number(pad.fontSize) || 14}px` }"
      >
        <!-- Reserved space for pre-printed header (screen only — @page margin-top handles every page in print) -->
        <div class="print:hidden" :style="`height: ${pad.headerHeight}cm; min-height: ${pad.headerHeight}cm;`"></div>

        <!-- ── Letter body ── -->

        <!-- MODE A: First page only — normal div layout -->
        <template v-if="!pad.repeatHeader">
          <div class="flex-1">
            <div class="px-10 pt-4">
              <div class="mb-3 flex justify-between text-sm">
                <div><span class="font-bold">Letter No: </span><span class="font-bold underline">{{ letterNo }}</span></div>
                <div><span class="font-bold">Date: </span><span class="font-bold underline">{{ letterDate }}</span></div>
              </div>
              <div class="mb-4 text-sm font-bold leading-relaxed">
                Subject: Request for transfer of salary for the month of
                <span class="underline">{{ subjectMonth }}</span> from {{ acName }} A/C No. {{ acNumber }}
              </div>
              <p class="mb-4 text-sm">Dear Sir/Madam</p>
              <p class="mb-6 text-justify text-sm leading-relaxed">
                With reference to the above mentioned subject you are requested to transfer the
                amount in favor of the following Name and Account No. from
                <strong>{{ acName }}</strong> (AC No.<strong>{{ acNumber }}</strong>).
              </p>
            </div>
            <div class="px-10 pb-6">
              <table class="w-full border-collapse text-sm">
                <thead><tr>
                  <th v-for="col in activeCols" :key="col.key" class="border border-black px-3 py-2 font-semibold"
                    :class="{ 'text-center w-10': col.key==='sl', 'text-left': col.key==='name', 'text-center w-28': col.key==='employeeId'||col.key==='unit', 'text-center w-40': col.key==='accountNo', 'text-right w-32': col.key==='amount' }"
                  >{{ col.key === 'name' ? 'Account Holder Name' : col.label }}</th>
                </tr></thead>
                <tbody>
                  <tr v-for="(emp,idx) in tableRows" :key="`e${idx}`">
                    <td v-for="col in activeCols" :key="col.key" class="border border-black px-3 py-1.5"
                      :class="{ 'text-center': col.key==='sl'||col.key==='employeeId'||col.key==='unit'||col.key==='accountNo', 'text-right': col.key==='amount' }"
                    >{{ cellValue(col,emp,idx) }}</td>
                  </tr>
                  <tr v-for="n in emptyCount" :key="`b${n}`">
                    <td v-for="col in activeCols" :key="col.key" class="border border-black px-3 py-4"
                      :class="{ 'text-center text-slate-400': col.key==='sl' }"
                    >{{ blankCellValue(col,n) }}</td>
                  </tr>
                </tbody>
                <tfoot style="break-inside: avoid; page-break-inside: avoid;">
                  <tr class="font-bold">
                    <td :colspan="activeCols.length-1" class="border border-black px-4 py-2 text-right">Total</td>
                    <td class="border border-black px-4 py-2 text-right">{{ hasRows ? fmtAmount(tableTotal) : '' }}</td>
                  </tr>
                  <tr v-if="hasRows">
                    <td :colspan="activeCols.length" class="border border-black px-4 py-2 text-sm leading-relaxed">
                      <strong>Inwords:</strong> {{ tableTotalWords }}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </template>

        <!-- MODE B: All pages — flat table: intro + column headers in <thead>, one <tr> per employee in <tbody>.
             Browser repeats <thead> (intro + headers) on every page when <tbody> rows overflow. -->
        <template v-else>
          <div class="flex-1 px-10">
            <table class="w-full text-sm" style="border-collapse: collapse;">
              <thead>
                <!-- Intro row: spans all columns -->
                <tr>
                  <th :colspan="activeCols.length" class="pt-4 pb-2 text-left font-normal align-top">
                    <div class="mb-3 flex justify-between text-sm">
                      <div><span class="font-bold">Letter No: </span><span class="font-bold underline">{{ letterNo }}</span></div>
                      <div><span class="font-bold">Date: </span><span class="font-bold underline">{{ letterDate }}</span></div>
                    </div>
                    <div class="mb-4 text-sm font-bold leading-relaxed">
                      Subject: Request for transfer of salary for the month of
                      <span class="underline">{{ subjectMonth }}</span> from {{ acName }} A/C No. {{ acNumber }}
                    </div>
                    <p class="mb-4 text-sm font-normal">Dear Sir/Madam</p>
                    <p class="mb-4 text-justify text-sm font-normal leading-relaxed">
                      With reference to the above mentioned subject you are requested to transfer the
                      amount in favor of the following Name and Account No. from
                      <strong>{{ acName }}</strong> (AC No.<strong>{{ acNumber }}</strong>).
                    </p>
                  </th>
                </tr>
                <!-- Column header row -->
                <tr>
                  <th v-for="col in activeCols" :key="col.key" class="border border-black px-3 py-2 font-semibold"
                    :class="{ 'text-center w-10': col.key==='sl', 'text-left': col.key==='name', 'text-center w-28': col.key==='employeeId'||col.key==='unit', 'text-center w-40': col.key==='accountNo', 'text-right w-32': col.key==='amount' }"
                  >{{ col.key === 'name' ? 'Account Holder Name' : col.label }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(emp,idx) in tableRows" :key="`e${idx}`">
                  <td v-for="col in activeCols" :key="col.key" class="border border-black px-3 py-1.5"
                    :class="{ 'text-center': col.key==='sl'||col.key==='employeeId'||col.key==='accountNo', 'text-right': col.key==='amount' }"
                  >{{ cellValue(col,emp,idx) }}</td>
                </tr>
                <tr v-for="n in emptyCount" :key="`b${n}`">
                  <td v-for="col in activeCols" :key="col.key" class="border border-black px-3 py-4"
                    :class="{ 'text-center text-slate-400': col.key==='sl' }"
                  >{{ blankCellValue(col,n) }}</td>
                </tr>
              </tbody>
              <tfoot style="break-inside: avoid; page-break-inside: avoid;">
                <tr class="font-bold">
                  <td :colspan="activeCols.length-1" class="border border-black px-4 py-2 text-right">Total</td>
                  <td class="border border-black px-4 py-2 text-right">{{ hasRows ? fmtAmount(tableTotal) : '' }}</td>
                </tr>
                <tr v-if="hasRows">
                  <td :colspan="activeCols.length" class="border border-black px-4 py-2 text-sm leading-relaxed">
                    <strong>Inwords:</strong> {{ tableTotalWords }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </template>

        <!-- Reserved space for pre-printed footer (screen only — @page margin-bottom handles every page in print) -->
        <div class="print:hidden" :style="`height: ${pad.footerHeight}cm; min-height: ${pad.footerHeight}cm;`"></div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
#letter-print-area :deep(.text-sm),
#letter-print-area :deep(table),
#letter-print-area :deep(th),
#letter-print-area :deep(td),
#letter-print-area .letter-text {
  font-size: var(--letter-font-size) !important;
}

@media print {
  /* Strip the modal scroll container so no scrollbar appears in print output */
  .letter-modal-root {
    position: static !important;
    inset: auto !important;
    overflow: visible !important;
    background: white !important;
    height: auto !important;
    scrollbar-width: none !important;
  }

  #letter-print-area {
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    min-height: 100vh !important;
    max-width: 100% !important;
    width: 100% !important;
  }
}
</style>
