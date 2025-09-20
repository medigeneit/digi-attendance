<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import TextEditor from '@/components/TextEditor.vue'
import { useMonthlyKpiFormItemsStore } from '@/stores/monthly-kpi-form-items'
import { storeToRefs } from 'pinia'
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const toast = useToast()
const router = useRouter()
const route = useRoute()
const formId = computed(() => Number(route.params.id))

// Pinia store (keep state reactive via storeToRefs)
const store = useMonthlyKpiFormItemsStore()
const { items, isLoading, isSaving, error } = storeToRefs(store)

// Add form state
const options = ref([]) // available criteria
const addForm = ref({
  criteria_id: '',
  title: '',
  description: '',
  max_score: 10,
})

const canAdd = computed(() =>
  addForm.value.criteria_id &&
  Number.isFinite(+addForm.value.max_score) &&
  +addForm.value.max_score >= 1
)

async function load() {
  await store.fetchItems(formId.value)
  options.value = await store.fetchAvailableCriteria(formId.value)
}

function periodBack() {
  router.push({ name: 'MonthlyKpiFormEdit', params: { id: formId.value } })
}

function onSelectCriteria() {
  const id = Number(addForm.value.criteria_id)
  const c = options.value.find(x => x.id === id)
  if (c) {
    addForm.value.title = c.name || ''
    addForm.value.description = c.description || ''
  }
}

async function addItem() {
  try {
    if (!canAdd.value) {
      toast.error('Please pick a criteria and valid max score (≥ 1).')
      return
    }
    await store.createItem(formId.value, {
      criteria_id: Number(addForm.value.criteria_id),
      title: addForm.value.title?.trim() || undefined,        // server will snapshot if empty
      description: addForm.value.description?.trim() || undefined,
      max_score: Number(addForm.value.max_score || 0),
    })
    toast.success('Item added')
    // reset & refresh available criteria
    addForm.value = { criteria_id: '', title: '', description: '', max_score: 10 }
    options.value = await store.fetchAvailableCriteria(formId.value)
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed to add')
  }
}

// Optimistic reorder with rollback if API fails
const isReordering = ref(false)
async function reorderAt(newIds) {
  if (isReordering.value) return
  isReordering.value = true
  const backup = items.value.slice()
  // optimistic UI: re-map with new sort order
  const map = new Map(backup.map(it => [it.id, it]))
  items.value = newIds.map((id, i) => ({ ...map.get(id), sort_order: i + 1 })).filter(Boolean)
  try {
    await store.reorder(formId.value, newIds)
    toast.success('Reordered')
  } catch (e) {
    // rollback
    items.value = backup
    toast.error(e?.response?.data?.message || 'Failed to reorder')
  } finally {
    isReordering.value = false
  }
}

function moveUp(i) {
  if (i <= 0 || isReordering.value) return
  const ids = items.value.map(x => x.id)
  ;[ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]
  reorderAt(ids)
}

function moveDown(i) {
  if (i >= items.value.length - 1 || isReordering.value) return
  const ids = items.value.map(x => x.id)
  ;[ids[i], ids[i + 1]] = [ids[i + 1], ids[i]]
  reorderAt(ids)
}

async function saveRow(row) {
  try {
    if (!Number.isFinite(+row.max_score) || +row.max_score < 1) {
      toast.error('Max score must be ≥ 1.')
      return
    }
    await store.updateItem(formId.value, row.id, {
      title: row.title?.trim() || '',
      description: (row.description || '').toString(),
      max_score: Number(row.max_score),
    })
    toast.success('Updated')
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed to update')
  }
}

