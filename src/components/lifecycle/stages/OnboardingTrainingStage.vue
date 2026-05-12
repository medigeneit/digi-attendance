<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import SelectDropdown from '@/components/SelectDropdown.vue'
import UserChip from '@/components/user/UserChip.vue'
import { useLifecycleStore } from '@/stores/lifecycle'
import { useLifecycleUsersStore } from '@/stores/lifecycleUsers'

const props = defineProps({
  lifecycleId: { type: Number, default: 0 },
  stage: { type: Object, required: true },
  employee: { type: Object, default: null },
})

const store = useLifecycleStore()
const usersStore = useLifecycleUsersStore()
const saving = ref(false)
const uploading = ref(false)
const saveState = ref('idle')
const lastSavedAt = ref('')
const baselineSnapshot = ref('')

const form = reactive({
  status: 'not_started',
  remarks: '',
  payload: {},
})

const statusOptions = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
]

const trainingItems = [
  {
    key: 'basic',
    title: 'Basic Training',
    statusPath: 'basic_training_status',
    notePath: 'basic_training_note',
    placeholder: 'Trainer, session date, coverage, or completion note',
    tone: {
      card: 'border-sky-200 bg-sky-50/60',
      header: 'bg-sky-100/80',
      title: 'text-sky-900',
      badge: 'border-sky-300 bg-white text-sky-700',
    },
  },
  {
    key: 'technical',
    title: 'Technical Training',
    statusPath: 'technical_training_status',
    notePath: 'technical_training_note',
    placeholder: 'Technical module, assessment result, or resource note',
    tone: {
      card: 'border-violet-200 bg-violet-50/60',
      header: 'bg-violet-100/80',
      title: 'text-violet-900',
      badge: 'border-violet-300 bg-white text-violet-700',
    },
  },
  {
    key: 'advanced',
    title: 'Advanced Training',
    statusPath: 'advanced_training_status',
    notePath: 'advanced_training_note',
    placeholder: 'Advanced topic, mentor feedback, or readiness note',
    tone: {
      card: 'border-emerald-200 bg-emerald-50/60',
      header: 'bg-emerald-100/80',
      title: 'text-emerald-900',
      badge: 'border-emerald-300 bg-white text-emerald-700',
    },
  },
]

const trainingStatusOptions = [
  { value: 'assigned', label: 'Assigned' },
  { value: 'completed', label: 'Completed' },
]

onMounted(() => {
  if (!Array.isArray(usersStore.items) || !usersStore.items.length) {
    usersStore.fetchUsers({ all: 1 })
  }
})

const selectedStatusLabel = computed(
  () => statusOptions.find((item) => item.value === form.status)?.label || 'Not Started',
)

const selectedStatusTone = computed(() => {
  if (form.status === 'completed') return 'bg-emerald-100 text-emerald-700 ring-emerald-200'
  if (form.status === 'in_progress') return 'bg-blue-100 text-blue-700 ring-blue-200'
  if (form.status === 'on_hold') return 'bg-amber-100 text-amber-700 ring-amber-200'
  return 'bg-slate-100 text-slate-600 ring-slate-200'
})

const completedTrainingCount = computed(() =>
  trainingItems.filter((item) => form.payload?.[item.statusPath] === 'completed').length,
)

const assignedTrainingCount = computed(() =>
  trainingItems.filter((item) => form.payload?.[item.statusPath] === 'assigned').length,
)

const summaryItems = computed(() => [
  { label: 'Training Blocks', value: `${trainingItems.length} total` },
  { label: 'Completed', value: `${completedTrainingCount.value} completed` },
  { label: 'Assigned', value: `${assignedTrainingCount.value} assigned` },
  {
    label: 'Orientation',
    value: form.payload.orientation_complete ? 'Completed' : 'Pending',
  },
  {
    label: 'Supervisor',
    value: supervisorName.value || 'Unassigned',
  },
  {
    label: 'Materials',
    value: form.payload.training_materials_attachment ? 'Attached' : 'Not attached',
  },
])

