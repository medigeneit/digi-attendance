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
  <div class="space-y-4">

    <div class="grid gap-5">
      

      <div class="space-y-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div class="flex gap-2 overflow-x-auto">
          <button
            v-for="item in stageItems"
            :key="`${item.value}-card`"
            type="button"
            class="min-w-[210px] flex-1 rounded-xl border px-3 py-3 text-left transition"
            :class="
              item.isActive
                ? 'border-blue-200 bg-blue-50 text-blue-900 shadow-sm'
                : 'border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50'
            "
            @click="setStageFilter(item.value)"
          >
            <div
              class="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide"
              :class="item.isActive ? 'text-blue-600' : 'text-slate-400'"
            >
              <span>{{ item.isActive ? 'Current Filter' : 'Stage' }}</span>
              <span
                class="rounded-full px-2 py-0.5 text-[10px]"
                :class="item.isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'"
              >
                {{ item.count }} employees
              </span>
            </div>
            <div class="mt-2 text-sm font-semibold">{{ item.label }}</div>
           
          </button>
          </div>
        </div>

        
        <div
          class="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
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

          <div class="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <div class="text-sm font-semibold text-slate-900">{{ boardHeadline }}</div>
              <div class="text-xs text-slate-500">
                {{ boardSubline }}
              </div>
            </div>

            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {{ visibleCount }} / {{ totalCount }} employees
            </span>
          </div>

          <div v-if="filteredRows.length" class="overflow-x-auto">
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
  </div>
</template>
