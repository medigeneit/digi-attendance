<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AttachmentUploader from '@/components/AttachmentUploader.vue'
import { resolveLifecycleStageComponent } from '@/components/lifecycle/stages/stageRegistry'
import { useChecklistStore } from '@/stores/checklist'
import { useLifecycleStore } from '@/stores/lifecycle'

const props = defineProps({
  open: { type: Boolean, default: false },
  row: { type: Object, default: null },
  flowType: { type: String, default: 'onboarding' },
})

const emit = defineEmits(['close', 'refresh'])

const router = useRouter()
const lifecycleStore = useLifecycleStore()
const checklistStore = useChecklistStore()

const activeStageCode = ref('')
const startingChecklist = ref(false)
const checklistFilter = ref('all')
const itemSaving = ref(Object.create(null))

const record = computed(() => lifecycleStore.currentRecord || null)
const lifecycle = computed(() => record.value?.lifecycle || null)
const employee = computed(() => record.value?.employee || props.row?.employee || null)
const checklist = computed(() => record.value?.checklist || null)
const template = computed(() => record.value?.template || null)
const stages = computed(() => record.value?.stages || props.row?.stages || [])
const clamp = (v, min = 0, max = 100) => Math.min(Math.max(Number(v || 0), min), max)
const stageAverageProgress = (items = []) => {
  const values = (Array.isArray(items) ? items : [])
    .map((stage) => clamp(stage?.progress))
    .filter((value) => Number.isFinite(value))

  if (!values.length) return null

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

const currentStageCode = computed(() => lifecycle.value?.current_stage || props.row?.lifecycle?.current_stage || '')
const activeStage = computed(
  () => stages.value.find((item) => item.code === activeStageCode.value) || stages.value[0] || null,
)

const activeStageComponent = computed(() =>
  resolveLifecycleStageComponent(props.flowType, activeStageCode.value),
)

const isChecklistStage = computed(
  () => activeStageCode.value === 'joining' || activeStageCode.value === 'clearance_in_progress',
)

const canRenderStageForm = computed(
  () => Boolean(activeStage.value && activeStageComponent.value && !isChecklistStage.value),
)

const progress = computed(() => {
  const fromStages = stageAverageProgress(stages.value)
  return fromStages === null
    ? clamp(lifecycle.value?.overall_progress ?? props.row?.lifecycle?.overall_progress)
    : clamp(fromStages)
})

const currentStageLabel = computed(() => {
  const stage = stages.value.find((item) => item.code === currentStageCode.value)
  return stage?.label || prettyStage(currentStageCode.value) || 'In Progress'
})

const metaItems = computed(() =>
  [
    employee.value?.employee_id || 'No employee ID',
    employee.value?.department?.name || 'No department',
    employee.value?.designation?.title || 'No designation',
    employee.value?.employment_type || null,
  ].filter(Boolean),
)

const checklistItems = computed(() => checklistStore.items || [])
const requiredItems = computed(() => checklistItems.value.filter((item) => requiredOf(item)))
const optionalItems = computed(() => checklistItems.value.filter((item) => !requiredOf(item)))
const checklistCompletion = computed(() => clamp(checklistStore.completion))
const checklistStats = computed(() => {
  const required = requiredItems.value
  const done = required.filter((item) => ['done', 'waived'].includes(String(item.status))).length

  return {
    done,
    pending: Math.max(required.length - done, 0),
    required: required.length,
  }
})

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen || !props.row?.employee?.id) return
    checklistStore.reset()
    await lifecycleStore.fetchDetail(props.row.employee.id, props.flowType)
    activeStageCode.value =
      currentStageCode.value ||
      stages.value.find((item) => item.status === 'current')?.code ||
      stages.value[0]?.code ||
      ''
    await loadChecklistIfNeeded()
  },
)

watch(activeStageCode, async () => {
  if (!props.open) return
  await loadChecklistIfNeeded()
})

watch(
  () => lifecycleStore.currentRecord,
  (value, oldValue) => {
    if (!props.open || !value || !oldValue || value.id !== oldValue.id) return
    emit('refresh')
  },
)

async function loadChecklistIfNeeded() {
  if (!isChecklistStage.value) return
  if (checklist.value?.id) {
    await checklistStore.fetchChecklist(employee.value?.id, checklist.value.id)
  } else {
    checklistStore.reset()
  }
}

async function startChecklist() {
  if (!employee.value?.id || !template.value?.id || startingChecklist.value) return
  startingChecklist.value = true
  try {
    await checklistStore.ensureChecklist(employee.value.id, template.value.id)
    await lifecycleStore.fetchDetail(employee.value.id, props.flowType)
    emit('refresh')
  } finally {
    startingChecklist.value = false
  }
}

