<script setup>
import { ref } from 'vue'
import { useChecklistStore } from '@/stores/checklist'
import AttachmentUploader from './AttachmentUploader.vue'

const props = defineProps({ items: { type: Array, required: true } })
const store = useChecklistStore()

const statuses = [
  { value: 'pending', label: 'Pending' },
  { value: 'done', label: 'Done' },
  { value: 'waived', label: 'Waived' },
  { value: 'rejected', label: 'Rejected' },
]

const saving = ref(Object.create(null))

function setSaving(id, flag) {
  saving.value[id] = !!flag
  saving.value = { ...saving.value }
}

function debounce(fn, ms = 600) {
  let timeoutId

  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), ms)
  }
}

function labelOf(item) {
  return store.labelOf(item)
}

function requiredOf(item) {
  return store.requiredOf(item)
}

const saveCommentDebounced = debounce(async (item) => {
  try {
    setSaving(item.id, true)
    await store.saveItem(item, { comment: item.comment || null })
    if (window?.notify?.success) window.notify.success('Note saved')
  } catch (error) {
    if (window?.notify?.error) window.notify.error('Failed to save note')
  } finally {
    setSaving(item.id, false)
  }
}, 600)

async function onStatusChange(item) {
  try {
    setSaving(item.id, true)
    await store.saveItem(item, { status: item.status })
    if (window?.notify?.success) window.notify.success('Status updated')
  } catch (error) {
    if (window?.notify?.error) window.notify.error('Failed to update status')
  } finally {
    setSaving(item.id, false)
  }
}

async function onAttachment(item, doc) {
  try {
    setSaving(item.id, true)
    await store.saveItem(item, { attachment_id: doc.id })
    item.attachment = { ...doc }
    if (window?.notify?.success) window.notify.success('Attachment linked')
  } catch (error) {
    if (window?.notify?.error) window.notify.error('Failed to link file')
  } finally {
    setSaving(item.id, false)
  }
}

function fmtDate(value) {
  if (!value) return '-'

  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div class="w-full overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead class="sticky top-0 bg-slate-50 backdrop-blur">
          <tr class="border-b text-left">
            <th class="w-10 px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">#</th>
            <th class="px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Item</th>
            <th class="w-20 px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Req.</th>
            <th class="w-36 px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
            <th class="w-56 px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Comment</th>
            <th class="w-56 px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Attachment</th>
            <th class="w-40 px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Checked By</th>
            <th class="w-44 px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Checked At</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(item, index) in props.items"
            :key="item.id"
            class="border-b align-top hover:bg-slate-50/70"
          >
            <td class="px-2.5 py-2.5 text-xs text-slate-500">{{ index + 1 }}</td>

            <td class="px-2.5 py-2.5 font-medium text-slate-800">{{ labelOf(item) }}</td>

            <td class="px-2.5 py-2.5">
              <span
                :class="[
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  requiredOf(item) ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600',
                ]"
              >
                {{ requiredOf(item) ? 'Yes' : 'No' }}
              </span>
            </td>

            <td class="px-2.5 py-2.5">
              <select
                v-model="item.status"
                class="w-full rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring disabled:opacity-60"
                :disabled="saving[item.id]"
                @change="onStatusChange(item)"
              >
                <option v-for="status in statuses" :key="status.value" :value="status.value">
                  {{ status.label }}
                </option>
              </select>
            </td>

            <td class="px-2.5 py-2.5">
              <textarea
                v-model="item.comment"
                class="h-10 w-full resize-y rounded-lg border p-2 text-sm focus:outline-none focus:ring disabled:opacity-60"
                :disabled="saving[item.id]"
                placeholder="Notes..."
                @input="saveCommentDebounced(item)"
              />
            </td>

            <td class="px-2.5 py-2.5">
              <AttachmentUploader
                :item-id="item.id"
                v-model="item.attachment_id"
                :current="item.attachment"
                :disabled="saving[item.id]"
                @uploaded="(doc) => onAttachment(item, doc)"
                @update:current="(value) => (item.attachment = value)"
                @detached="() => { item.attachment = null }"
              />
            </td>

            <td class="px-2.5 py-2.5 text-sm text-slate-600">
              {{ item.checked_by?.name || item.checker?.name || '-' }}
            </td>
            <td class="px-2.5 py-2.5 text-sm text-slate-600">{{ fmtDate(item.checked_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
