<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useTemplateItemsStore } from '@/stores/templateItems'
import AddEditItemModal from '@/components/AddEditItemModal.vue'

const route = useRoute()
const templateId = computed(() => Number(route.params.id || route.query.template_id))

const s = useTemplateItemsStore()

/* ---------- Modal ---------- */
const modalOpen = ref(false)
const mode = ref('add')            // 'add' | 'edit'
const editing = ref(null)

/* ---------- Filters ---------- */
const q = ref('')
const f = ref({ handover_to: '', status: '' })

const HANDOVER_LABELS = {
  departmental_incharge:  'Departmental In-charge',
  technical_support_team: 'Technical Support Team',
  it_incharge:            'IT In-charge',
  hr_department:          'HR Department',
  inventory_incharge:     'Inventory Incharge',
}
const HANDOVER_OPTIONS = [
  { value: '',                         label: 'All handovers' },
  { value: 'departmental_incharge',    label: HANDOVER_LABELS.departmental_incharge },
  { value: 'technical_support_team',   label: HANDOVER_LABELS.technical_support_team },
  { value: 'it_incharge',              label: HANDOVER_LABELS.it_incharge },
  { value: 'hr_department',            label: HANDOVER_LABELS.hr_department },
  { value: 'inventory_incharge',            label: HANDOVER_LABELS.inventory_incharge },
]
const STATUS_OPTIONS = [
  { value: '',           label: 'All status' },
  { value: 'BLOCKED',    label: 'Blocked' },
  { value: 'COMPLETED',  label: 'Completed' },
]

/* ---------- Derived ---------- */
const filtered = computed(() => {
  const term = (q.value || '').toLowerCase().trim()
  const list = Array.isArray(s.items) ? s.items : []

  return list
    .filter(x => {
      // search
      if (term) {
        const hay =
          (x.item_key || '') + ' ' +
          (x.label || '') + ' ' +
          (HANDOVER_LABELS[x.handover_to] || '') + ' ' +
          (x.status || '')
        if (!hay.toLowerCase().includes(term)) return false
      }
      // handover filter
      if (f.value.handover_to && x.handover_to !== f.value.handover_to) return false
      // status filter
      if (f.value.status && x.status !== f.value.status) return false
      return true
    })
    .sort((a, b) => (a.order_no ?? 0) - (b.order_no ?? 0))
})

const nextOrder = computed(() => (s.items?.length || 0))

/* ---------- Lifecycle ---------- */
onMounted(async () => {
  if (templateId.value) await s.fetch(templateId.value)
})
watch(templateId, async (id, old) => {
  if (id && id !== old) await s.fetch(id)
})

/* ---------- Actions ---------- */
function openAdd() {
  mode.value = 'add'
  editing.value = null
  modalOpen.value = true
}
function openEdit(row) {
  mode.value = 'edit'
  editing.value = { ...row }
  modalOpen.value = true
}
async function submitModal(payload) {
  try {
    if (mode.value === 'add') {
      await s.add(templateId.value, payload)
    } else if (editing.value?.id) {
      const patch = {
        label: payload.label,
        status: payload.status,
        required: !!payload.required,
        order_no: payload.order_no ?? editing.value.order_no,
        handover_to: payload.handover_to, // <- NEW
        handover_to_id: payload.handover_to_id, // <- NEW
      }
      await s.update(editing.value.id, patch)
    }
    modalOpen.value = false
  } catch (e) {
    // store ভিতরেই toast ধরেছেন ধরে নিচ্ছি
  }
}
async function toggleRequired(row) {
  try {
    await s.update(row.id, { required: !row.required })
    window?.notify?.success?.('Required updated')
  } catch {}
}
async function del(row) {
  if (!confirm(`Delete "${row.label}"?`)) return
  await s.remove(row.id)
}

function moveUp(row)   { s.moveUp(row.id) }
function moveDown(row) { s.moveDown(row.id) }
async function saveOrder() { await s.saveOrder() }

function resetFilters() {
  q.value = ''
  f.value = { handover_to: '', status: '' }
}
</script>

