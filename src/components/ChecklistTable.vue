<script setup>
import { reactive, ref } from 'vue'
import { useChecklistStore } from '@/stores/checklist'
import AttachmentUploader from './AttachmentUploader.vue'

const props = defineProps({ items: { type: Array, required: true } })
const store = useChecklistStore()

const statuses = [
  { value: 'pending',  label: 'Pending' },
  { value: 'done',     label: 'Done ✓' },
  { value: 'waived',   label: 'Waived' },
  { value: 'rejected', label: 'Rejected' },
]

// per-row saving flags
const saving = ref(Object.create(null))
function setSaving(id, flag) {
  saving.value[id] = !!flag
  // force shallow change
  saving.value = { ...saving.value }
}

// small debounce without deps
function debounce(fn, ms = 600) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

function labelOf(i) { return store.labelOf(i) }
function requiredOf(i) { return store.requiredOf(i) }

const saveCommentDebounced = debounce(async (item) => {
  try {
    setSaving(item.id, true)
    await store.saveItem(item, { comment: item.comment || null })
    if (window?.notify?.success) window.notify.success('Note saved')
  } catch (e) {
    if (window?.notify?.error) window.notify.error('Failed to save note')
  } finally {
    setSaving(item.id, false)
  }
}, 600)

async function onStatusChange(item) {
  // optimistic: item.status is already updated by v-model
  try {
    setSaving(item.id, true)
    await store.saveItem(item, { status: item.status })
    if (window?.notify?.success) window.notify.success('Status updated')
  } catch (e) {
    if (window?.notify?.error) window.notify.error('Failed to update status')
    // optional: you could reload the item from store if you keep originals
  } finally {
    setSaving(item.id, false)
  }
}

async function onAttachment(item, doc) {
  try {

    setSaving(item.id, true)

    console.log('linking attachment', item, doc);

    await store.saveItem(item, { attachment_id: doc.id })
    // keep preview locally too
    item.attachment = { ...doc }
    if (window?.notify?.success) window.notify.success('Attachment linked')
  } catch (e) {
    if (window?.notify?.error) window.notify.error('Failed to link file')
  } finally {
    setSaving(item.id, false)
  }
}

function fmtDate(v) {
  if (!v) return '-'
  try { return new Date(v).toLocaleString() } catch { return String(v) }
}

</script>

<template>
  <div class="w-full overflow-x-auto bg-white">
    <table class="min-w-full text-sm">
      <thead class="sticky top-0 bg-gray-100 backdrop-blur">
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
            <span
              :class="[
                'px-2 py-0.5 rounded text-xs',
                requiredOf(it) ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'
              ]"
            >
              {{ requiredOf(it) ? 'Yes' : 'No' }}
            </span>
          </td>

          <td class="p-3">
            <select
              v-model="it.status"
              @change="onStatusChange(it)"
              class="border rounded px-2 py-1 w-full focus:outline-none focus:ring disabled:opacity-60"
              :disabled="saving[it.id]"
            >
              <option v-for="s in statuses" :key="s.value" :value="s.value">
                {{ s.label }}
              </option>
            </select>
          </td>

          <td class="p-3">
            <textarea
              v-model="it.comment"
              @input="saveCommentDebounced(it)"
              placeholder="Notes…"
              class="border rounded p-2 w-60 h-10 resize-y focus:outline-none focus:ring disabled:opacity-60"
              :disabled="saving[it.id]"
            ></textarea>
          </td>

          <td class="p-3">
            <AttachmentUploader
              :item-id="it.id"
              v-model="it.attachment_id"
              :current="it.attachment"
              :disabled="saving[it.id]"
              @uploaded="doc => onAttachment(it, doc)"
              @update:current="val => (it.attachment = val)"
              @detached="() => { it.attachment = null }"
            />
          </td>

          <td class="p-3">{{ it.checked_by?.name || it.checker?.name || '-' }}</td>
          <td class="p-3">{{ fmtDate(it.checked_at) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
