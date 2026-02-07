<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import LoaderView from '@/components/common/LoaderView.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import SearchInput from '@/components/SearchInput.vue'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import MonthCell from '@/components/discipline/MonthCell.vue'
import IndisciplineList from '@/components/discipline/IndisciplineList.vue'
import ActionList from '@/components/discipline/ActionList.vue'
import AttachmentCell from '@/components/discipline/AttachmentCell.vue'
import FinalOutcomeCell from '@/components/discipline/FinalOutcomeCell.vue'
import MonthModal from '@/components/discipline/MonthModal.vue'
import AttachmentModal from '@/components/discipline/AttachmentModal.vue'
import { useDisciplineReportStore } from '@/stores/useDisciplineReportStore'

const reportStore = useDisciplineReportStore()
const route = useRoute()
const router = useRouter()
const q = route.query

const currentYear = new Date().getFullYear()
const filters = ref({
  company_id: q.company_id || '',
  department_id: q.department_id === 'all' ? '' : q.department_id || '',
  line_type: q.line_type || 'all',
  employee_id: q.employee_id || '',
  year: Number(q.year) || currentYear,
  search: q.search || '',
  page: Number(q.page) || 1,
  per_page: Number(q.per_page) || 25,
})

const { users: storeUsers, months: storeMonths, pagination, loading } = storeToRefs(reportStore)

const monthModalOpen = ref(false)
const attachmentModalOpen = ref(false)
const activeUser = ref(null)
const activeMonthStart = ref('')
const activeTab = ref('indiscipline')
const editItem = ref(null)
const editType = ref('')

const attachmentUser = ref(null)
const attachmentMonthStart = ref('')

const getUserId = (user) => user?.id || user?.user_id
const getUserName = (user) =>
  user?.name || user?.user || user?.employee_name || user?.full_name || 'Employee'

const getUserMeta = (user) =>
  user?.designation || user?.department?.name || user?.dept || user?.department_name || ''

const getRecord = (user, monthStart) => user?._monthMap?.[monthStart] || null

const getPaycuts = (record) => {
  if (!record) return []
  if (Array.isArray(record.paycuts)) return record.paycuts
  if (record.paycut) return [record.paycut]
  return []
}

const getAutoIndisciplineItems = (record) =>
  getPaycuts(record).map((paycut) => ({
    id: paycut?.id || paycut?.paycut_id || `paycut-${paycut?.reason || ''}`,
    reason: paycut?.reason || 'Paycut applied',
  }))

const getAutoActionItems = (record) =>
  getPaycuts(record).map((paycut) => ({
    id: paycut?.id || paycut?.paycut_id || `paycut-${paycut?.pay_hours || ''}`,
    label: 'Paycut applied',
    hours: paycut?.pay_hours || paycut?.paycut_hours || paycut?.hours,
  }))

const getManualIndisciplineItems = (record) =>
  record?.manual_indisciplines || record?.indisciplines || []

const getManualActionItems = (record) =>
  record?.manual_actions || record?.actions || []

const getAttachmentList = (record) => {
  if (!record) return []
  const files = record.attachments || record.attachment_files || record.files || []
  const letters = record.letters || record.text_letters || record.letter_attachments || []
  return [
    ...files.map((item) => ({ ...item, _type: 'file' })),
    ...letters.map((item) => ({ ...item, _type: 'letter' })),
  ]
}

const getAttachmentCount = (record) =>
  record?.attachments_count ||
  record?.attachment_count ||
  getAttachmentList(record).length

const getFinalOutcome = (user) =>
  Number(user?.final_outcome || user?.final_score || user?.yearly_final_outcome || 0)

const pad = (value) => String(value).padStart(2, '0')

const monthLabel = (monthStart) => {
  if (!monthStart) return ''
  const date = new Date(monthStart)
  if (Number.isNaN(date.getTime())) return monthStart
  return new Intl.DateTimeFormat('en', { month: 'short' }).format(date)
}

const buildMonths = (year) =>
  Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    const monthStart = `${year}-${pad(month)}-01`
    return { month_start: monthStart, label: monthLabel(monthStart) }
  })

const months = computed(() =>
  storeMonths.value?.length ? storeMonths.value : buildMonths(filters.value.year)
)

const currentMonthStart = computed(() => {
  const now = new Date()
  const month = pad(now.getMonth() + 1)
  return `${filters.value.year}-${month}-01`
})

const selectedMonthStarts = ref([])

const visibleMonths = computed(() => {
  if (!selectedMonthStarts.value.length) return months.value
  const set = new Set(selectedMonthStarts.value)
  return months.value.filter((month) => set.has(month.month_start))
})

const setDefaultMonths = (year) => {
  const allMonths = buildMonths(year).map((month) => month.month_start)
  if (year === currentYear) {
    selectedMonthStarts.value = [currentMonthStart.value]
  } else {
    selectedMonthStarts.value = allMonths
  }
}

const toggleMonth = (monthStart) => {
  const next = new Set(selectedMonthStarts.value)
  if (next.has(monthStart)) {
    next.delete(monthStart)
  } else {
    next.add(monthStart)
  }
  if (!next.size) {
    next.add(currentMonthStart.value)
  }
  selectedMonthStarts.value = Array.from(next)
}

