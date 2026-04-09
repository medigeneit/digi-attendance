<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import SelectDropdown from '@/components/SelectDropdown.vue'
import UserChip from '@/components/user/UserChip.vue'
import { useLifecycleStore } from '@/stores/lifecycle'
import { useLifecycleUsersStore } from '@/stores/lifecycleUsers'

const props = defineProps({
  lifecycleId: { type: Number, required: true },
  stage: { type: Object, required: true },
  definition: { type: Object, required: true },
  summaryItems: { type: Array, default: () => [] },
  defaultPayload: { type: Object, default: () => ({}) },
})

const store = useLifecycleStore()
const usersStore = useLifecycleUsersStore()
const saving = ref(false)
const uploading = ref({})

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

onMounted(() => {
  if (props.definition?.fields?.some((field) => field.type === 'user_select')) {
    usersStore.fetchUsers()
  }
})

watch(
  () => [props.stage, props.defaultPayload],
  ([stage, defaultPayload]) => {
    form.status = stage?.record?.status || stage?.data_status || 'not_started'
    form.remarks = stage?.record?.remarks || ''
    form.payload = {
      ...(defaultPayload || {}),
      ...(stage?.record?.payload || {}),
    }
  },
  { immediate: true, deep: true },
)

function fileUrl(file) {
  return file?.url || file?.path || '#'
}

async function onFileChange(fieldKey, event) {
  const file = event?.target?.files?.[0]
  if (!file) return

  uploading.value = { ...uploading.value, [fieldKey]: true }

  try {
    const doc = await store.uploadDocument(file)
    form.payload = { ...form.payload, [fieldKey]: doc }
    window?.notify?.success && window.notify.success('Attachment uploaded')
  } catch (error) {
    window?.notify?.error && window.notify.error('Attachment upload failed')
  } finally {
    uploading.value = { ...uploading.value, [fieldKey]: false }
    if (event?.target) event.target.value = ''
  }
}

function clearFile(fieldKey) {
  form.payload = { ...form.payload, [fieldKey]: null }
}

function searchLifecycleUsers(options, term) {
  const needle = (term || '').trim().toLowerCase()
  if (!needle) return Array.isArray(options) ? [...options] : []

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

async function save() {
  saving.value = true

  try {
    await store.saveStageRecord(props.lifecycleId, props.stage.code, {
      status: form.status,
      payload: form.payload,
      remarks: form.remarks || null,
    })
    window?.notify?.success && window.notify.success('Stage updated')
  } catch (error) {
    window?.notify?.error && window.notify.error('Failed to update stage')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="rounded-2xl border bg-white shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-4 border-b px-6 py-4">
      <div>
        <h2 class="text-lg font-semibold">{{ definition.title }}</h2>
        <p class="text-sm text-gray-500">{{ definition.description }}</p>
      </div>

      <div class="min-w-[180px]">
        <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Stage Status</label>
        <select v-model="form.status" class="w-full rounded-lg border px-3 py-2 text-sm">
          <option v-for="item in statusOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </div>
    </div>

    <div class="space-y-6 px-6 py-5">
      <div
        v-if="summaryItems.length"
        class="grid gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <div v-for="item in summaryItems" :key="item.label" class="min-w-0">
          <div class="text-xs font-medium uppercase tracking-wide text-blue-700">{{ item.label }}</div>
          <div class="mt-1 truncate text-sm font-semibold text-slate-800" :title="item.value || 'N/A'">
            {{ item.value || 'N/A' }}
          </div>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <template v-for="field in definition.fields" :key="field.key">
          <label
            v-if="field.type === 'text' || field.type === 'date' || field.type === 'number'"
            class="block"
          >
            <span class="mb-1 block text-sm font-medium text-gray-700">{{ field.label }}</span>
            <input
              v-model="form.payload[field.key]"
              :type="field.type"
              class="w-full rounded-lg border px-3 py-2 text-sm"
              :class="{ 'bg-gray-50 text-gray-500': field.readonly }"
              :placeholder="field.placeholder || ''"
              :readonly="field.readonly"
              :disabled="field.readonly"
            />
          </label>

          <label v-else-if="field.type === 'textarea'" class="block md:col-span-2">
            <span class="mb-1 block text-sm font-medium text-gray-700">{{ field.label }}</span>
            <textarea
              v-model="form.payload[field.key]"
              class="min-h-[110px] w-full rounded-lg border px-3 py-2 text-sm"
              :placeholder="field.placeholder || ''"
            />
          </label>

          <label v-else-if="field.type === 'select'" class="block">
            <span class="mb-1 block text-sm font-medium text-gray-700">{{ field.label }}</span>
            <select v-model="form.payload[field.key]" class="w-full rounded-lg border px-3 py-2 text-sm">
              <option value="">Select</option>
              <option v-for="option in field.options || []" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label v-else-if="field.type === 'user_select'" class="block">
            <span class="mb-1 block text-sm font-medium text-gray-700">{{ field.label }}</span>
            <SelectDropdown
              v-model="form.payload[field.key]"
              :options="usersStore.items"
              label="name"
              :searchBy="searchLifecycleUsers"
              placeholder="-- SELECT USER --"
              class="h-11 w-full"
              clearable
              searchable
            >
              <template #option="{ option }">
                <UserChip :user="option || {}" class="w-full overflow-hidden border relative" />
              </template>
              <template #selected-option="{ option }">
                <UserChip v-if="option" :user="option || {}" />
              </template>
            </SelectDropdown>
          </label>

          <label v-else-if="field.type === 'checkbox'" class="flex items-center gap-3 rounded-xl border px-4 py-3">
            <input v-model="form.payload[field.key]" type="checkbox" class="h-4 w-4 rounded border-gray-300" />
            <span class="text-sm font-medium text-gray-700">{{ field.label }}</span>
          </label>

          <div v-else-if="field.type === 'file'" class="rounded-xl border px-4 py-3">
            <div class="mb-2 text-sm font-medium text-gray-700">{{ field.label }}</div>
            <input
              type="file"
              :accept="field.accept || '.pdf,.jpg,.jpeg,.png,.doc,.docx'"
              class="block w-full text-sm text-gray-600"
              @change="onFileChange(field.key, $event)"
            />
            <div v-if="form.payload[field.key]" class="mt-3 flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm">
              <a :href="fileUrl(form.payload[field.key])" target="_blank" class="truncate text-blue-600 underline">
                {{ form.payload[field.key]?.name || 'Open attachment' }}
              </a>
              <button type="button" class="rounded border px-2 py-1 text-xs text-gray-600" @click="clearFile(field.key)">
                Remove
              </button>
            </div>
            <div v-if="uploading[field.key]" class="mt-2 text-xs text-gray-500">Uploading...</div>
          </div>
        </template>
      </div>

      <label class="block">
        <span class="mb-1 block text-sm font-medium text-gray-700">Remarks</span>
        <textarea
          v-model="form.remarks"
          class="min-h-[100px] w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Notes, context, handover remarks, or HR observations"
        />
      </label>

      <div v-if="usersStore.error" class="text-sm text-red-600">{{ usersStore.error }}</div>

      <div class="flex items-center justify-end">
        <button
          type="button"
          class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? 'Saving...' : 'Save Stage' }}
        </button>
      </div>
    </div>
  </section>
</template>
