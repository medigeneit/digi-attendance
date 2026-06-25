<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useLifecycleStore } from '@/stores/lifecycle'

const props = defineProps({
  lifecycleId: { type: Number, default: 0 },
  stage: { type: Object, required: true },
  employee: { type: Object, default: null },
})

const store = useLifecycleStore()
const saving = ref(false)
const uploading = ref(false)
const saveState = ref('idle')
const baselineSnapshot = ref('')

const form = reactive({
  remarks: '',
  payload: {
    decision: 'confirmed',
    effective_date: '',
    extended_months: '',
    decision_attachment: null,
    decision_notes: '',
  },
})

const decisionOptions = [
  {
    value: 'confirmed',
    title: 'Confirm',
    subtitle: 'Regularize as permanent',
    icon: 'fa-check',
    tone: 'emerald',
  },
  {
    value: 'extend_probation',
    title: 'Extend probation',
    subtitle: 'Add more months',
    icon: 'fa-rotate-right',
    tone: 'amber',
  },
  {
    value: 'terminated',
    title: 'Do not confirm',
    subtitle: 'Release / terminate',
    icon: 'fa-xmark',
    tone: 'rose',
  },
]

const probationStage = computed(() =>
  (store.currentRecord?.stages || []).find((item) => item.code === 'probation') || null,
)

const probationPayload = computed(() => probationStage.value?.record?.payload || {})

const reviewerRows = computed(() =>
  Array.isArray(probationPayload.value.reviewer_matrix) ? probationPayload.value.reviewer_matrix : [],
)

const reviewSummary = computed(() => {
  const slabKeys = ['30', '60', 'final']
  let total = 0
  let positive = 0

  reviewerRows.value.forEach((row) => {
    slabKeys.forEach((key) => {
      const status = String(row?.[`slab_${key}_status`] || '').toLowerCase()
      if (!status) return
      total += 1
      if (status === 'completed' || status === 'done') positive += 1
    })
  })

  return {
    total,
    positive,
    label: total ? `${positive} / ${total} positive` : '0 / 0 positive',
  }
})

const checkpointSummary = computed(() => {
  const slabKeys = ['30', '60', 'final']
  const done = slabKeys.filter((key) =>
    reviewerRows.value.length &&
    reviewerRows.value.every((row) =>
      ['completed', 'done'].includes(String(row?.[`slab_${key}_status`] || '').toLowerCase()),
    ),
  ).length

  return `${done} / ${slabKeys.length} done`
})

const recommendedDecision = computed(() => {
  const value = String(probationPayload.value.recommendation || '').toLowerCase()
  if (value === 'extend_probation') return 'Extend probation'
  if (value === 'terminate' || value === 'terminated') return 'Do not confirm'
  return 'Confirm'
})

const probationEndDate = computed(() =>
  formatDate(probationPayload.value.probation_end_date || props.employee?.probation_end_date || ''),
)

const selectedDecision = computed(() =>
  decisionOptions.find((item) => item.value === form.payload.decision) || decisionOptions[0],
)

const hasUnsavedChanges = computed(() => createSnapshot() !== baselineSnapshot.value)

watch(
  () => props.stage,
  (stage) => {
    const payload = stage?.record?.payload || {}
    form.remarks = stage?.record?.remarks || ''
    form.payload = {
      decision: payload.decision || 'confirmed',
      effective_date: payload.effective_date || '',
      extended_months: payload.extended_months || '',
      decision_attachment: payload.decision_attachment || null,
      decision_notes: payload.decision_notes || '',
    }
    baselineSnapshot.value = createSnapshot()
    saveState.value = 'idle'
  },
  { immediate: true, deep: true },
)

function createSnapshot() {
  return JSON.stringify({
    remarks: form.remarks || '',
    payload: form.payload || {},
  })
}

