<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useToast } from 'vue-toastification'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import { useUserMonthlyKpiStore } from '@/stores/user-monthly-kpi'
import { useMonthlyKpiFormsStore } from '@/stores/monthly-kpi-forms'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // ✅ নতুন: যদি userId আসে, তখন EmployeeFilter দেখানো হবে না (লকড)
  userId: { type: [Number, String], default: '' },
  // optional: সুন্দর লেবেল দেখাতে চাইলে
  userLabel: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'created'])

const toast = useToast()
const evalStore = useUserMonthlyKpiStore()
const formsStore = useMonthlyKpiFormsStore?.()

const open = ref(props.modelValue)

watch(() => props.modelValue, v => (open.value = v))

watch(open, v => emit('update:modelValue', v))

// local state
const sel = ref({
  company_id: '',
  department_id: '',
  employee_id: '',
  line_type: '',
  user_id: '', // mapped or locked
  form_id: '',
})
const forms = ref([])
const creating = ref(false)

const isUserFixed = computed(() => !!props.userId)

// যখন userId prop দেয়া থাকবে, তখনই সেটাকে lock করে দিন
watch(
  () => props.userId,
  (v) => {
    if (v) {
      sel.value.user_id = String(v)
      // নিরাপদ রাখতে employee related ফিল্ড পরিষ্কার করে দিচ্ছি
      sel.value.company_id = ''
      sel.value.department_id = ''
      sel.value.employee_id = ''
      sel.value.line_type = ''
    }
  },
  { immediate: true }
)

onMounted(async () => {
  if (formsStore) {
    await formsStore.fetchList?.({ per_page: 100 })
    forms.value = formsStore.items || []
  }
})

function onEmpFilterChange() {
  sel.value.user_id = sel.value.employee_id || ''
}

async function createNow() {
  if (!sel.value.user_id || !sel.value.form_id) {
    toast.error('User এবং Form সিলেক্ট করুন')
    return
  }
  try {
    creating.value = true
    const created = await evalStore.create(Number(sel.value.user_id), Number(sel.value.form_id))
    toast.success('Evaluation created')
    emit('created', created)
    open.value = false
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed to create')
  } finally {
    creating.value = false
  }
}

function close() { open.value = false }
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- overlay -->
    <div class="absolute inset-0 bg-black/40" @click="close"></div>

    <!-- card -->
    <div class="relative w-full max-w-3xl rounded-2xl bg-white shadow-lg border p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-semibold">Create Evaluation</h3>
        <button class="btn-icon" @click="close"><i class="far fa-times"></i></button>
      </div>

      <div class="grid gap-3 md:grid-cols-12">
        <!-- ✅ যদি userId দেয়া থাকে: EmployeeFilter লুকিয়ে শুধু রিডঅনলি সারাংশ দেখাবে -->
        <template v-if="isUserFixed">
          <div class="md:col-span-7">
            <label class="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <div class="rounded-md border px-3 py-2 bg-gray-50 text-gray-700">
              <span class="text-sm">
                {{ userLabel || ('#' + String(userId)) }}
              </span>
              <span class="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                locked
              </span>
            </div>
          </div>
        </template>

        <!-- ❌ userId না থাকলে: আগের মতো EmployeeFilter দেখাবে -->
        <template v-else>
          <div class="md:col-span-7">
            <label class="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <EmployeeFilter
              v-model:company_id="sel.company_id"
              v-model:department_id="sel.department_id"
              v-model:employee_id="sel.employee_id"
              v-model:line_type="sel.line_type"
              :with-type="true"
              @filter-change="onEmpFilterChange"
              class="w-full"
            />
            <p class="mt-1 text-xs text-gray-500" v-if="sel.user_id">Selected user_id: {{ sel.user_id }}</p>
          </div>
        </template>

        <div class="md:col-span-5">
          <label class="block text-sm font-medium text-gray-700">Form</label>
          <select v-model="sel.form_id"
                  class="mt-1 w-full rounded-md border px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200">
            <option value="">Select a form…</option>
            <option v-for="f in forms" :key="f.id" :value="f.id">
              #{{ f.id }} — {{ f.type }} — {{ f.start_month }}{{ f.end_month ? ` → ${f.end_month}` : '' }}
            </option>
          </select>
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button class="btn-3" @click="close" :disabled="creating">Cancel</button>
        <button class="btn-2" @click="createNow" :disabled="creating">
          <span v-if="creating">Creating…</span>
          <span v-else>Create</span>
        </button>
      </div>
    </div>
  </div>
</template>
