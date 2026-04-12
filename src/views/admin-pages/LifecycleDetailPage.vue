<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChecklistTable from '@/components/ChecklistTable.vue'
import { resolveLifecycleStageComponent } from '@/components/lifecycle/stages/stageRegistry'
import { useChecklistStore } from '@/stores/checklist'
import { useLifecycleStore } from '@/stores/lifecycle'

const route = useRoute()
const router = useRouter()
const lifecycleStore = useLifecycleStore()
const checklistStore = useChecklistStore()

const flowType = computed(() =>
  route.params.flowType === 'offboarding' ? 'offboarding' : 'onboarding',
)
const userId = computed(() => Number(route.params.userId))

const lifecycle = computed(() => lifecycleStore.currentRecord?.lifecycle || null)
const employee = computed(() => lifecycleStore.currentRecord?.employee || null)
const checklist = computed(() => lifecycleStore.currentRecord?.checklist || null)
const template = computed(() => lifecycleStore.currentRecord?.template || null)
const stages = computed(() => lifecycleStore.currentRecord?.stages || [])
const activeStageCode = ref(null)
const checklistStarting = ref(false)

async function load() {
  lifecycleStore.setFlowType(flowType.value)
  await lifecycleStore.fetchDetail(userId.value, flowType.value)

  if (checklist.value?.id) {
    await checklistStore.fetchChecklist(userId.value, checklist.value.id)
    return
  }

  checklistStore.reset()
}

watch([flowType, userId], load, { immediate: true })
watch(
  stages,
  (value) => {
    const requested = String(route.query.stage || '')
    const allowed = value.map((item) => item.code)
    const fallback =
      value.find((item) => item.status === 'current')?.code || value[0]?.code || null
    activeStageCode.value = allowed.includes(requested) ? requested : fallback
  },
  { immediate: true },
)

watch(activeStageCode, (value) => {
  if (!value) return
  router.replace({ query: { ...route.query, stage: value } })
})

function stageTone(status) {
  if (status === 'done') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'current') return 'border-blue-200 bg-blue-50 text-blue-700'
  return 'border-gray-200 bg-gray-50 text-gray-500'
}

const activeStage = computed(
  () => stages.value.find((item) => item.code === activeStageCode.value) || stages.value[0] || null,
)
const activeStageComponent = computed(() =>
  resolveLifecycleStageComponent(flowType.value, activeStageCode.value),
)
const isChecklistStage = computed(
  () => activeStageCode.value === 'joining' || activeStageCode.value === 'clearance_in_progress',
)
const isStageComponentVisible = computed(
  () => !!activeStage.value && !isChecklistStage.value && !!activeStageComponent.value,
)

function openChecklistPage() {
  return startChecklistInline()
}

const currentChecklist = computed(() => checklistStore.checklist || checklist.value || null)

async function startChecklistInline() {
  if (checklistStarting.value) return

  if (currentChecklist.value?.id) {
    await checklistStore.fetchChecklist(userId.value, currentChecklist.value.id)
    return
  }

  if (!template.value?.id) {
    window?.notify?.error?.('Checklist template is not configured')
    return
  }

  checklistStarting.value = true

  try {
    await checklistStore.ensureChecklist(userId.value, template.value.id)
    window?.notify?.success?.('Checklist started')
    await lifecycleStore.fetchDetail(userId.value, flowType.value)
  } catch (error) {
    window?.notify?.error?.('Failed to start checklist')
  } finally {
    checklistStarting.value = false
  }
}

const currentStageLabel = computed(() => {
  const row = stages.value.find((item) => item.code === lifecycle.value?.current_stage)
  return row?.label || 'Not started'
})

const employeeMetaItems = computed(() =>
  [
    employee.value?.employee_id || 'No employee ID',
    employee.value?.department?.name || 'No department',
    employee.value?.designation?.title || 'No designation',
  ].filter(Boolean),
)

const checklistSectionTitle = computed(() =>
  flowType.value === 'onboarding'
    ? 'Joining Checklist Phase'
    : 'Exit Checklist / Clearance Phase',
)

const checklistActionLabel = computed(() => {
  if (checklistStarting.value) return 'Starting...'
  if (currentChecklist.value?.id) return 'Refresh Checklist'
  return 'Start Checklist'
})

const canStartChecklist = computed(
  () => !checklistStarting.value && (Boolean(currentChecklist.value?.id) || Boolean(template.value?.id)),
)

const checklistSummaryItems = computed(() => [
  { label: 'Template', value: currentChecklist.value?.template_name || template.value?.name || '-' },
  {
    label: 'Checklist Progress',
    value: `${currentChecklist.value?.progress ?? checklistStore.completion ?? 0}%`,
  },
  { label: 'Current Stage', value: currentStageLabel.value },
  { label: 'Lifecycle Status', value: lifecycle.value?.status || '-' },
  { label: 'Active Tab', value: activeStage.value?.label || '-' },
])
</script>