async function removeRow(row) {
  if (!confirm(`Remove "${row.title || 'this item'}"?`)) return
  try {
    await store.deleteItem(formId.value, row.id)
    toast.success('Deleted')
    options.value = await store.fetchAvailableCriteria(formId.value)
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed to delete')
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4 px-4">
    <!-- Header -->
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="periodBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back to Form</span>
      </button>
      <h1 class="title-md md:title-lg">Form Items</h1>
      <RouterLink :to="{ name: 'MonthlyKpiFormList' }" class="btn-2">
        All Forms
      </RouterLink>
    </div>

    <!-- Add new -->
    <div class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="grid gap-4 md:grid-cols-12">
        <div class="md:col-span-4">
          <label class="block text-sm font-medium text-gray-700">Criteria</label>
          <select
            v-model="addForm.criteria_id"
            @change="onSelectCriteria"
            class="mt-1 w-full rounded-md border px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            aria-label="Select criteria"
          >
            <option value="">Select…</option>
            <option v-for="c in options" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
        </div>

        <div class="md:col-span-3">
          <label class="block text-sm font-medium text-gray-700">Max Score</label>
          <input
            type="number"
            min="1"
            v-model.number="addForm.max_score"
            class="mt-1 w-full rounded-md border px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            aria-label="Max score"
          />
        </div>

        <div class="md:col-span-2 flex items-end">
          <button
            class="btn-2 w-full"
            :disabled="isSaving || !canAdd"
            @click="addItem"
          >
            <i class="far fa-plus mr-2"></i> Add
          </button>
        </div>

        <div class="md:col-span-12">
          <label class="block text-sm font-medium text-gray-700">Title</label>
          <input
            v-model="addForm.title"
            type="text"
            maxlength="200"
            class="mt-1 w-full rounded-md border px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            placeholder="(Optional) override criteria title"
          />
        </div>

        <div class="md:col-span-12">
          <label class="block text-sm font-medium text-gray-700">Description</label>
          <TextEditor v-model="addForm.description" />
        </div>
      </div>
    </div>

    <!-- Loader / Error -->
    <div v-if="isLoading" class="py-8 text-center">
      <LoaderView />
    </div>
    <div v-else-if="error" class="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
      {{ error }}
    </div>

    <!-- Items table -->
    <div v-else class="overflow-x-auto rounded-xl border bg-white shadow-sm">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="bg-gray-100 text-left text-gray-700">
            <th class="px-3 py-2 w-12">#</th>
            <th class="px-3 py-2">Title</th>
            <th class="px-3 py-2">Criteria</th>
            <th class="px-3 py-2 w-24 text-right">Max</th>
            <th class="px-3 py-2 w-24">Order</th>
            <th class="px-3 py-2 w-28 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in items" :key="row.id" class="border-t">
            <td class="px-3 py-2">{{ i + 1 }}</td>

            <td class="px-3 py-2">
              <input
                v-model="row.title"
                maxlength="200"
                class="w-full rounded-md border px-2 py-1 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
                aria-label="Item title"
              />
              <TextEditor
                v-model="row.description"
                rows="2"
                class="mt-1 w-full rounded-md border px-2 py-1 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
                aria-label="Item description"
              />
            </td>

            <td class="px-3 py-2">
              <div class="font-medium">{{ row.criteria?.name || '-' }}</div>
              <div class="text-xs text-gray-500">#{{ row.criteria_id }}</div>
            </td>

            <td class="px-3 py-2 text-right">
              <input
                type="number"
                min="1"
                v-model.number="row.max_score"
                class="w-20 rounded-md border px-2 py-1 text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
                aria-label="Max score"
              />
            </td>

            <td class="px-3 py-2">
              <div class="inline-flex items-center gap-1">
                <button
                  class="btn-icon"
                  :disabled="i===0 || isReordering"
                  @click="moveUp(i)"
                  title="Move up"
                  aria-label="Move up"
                >
                  <i class="far fa-arrow-up"></i>
                </button>
                <button
                  class="btn-icon"
                  :disabled="i===items.length-1 || isReordering"
                  @click="moveDown(i)"
                  title="Move down"
                  aria-label="Move down"
                >
                  <i class="far fa-arrow-down"></i>
                </button>
              </div>
            </td>

            <td class="px-3 py-2 text-right">
              <div class="inline-flex gap-1">
                <button
                  class="btn-icon"
                  :disabled="isSaving"
                  @click="saveRow(row)"
                  title="Save"
                  aria-label="Save row"
                >
                  <i class="far fa-save"></i>
                </button>
                <button
                  class="btn-icon text-red-600 hover:text-red-700"
                  :disabled="isSaving || isReordering"
                  @click="removeRow(row)"
                  title="Delete"
                  aria-label="Delete row"
                >
                  <i class="far fa-trash-alt"></i>
                </button>
              </div>
            </td>
          </tr>

          <tr v-if="items.length === 0">
            <td colspan="6" class="px-3 py-6 text-center text-gray-600">No items added yet.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