async function refreshLifecycleDetail() {
  if (!employee.value?.id) return
  await lifecycleStore.fetchDetail(employee.value.id, props.flowType)
}

function setItemSaving(id, flag) {
  itemSaving.value[id] = !!flag
  itemSaving.value = { ...itemSaving.value }
}

function labelOf(item) {
  return checklistStore.labelOf(item)
}

function requiredOf(item) {
  return checklistStore.requiredOf(item)
}

function checkedBy(item) {
  return item?.checked_by?.name || item?.checker?.name || ''
}

function checkedAt(item) {
  if (!item?.checked_at) return ''
  try {
    return new Date(item.checked_at).toLocaleDateString('en-GB')
  } catch {
    return String(item.checked_at)
  }
}

function itemTone(item) {
  if (item.status === 'done' || item.status === 'waived') {
    return 'border-emerald-300 bg-emerald-50/40'
  }

  if (requiredOf(item)) {
    return 'border-amber-300 bg-amber-50/30'
  }

  return 'border-slate-200 bg-white'
}

function filteredChecklistItems(items) {
  if (checklistFilter.value === 'pending') {
    return items.filter((item) => !['done', 'waived'].includes(String(item.status)))
  }

  if (checklistFilter.value === 'required') {
    return items.filter((item) => requiredOf(item))
  }

  return items
}

async function updateChecklistItem(item, patch) {
  try {
    setItemSaving(item.id, true)
    await checklistStore.saveItem(item, patch)
    await refreshLifecycleDetail()
  } finally {
    setItemSaving(item.id, false)
  }
}

async function markRequiredDone() {
  const pending = requiredItems.value.filter((item) => !['done', 'waived'].includes(String(item.status)))

  for (const item of pending) {
    await updateChecklistItem(item, { status: 'done' })
  }
}

function close() {
  emit('close')
}

function openFull(stageCode = activeStageCode.value) {
  if (!employee.value?.id) return
  router.push({
    name: 'lifecycle.detail',
    params: { flowType: props.flowType, userId: employee.value.id },
    query: stageCode ? { stage: stageCode } : {},
  })
}