<template>
  <div class="space-y-3 p-3 md:p-4">
    <div class="rounded-xl border bg-white shadow-sm">
      <div class="bg-gradient-to-r from-slate-50 via-white to-slate-50 px-4 py-3 md:px-4.5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="text-[11px] uppercase tracking-[0.24em] text-gray-500">
              {{ lifecycleStore.flowLabel }}
            </div>
            <h1 class="text-lg font-semibold text-slate-900 md:text-xl">
              {{ employee?.name || 'Lifecycle Detail' }}
            </h1>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <span
                v-for="item in employeeMetaItems"
                :key="item"
                class="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600"
              >
                {{ item }}
              </span>
            </div>
          </div>

          <div class="min-w-[210px] rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5">
            <div class="mb-1 flex items-center justify-between text-[11px] font-medium text-gray-600">
              <span>{{ currentStageLabel }}</span>
              <span>{{ lifecycle?.overall_progress || 0 }}%</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-gray-200">
              <div
                class="h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500"
                :style="{ width: `${lifecycle?.overall_progress || 0}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-3">
      <section class="rounded-xl border bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 md:px-4.5">
          <div>
            <h2 class="text-base font-semibold text-slate-900">Lifecycle Stages</h2>
            <p class="text-xs text-gray-500">
              Stage-by-stage execution under onboarding and offboarding.
            </p>
          </div>
        </div>

        <div class="px-4 py-3 md:px-4.5">
          <div class="mb-3 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-5">
            <button
              v-for="stage in stages"
              :key="stage.code"
              type="button"
              class="rounded-lg border px-2.5 py-2 text-left transition"
              :class="[
                stageTone(stage.status),
                activeStageCode === stage.code ? 'ring-2 ring-blue-200 shadow-sm' : 'hover:border-gray-300',
              ]"
              @click="activeStageCode = stage.code"
            >
              <div class="text-[10px] uppercase tracking-[0.2em]">{{ stage.status }}</div>
              <div class="mt-0.5 text-sm font-medium leading-snug">{{ stage.label }}</div>
            </button>
          </div>

          <div v-if="lifecycleStore.detailLoading || checklistStore.loading" class="text-gray-600">
            Loading...
          </div>
          <div
            v-else-if="lifecycleStore.detailError || checklistStore.error"
            class="text-red-600"
          >
            Failed to load lifecycle detail.
          </div>

          <div v-else-if="isChecklistStage">
            <div class="mb-2.5 flex flex-wrap items-center justify-between gap-2.5">
              <div>
                <h2 class="text-base font-semibold text-slate-900">{{ checklistSectionTitle }}</h2>
                <p class="text-xs text-gray-500">
                  Existing attachment, comment, status, checked by, and checked at behavior is reused here.
                </p>
              </div>

              <button
                class="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="!canStartChecklist"
                @click="openChecklistPage"
              >
                {{ checklistActionLabel }}
              </button>
            </div>

            <ChecklistTable v-if="checklistStore.checklist" :items="checklistStore.items" />
            <div v-else class="rounded-lg border border-dashed bg-gray-50 p-3 text-sm text-gray-600">
              Checklist is not created yet. Start the checklist from this page when you are ready
              to move from the current lifecycle stage.
            </div>
          </div>

          <component
            :is="activeStageComponent"
            v-else-if="isStageComponentVisible"
            :lifecycle-id="lifecycle?.id || 0"
            :stage="activeStage"
            :employee="employee"
          />

          <div v-else class="rounded-lg border border-dashed bg-gray-50 p-3 text-sm text-gray-600">
            This stage is part of the lifecycle structure, but its detailed form is not configured
            yet.
          </div>
        </div>
      </section>

      <!-- <aside class="space-y-3 xl:sticky xl:top-3 xl:self-start">
        <section class="rounded-xl border bg-white shadow-sm">
          <div class="border-b px-4 py-2.5">
            <h2 class="text-sm font-semibold text-slate-900">Checklist Summary</h2>
          </div>
          <div class="space-y-2 px-4 py-3 text-sm">
            <div
              v-for="item in checklistSummaryItems"
              :key="item.label"
              class="flex items-center justify-between gap-3"
            >
              <span class="text-gray-500">{{ item.label }}</span>
              <span class="text-right font-medium text-gray-800">{{ item.value }}</span>
            </div>
          </div>
        </section>

        <section class="rounded-xl border bg-white shadow-sm">
          <div class="border-b px-4 py-2.5">
            <h2 class="text-sm font-semibold text-slate-900">Next Phases</h2>
          </div>
          <div class="space-y-2 px-4 py-3 text-sm text-gray-600">
            <div v-if="flowType === 'onboarding'">
              Onboarding now follows your structure: Pre-Boarding, Joining Checklist, Training,
              Probation Tracking, and Confirmation.
            </div>
            <div v-else>
              Offboarding now follows your structure: Exit Request, Exit Checklist, Handover, Exit
              Interview, and Final Settlement.
            </div>
          </div>
        </section>
      </aside> -->
    </div>
  </div>
</template>
