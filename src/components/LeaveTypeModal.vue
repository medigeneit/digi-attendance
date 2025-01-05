<script setup>
import { ref, reactive, watch } from 'vue'
import { useCompanyStore } from '@/stores/company'

const props = defineProps({
  show: { type: Boolean, required: true },
  leaveType: { type: Object, default: null },
})

const emit = defineEmits(['close', 'save'])
const companyStore = useCompanyStore()

const isEditMode = ref(false)
const isCompaniesFetched = ref(false) // ফেচ স্টেট ট্র্যাক করার জন্য ফ্ল্যাগ

const form = reactive({
  id: null, // ID যোগ করা হয়েছে
  company_id: '',
  name: '',
  annual_quota: 0,
  type: 'Paid',
  max_consecutive_days: null,
  description: '',
})

// ফর্ম রিসেট ফাংশন
const resetForm = () => {
  isEditMode.value = false
  form.id = null // ID রিসেট করা
  form.company_id = ''
  form.name = ''
  form.annual_quota = 0
  form.type = 'Paid'
  form.max_consecutive_days = null
  form.description = ''
}

// `props.leaveType` এর উপর নির্ভর করে ফর্ম আপডেট
watch(
  () => props.leaveType,
  (newLeaveType) => {
    if (newLeaveType) {
      isEditMode.value = true
      form.id = newLeaveType.id
      form.company_id = newLeaveType.company_id
      form.name = newLeaveType.name
      form.annual_quota = newLeaveType.annual_quota
      form.type = newLeaveType.type
      form.max_consecutive_days = newLeaveType.max_consecutive_days
      form.description = newLeaveType.description
    } else {
      resetForm()
    }
  },
  { immediate: true, deep: true },
)

// মোডাল শো হওয়ার সময় কোম্পানি ফেচ করা
watch(
  () => props.show,
  async (isShown) => {
    if (isShown && !isCompaniesFetched.value) {
      await fetchCompanies() // কোম্পানি ফেচ ফাংশন কল
    }
  },
)

// কোম্পানি ফেচ ফাংশন
const fetchCompanies = async () => {
  try {
    await companyStore.fetchCompanies() // পিনিয়া স্টোর থেকে ফেচ
    isCompaniesFetched.value = true // সফল ফেচের পর ফ্ল্যাগ আপডেট
  } catch (error) {
    console.error('Failed to fetch companies:', error)
  }
}

// ফর্ম সাবমিট হ্যান্ডলার
const handleSubmit = () => {
  emit('save', { ...form })
  closeModal()
}

// মোডাল ক্লোজ হ্যান্ডলার
const closeModal = () => {
  resetForm()
  emit('close')
}
</script>
<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50"
  >
    <div class="bg-white rounded-lg shadow-lg w-full max-w-lg">
      <div class="px-6 py-4 border-b">
        <h3 class="text-lg font-bold">
          {{ isEditMode ? 'Edit Leave Type' : 'Add Leave Type' }}
        </h3>
      </div>

      <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
        <!-- কোম্পানি সিলেক্ট -->
        <div>
          <label for="company_id" class="block text-sm font-medium">Company</label>
          <select
            id="company_id"
            v-model="form.company_id"
            class="w-full border rounded px-3 py-2"
            required
          >
            <option value="" disabled>Select a company</option>
            <option v-for="company in companyStore.companies" :key="company.id" :value="company.id">
              {{ company.name }}
            </option>
          </select>
        </div>

        <!-- লিভ টাইপ ইনপুট -->
        <div>
          <label for="name" class="block text-sm font-medium">Name</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter leave type name"
            required
          />
        </div>

        <div>
          <label for="annual_quota" class="block text-sm font-medium">Annual Quota</label>
          <input
            id="annual_quota"
            v-model="form.annual_quota"
            type="number"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter annual quota"
            required
          />
        </div>

        <div>
          <label for="type" class="block text-sm font-medium">Type</label>
          <select id="type" v-model="form.type" class="w-full border rounded px-3 py-2" required>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>

        <div>
          <label for="max_consecutive_days" class="block text-sm font-medium"
            >Max Consecutive Days</label
          >
          <input
            id="max_consecutive_days"
            v-model="form.max_consecutive_days"
            type="number"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter max consecutive days (optional)"
          />
        </div>

        <div>
          <label for="description" class="block text-sm font-medium">Description</label>
          <textarea
            id="description"
            v-model="form.description"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter description (optional)"
          ></textarea>
        </div>

        <!-- অ্যাকশন বাটন -->
        <div class="flex justify-end space-x-4">
          <button
            type="button"
            @click="closeModal"
            class="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            {{ isEditMode ? 'Update' : 'Create' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