function stageTone(stage) {
  const status = stage?.status || stage?.data_status
  if (status === 'done' || stage?.data_status === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  return 'border-blue-200 bg-blue-50 text-blue-800'
}

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
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[9998]">
      <div class="absolute inset-0 bg-slate-950/35" @click="close"></div>

      <aside
        class="lifecycle-quick-detail absolute right-0 top-0 flex h-full w-full max-w-[860px] flex-col bg-slate-50 text-[11px] shadow-2xl md:border-l md:border-slate-200"
      >
        <header class="border-b border-slate-200 bg-white px-2.5 py-1.5 md:px-3">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {{ lifecycleStore.flowLabel }} Quick Detail
              </div>
              <h2 class="truncate text-[13px] font-semibold text-slate-950 md:text-sm">
                {{ employee?.name || 'Employee lifecycle' }}
              </h2>
              <div class="mt-1 flex flex-wrap gap-1">
                <span
                  v-for="item in metaItems"
                  :key="item"
                  class="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                >
                  {{ item }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                @click="openFull()"
              >
                Open full
              </button>
              <button
                type="button"
                class="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                aria-label="Close"
                @click="close"
              >
                <i class="far fa-times"></i>
              </button>
            </div>
          </div>
        </header>

        <div v-if="lifecycleStore.detailLoading" class="flex flex-1 items-start justify-center p-10">
          <div class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
            Loading lifecycle...
          </div>
        </div>

        <div v-else-if="lifecycleStore.detailError" class="p-5 text-sm text-rose-700">
          Failed to load lifecycle detail.
        </div>

        <div v-else class="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[238px,minmax(0,1fr)]">
          <section class="min-h-0 overflow-y-auto border-b border-slate-200 bg-white p-2 lg:border-b-0 lg:border-r">
            <div class="rounded-md border border-slate-200 bg-slate-50 p-2">
              <div class="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                <span>{{ currentStageLabel }}</span>
                <span>{{ progress }}%</span>
              </div>
              <div class="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div class="h-1.5 rounded-full bg-slate-900" :style="{ width: `${progress}%` }"></div>
              </div>
            </div>

            <div class="mt-2 space-y-1">
              <button
                v-for="stage in stages"
                :key="stage.code"
                type="button"
                class="relative w-full rounded-md border px-2 py-1.5 text-left transition hover:border-slate-300"
                :class="[
                  stageTone(stage),
                  activeStageCode === stage.code
                    ? '!border-blue-700 !bg-blue-600 !text-white shadow-sm ring-2 ring-blue-200'
                    : '',
                ]"
                @click="activeStageCode = stage.code"
              >
                <span
                  v-if="activeStageCode === stage.code"
                  class="absolute inset-y-1 left-1 w-1 rounded-full bg-white/90"
                ></span>
                <div class="flex items-center justify-between gap-2">
                  <div class="truncate pl-1.5 text-[11px] font-semibold">{{ stage.label }}</div>
                  <span
                    class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                    :class="activeStageCode === stage.code ? 'bg-white text-blue-700' : 'bg-white/80'"
                  >
                    {{ stage.progress ?? 0 }}%
                  </span>
                </div>
                <div
                  class="mt-0.5 pl-1.5 text-[10px]"
                  :class="activeStageCode === stage.code ? 'text-blue-50' : 'opacity-80'"
                >
                  {{ progressStatusLabel(stage.data_status || stage.status) }}
                </div>
              </button>
            </div>
          </section>

          <section class="min-h-0 overflow-y-auto p-2">
            <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div class="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  EmpManage / {{ lifecycleStore.flowLabel }} / {{ activeStage?.label || 'Stage' }}
                </div>
                <h3 class="text-[12px] font-semibold text-slate-950">{{ activeStage?.label || 'Stage' }}</h3>
              </div>
              <button
                type="button"
                class="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                @click="openFull(activeStageCode)"
              >
                Full page
              </button>
            </div>

            <div v-if="isChecklistStage" class="rounded-md border border-slate-200 bg-[#fffdf8] p-2">
              <div v-if="checklistStore.checklist" class="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-blue-500 bg-white text-[12px] font-bold text-blue-600">
                    {{ checklistCompletion }}%
                  </div>
                  <div>
                    <div class="text-[13px] font-semibold text-slate-950">
                      {{ props.flowType === 'onboarding' ? 'Joining Checklist' : 'Exit Clearance' }}
                    </div>
                    <div class="text-[11px] text-slate-500">
                      {{ checklistStats.done }} of {{ checklistStats.required }} required done · {{ checklistStats.pending }} pending
                    </div>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-1.5">
                  <button
                    v-for="filter in [
                      { value: 'all', label: 'All' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'required', label: 'Required' },
                    ]"
                    :key="filter.value"
                    type="button"
                    class="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold"
                    :class="checklistFilter === filter.value
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'"
                    @click="checklistFilter = filter.value"
                  >
                    {{ filter.label }}
                  </button>
                  <button
                    type="button"
                    class="rounded-md bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white disabled:opacity-60"
                    :disabled="!checklistStats.pending"
                    @click="markRequiredDone"
                  >
                    Mark required done
                  </button>
                </div>
              </div>

              <div v-if="checklistStore.checklist" class="space-y-1.5">
                <div
                  v-for="group in [
                    { key: 'required', label: 'Required documents', items: filteredChecklistItems(requiredItems) },
                    { key: 'optional', label: 'Optional', items: filteredChecklistItems(optionalItems) },
                  ]"
                  :key="group.key"
                  class="space-y-1.5"
                >
                  <div v-if="group.items.length" class="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                    {{ group.label }}
                  </div>
                  <div
                    v-for="item in group.items"
                    :key="item.id"
                    class="grid gap-2 rounded-md border px-2 py-1.5 sm:grid-cols-[1fr_auto]"
                    :class="itemTone(item)"
                  >
                    <div class="flex min-w-0 items-start gap-2">
                      <button
                        type="button"
                        class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold"
                        :class="['done', 'waived'].includes(String(item.status))
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-amber-400 bg-white text-amber-600'"
                        :disabled="itemSaving[item.id]"
                        @click="updateChecklistItem(item, { status: ['done', 'waived'].includes(String(item.status)) ? 'pending' : 'done' })"
                      >
                        {{ ['done', 'waived'].includes(String(item.status)) ? '✓' : '○' }}
                      </button>
                      <div class="min-w-0">
                        <div class="truncate text-xs font-semibold text-slate-950">{{ labelOf(item) }}</div>
                        <div class="mt-0.5 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
                          <span v-if="checkedBy(item)">{{ checkedBy(item) }}</span>
                          <span v-if="checkedAt(item)">· {{ checkedAt(item) }}</span>
                          <span v-if="!requiredOf(item)">not required</span>
                        </div>
                      </div>
                    </div>

                    <div class="flex flex-wrap items-center justify-end gap-1.5">
                      <select
                        v-if="requiredOf(item)"
                        v-model="item.status"
                        class="h-7 rounded-md border bg-white px-2 text-[11px] font-medium"
                        :disabled="itemSaving[item.id]"
                        @change="updateChecklistItem(item, { status: item.status })"
                      >
                        <option value="pending">Pending</option>
                        <option value="done">Done</option>
                        <option value="waived">Waived</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      <AttachmentUploader
                        v-if="requiredOf(item)"
                        :item-id="item.id"
                        v-model="item.attachment_id"
                        :current="item.attachment"
                        :disabled="itemSaving[item.id]"
                        @uploaded="(doc) => updateChecklistItem(item, { attachment_id: doc.id })"
                        @update:current="(value) => (item.attachment = value)"
                        @detached="() => { item.attachment = null; refreshLifecycleDetail() }"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-slate-300 bg-white p-3">
                <div>
                  <div class="text-sm font-semibold text-slate-900">
                    {{ props.flowType === 'onboarding' ? 'Joining Checklist' : 'Exit Clearance Checklist' }}
                  </div>
                  <div class="text-xs text-slate-500">Checklist has not been created for this employee yet.</div>
                </div>
                <button
                  type="button"
                  class="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  :disabled="startingChecklist || !template?.id"
                  @click="startChecklist"
                >
                  {{ startingChecklist ? 'Starting...' : 'Start checklist' }}
                </button>
              </div>
            </div>

            <component
              :is="activeStageComponent"
              v-else-if="canRenderStageForm"
              :lifecycle-id="lifecycle?.id || 0"
              :stage="activeStage"
              :employee="employee"
            />

            <div v-else class="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
              This stage is tracked in the lifecycle, but the compact form is not configured yet.
            </div>
          </section>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<style scoped>
