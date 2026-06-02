<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LifecycleQuickDetailDrawer from '@/components/lifecycle/LifecycleQuickDetailDrawer.vue'
import { useLifecycleStore } from '@/stores/lifecycle'

const store = useLifecycleStore()
const route = useRoute()
const router = useRouter()

const q = ref('')
const sortBy = ref('progress_desc')
const quickDetailOpen = ref(false)
const selectedRow = ref(null)
const selectedBoardRowId = ref(null)
const viewMode = ref('split')

const STAGE_DESCRIPTIONS = {
  // onboarding: {
  //   pre_boarding: 'Documents, approvals, and readiness checks before day one.',
  //   joining: 'Joining formalities and first-day checklist items.',
  //   training: 'Orientation, tools, and resource setup for the new joiner.',
  //   probation: 'Performance follow-up and probation milestone tracking.',
  //   confirmation: 'Final review, confirmation, and regularization tasks.',
  // },
  // offboarding: {
  //   exit_request: 'Initial resignation or separation request handling.',
  //   clearance_in_progress: 'Department clearance and exit checklist follow-up.',
  //   handover_in_progress: 'Knowledge transfer, asset return, and handover work.',
  //   exit_interview: 'Feedback capture and final exit interview activities.',
  //   settlement_pending: 'Final settlement, dues, and closeout preparation.',
  //   exited: 'Employee exit closed and lifecycle completed.',
  // },
}