function decisionTone(option) {
  if (option.value === form.payload.decision) {
    if (option.tone === 'emerald') return 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-200'
    if (option.tone === 'amber') return 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm ring-1 ring-amber-200'
    return 'border-rose-500 bg-rose-50 text-rose-900 shadow-sm ring-1 ring-rose-200'
  }

  return 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function fileUrl(file) {
  return file?.url || file?.path || '#'
}

async function onFileChange(event) {
  const file = event?.target?.files?.[0]
  if (!file) return

  uploading.value = true
  try {
    const doc = await store.uploadDocument(file)
    form.payload.decision_attachment = doc
    window?.notify?.success?.('Attachment uploaded')
  } catch (error) {
    window?.notify?.error?.('Attachment upload failed')
  } finally {
    uploading.value = false
    if (event?.target) event.target.value = ''
  }
}

async function save() {
  if (saving.value || !hasUnsavedChanges.value) return

  saving.value = true
  saveState.value = 'saving'
  try {
    await store.saveStageRecord(props.lifecycleId, props.stage.code, {
      payload: { ...form.payload },
      remarks: form.remarks || null,
    })
    baselineSnapshot.value = createSnapshot()
    saveState.value = 'success'
    window?.notify?.success?.('Confirmation stage updated')
  } catch (error) {
    saveState.value = 'error'
    window?.notify?.error?.('Failed to update confirmation stage')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="rounded-lg border border-slate-200 bg-[#fffdf8] shadow-sm">
    <div class="border-b border-slate-200 px-3 py-2">
      <h2 class="inline-flex rounded bg-blue-100 px-2 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-blue-800">
        Confirmation
      </h2>
    </div>

    <div class="space-y-3 p-3 text-[12px]">
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-emerald-600 bg-emerald-50 px-3 py-2 shadow-sm">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full border border-emerald-500 bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
            Probation outcome
          </span>
          <span class="text-sm font-black text-slate-950">
            Recommended: {{ recommendedDecision }}
          </span>
        </div>
        <div class="flex flex-wrap gap-4 text-[11px] font-black uppercase tracking-[0.14em] text-slate-700">
          <span>Reviews <b class="text-slate-950">{{ reviewSummary.label }}</b></span>
          <span>Checkpoints <b class="text-slate-950">{{ checkpointSummary }}</b></span>
          <span>Prob. end <b class="text-slate-950">{{ probationEndDate }}</b></span>
        </div>
      </div>

      <div>
        <div class="mb-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Decision</div>
        <div class="grid gap-2 lg:grid-cols-3">
          <button
            v-for="option in decisionOptions"
            :key="option.value"
            type="button"
            class="min-h-[72px] rounded-lg border-2 px-3 py-2 text-left transition"
            :class="decisionTone(option)"
            @click="form.payload.decision = option.value"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="flex items-center gap-2 text-sm font-black">
                  <i :class="['fa-solid', option.icon]"></i>
                  {{ option.title }}
                </div>
                <div class="mt-1 text-[11px] italic opacity-75">{{ option.subtitle }}</div>
              </div>
              <span
                class="flex h-6 min-w-6 items-center justify-center rounded-full border px-2 text-[10px] font-bold"
                :class="option.value === form.payload.decision ? 'border-current bg-white/70' : 'border-slate-400'"
              >
                {{ option.value === form.payload.decision ? 'selected' : '' }}
              </span>
            </div>
          </button>
        </div>
      </div>

      <div
        v-if="form.payload.decision === 'confirmed'"
        class="grid gap-3 lg:grid-cols-[minmax(0,1fr),minmax(260px,0.75fr)]"
      >
        <label class="block">
          <span class="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Effective Date</span>
          <input
            v-model="form.payload.effective_date"
            type="date"
            class="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs focus:border-blue-500 focus:outline-none"
          />
        </label>

        <label class="block">
          <span class="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Confirmation Letter</span>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            class="block h-9 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600"
            @change="onFileChange"
          />
          <div v-if="form.payload.decision_attachment" class="mt-1 flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1 text-[11px]">
            <a :href="fileUrl(form.payload.decision_attachment)" target="_blank" class="truncate text-blue-700 underline">
              {{ form.payload.decision_attachment?.name || 'Open attachment' }}
            </a>
            <button type="button" class="font-semibold text-rose-600" @click="form.payload.decision_attachment = null">
              Remove
            </button>
          </div>
          <div v-if="uploading" class="mt-1 text-[11px] text-slate-500">Uploading...</div>
        </label>
      </div>

      <label v-if="form.payload.decision === 'extend_probation'" class="block max-w-xs">
        <span class="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Extended Months</span>
        <input
          v-model="form.payload.extended_months"
          type="number"
          min="0"
          class="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs focus:border-blue-500 focus:outline-none"
          placeholder="0"
        />
      </label>

      <label class="block">
        <span class="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          Decision Notes - one field, not two
        </span>
        <textarea
          v-model="form.payload.decision_notes"
          rows="3"
          class="min-h-[54px] w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
          placeholder="Approval / decision summary, handover remarks..."
        />
      </label>

      <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-slate-800 bg-slate-50 px-3 py-2.5 shadow-sm">
        <div class="min-w-0">
          <div class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            Selected decision
          </div>
          <div class="mt-1 text-sm font-black text-slate-950">{{ selectedDecision.title }}</div>
          <div
            class="mt-0.5 text-[11px]"
            :class="{
              'text-amber-700': saveState === 'error' || hasUnsavedChanges,
              'text-emerald-700': saveState === 'success' && !hasUnsavedChanges,
              'text-slate-500': saveState === 'idle' && !hasUnsavedChanges,
            }"
          >
            {{ saving ? 'Saving changes...' : hasUnsavedChanges ? 'Unsaved changes' : saveState === 'success' ? 'Saved' : 'No pending changes' }}
          </div>
        </div>

        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          :class="hasUnsavedChanges ? 'bg-blue-700 hover:bg-blue-800' : 'bg-emerald-600'"
          :disabled="saving || !hasUnsavedChanges"
          @click="save"
        >
          {{ saving ? 'Saving...' : form.payload.decision === 'confirmed' ? 'Save & confirm employee' : 'Save decision' }}
        </button>
      </div>
    </div>
  </section>
</template>