const selectAllMonths = () => {
  selectedMonthStarts.value = months.value.map((month) => month.month_start)
}

const selectCurrentMonth = () => {
  selectedMonthStarts.value = [currentMonthStart.value]
}

const monthTone = (index) => (index % 2 === 0 ? 'tone-a' : 'tone-b')

const users = computed(() => storeUsers.value || [])

const yearOptions = computed(() => {
  const years = []
  for (let y = currentYear + 1; y >= currentYear - 4; y -= 1) {
    years.push(y)
  }
  return years
})

const attachmentRecord = computed(() =>
  getRecord(attachmentUser.value, attachmentMonthStart.value)
)

const attachmentList = computed(() => getAttachmentList(attachmentRecord.value))

const openMonthModal = (user, monthStart, tab = 'indiscipline') => {
  activeUser.value = user
  activeMonthStart.value = monthStart
  activeTab.value = tab
  editItem.value = null
  editType.value = ''
  monthModalOpen.value = true
}

const openEditItem = (type, user, monthStart, item) => {
  activeUser.value = user
  activeMonthStart.value = monthStart
  activeTab.value = type
  editItem.value = item
  editType.value = type
  monthModalOpen.value = true
}

const closeMonthModal = () => {
  monthModalOpen.value = false
  editItem.value = null
  editType.value = ''
}

const openAttachmentModal = (user, monthStart) => {
  attachmentUser.value = user
  attachmentMonthStart.value = monthStart
  attachmentModalOpen.value = true
}

const closeAttachmentModal = () => {
  attachmentModalOpen.value = false
}

const deleteManualItem = async (type, item, monthStart) => {
  if (!item?.id) return
  if (!confirm('Delete this item?')) return
  if (type === 'indiscipline') {
    await reportStore.deleteManualIndiscipline(item.id, { month_start: monthStart })
  } else {
    await reportStore.deleteManualAction(item.id, { month_start: monthStart })
  }
}

const cleanQuery = (payload) => {
  const next = {}
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    next[key] = value
  })
  return next
}

const handleFilterChange = () => {
  if (filters.value.page !== 1) {
    filters.value.page = 1
  }
}

watch(
  filters,
  async (next) => {
    await reportStore.fetchReport(next)
    router.replace({ query: cleanQuery(next) })
  },
  { deep: true, immediate: true }
)

watch(
  () => [
    filters.value.year,
    filters.value.company_id,
    filters.value.department_id,
    filters.value.line_type,
    filters.value.employee_id,
    filters.value.search,
    filters.value.per_page,
  ],
  () => {
    filters.value.page = 1
  }
)

watch(
  () => filters.value.year,
  (year) => {
    setDefaultMonths(year)
  },
  { immediate: true }
)
</script>