const clamp = (v, min = 0, max = 100) => Math.min(Math.max(Number(v || 0), min), max)
const stageAverageProgress = (stages = []) => {
  const values = (Array.isArray(stages) ? stages : [])
    .map((stage) => clamp(stage?.progress))
    .filter((value) => Number.isFinite(value))

  if (!values.length) return null

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

const rowProgress = (row) => {
  const fromStages = stageAverageProgress(row?.stages)
  return fromStages === null ? clamp(row?.lifecycle?.overall_progress) : clamp(fromStages)
}

const flowLabel = computed(() => store.flowLabel)
const availableStageValues = computed(() =>
  store.lifecycleStatusOptions.map((item) => String(item.value)),
)

const activeStage = computed(() => {
  const candidate = String(
    route.query.lifecycle_status ?? route.query.stage ?? store.lifecycleStatus ?? '',
  ).trim()

  return availableStageValues.value.includes(candidate) ? candidate : null
})

const stageCounts = computed(() => {
  const counts = {}

  for (const row of store.rows || []) {
    const key = String(row?.lifecycle?.current_stage || '').trim()
    if (!key) continue
    counts[key] = (counts[key] || 0) + 1
  }

  return counts
})

const stageItems = computed(() =>
  store.lifecycleStatusOptions.map((item, index) => ({
    ...item,
    count: stageCounts.value[item.value] || 0,
    description:
      STAGE_DESCRIPTIONS?.[store.flowType]?.[item.value] ||
      'Track lifecycle records for this stage.',
    sequence: index + 1,
    isActive: activeStage.value === item.value,
  })),
)

const doneStageCount = computed(() => stageItems.value.filter((item) => item.count > 0).length)

const activeStageMeta = computed(
  () => stageItems.value.find((item) => item.value === activeStage.value) || null,
)

const filteredRows = computed(() => {
  const needle = String(q.value || '').trim().toLowerCase()
  let list = Array.isArray(store.rows) ? [...store.rows] : []

  if (activeStage.value) {
    list = list.filter((row) => String(row?.lifecycle?.current_stage || '') === activeStage.value)
  }

  if (needle) {
    list = list.filter((row) => {
      const emp = row?.employee || {}
      return [emp.name, emp.employee_id, emp.department?.name, emp.designation?.title]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    })
  }

  if (sortBy.value === 'name_asc') {
    list.sort((a, b) => String(a?.employee?.name || '').localeCompare(String(b?.employee?.name || '')))
  } else if (sortBy.value === 'progress_asc') {
    list.sort((a, b) => rowProgress(a) - rowProgress(b))
  } else {
    list.sort((a, b) => rowProgress(b) - rowProgress(a))
  }

  return list
})

const visibleCount = computed(() => filteredRows.value.length)
const totalCount = computed(() => (Array.isArray(store.rows) ? store.rows.length : 0))

const averageProgress = computed(() => {
  if (!filteredRows.value.length) return 0

  const total = filteredRows.value.reduce(
    (sum, row) => sum + rowProgress(row),
    0,
  )

  return Math.round(total / filteredRows.value.length)
})

const checklistReadyCount = computed(
  () => filteredRows.value.filter((row) => clamp(row?.checklist?.progress) >= 100).length,
)

const selectedBoardRow = computed(() => {
  const explicit = filteredRows.value.find((row) => Number(row?.employee?.id) === Number(selectedBoardRowId.value))
  return explicit || filteredRows.value[0] || null
})

const boardHeadline = computed(() =>
  activeStageMeta.value ? activeStageMeta.value.label : `${flowLabel.value} Pipeline Overview`,
)

const boardSubline = computed(() =>
  activeStageMeta.value
    ? activeStageMeta.value.description
    : `Browse every ${String(flowLabel.value).toLowerCase()} stage from one board and drill down instantly.`,
)

function prettyStage(value) {
  return String(value || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function progressStatusLabel(value) {
  const status = String(value || '').toLowerCase()
  if (status === 'done' || status === 'completed') return 'Done'
  return 'In Progress'
}

function initials(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join(' ') || '--'
}

function setStageFilter(stageValue = null) {
  const nextValue = stageValue === activeStage.value ? null : stageValue
  const query = { ...route.query }

  delete query.stage

  if (nextValue) query.lifecycle_status = nextValue
  else delete query.lifecycle_status

  router.replace({ query })
}

function openDetail(row) {
  selectedRow.value = row
  quickDetailOpen.value = true
}

function selectBoardRow(row) {
  selectedBoardRowId.value = row?.employee?.id || null
}

function openFullDetail(row, stageCode = null) {
  router.push({
    name: 'lifecycle.detail',
    params: {
      flowType: store.flowType,
      userId: row?.employee?.id,
    },
    query: stageCode ? { stage: stageCode } : {},
  })
}

function closeQuickDetail() {
  quickDetailOpen.value = false
  selectedRow.value = null
}

function stageToneClass(stage) {
  const status = String(stage?.status || stage?.data_status || '').toLowerCase()
  if (status === 'done' || status === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  return 'border-blue-200 bg-blue-50 text-blue-800'
}

watch(
  filteredRows,
  (rows) => {
    if (!rows.length) {
      selectedBoardRowId.value = null
      return
    }

    if (!rows.some((row) => Number(row?.employee?.id) === Number(selectedBoardRowId.value))) {
      selectedBoardRowId.value = rows[0]?.employee?.id || null
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="space-y-3 text-[12px]">

    <div class="grid gap-5">
      

      <div class="space-y-4">
        <div class="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          <div class="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
            <div>
              <div class="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">
                {{ flowLabel }} Flow
              </div>
              <div class="mt-0.5 text-xs text-slate-500">
                Click a stage to filter employees; arrows show the next step.
              </div>
            </div>
            <div class="flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-600">
              <span class="rounded-full bg-slate-100 px-2.5 py-1">{{ totalCount }} total</span>
              <span class="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{{ visibleCount }} visible</span>
              <span class="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{{ doneStageCount }} active stages</span>
            </div>
          </div>
          <div class="flex gap-2 overflow-x-auto pb-1">
          <button
            v-for="(item, index) in stageItems"
            :key="`${item.value}-card`"
            type="button"
            class="relative min-w-[210px] flex-1 rounded-md border px-3 py-2.5 text-left transition"
            :class="
              item.isActive
                ? 'border-blue-300 bg-blue-50 text-blue-900 shadow-sm ring-1 ring-blue-200'
                : item.count > 0
                  ? 'border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50/40'
                  : 'border-slate-200 bg-slate-50/60 text-slate-500 hover:border-slate-300'
            "
            @click="setStageFilter(item.value)"
          >
            <span
              v-if="index < stageItems.length - 1"
              class="pointer-events-none absolute -right-4 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-black text-slate-700 shadow-sm xl:inline-flex"
            >
              →
            </span>
            <div
              class="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide"
              :class="item.isActive ? 'text-blue-600' : 'text-slate-400'"
            >
              <span>{{ item.isActive ? 'Current Filter' : `Step ${item.sequence}` }}</span>
              <span
                class="rounded-full px-2 py-0.5 text-[10px]"
                :class="item.isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'"
              >
                {{ item.count }} employees
              </span>
            </div>
            <div class="mt-1.5 text-sm font-semibold">{{ item.label }}</div>
            <div class="mt-1 line-clamp-2 text-[11px] leading-snug opacity-75">{{ item.description }}</div>
           
          </button>
          </div>
        </div>

        
        <div
            class="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
        >
          <div
            v-if="store.loading"
            class="absolute inset-0 z-20 flex items-start justify-center bg-white/70 pt-12 backdrop-blur-[1px]"
          >
            <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
              <span class="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"></span>
              Loading {{ activeStageMeta?.label || flowLabel }}...
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
            <div>
              <div class="text-sm font-semibold text-slate-900">{{ boardHeadline }}</div>
              <div class="text-xs text-slate-500">
                {{ boardSubline }}
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <div class="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  class="rounded px-2.5 py-1.5"
                  :class="viewMode === 'split' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'"
                  @click="viewMode = 'split'"
                >
                  Split
                </button>
                <button
                  type="button"
                  class="rounded px-2.5 py-1.5"
                  :class="viewMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'"
                  @click="viewMode = 'table'"
                >
                  Table
                </button>
              </div>
              <div class="relative">
                <input
                  v-model="q"
                  type="search"
                  placeholder="Search employee"
                  class="h-8 w-48 rounded-md border border-slate-300 bg-white px-2.5 text-xs outline-none focus:border-slate-500"
                />
              </div>
              <select v-model="sortBy" class="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700">
                <option value="progress_desc">Progress high first</option>
                <option value="progress_asc">Progress low first</option>
                <option value="name_asc">Name A-Z</option>
              </select>
              <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {{ visibleCount }} / {{ totalCount }} employees
              </span>
            </div>
          </div>

          <div v-if="filteredRows.length && viewMode === 'split'" class="grid min-h-[430px] gap-0 lg:grid-cols-[290px,minmax(0,1fr)]">
            <div class="border-b border-slate-200 bg-slate-50/70 lg:border-b-0 lg:border-r">
              <div class="border-b border-slate-200 px-3 py-2">
                <div class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Search {{ filteredRows.length }} employees
                </div>
                <div class="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                  <span
                    v-for="item in stageItems.slice(0, 3)"
                    :key="`mini-${item.value}`"
                    class="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-600"
                  >
                    {{ item.label }}: {{ item.count }}
                  </span>
                </div>
              </div>

              <div class="max-h-[430px] overflow-y-auto p-1.5">
                <button
                  v-for="row in filteredRows"
                  :key="`split-${row.id}`"
                  type="button"
                  class="mb-1.5 w-full rounded-md border bg-white p-1.5 text-left transition hover:border-slate-300"
                  :class="Number(selectedBoardRow?.employee?.id) === Number(row?.employee?.id)
                    ? 'border-slate-900 shadow-sm ring-1 ring-slate-900'
                    : 'border-slate-200'"
                  @click="selectBoardRow(row)"
                >
                  <div class="flex items-start gap-2">
                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-900 text-[10px] font-semibold text-white">
                      {{ initials(row?.employee?.name) }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="truncate text-xs font-semibold text-slate-900">{{ row?.employee?.name || '-' }}</div>
                      <div class="mt-0.5 truncate text-[11px] text-slate-500">
                        {{ prettyStage(row?.lifecycle?.current_stage) }} - {{ rowProgress(row) }}%
                      </div>
                      <div class="mt-0.5 truncate text-[11px] text-slate-500">
                        {{ row?.employee?.department?.name || 'No department' }}
                        <span v-if="row?.employee?.designation?.title"> - {{ row.employee.designation.title }}</span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div class="min-w-0 bg-white p-3">
              <div v-if="selectedBoardRow" class="space-y-3">
                <div class="flex flex-wrap items-start justify-between gap-3 rounded-md border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 px-3 py-3">
                  <div class="min-w-0">
                    <div class="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Selected Employee</div>
                    <div class="text-base font-semibold text-slate-950 md:text-lg">
                      {{ selectedBoardRow.employee?.name || '-' }}
                      <span class="text-xs font-medium text-slate-500">- {{ selectedBoardRow.employee?.employee_id || 'No ID' }}</span>
                    </div>
                    <div class="mt-1 flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                      <span class="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                        {{ selectedBoardRow.employee?.department?.name || 'No department' }}
                      </span>
                      <span class="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                        {{ selectedBoardRow.employee?.designation?.title || 'No designation' }}
                      </span>
                      <span class="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                        {{ selectedBoardRow.employee?.employment_type || 'No type' }}
                      </span>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <div class="min-w-[120px]">
                      <div class="mb-1 flex items-center justify-between text-[11px] font-medium text-slate-500">
                        <span>{{ prettyStage(selectedBoardRow.lifecycle?.current_stage) }}</span>
                        <span>{{ rowProgress(selectedBoardRow) }}%</span>
                      </div>
                      <div class="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          class="h-2 rounded-full bg-slate-900"
                          :style="{ width: `${rowProgress(selectedBoardRow)}%` }"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      class="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                      @click="openDetail(selectedBoardRow)"
                    >
                      Quick view
                    </button>
                  </div>
                </div>

                <div class="grid gap-2 xl:grid-cols-5">
                  <div
                    v-for="(stage, index) in selectedBoardRow.stages || []"
                    :key="`timeline-${stage.code}`"
                    class="relative rounded-md border px-3 py-2"
                    :class="stageToneClass(stage)"
                  >
                    <span
                      v-if="index < (selectedBoardRow.stages || []).length - 1"
                      class="pointer-events-none absolute -right-4 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-black text-slate-700 shadow-sm xl:inline-flex"
                    >
                      →
                    </span>
                    <div class="flex h-full flex-col justify-between gap-2">
                      <div class="min-w-0">
                        <div class="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">Step {{ index + 1 }}</div>
                        <div class="mt-1 text-sm font-semibold leading-tight">{{ stage.label }}</div>
                        <div class="mt-0.5 text-[11px] opacity-80">
                          {{ progressStatusLabel(stage.data_status || stage.status) }}
                        </div>
                      </div>
                      <div class="space-y-2">
                        <div class="h-1.5 overflow-hidden rounded-full bg-white/70 ring-1 ring-inset ring-slate-200">
                          <div
                            class="h-1.5 rounded-full bg-current opacity-70"
                            :style="{ width: `${clamp(stage.progress)}%` }"
                          />
                        </div>
                        <div class="flex items-center justify-between gap-2">
                          <span class="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold">
                            {{ stage.progress ?? 0 }}%
                          </span>
                        <button
                          type="button"
                          class="rounded border border-current px-2 py-1 text-[11px] font-semibold opacity-80 hover:opacity-100"
                          @click="openFullDetail(selectedBoardRow, stage.code)"
                        >
                          Open
                        </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="filteredRows.length" class="overflow-x-auto bg-white">
            <div class="flex min-w-[980px] items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-3 py-2">
              <div class="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600">
                <span class="rounded-full bg-white px-2.5 py-1 shadow-sm ring-1 ring-slate-200">
                  Avg {{ averageProgress }}%
                </span>
                <span class="rounded-full bg-white px-2.5 py-1 shadow-sm ring-1 ring-slate-200">
                  Checklist ready {{ checklistReadyCount }}
                </span>
                <span v-if="activeStageMeta" class="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 ring-1 ring-blue-100">
                  {{ activeStageMeta.label }}
                </span>
              </div>
              <div class="text-[11px] font-medium text-slate-500">
                Dense table view for scanning employee lifecycle status.
              </div>
            </div>

            <table class="min-w-[980px] text-[12px] text-slate-700">
              <thead class="sticky top-0 z-10 bg-slate-100/95 backdrop-blur">
                <tr class="border-b border-slate-200 text-left text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  <th class="w-10 px-3 py-2 font-bold">#</th>
                  <th class="min-w-[250px] px-3 py-2 font-bold">Employee</th>
                  <th class="min-w-[190px] px-3 py-2 font-bold">Assignment</th>
                  <th class="min-w-[170px] px-3 py-2 font-bold">Current Stage</th>
                  <th class="min-w-[260px] px-3 py-2 font-bold">Stage Flow</th>
                  <th class="min-w-[170px] px-3 py-2 font-bold">Progress</th>
                  <th class="min-w-[160px] px-3 py-2 font-bold">Checklist</th>
                  <th class="w-32 px-3 py-2 text-right font-bold">Action</th>
                </tr>
              </thead>

              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="(row, idx) in filteredRows"
                  :key="row.id"
                  class="transition hover:bg-blue-50/30"
                >
                  <td class="px-3 py-2 align-top text-[11px] font-semibold text-slate-400">{{ idx + 1 }}</td>

                  <td class="px-3 py-2">
                    <div class="flex items-start gap-2">
                      <div
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-900 text-[10px] font-semibold text-white shadow-sm"
                      >
                        {{ initials(row?.employee?.name) }}
                      </div>

                      <div class="min-w-0">
                        <div class="truncate text-[13px] font-semibold text-slate-950">
                          {{ row?.employee?.name || '-' }}
                        </div>
                        <div class="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-slate-500">
                          <span>{{ row?.employee?.employee_id || 'No ID' }}</span>
                          <span class="h-1 w-1 rounded-full bg-slate-300"></span>
                          <span
                            class="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-medium text-slate-600"
                          >
                            {{ row?.employee?.employment_type || 'No type' }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td class="px-3 py-2">
                    <div class="max-w-[190px]">
                      <div class="truncate text-[12px] font-semibold text-slate-800">
                        {{ row?.employee?.department?.name || 'No department' }}
                      </div>
                      <div class="mt-0.5 truncate text-[11px] text-slate-500">
                        {{ row?.employee?.designation?.title || 'No designation' }}
                      </div>
                    </div>
                  </td>

                  <td class="px-3 py-2">
                    <div class="inline-flex max-w-[170px] items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5 text-blue-800">
                      <span class="h-2 w-2 shrink-0 rounded-full bg-blue-600"></span>
                      <div class="min-w-0">
                        <div class="truncate text-[12px] font-semibold">{{ prettyStage(row?.lifecycle?.current_stage) || '-' }}</div>
                        <div class="text-[10px] text-blue-600/80">{{ progressStatusLabel(row?.lifecycle?.status) }}</div>
                      </div>
                    </div>
                  </td>

                  <td class="px-3 py-2">
                    <div class="flex min-w-[240px] items-center gap-1.5">
                      <button
                        v-for="stage in row.stages || []"
                        :key="`table-stage-${row.id}-${stage.code}`"
                        type="button"
                        class="group min-w-0 flex-1 rounded border px-1.5 py-1 text-left transition hover:border-blue-300"
                        :class="stageToneClass(stage)"
                        :title="`${stage.label}: ${stage.progress ?? 0}%`"
                        @click="openFullDetail(row, stage.code)"
                      >
                        <div class="truncate text-[10px] font-semibold leading-tight">{{ stage.label }}</div>
                        <div class="mt-1 h-1 overflow-hidden rounded-full bg-white/70 ring-1 ring-inset ring-slate-200">
                          <div
                            class="h-1 rounded-full bg-current opacity-75"
                            :style="{ width: `${clamp(stage.progress)}%` }"
                          />
                        </div>
                      </button>
                    </div>
                  </td>

                  <td class="px-3 py-2">
                    <div class="min-w-[150px]">
                      <div class="mb-1 flex items-center justify-between text-[10px] font-semibold text-slate-500">
                        <span>{{ flowLabel }}</span>
                        <span class="text-slate-800">{{ rowProgress(row) }}%</span>
                      </div>
                      <div class="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          class="h-2 rounded-full bg-blue-700"
                          :style="{ width: `${rowProgress(row)}%` }"
                        />
                      </div>
                    </div>
                  </td>

                  <td class="px-3 py-2">
                    <div class="truncate text-[12px] font-semibold text-slate-800">
                      {{ row?.checklist?.template_name || 'Not created' }}
                    </div>
                    <div class="mt-1 flex items-center gap-2">
                      <div class="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                        <div
                          class="h-1.5 rounded-full bg-emerald-600"
                          :style="{ width: `${clamp(row?.checklist?.progress)}%` }"
                        />
                      </div>
                      <span class="text-[10px] font-semibold text-slate-500">{{ clamp(row?.checklist?.progress) }}%</span>
                    </div>
                  </td>

                  <td class="px-3 py-2">
                    <div class="flex justify-end gap-1.5">
                      <button
                        type="button"
                        class="rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-800"
                        @click="openDetail(row)"
                      >
                        Quick
                      </button>
                      <button
                        type="button"
                        class="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                        @click="openFullDetail(row)"
                      >
                        Full
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            v-else-if="!store.loading"
            class="px-6 py-16 text-center"
          >
            <div class="mx-auto max-w-md">
              <div class="text-sm font-semibold text-slate-700">No lifecycle records found</div>
              <p class="mt-2 text-sm text-slate-500">
                Try another stage or broaden the employee filters from the top panel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <LifecycleQuickDetailDrawer
      :open="quickDetailOpen"
      :row="selectedRow"
      :flow-type="store.flowType"
      @close="closeQuickDetail"
      @refresh="store.fetchBoard()"
    />
  </div>
</template>
