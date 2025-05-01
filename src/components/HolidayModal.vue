<script setup>
import Multiselect from '@/components/MultiselectDropdown.vue'
import { useCompanyStore } from '@/stores/company'
import { computed, onMounted, reactive, ref, watch } from 'vue'

const props = defineProps({
  show: { type: Boolean, required: true },
  holiday: { type: Object, default: null },
})

const emit = defineEmits(['close', 'save'])

const selectedCompanies = ref([])

const isEditMode = ref(false)

const holidayForm = reactive({
  id: null,
  year: new Date().getFullYear(),
  name: '',
  start_date: '',
  end_date: '',
  type: 'government',
  description: '',
  company_id: null,
  company_ids: [],
})

holidayForm.company_ids = computed(() =>
  selectedCompanies.value.filter((item) => item?.id).map((item) => item.id),
)

const companyStore = useCompanyStore()
const companies = ref([])

const resetForm = () => {
  isEditMode.value = false
  holidayForm.id = null
  holidayForm.year = new Date().getFullYear()
  holidayForm.name = ''
  holidayForm.start_date = ''
  holidayForm.end_date = ''
  holidayForm.type = 'government'
  holidayForm.description = ''
  holidayForm.company_id = null
}

watch(
  () => props.holiday,
  (newHoliday) => {
    if (newHoliday) {
      isEditMode.value = true
      Object.assign(holidayForm, newHoliday)
      selectedCompanies.value = companies.value.find((com) => com.id == newHoliday.company_id)
    } else {
      resetForm()
    }
  },
  { immediate: true, deep: true },
)

const handleSubmit = () => {
  emit('save', { ...holidayForm })
  closeModal()
}

const closeModal = () => {
  emit('close')
}

onMounted(async () => {
  await companyStore.fetchCompanies()
  companies.value = [{ id: null, name: 'All' }, ...companyStore.companies]
})
</script>

<template>
  <div v-if="show" class="modal-bg">
    <div class="modal-card">
      <h2 class="text-lg font-semibold">
        {{ isEditMode ? 'Edit Holiday' : 'Add Holiday' }}
      </h2>
      <form @submit.prevent="handleSubmit" class="space-y-2">
        <div class="">
          <label for="year" class="block text-sm font-medium">Year</label>
          <input
            id="year"
            v-model="holidayForm.year"
            type="number"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter year"
            required
          />
        </div>
        <div class="">
          <label for="name" class="block text-sm font-medium">Name</label>
          <input
            id="name"
            v-model="holidayForm.name"
            type="text"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter holiday name"
            required
          />
        </div>
        <div class="">
          <label for="start_date" class="block text-sm font-medium">Start Date</label>
          <input
            id="start_date"
            v-model="holidayForm.start_date"
            type="date"
            class="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div class="">
          <label for="end_date" class="block text-sm font-medium">End Date</label>
          <input
            id="end_date"
            v-model="holidayForm.end_date"
            type="date"
            class="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div class="">
          <label for="type" class="block text-sm font-medium">Type</label>
          <select
            id="type"
            v-model="holidayForm.type"
            class="w-full border rounded px-3 py-2"
            required
          >
            <option value="government">Government</option>
            <option value="special">Special</option>
            <option value="organizational">Organizational</option>
          </select>
        </div>

        <div>
          <label for="company_id" class="block text-sm font-medium">Company</label>
          <Multiselect
            v-model="selectedCompanies"
            :options="companies"
            :multiple="isEditMode ? false : true"
            :searchable="true"
            placeholder="Select companies"
            track-by="id"
            label="name"
          />
        </div>

        <!-- <div class="">
          <label for="company_id" class="block text-sm font-medium">Company</label>
          <select
            id="company_id"
            v-model="holidayForm.company_id"
            class="w-full border rounded px-3 py-2"
          >
            <option v-for="company in companies" :key="company.id" :value="company.id">
              {{ company.name }}
            </option>
          </select>
        </div> -->
        <div class="">
          <label for="description" class="block text-sm font-medium">Description</label>
          <textarea
            id="description"
            v-model="holidayForm.description"
            class="w-full border rounded px-3 py-2"
            placeholder="Enter holiday description (optional)"
          ></textarea>
        </div>
        <div class="flex justify-end">
          <button
            type="button"
            @click="closeModal"
            class="bg-gray-300 text-gray-700 px-4 py-2 rounded mr-2"
          >
            Cancel
          </button>
          <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded">
            {{ isEditMode ? 'Update' : 'Create' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