.lifecycle-quick-detail :deep(section),
.lifecycle-quick-detail :deep(div),
.lifecycle-quick-detail :deep(label),
.lifecycle-quick-detail :deep(table) {
  font-size: 11px;
}

.lifecycle-quick-detail :deep(h2),
.lifecycle-quick-detail :deep(h3) {
  font-size: 13px;
  line-height: 1.18;
}

.lifecycle-quick-detail :deep(.text-base) {
  font-size: 13px;
  line-height: 1.2;
}

.lifecycle-quick-detail :deep(.text-sm) {
  font-size: 11px;
  line-height: 1.2;
}

.lifecycle-quick-detail :deep(.text-xs) {
  font-size: 10.5px;
  line-height: 1.2;
}

.lifecycle-quick-detail :deep(input),
.lifecycle-quick-detail :deep(select),
.lifecycle-quick-detail :deep(textarea) {
  min-height: 26px;
  border-radius: 5px;
  font-size: 11px;
  line-height: 1.15;
  padding: 3px 6px;
}

.lifecycle-quick-detail :deep(textarea) {
  min-height: 34px;
}

.lifecycle-quick-detail :deep(th),
.lifecycle-quick-detail :deep(td) {
  padding: 4px 6px;
  font-size: 11px;
  line-height: 1.2;
}

.lifecycle-quick-detail :deep(button) {
  border-radius: 5px;
}

.lifecycle-quick-detail :deep(.rounded-lg),
.lifecycle-quick-detail :deep(.rounded-xl) {
  border-radius: 6px;
}

.lifecycle-quick-detail :deep(.p-3),
.lifecycle-quick-detail :deep(.p-2\.5) {
  padding: 0.5rem;
}

.lifecycle-quick-detail :deep(.px-3) {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.lifecycle-quick-detail :deep(.py-2\.5) {
  padding-top: 0.375rem;
  padding-bottom: 0.375rem;
}

.lifecycle-quick-detail :deep(.py-2) {
  padding-top: 0.35rem;
  padding-bottom: 0.35rem;
}

.lifecycle-quick-detail :deep(.gap-3) {
  gap: 0.5rem;
}

.lifecycle-quick-detail :deep(.gap-2) {
  gap: 0.375rem;
}

.lifecycle-quick-detail :deep(.space-y-3 > :not([hidden]) ~ :not([hidden])) {
  margin-top: 0.5rem;
}

.lifecycle-quick-detail :deep(.space-y-2 > :not([hidden]) ~ :not([hidden])) {
  margin-top: 0.375rem;
}

.lifecycle-quick-detail :deep(.space-y-1\.5 > :not([hidden]) ~ :not([hidden])) {
  margin-top: 0.25rem;
}
</style>