const supervisorName = computed(() => {
  const selected = usersStore.items.find((item) => Number(item.id) === Number(form.payload.supervisor_id))
  return selected?.name || form.payload.supervisor_name || ''
})

const hasUnsavedChanges = computed(() => createFormSnapshot() !== baselineSnapshot.value)

const saveStatusMeta = computed(() => {
  if (saving.value) {
    return {
      tone: 'saving',
      label: 'Saving changes...',
      detail: 'Please wait while the stage record is being updated.',
    }
  }

  if (saveState.value === 'error') {
    return {
      tone: 'error',
      label: 'Save failed',
      detail: 'The latest changes were not submitted. Try again.',
    }
  }

  if (hasUnsavedChanges.value) {
    return {
      tone: 'pending',
      label: 'Unsaved changes',
      detail: 'The form has changes that are not submitted yet.',
    }
  }

  if (saveState.value === 'success' && lastSavedAt.value) {
    return {
      tone: 'success',
      label: 'Saved',
      detail: `Last saved at ${lastSavedAt.value}.`,
    }
  }

  return {
    tone: 'idle',
    label: 'No pending changes',
    detail: 'Update the form and click save when ready.',
  }
})

watch(
  () => props.stage?.record,
  (record) => {
    form.status = record?.status || props.stage?.data_status || 'not_started'
    form.remarks = record?.remarks || ''
    form.payload = normalizeTrainingPayload(record?.payload || {})
    baselineSnapshot.value = createFormSnapshot()
    saveState.value = 'idle'
    lastSavedAt.value = formatSaveTimestamp(record?.updated_at || props.stage?.updated_at || '')
  },
  { immediate: true, deep: true },
)

function normalizeTrainingPayload(payload = {}) {
  return {
    basic_training_status: payload.basic_training_status || '',
    basic_training_note: payload.basic_training_note || '',
    technical_training_status: payload.technical_training_status || '',
    technical_training_note: payload.technical_training_note || '',
    advanced_training_status: payload.advanced_training_status || '',
    advanced_training_note: payload.advanced_training_note || '',
    training_materials_attachment: payload.training_materials_attachment || null,
    supervisor_id: payload.supervisor_id || null,
    supervisor_name: payload.supervisor_name || '',
    orientation_complete: Boolean(payload.orientation_complete),
  }
}

function setPayloadValue(key, value) {
  form.payload = { ...(form.payload || {}), [key]: value }
}

function updateSupervisor(userId) {
  const selected = usersStore.items.find((item) => Number(item.id) === Number(userId))
  form.payload = {
    ...(form.payload || {}),
    supervisor_id: userId ? Number(userId) : null,
    supervisor_name: selected?.name || '',
  }
}

function createFormSnapshot() {
  return JSON.stringify({
    status: form.status,
    remarks: form.remarks || '',
    payload: form.payload || {},
  })
}

