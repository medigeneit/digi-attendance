<script setup>
import { useMonthlyKpiFormsStore } from '@/stores/monthly-kpi-forms'
import { computed, reactive, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
const toast = useToast()
const router = useRouter()
const route = useRoute()
const store = useMonthlyKpiFormsStore()
const options = ref([]) // available criteria

const editingId = computed(() => {
  const n = Number(route.params?.id)
  return Number.isFinite(n) && n > 0 ? n : null
})
const isEdit = computed(() => !!editingId.value)

const form = reactive({
  type: 'staff',          
  start_month: '',        
  end_month: '',          
  performance_mark: 25,
  target_marks: 25,          
})

const loading = ref(false)
const preloading = ref(false)
const fieldErrors = reactive({
  type: '', start_month: '', end_month: '',
  performance_mark: '', target_marks: ''
})

const canSubmit = computed(() => {
  const okMonths = form.start_month?.match(/^\d{4}-\d{2}$/)
    && (!form.end_month || form.end_month?.match(/^\d{4}-\d{2}$/))
  return !loading.value && okMonths
})

function resetErrors() { Object.keys(fieldErrors).forEach(k => fieldErrors[k] = '') }



async function prefillIfEditing() {
  if (!isEdit.value) return
  preloading.value = true
  resetErrors()
  try {
    const item = await store.fetchOne(editingId.value)
    form.type = item.type || 'staff'
    form.start_month = item.start_month || ''
    form.end_month = item.end_month || ''
    form.performance_mark = item.performance_mark ?? 25
    form.target_marks = item.target_marks ?? 0
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed to load form')
  } finally {
    preloading.value = false
  }
}


async function onSubmit() {
  if (!canSubmit.value) return
  loading.value = true
  resetErrors()

  try {
    if (isEdit.value) {
      await store.updateForm(editingId.value, { ...form })
      toast.success('Form updated successfully')
    } else {
      await store.createForm({ ...form })
      toast.success('Form created successfully')
    }
    await store.fetchList()
    router.replace({ name: 'MonthlyKpiFormList' })
  } catch (err) {
    const data = err?.response?.data
    if (data?.errors) {
      for (const [k, v] of Object.entries(data.errors)) fieldErrors[k] = Array.isArray(v) ? v[0] : String(v)
    }
    toast.error(data?.message || (isEdit.value ? 'Failed to update' : 'Failed to create'))
  } finally {
    loading.value = false
  }
}

function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    onSubmit()
  }
}

onMounted( async () => { 
  window.addEventListener('keydown', handleKeydown); 
  prefillIfEditing();
  options.value = await store.fetchAvailableCriteria()
})
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))

// keep a simple “dirty” tracker if you need warn-on-leave later
const touched = ref(false)
watch(() => [form.type, form.start_month, form.end_month, form.performance_mark, form.target_marks], () => {
  touched.value = true
})
</script>

<template>
  <div class="my-container mx-auto max-w-4xl px-4 py-6">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-900">
        {{ isEdit ? 'Edit Monthly KPI Form' : 'Create Monthly KPI Form' }}
      </h1>
      <RouterLink :to="{ name: 'MonthlyKpiFormList' }"
        class="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
        Back to list
      </RouterLink>
    </div>


    <form @submit.prevent="onSubmit" class="card-bg rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" novalidate>
      <div class="grid gap-6">
        <!-- Type -->
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Type <span class="text-red-500">*</span></label>
          <select v-model="form.type" class="w-full rounded-md border px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200">
            <option value="admin">Admin</option>
            <option value="executive">Executive</option>
            <option value="staff">Staff</option>
          </select>
          <p v-if="fieldErrors.type" class="mt-1 text-sm text-red-600">{{ fieldErrors.type }}</p>
        </div>

        <!-- Period -->
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label for="start_month" class="mb-1 block text-sm font-medium text-gray-700">Start Month <span class="text-red-500">*</span></label>
            <input id="start_month" type="month" v-model="form.start_month"
              class="w-full rounded-md border px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" required />
            <p v-if="fieldErrors.start_month" class="mt-1 text-sm text-red-600">{{ fieldErrors.start_month }}</p>
          </div>
          <div>
            <label for="end_month" class="mb-1 block text-sm font-medium text-gray-700">End Month</label>
            <input id="end_month" type="month" v-model="form.end_month"
              class="w-full rounded-md border px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
            <p v-if="fieldErrors.end_month" class="mt-1 text-sm text-red-600">{{ fieldErrors.end_month }}</p>
          </div>
        </div>

        <!-- Marks -->
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label for="performance_mark" class="mb-1 block text-sm font-medium text-gray-700">Performance Mark <span class="text-red-500">*</span></label>
            <input id="performance_mark" type="number" min="1" step="1" v-model.number="form.performance_mark"
              class="w-full rounded-md border px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" required />
            <p v-if="fieldErrors.performance_mark" class="mt-1 text-sm text-red-600">{{ fieldErrors.performance_mark }}</p>
          </div>
          <div>
            <label for="target_marks" class="mb-1 block text-sm font-medium text-gray-700">Target Marks <span class="text-red-500">*</span></label>
            <input id="target_marks" type="number" min="0" step="1" v-model.number="form.target_marks"
              class="w-full rounded-md border px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" required />
            <p v-if="fieldErrors.target_marks" class="mt-1 text-sm text-red-600">{{ fieldErrors.target_marks }}</p>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="mt-8 flex items-center justify-end gap-3">
        <RouterLink :to="{ name: 'MonthlyKpiFormList' }"
          class="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </RouterLink>
        <button type="submit" :disabled="!canSubmit || preloading"
          class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white
                 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed">
          <svg v-if="loading || preloading" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"/>
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="4" />
          </svg>
          <span>{{ (loading || preloading) ? (isEdit ? 'Updating…' : 'Saving…') : (isEdit ? 'Update' : 'Save') }}</span>
        </button>
      </div>
    </form>
  </div>
</template>
