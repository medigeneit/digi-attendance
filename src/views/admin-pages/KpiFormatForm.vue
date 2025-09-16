<script setup>
import TextEditor from '@/components/TextEditor.vue'
import { useMonthlyAssessmentCriteriaStore } from '@/stores/monthly-assessment-criteria'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'

const toast = useToast()
const router = useRouter()
const route = useRoute()
const kpiStore = useMonthlyAssessmentCriteriaStore()

// detect edit mode
const editingId = computed(() => {
  const v = route.params?.id
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
})
const isEdit = computed(() => !!editingId.value)

// --- form state (your schema) ---
const form = reactive({
  name: '',
  description: '',
  is_active: 1,  // 1=Active, 0=Inactive
})

// --- UI/validation state ---
const loading = ref(false)
const preloading = ref(false) // for initial fetch on edit
const fieldErrors = reactive({ name: '', description: '', is_active: '' })

const titleMax = 120
const titleLen = computed(() => form.name.trim().length)

const canSubmit = computed(() =>
  !loading.value &&
  titleLen.value > 0 &&
  titleLen.value <= titleMax
)

function resetErrors() {
  for (const k of Object.keys(fieldErrors)) fieldErrors[k] = ''
}

function payload() {
  return {
    name: form.name.trim(),
    description: (form.description || '').trim(),
    is_active: Number(form.is_active ?? 0),
  }
}

// prefill on edit
async function prefillIfEditing() {
  if (!isEdit.value) return
  preloading.value = true
  resetErrors()
  try {
    const item =
      typeof kpiStore.fetchOne === 'function'
        ? await kpiStore.fetchOne(editingId.value)
        : null

    if (item) {
      form.name = item.name ?? ''
      form.description = item.description ?? ''
      form.is_active = Number(item.is_active ?? 0)
    }
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to load item')
    // optional: redirect back to list on fatal
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
      await kpiStore.updateCriteria(editingId.value, payload())
      toast.success('Criteria updated successfully')
    } else {
      await kpiStore.createCriteria(payload())
      toast.success('Criteria created successfully')
    }

    await kpiStore.fetchList() // refresh list after save
    router.replace('/kpi/monthly-format-list')
  } catch (error) {
    const data = error?.response?.data
    if (data?.errors) {
      for (const [k, v] of Object.entries(data.errors)) {
        fieldErrors[k] = Array.isArray(v) ? v[0] : String(v)
      }
    }
    toast.error(data?.message || (isEdit.value ? 'Failed to update criteria' : 'Failed to create criteria'))
    console.error(error)
  } finally {
    loading.value = false
  }
}

// keyboard shortcut: Ctrl/Cmd + Enter
function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    onSubmit()
  }
}
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  prefillIfEditing()
})
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))

// dirty state (optional)
const touched = ref(false)
watch(() => [form.name, form.description, form.is_active], () => (touched.value = true))
</script>

<template>
  <div class="my-container mx-auto max-w-4xl px-4 py-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-900">
        {{ isEdit ? 'Edit Monthly Assessment Criteria' : 'Create Monthly Assessment Criteria' }}
      </h1>
      <RouterLink
        to="/kpi/monthly-format-list"
        class="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Back to list
      </RouterLink>
    </div>

    <!-- Card -->
    <form
      @submit.prevent="onSubmit"
      class="card-bg rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      novalidate
    >
      <div class="grid gap-6">
        <!-- Name -->
        <div>
          <label for="name" class="mb-1 block text-sm font-medium text-gray-700">
            Name <span class="text-red-500">*</span>
          </label>
          <input
            id="name"
            v-model.trim="form.name"
            type="text"
            :maxlength="titleMax"
            :aria-invalid="!!fieldErrors.name"
            :aria-describedby="fieldErrors.name ? 'name-error' : undefined"
            class="w-full rounded-lg border px-3 py-2 outline-none transition
                   border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            placeholder="e.g., Punctuality and Attendance"
            required
          />
          <div class="mt-1 flex items-center justify-between">
            <p v-if="fieldErrors.name" id="name-error" class="text-sm text-red-600">
              {{ fieldErrors.name }}
            </p>
            <p class="ml-auto text-right text-xs text-gray-500">
              {{ titleLen }} / {{ titleMax }}
            </p>
          </div>
        </div>

        <!-- Status -->
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            Status <span class="text-red-500">*</span>
          </label>
          <div class="flex items-center gap-3">
            <button
              type="button"
              :aria-pressed="form.is_active === 1"
              @click="form.is_active = form.is_active === 1 ? 0 : 1"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition bg-gray-300"
              :class="form.is_active === 1 ? 'bg-green-500' : ''"
            >
              <span
                class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition"
                :class="form.is_active === 1 ? 'translate-x-5' : 'translate-x-1'"
              />
            </button>
            <span class="text-sm font-medium" :class="form.is_active === 1 ? 'text-green-700' : 'text-gray-600'">
              {{ form.is_active === 1 ? 'Active' : 'Inactive' }}
            </span>
            <input type="hidden" name="is_active" :value="form.is_active" />
          </div>
          <p v-if="fieldErrors.is_active" class="mt-1 text-sm text-red-600">
            {{ fieldErrors.is_active }}
          </p>
        </div>

        <!-- Description -->
        <div>
          <label for="description" class="mb-1 block text-sm font-medium text-gray-700">
            Description / Criteria Details
          </label>
          <div class="rounded-lg overflow-hidden border border-gray-300">
            <TextEditor id="description" v-model="form.description" class="w-full" />
          </div>
          <p v-if="fieldErrors.description" class="mt-1 text-sm text-red-600">
            {{ fieldErrors.description }}
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="mt-8 flex items-center justify-end gap-3">
        <RouterLink
          to="/kpi/monthly-format-list"
          class="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </RouterLink>

        <button
          type="submit"
          :disabled="!canSubmit || preloading"
          class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white
                 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50
                 disabled:cursor-not-allowed"
        >
          <svg v-if="loading || preloading" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"/>
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="4" />
          </svg>
          <span>{{ (loading || preloading) ? (isEdit ? 'Updating...' : 'Saving...') : (isEdit ? 'Update' : 'Save') }}</span>
        </button>
      </div>
    </form>
  </div>
</template>