function formatSaveTimestamp(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function searchLifecycleUsers(options, term) {
  const needle = (term || '').trim().toLowerCase()
  if (!needle) return Array.isArray(options) ? [...options] : []

  if (needle.length >= 2) {
    usersStore.searchUsers(needle, { all: 1, limit: 50 })
  }

  return (Array.isArray(options) ? options : []).filter((option) => {
    const haystacks = [
      option?.name,
      option?.employee_id,
      option?.email,
      option?.department?.name,
      option?.designation?.title,
    ]

    return haystacks.some((value) => String(value || '').toLowerCase().includes(needle))
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
    setPayloadValue('training_materials_attachment', doc)
    window?.notify?.success && window.notify.success('Attachment uploaded')
  } catch (error) {
    window?.notify?.error && window.notify.error('Attachment upload failed')
  } finally {
    uploading.value = false
    if (event?.target) event.target.value = ''
  }
}

function clearFile() {
  setPayloadValue('training_materials_attachment', null)
}

async function save() {
  if (!hasUnsavedChanges.value) return

  saving.value = true
  saveState.value = 'saving'

  try {
    await store.saveStageRecord(props.lifecycleId, props.stage.code, {
      status: form.status,
      payload: form.payload,
      remarks: form.remarks || null,
    })
    baselineSnapshot.value = createFormSnapshot()
    lastSavedAt.value = formatSaveTimestamp(new Date())
    saveState.value = 'success'
    window?.notify?.success && window.notify.success('Stage updated')
  } catch (error) {
    saveState.value = 'error'
    window?.notify?.error && window.notify.error('Failed to update stage')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="rounded-lg border bg-white shadow-sm">
    <div class="border-b px-3 py-2">
      <h2 class="text-sm font-semibold text-slate-900 md:text-base">Training & Resource Setup</h2>
    </div>

    <div class="space-y-2 px-3 py-2">
      <div class="grid gap-x-3 gap-y-1 rounded-xl border border-blue-100 bg-blue-50/60 px-2 py-1.5 md:grid-cols-3 xl:grid-cols-6">
        <div v-for="item in summaryItems" :key="item.label" class="min-w-0">
          <div class="text-[10px] font-medium uppercase tracking-wide text-blue-700">
            {{ item.label }}
          </div>
          <div class="truncate text-xs font-semibold text-slate-800" :title="item.value || 'N/A'">
            {{ item.value || 'N/A' }}
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-2">
        <div class="mb-1.5 text-sm font-semibold text-slate-800">Training Blocks</div>
        <div class="grid gap-2 lg:grid-cols-3">
          <div
            v-for="item in trainingItems"
            :key="item.key"
            class="overflow-hidden rounded-xl border"
            :class="item.tone.card"
          >
            <div class="flex items-center justify-between gap-2 border-b px-2.5 py-1.5" :class="item.tone.header">
              <div class="text-sm font-semibold" :class="item.tone.title">{{ item.title }}</div>
              <span
                class="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
                :class="item.tone.badge"
              >
                {{ form.payload[item.statusPath] || 'Select' }}
              </span>
            </div>

            <div class="space-y-2 bg-white/80 p-2">
              <label class="block">
                <span class="mb-1 block text-xs font-medium text-slate-600">Status</span>
                <select
                  :value="form.payload[item.statusPath] || ''"
                  class="w-full rounded-lg border bg-white px-2.5 py-1.5 text-xs"
                  @change="setPayloadValue(item.statusPath, $event.target.value)"
                >
                  <option value="">Select</option>
                  <option v-for="option in trainingStatusOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>

              <label class="block">
                <span class="mb-1 block text-xs font-medium text-slate-600">Note</span>
                <textarea
                  :value="form.payload[item.notePath] || ''"
                  rows="3"
                  class="min-h-[70px] w-full rounded-lg border bg-white px-2.5 py-1.5 text-xs"
                  :placeholder="item.placeholder"
                  @input="setPayloadValue(item.notePath, $event.target.value)"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-2 lg:grid-cols-2">
        <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-2">
          <div class="mb-1.5 text-sm font-semibold text-slate-800">Resource Setup</div>
          <label class="flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2">
            <span>
              <span class="block text-sm font-medium text-slate-800">Department Orientation Complete</span>
              <span class="block text-xs text-slate-500">Mark after department orientation is confirmed.</span>
            </span>
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-slate-300 text-blue-600"
              :checked="Boolean(form.payload.orientation_complete)"
              @change="setPayloadValue('orientation_complete', $event.target.checked)"
            />
          </label>

          <label class="mt-2 block">
            <span class="mb-1 block text-sm font-medium text-slate-700">Supervisor Assigned</span>
            <SelectDropdown
              :model-value="form.payload.supervisor_id"
              :options="usersStore.items"
              label="name"
              :searchBy="searchLifecycleUsers"
              placeholder="-- SELECT USER --"
              class="h-10 w-full"
              clearable
              searchable
              @update:model-value="updateSupervisor"
            >
              <template #option="{ option }">
                <UserChip :user="option || {}" class="relative w-full overflow-hidden border" />
              </template>
              <template #selected-option="{ option }">
                <UserChip v-if="option" :user="option || {}" />
              </template>
            </SelectDropdown>
          </label>
        </div>

        <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-2">
          <div class="mb-1.5 text-sm font-semibold text-slate-800">Training Materials</div>
          <div class="rounded-lg border bg-white px-3 py-2">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
              class="block w-full text-sm text-gray-600"
              @change="onFileChange"
            />
            <div
              v-if="form.payload.training_materials_attachment"
              class="mt-2.5 flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm"
            >
              <a :href="fileUrl(form.payload.training_materials_attachment)" target="_blank" class="truncate text-blue-600 underline">
                {{ form.payload.training_materials_attachment?.name || 'Open attachment' }}
              </a>
              <button type="button" class="rounded border px-2 py-1 text-xs text-gray-600" @click="clearFile">
                Remove
              </button>
            </div>
            <div v-if="uploading" class="mt-2 text-xs text-gray-500">Uploading...</div>
          </div>
        </div>

        <label class="block lg:col-span-2">
          <span class="mb-1 block text-sm font-medium text-gray-700">Remarks</span>
          <textarea
            v-model="form.remarks"
            class="min-h-[42px] w-full rounded-lg border px-2.5 py-1.5 text-sm"
            rows="2"
            placeholder="Training handover note, setup context, or follow-up remarks"
          />
        </label>
      </div>

      <div class="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
        <div
          class="flex min-w-0 items-start gap-3"
          :class="{
            'text-amber-700': saveStatusMeta.tone === 'pending',
            'text-emerald-700': saveStatusMeta.tone === 'success',
            'text-rose-700': saveStatusMeta.tone === 'error',
            'text-blue-700': saveStatusMeta.tone === 'saving',
            'text-slate-600': saveStatusMeta.tone === 'idle',
          }"
        >
          <div
            class="mt-1 h-2.5 w-2.5 flex-none rounded-full"
            :class="{
              'animate-pulse bg-amber-500': saveStatusMeta.tone === 'pending',
              'animate-pulse bg-blue-500': saveStatusMeta.tone === 'saving',
              'bg-emerald-500': saveStatusMeta.tone === 'success',
              'bg-rose-500': saveStatusMeta.tone === 'error',
              'bg-slate-300': saveStatusMeta.tone === 'idle',
            }"
          />
          <div class="min-w-0">
            <div class="text-sm font-semibold">{{ saveStatusMeta.label }}</div>
            <div class="text-xs opacity-90">{{ saveStatusMeta.detail }}</div>
          </div>
        </div>

        <div class="flex flex-wrap items-end gap-2">
          <label class="block min-w-[190px]">
            <span class="mb-1 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-800">
              Stage Status
              <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal ring-1" :class="selectedStatusTone">
                {{ selectedStatusLabel }}
              </span>
            </span>
            <select
              v-model="form.status"
              class="w-full rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-200"
            >
              <option v-for="item in statusOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </label>

          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            :class="
              saving
                ? 'bg-blue-600 hover:bg-blue-600'
                : hasUnsavedChanges
                  ? 'bg-gray-900 hover:bg-black'
                  : 'bg-emerald-600 hover:bg-emerald-600'
            "
            :disabled="saving || !hasUnsavedChanges"
            @click="save"
          >
            <span v-if="saving" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            <span
              v-else-if="!hasUnsavedChanges && saveState === 'success'"
              class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]"
            >
              OK
            </span>
            {{ saving ? 'Submitting...' : !hasUnsavedChanges && saveState === 'success' ? 'Saved' : 'Save Stage' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