<template>
  <div class="mx-auto max-w-7xl p-4">
    <!-- Header -->
    <div class="mb-4 flex items-center gap-2">
      <div class="flex-1">
        <h2 class="text-xl font-semibold">Checklist Template Items</h2>
        <p class="text-sm text-gray-500">
          Template:
          <span class="font-medium">
            {{ templateId == 1 ? 'Joining Checklist Items' : 'Exit Checklist Items' }}
          </span>
        </p>
      </div>
      <button
        class="rounded-lg bg-gray-900 px-3 py-2 text-white shadow hover:bg-gray-800"
        @click="openAdd"
      >
        + Add Item
      </button>
    </div>

    <!-- Toolbar -->
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <input
        v-model="q"
        type="text"
        placeholder="Search key/label/hand-over/status…"
        class="w-64 rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
      />

      <select
        v-model="f.handover_to"
        class="rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
        title="Filter by Handover target"
      >
        <option v-for="o in HANDOVER_OPTIONS" :key="o.value" :value="o.value">
          {{ o.label }} 
        </option>
      </select>

      <select
        v-model="f.status"
        class="rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
        title="Filter by Status"
      >
        <option v-for="o in STATUS_OPTIONS" :key="o.value" :value="o.value">
          {{ o.label }}
        </option>
      </select>

      <button
        class="rounded-lg border px-3 py-2 hover:bg-gray-50"
        @click="resetFilters"
        title="Reset filters"
      >
        Reset
      </button>

      <div class="ml-auto flex items-center gap-2">
        <button
          class="rounded-lg border px-3 py-2 hover:bg-gray-50"
          :disabled="s.saving"
          @click="saveOrder"
          title="Persist current order"
        >
          Save Order
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-hidden rounded-xl border bg-white">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-50 text-left">
          <tr>
            <th class="px-3 py-2 w-20">Order</th>
            <!-- <th class="px-3 py-2">Item Key</th> -->
            <th class="px-3 py-2">Label</th>
            <th class="px-3 py-2">Handover To</th>
            <th class="px-3 py-2">Handover By</th>
            <th class="px-3 py-2 w-28">Required</th>
            <th class="px-3 py-2 w-28">Status</th>
            <th class="px-3 py-2 w-40">Actions</th>
          </tr>
        </thead>
        <tbody>
          <!-- skeleton -->
          <tr v-if="s.loading">
            <td colspan="7" class="px-3 py-4">
              <div class="h-4 w-full animate-pulse rounded bg-gray-100"></div>
            </td>
          </tr>

          <tr
            v-for="(row, i) in filtered"
            :key="row.id"
            class="border-t hover:bg-gray-50"
          >
            <!-- Order controls -->
            <td class="px-3 py-2">
              <div class="flex items-center gap-1">
                <button
                  class="rounded border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                  :disabled="i === 0 || s.saving"
                  @click="moveUp(row)"
                  title="Move up"
                >↑</button>
                <button
                  class="rounded border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                  :disabled="i === filtered.length - 1 || s.saving"
                  @click="moveDown(row)"
                  title="Move down"
                >↓</button>
                <span class="ml-2 tabular-nums text-gray-500">{{ row.order_no ?? i }}</span>
              </div>
            </td>

            <!-- Item key -->
            <!-- <td class="px-3 py-2 font-mono text-xs text-gray-700">
              {{ row.item_key }}
            </td> -->

            <!-- Label -->
            <td class="px-3 py-2">
              <div class="truncate">{{ row.label }}</div>
            </td>

            <!-- Handover To -->
            <td class="px-3 py-2">
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                :class="{
                  'bg-gray-100 text-gray-700': !row.handover_to,
                  'bg-sky-100 text-sky-700': row.handover_to === 'departmental_incharge',
                  'bg-amber-100 text-amber-800': row.handover_to === 'technical_support_team',
                  'bg-indigo-100 text-indigo-700': row.handover_to === 'it_incharge',
                  'bg-emerald-100 text-emerald-700': row.handover_to === 'hr_department',
                  'bg-emerald-700 text-emerald-50': row.handover_to === 'inventory_incharge',
                }"
                :title="HANDOVER_LABELS[row.handover_to] || '—'"
              >
                {{ HANDOVER_LABELS[row.handover_to] || '—' }}
              </span>
            </td>
            <td>
              <span>{{ row?.handover_user?.name }}</span>
            </td>

            <!-- Required -->
            <td class="px-3 py-2">
              <label class="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  class="h-4 w-4"
                  :checked="!!row.required"
                  :disabled="s.saving"
                  @change="toggleRequired(row)"
                />
                <span class="text-xs">{{ row.required ? 'Yes' : 'No' }}</span>
              </label>
            </td>

            <!-- Status -->
            <td class="px-3 py-2">
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                :class="{
                  'bg-amber-100 text-amber-800': row.status === 'BLOCKED',
                  'bg-emerald-100 text-emerald-700': row.status === 'COMPLETED',
                  'bg-gray-100 text-gray-700': !row.status
                }"
              >
                {{ row.status || '—' }}
              </span>
            </td>

            <!-- Actions -->
            <td class="px-3 py-2">
              <div class="flex items-center gap-2">
                <button
                  class="rounded-lg border px-2.5 py-1 text-sm hover:bg-gray-50"
                  @click="openEdit(row)"
                >
                  Edit
                </button>
                <!--
                <button
                  class="rounded-lg border border-rose-300 px-2.5 py-1 text-sm text-rose-700 hover:bg-rose-50"
                  @click="del(row)"
                >
                  Delete
                </button>
                -->
              </div>
            </td>
          </tr>

          <tr v-if="!s.loading && filtered.length === 0">
            <td colspan="7" class="px-3 py-10 text-center text-gray-500">
              No items found. Try adjusting filters or add a new item.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Busy state -->
    <div v-if="s.saving" class="mt-3 text-sm text-gray-500">Saving…</div>

    <!-- Modal -->
    <AddEditItemModal
      :open="modalOpen"
      :mode="mode"
      :model="editing"
      :next-order="nextOrder"
      @close="modalOpen = false"
      @submit="submitModal"
    />
  </div>
</template>
