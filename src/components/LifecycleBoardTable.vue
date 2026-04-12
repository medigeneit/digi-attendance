<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLifecycleStore } from '@/stores/lifecycle'

const store = useLifecycleStore()
const route = useRoute()
const router = useRouter()

const q = ref('')
const sortBy = ref('progress_desc')

const STAGE_DESCRIPTIONS = {
  onboarding: {
    pre_boarding: 'Documents, approvals, and readiness checks before day one.',
    joining: 'Joining formalities and first-day checklist items.',
    training: 'Orientation, tools, and resource setup for the new joiner.',
    probation: 'Performance follow-up and probation milestone tracking.',
    confirmation: 'Final review, confirmation, and regularization tasks.',
  },
  offboarding: {
    exit_request: 'Initial resignation or separation request handling.',
    clearance_in_progress: 'Department clearance and exit checklist follow-up.',
    handover_in_progress: 'Knowledge transfer, asset return, and handover work.',
    exit_interview: 'Feedback capture and final exit interview activities.',
    settlement_pending: 'Final settlement, dues, and closeout preparation.',
    exited: 'Employee exit closed and lifecycle completed.',
  },
}

const clamp = (v, min = 0, max = 100) => Math.min(Math.max(Number(v || 0), min), max)

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
    list.sort((a, b) => clamp(a?.lifecycle?.overall_progress) - clamp(b?.lifecycle?.overall_progress))
  } else {
    list.sort((a, b) => clamp(b?.lifecycle?.overall_progress) - clamp(a?.lifecycle?.overall_progress))
  }

  return list
})

const visibleCount = computed(() => filteredRows.value.length)
const totalCount = computed(() => (Array.isArray(store.rows) ? store.rows.length : 0))

const averageProgress = computed(() => {
  if (!filteredRows.value.length) return 0

  const total = filteredRows.value.reduce(
    (sum, row) => sum + clamp(row?.lifecycle?.overall_progress),
    0,
  )

  return Math.round(total / filteredRows.value.length)
})

const checklistReadyCount = computed(
  () => filteredRows.value.filter((row) => clamp(row?.checklist?.progress) >= 100).length,
)

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
  router.push({
    name: 'lifecycle.detail',
    params: {
      flowType: store.flowType,
      userId: row?.employee?.id,
    },
  })
}
</script>

<template>
  <div class="space-y-5">

    <div class="grid gap-5">
      

      <div class="space-y-4">
        <div class="flex gap-3 overflow-x-auto pb-1">
          <button
            v-for="item in stageItems"
            :key="`${item.value}-card`"
            type="button"
            class="min-w-[240px] flex-1 rounded-[24px] border px-4 py-4 text-left transition"
            :class="
              item.isActive
                ? 'border-blue-200 bg-blue-50/80 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
            "
            @click="setStageFilter(item.value)"
          >
            <div
              class="text-[11px] font-semibold uppercase"
              :class="item.isActive ? 'text-blue-500' : 'text-slate-400'"
            >
              {{ item.isActive ? 'Current Filter' : 'Stage' }}  
              <span v-if="item.count">{{ item.count }} employees</span>
            </div>
            <div class="mt-2 text-md font-semibold text-slate-900">{{ item.label }}</div>
           
          </button>
        </div>

        
        <div
          v-if="filteredRows.length"
          class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
        >
          <div class="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <div class="text-sm font-semibold text-slate-900">Employee Lifecycle Snapshot</div>
              <div class="text-xs text-slate-500">
                {{ activeStageMeta ? activeStageMeta.description : 'Full lifecycle board overview.' }}
              </div>
            </div>

            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {{ activeStageMeta?.label || flowLabel }}
            </span>
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full text-[13px] text-slate-700">
              <thead class="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                <tr class="border-b border-slate-200 text-left">
                  <th class="w-12 px-4 py-3 font-semibold text-slate-500">#</th>
                  <th class="min-w-[260px] px-4 py-3 font-semibold text-slate-500">Employee</th>
                  <th class="min-w-[260px] px-4 py-3 font-semibold text-slate-500">Employee Type</th>
                  <th class="min-w-[210px] px-4 py-3 font-semibold text-slate-500">Current Stage</th>
                  <th class="min-w-[240px] px-4 py-3 font-semibold text-slate-500">Lifecycle Progress</th>
                  <th class="min-w-[180px] px-4 py-3 font-semibold text-slate-500">Checklist</th>
                  <th class="w-36 px-4 py-3 font-semibold text-slate-500">Actions</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="(row, idx) in filteredRows"
                  :key="row.id"
                  class="border-b border-slate-100 transition hover:bg-slate-50/70"
                >
                  <td class="px-4 py-3 align-top text-slate-500">{{ idx + 1 }}</td>

                  <td class="px-4 py-3">
                    <div class="flex items-start gap-3">
                      <div
                        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-blue-700 text-[11px] font-semibold text-white shadow-sm"
                      >
                        {{ initials(row?.employee?.name) }}
                      </div>

                      <div class="min-w-0">
                        <div class="truncate font-semibold text-slate-900">
                          {{ row?.employee?.name || '-' }}
                        </div>
                        <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                          <span>{{ row?.employee?.employee_id || 'No ID' }}</span>
                          <span class="h-1 w-1 rounded-full bg-slate-300"></span>
                          <span>{{ row?.employee?.department?.name || 'No department' }}</span>
                          <span
                            v-if="row?.employee?.designation?.title"
                            class="rounded-full bg-slate-100 px-2 py-0.5"
                          >
                            {{ row?.employee?.designation?.title }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    {{ row?.employee?.employment_type || '-' }}
                  </td>

                  <td class="px-4 py-3">
                    <div class="inline-flex rounded-2xl bg-blue-50 px-3 py-2 text-blue-700">
                      <div>
                        <div class="font-semibold">
                          {{ prettyStage(row?.lifecycle?.current_stage) || '-' }}
                        </div>
                        <div class="mt-1 text-[11px] text-blue-600/80">
                          {{ prettyStage(row?.lifecycle?.status) || 'Pending update' }}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td class="px-4 py-3">
                    <div class="w-full">
                      <div class="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{{ flowLabel }}</span>
                        <span>{{ clamp(row?.lifecycle?.overall_progress) }}%</span>
                      </div>
                      <div class="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
                        <div
                          class="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500"
                          :style="{ width: `${clamp(row?.lifecycle?.overall_progress)}%` }"
                        />
                      </div>
                    </div>
                  </td>

                  <td class="px-4 py-3">
                    <div class="font-semibold text-slate-800">
                      {{ row?.checklist?.template_name || 'Not created' }}
                    </div>
                    <div class="mt-1 text-[11px] text-slate-500">
                      {{ clamp(row?.checklist?.progress) }}% checklist done
                    </div>
                  </td>

                  <td class="px-4 py-3">
                    <button
                      type="button"
                      class="rounded-2xl bg-slate-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700"
                      @click="openDetail(row)"
                    >
                      Open Detail
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div
          v-else-if="!store.loading"
          class="rounded-[28px] border border-dashed border-slate-300 bg-white/80 px-6 py-16 text-center shadow-sm"
        >
          <div class="mx-auto max-w-md">
            <div class="text-sm font-semibold text-slate-700">No lifecycle records found</div>
            <p class="mt-2 text-sm text-slate-500">
              Try another stage, clear the search box, or broaden the employee filters from the top panel.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
