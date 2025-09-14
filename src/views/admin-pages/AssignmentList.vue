<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useKpiAssignmentsStore } from '@/stores/monthly-kpi-assignments'
import { storeToRefs } from 'pinia'
import { ref, onMounted } from 'vue'
import { useToast } from 'vue-toastification'

const toast = useToast()
const store = useKpiAssignmentsStore()
const { items, isLoading, isSaving, error } = storeToRefs(store)

const form = ref({
  user_id: '',
  monthly_kpi_form_id: '',
  assigned_from: new Date().toISOString().slice(0, 10),
  assigned_to: '',
  assigned_by: '', // optional; backend auth থেকেও নিতে পারে
  active: true,
})

async function load() {
  await store.fetchList()
}

async function add() {
  try {
    const payload = {
      user_id: Number(form.value.user_id),
      monthly_kpi_form_id: Number(form.value.monthly_kpi_form_id),
      assigned_from: form.value.assigned_from,
      assigned_to: form.value.assigned_to || null,
      assigned_by: form.value.assigned_by ? Number(form.value.assigned_by) : null,
      active: !!form.value.active,
    }
    await store.create(payload)
    toast.success('Assigned')
    form.value = { user_id:'', monthly_kpi_form_id:'', assigned_from:new Date().toISOString().slice(0,10), assigned_to:'', assigned_by:'', active:true }
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed')
  }
}

async function closeRow(row) {
  if (!confirm('Close this assignment?')) return
  try {
    await store.close(row.id)
    toast.success('Closed')
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed')
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4 px-4">
    <div class="flex items-center justify-between gap-2">
      <h1 class="title-md md:title-lg">Form Assignments</h1>
    </div>

    <div class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="grid gap-3 md:grid-cols-12">
        <div class="md:col-span-3">
          <label class="block text-sm font-medium text-gray-700">User ID</label>
          <input v-model="form.user_id" type="number" class="mt-1 w-full rounded-md border px-3 py-2">
        </div>
        <div class="md:col-span-3">
          <label class="block text-sm font-medium text-gray-700">Form ID</label>
          <input v-model="form.monthly_kpi_form_id" type="number" class="mt-1 w-full rounded-md border px-3 py-2">
        </div>
        <div class="md:col-span-3">
          <label class="block text-sm font-medium text-gray-700">From</label>
          <input v-model="form.assigned_from" type="date" class="mt-1 w-full rounded-md border px-3 py-2">
        </div>
        <div class="md:col-span-3">
          <label class="block text-sm font-medium text-gray-700">To (optional)</label>
          <input v-model="form.assigned_to" type="date" class="mt-1 w-full rounded-md border px-3 py-2">
        </div>
        <div class="md:col-span-2 flex items-end">
          <button class="btn-2 w-full" :disabled="isSaving" @click="add">Assign</button>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="py-8 text-center"><LoaderView /></div>
    <div v-else-if="error" class="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{{ error }}</div>

    <div v-else class="overflow-x-auto rounded-xl border bg-white shadow-sm">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="bg-gray-100 text-left text-gray-700">
            <th class="px-3 py-2 w-12">#</th>
            <th class="px-3 py-2">User</th>
            <th class="px-3 py-2">Form</th>
            <th class="px-3 py-2">Period</th>
            <th class="px-3 py-2">Active</th>
            <th class="px-3 py-2 text-right w-28">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in items" :key="row.id" class="border-t">
            <td class="px-3 py-2">{{ i + 1 }}</td>
            <td class="px-3 py-2">#{{ row.user_id }}</td>
            <td class="px-3 py-2">#{{ row.monthly_kpi_form_id }}</td>
            <td class="px-3 py-2">
              {{ row.assigned_from }} → {{ row.assigned_to || 'present' }}
            </td>
            <td class="px-3 py-2">
              <span :class="row.active ? 'text-green-600' : 'text-gray-500'">
                {{ row.active ? 'Yes' : 'No' }}
              </span>
            </td>
            <td class="px-3 py-2 text-right">
              <button class="btn-3" :disabled="isSaving || !row.active" @click="closeRow(row)">Close</button>
            </td>
          </tr>
          <tr v-if="items.length === 0"><td colspan="6" class="px-3 py-6 text-center text-gray-600">No assignments</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
