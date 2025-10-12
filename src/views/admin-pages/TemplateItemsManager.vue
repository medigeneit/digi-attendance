<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useTemplateItemsStore } from '@/stores/templateItems'
import AddEditItemModal from '@/components/AddEditItemModal.vue'

const route = useRoute()
const templateId = computed(() => Number(route.params.id || route.query.template_id))

const s = useTemplateItemsStore()

const modalOpen = ref(false)
const mode = ref('add')
const editing = ref(null)
const q = ref('')

const filtered = computed(() => {
  const term = (q.value || '').toLowerCase().trim()
  if (!term) return s.items
  return s.items.filter(x =>
    (x.item_key || '').toLowerCase().includes(term) ||
    (x.label || '').toLowerCase().includes(term)
  )
})

const nextOrder = computed(() => (s.items?.length || 0))

onMounted(async () => {
  if (!templateId.value) return
  await s.fetch(templateId.value)
})

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
        required: !!payload.required,
        order_no: payload.order_no ?? editing.value.order_no
      }
      await s.update(editing.value.id, patch)
    }
    modalOpen.value = false
  } catch (e) {
    // errors are toasted inside store
  }
}
async function toggleRequired(row) {
  try {
    await s.update(row.id, { required: !row.required })
    window?.notify?.success?.('Required updated')
  } catch {
    // errors are toasted inside store
  }
}
async function del(row) {
  if (!confirm(`Delete "${row.label}"?`)) return
  await s.remove(row.id)
}

function moveUp(row)  { s.moveUp(row.id) }
function moveDown(row){ s.moveDown(row.id) }
async function saveOrder() { await s.saveOrder() }
</script>

<template>
  <div class="mx-auto max-w-7xl p-4">
    <!-- Header -->
    <div class="mb-4 flex items-center gap-2">
      <div class="flex-1">
        <h2 class="text-xl font-semibold">Checklist Template Items</h2>
        <p class="text-md text-gray-500">Template : {{ templateId == 1 ? 'Joining Checklist Items':'Exist Checklist Items' }}</p>
      </div>
      <button class="rounded bg-gray-900 px-3 py-2 text-white hover:bg-gray-800" @click="openAdd">
        + Add Item
      </button>
    </div>

    <!-- Toolbar -->
    <div class="mb-3 flex items-center gap-2">
      <input
        v-model="q"
        type="text"
        placeholder="Search (key/label)…"
        class="w-64 rounded border px-3 py-2"
      />
      <div class="ml-auto flex items-center gap-2">
        <button
          class="rounded border px-3 py-2 hover:bg-gray-50"
          :disabled="s.saving"
          @click="saveOrder"
          title="Persist current order"
        >Save Order</button>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-hidden rounded-xl border bg-white">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-50 text-left">
          <tr>
            <th class="px-3 py-2 w-16">Order</th>
            <th class="px-3 py-2">Item Key</th>
            <th class="px-3 py-2">Label</th>
            <th class="px-3 py-2 w-28">Required</th>
            <th class="px-3 py-2 w-40">Actions</th>
          </tr>
        </thead>
        <tbody>
          <!-- skeleton -->
          <tr v-if="s.loading">
            <td colspan="5" class="px-3 py-4">
              <div class="h-4 w-full animate-pulse rounded bg-gray-100"></div>
            </td>
          </tr>

          <tr
            v-for="(row, i) in filtered"
            :key="row.id"
            class="border-t hover:bg-gray-50"
          >
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

            <td class="px-3 py-2 font-mono text-xs text-gray-700">
              {{ row.item_key }}
            </td>

            <td class="px-3 py-2">
              <div class="truncate">{{ row.label }}</div>
            </td>

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

            <td class="px-3 py-2">
                <button class="btn-2 py-1" @click="openEdit(row)">Edit</button>
              <!-- <div class="flex items-center gap-2">
                <button class="rounded border border-rose-300 px-2 py-1 text-rose-700 hover:bg-rose-50" @click="del(row)">Delete</button>
              </div> -->
            </td>
          </tr>

          <tr v-if="!s.loading && filtered.length === 0">
            <td colspan="5" class="px-3 py-6 text-center text-gray-500">No items</td>
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