<template>
  <div class="px-4 space-y-5">
    <div class="glass-panel flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Discipline Report
        </p>
        <h1 class="text-2xl font-semibold text-slate-900">Discipline Report Grid</h1>
        <p class="text-sm text-slate-500">
          Track monthly discipline, actions, and attachments with Excel-style clarity.
        </p>
      </div>
      <div class="text-xs font-semibold text-slate-500">
        {{ users.length }} users | {{ filters.year }}
      </div>
    </div>

    <div class="glass-panel space-y-3 px-5 py-4">
      <EmployeeFilter
        v-model:company_id="filters.company_id"
        v-model:department_id="filters.department_id"
        v-model:employee_id="filters.employee_id"
        v-model:line_type="filters.line_type"
        :with-type="true"
        :initial-value="$route.query"
        @filter-change="handleFilterChange"
        class="w-full"
      >
        <div class="flex items-center gap-2">
          <label class="text-xs font-semibold text-slate-600">Year</label>
          <select
            v-model.number="filters.year"
            class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
          </select>
        </div>
      </EmployeeFilter>

      <div class="flex flex-wrap items-center gap-3">
        <div class="min-w-[220px]">
          <SearchInput v-model="filters.search" placeholder="Search by name..." />
        </div>

        <div class="flex items-center gap-2">
          <label class="text-xs font-semibold text-slate-600">Rows</label>
          <select
            v-model.number="filters.per_page"
            class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option :value="15">15</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <p class="text-xs font-semibold text-slate-600">Months</p>
        <button class="chip" type="button" @click="selectCurrentMonth">Current</button>
        <button class="chip" type="button" @click="selectAllMonths">All</button>
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-for="month in months"
            :key="`toggle-${month.month_start}`"
            type="button"
            class="chip"
            :class="{ active: selectedMonthStarts.includes(month.month_start) }"
            @click="toggleMonth(month.month_start)"
          >
            {{ month.label || monthLabel(month.month_start) }}
          </button>
        </div>
      </div>
    </div>

    <LoaderView v-if="loading" />

    <div v-else class="table-shell">
      <div v-if="users.length === 0" class="empty-state">
        <p class="text-base font-semibold text-slate-700">No discipline records found</p>
        <p class="text-sm text-slate-500">Try a different year or adjust filters.</p>
      </div>

      <div v-else class="table-scroll">
        <table class="min-w-full table-fixed border-collapse">
          <thead class="sticky top-0 z-30 bg-slate-50">
            <tr>
              <th rowspan="2" class="th sticky-col">
                <div class="text-left">
                  <p class="text-xs font-semibold text-slate-700">Employee</p>
                  <p class="text-[10px] text-slate-400">Sticky column</p>
                </div>
              </th>
              <th
                v-for="(month, monthIndex) in visibleMonths"
                :key="`group-${month.month_start}`"
                colspan="3"
                class="th text-center"
                :class="monthTone(monthIndex)"
              >
                {{ month.label || monthLabel(month.month_start) }}
              </th>
              <th rowspan="2" class="th text-center">Final Outcome</th>
            </tr>
            <tr>
              <template
                v-for="(month, monthIndex) in visibleMonths"
                :key="`sub-${month.month_start}`"
              >
                <th class="th" :class="monthTone(monthIndex)">Indiscipline</th>
                <th class="th" :class="monthTone(monthIndex)">Action</th>
                <th class="th" :class="monthTone(monthIndex)">Attachment</th>
              </template>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="user in users"
              :key="getUserId(user)"
              class="border-b border-slate-100 hover:bg-slate-50/70"
            >
              <td class="td sticky-col">
                <div class="space-y-1">
                  <p class="text-sm font-semibold text-slate-800">{{ getUserName(user) }}</p>
                  <p class="text-[11px] text-slate-500">{{ getUserMeta(user) }}</p>
                </div>
              </td>

              <template
                v-for="(month, monthIndex) in visibleMonths"
                :key="`${getUserId(user)}-${month.month_start}`"
              >
                <td class="td min-w-[100px]" :class="monthTone(monthIndex)">
                  <MonthCell @add="openMonthModal(user, month.month_start, 'indiscipline')">
                    <IndisciplineList
                      :auto-items="getAutoIndisciplineItems(getRecord(user, month.month_start))"
                      :manual-items="getManualIndisciplineItems(getRecord(user, month.month_start))"
                      @edit="(item) => openEditItem('indiscipline', user, month.month_start, item)"
                      @delete="(item) => deleteManualItem('indiscipline', item, month.month_start)"
                    />
                  </MonthCell>
                </td>
                <td class="td min-w-[100px]" :class="monthTone(monthIndex)">
                  <MonthCell @add="openMonthModal(user, month.month_start, 'action')">
                    <ActionList
                      :auto-items="getAutoActionItems(getRecord(user, month.month_start))"
                      :manual-items="getManualActionItems(getRecord(user, month.month_start))"
                      @edit="(item) => openEditItem('action', user, month.month_start, item)"
                      @delete="(item) => deleteManualItem('action', item, month.month_start)"
                    />
                  </MonthCell>
                </td>
                <td class="td min-w-[100px]" :class="monthTone(monthIndex)">
                  <MonthCell @add="openMonthModal(user, month.month_start, 'attachment')">
                    <AttachmentCell
                      :count="getAttachmentCount(getRecord(user, month.month_start))"
                      @view="openAttachmentModal(user, month.month_start)"
                    />
                  </MonthCell>
                </td>
              </template>

              <td class="td min-w-[140px] text-center">
                <FinalOutcomeCell
                  :user-id="getUserId(user)"
                  :year="filters.year"
                  :value="getFinalOutcome(user)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <PaginationBar
      v-if="users.length"
      :page="pagination.page || filters.page"
      :per-page="pagination.per_page || filters.per_page"
      :total="pagination.total || users.length"
      :last-page="pagination.last_page || 1"
      @page-change="(page) => (filters.page = page)"
    />

    <MonthModal
      :open="monthModalOpen"
      :user="activeUser"
      :year="filters.year"
      :month-start="activeMonthStart"
      :record="getRecord(activeUser, activeMonthStart)"
      :initial-tab="activeTab"
      :edit-item="editItem"
      :edit-type="editType"
      @close="closeMonthModal"
    />

    <AttachmentModal
      :open="attachmentModalOpen"
      :attachments="attachmentList"
      :user="attachmentUser"
      :month-start="attachmentMonthStart"
      :year="filters.year"
      @close="closeAttachmentModal"
    />
  </div>
</template>

<style scoped>
.glass-panel { @apply rounded-2xl border border-slate-100 bg-white/80 shadow-sm; }
.table-shell { @apply rounded-2xl border border-slate-100 bg-white/90 shadow-lg; }
.table-scroll { @apply max-h-[70vh] overflow-auto; }
.empty-state { @apply flex min-h-[160px] flex-col items-center justify-center gap-1 text-center; }
.th { @apply border border-slate-200 px-2 py-2 text-[11px] font-semibold text-slate-600; }
.td { @apply border border-slate-200 px-2 py-2 align-top text-[11px]; }
.sticky-col { @apply sticky left-0 z-40 bg-white; }
thead .sticky-col { @apply bg-slate-50; }
.chip {
  @apply rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50;
}
.chip.active {
  @apply border-slate-900 bg-slate-900 text-white;
}
</style>
