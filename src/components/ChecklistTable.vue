<script setup>
import { nextTick } from 'vue'
import { useChecklistStore } from '@/stores/checklist'
import AttachmentUploader from './AttachmentUploader.vue'

const props = defineProps({ items: { type: Array, required: true } })
const store = useChecklistStore()

const statuses = [
  { value: 'pending', label: 'Pending' },
  { value: 'done',    label: 'Done ✓' },
  { value: 'waived',  label: 'Waived' },
  { value: 'rejected',label: 'Rejected' }
]

// small debounce without extra deps
function debounce(fn, ms = 500) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}
const saveCommentDebounced = debounce((item) => {
  store.saveItem(item, { comment: item.comment || null }).catch(() => {})
}, 600)

function labelOf(i) { return store.labelOf(i) }
function requiredOf(i) { return store.requiredOf(i) }

async function onStatusChange(item) {
  try {
    await store.saveItem(item, { status: item.status })
    if (window?.notify?.success) window.notify.success('Status updated')
  } catch (e) {
    if (window?.notify?.error) window.notify.error('Failed to update status')
  }
}
async function onAttachment(item, doc) {
  // update attachment_id → server, then keep preview local
  try {
    await store.saveItem(item, { attachment_id: doc.id })
    item.attachment = { ...doc }
    if (window?.notify?.success) window.notify.success('Attachment linked')
  } catch (e) {
    if (window?.notify?.error) window.notify.error('Failed to link file')
  }
}
</script>

<template>
  <div class="w-full overflow-x-auto">
    <table class="min-w-full text-sm">
      <thead>
        <tr class="text-left border-b">
          <th class="p-3 w-10">#</th>
          <th class="p-3">Item</th>
          <th class="p-3 w-20">Req.</th>
          <th class="p-3 w-40">Status</th>
          <th class="p-3">Comment</th>
          <th class="p-3 w-64">Attachment</th>
          <th class="p-3 w-44">Checked By</th>
          <th class="p-3 w-48">Checked At</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(it, i) in props.items" :key="it.id" class="border-b hover:bg-gray-50">
          <td class="p-3">{{ i + 1 }}</td>
          <td class="p-3 font-medium">{{ labelOf(it) }}</td>
          <td class="p-3">
            <span :class="['px-2 py-0.5 rounded text-xs', requiredOf(it) ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600']">
              {{ requiredOf(it) ? 'Yes' : 'No' }}
            </span>
          </td>
          <td class="p-3">
            <select v-model="it.status" @change="onStatusChange(it)"
              class="border rounded px-2 py-1 w-full focus:outline-none focus:ring">
              <option v-for="s in statuses" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </td>
          <td class="p-3">
            <textarea v-model="it.comment" @input="saveCommentDebounced(it)"
              placeholder="Notes…"
              class="border rounded p-2 w-80 h-10 resize-y focus:outline-none focus:ring"></textarea>
          </td>
          <td class="p-3">
            <AttachmentUploader
              v-model="it.attachment_id"
              :current="it.attachment"
              @uploaded="doc => onAttachment(it, doc)"
            />
          </td>
          <td class="p-3">{{ it.checked_by?.name || it.checker?.name || '-' }}</td>
          <td class="p-3">{{ it.checked_at ? new Date(it.checked_at).toLocaleString() : '-' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
