<script setup>
import { ref, onMounted, watch } from 'vue'
import Multiselect from '@/components/MultiselectDropdown.vue'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { storeToRefs } from 'pinia'

const props = defineProps({
  modelValue: Object,
  withType: { type: Boolean, default: true },
  initialValue: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:modelValue', 'filter-change'])

const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()

const { companies, employees } = storeToRefs(companyStore)
const { departments } = storeToRefs(departmentStore)

const selectedCompanyId = ref(null)
const selectedDepartmentId = ref({ id: 'all', name: 'All Departments' })
const selectedType = ref({ id: 'all', name: 'All Types' })
const selectedEmployeeId = ref(null)
const filterEmployees = ref([])

const typeLabel = (type) => {
  const map = {
    'executive': 'Executive',
    'support_staff': 'Support Staff',
    'doctor': 'Doctor',
    'academy_body': 'Academy Body',
  }
  return map[type] || type
}

onMounted(async () => {
  await companyStore.fetchCompanies()

  if (props.initialValue?.company_id) {
    const company = companies.value.find(c => c.id == props.initialValue.company_id)
    if (company) {
      selectedCompanyId.value = company

      await departmentStore.fetchDepartments(company.id)
      await companyStore.fetchEmployee(company.id)
      filterEmployees.value = [...companyStore.employees]

      // Department Selection

      if (props.initialValue?.department_id && props.initialValue.department_id !== 'all') {
        const dept = departments.value.find(d => d.id == props.initialValue.department_id)
        if (dept) {
          selectedDepartmentId.value = dept
        }
      }

      // Type Selection
      if (props.initialValue?.type && props.initialValue.type !== 'all') {
        selectedType.value = {
          id: props.initialValue.type,
          name: typeLabel(props.initialValue.type),
        }
      }

      applyFilter()

      // Employee Selection (after applyFilter to ensure filtered list updated)
      if (props.initialValue?.employee_id) {
        const emp = filterEmployees.value.find(e => e.id == props.initialValue.employee_id)
        if (emp) {
          selectedEmployeeId.value = emp
        }
      }
    }
  }
})

watch(selectedCompanyId, async (newCompany) => {
  if (newCompany) {
    await departmentStore.fetchDepartments(newCompany.id)
    await companyStore.fetchEmployee(newCompany.id)
    filterEmployees.value = [...companyStore.employees]
    // selectedDepartmentId.value = { id: 'all', name: 'All Departments' }
    // selectedEmployeeId.value = null
  } else {
    filterEmployees.value = []
    departments.value = []
    // selectedDepartmentId.value = { id: 'all', name: 'All Departments' }
    // selectedEmployeeId.value = null
  }
  emitFilter()
})

watch([selectedDepartmentId, selectedType], () => {
  applyFilter()
})

watch(selectedEmployeeId, () => {
  emitFilter()
})

const applyFilter = () => {
  let filtered = [...companyStore.employees]

  if (selectedDepartmentId.value?.id && selectedDepartmentId.value.id !== 'all') {
    filtered = filtered.filter(emp => emp.department_id == selectedDepartmentId.value.id)
  }

  if (props.withType && selectedType.value?.id && selectedType.value.id !== 'all') {
    filtered = filtered.filter(emp => emp.type == selectedType.value.id)
  }

  filterEmployees.value = filtered
  selectedEmployeeId.value = null
  emitFilter()
}

const emitFilter = () => {
  emit('update:modelValue', {
    company_id: selectedCompanyId.value?.id || '',
    department_id: selectedDepartmentId.value?.id || 'all',
    type: props.withType ? (selectedType.value?.id || 'all') : null,
    employee_id: selectedEmployeeId.value?.id || '',
  })
  emit('filter-change')
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <Multiselect 
      v-model="selectedCompanyId" 
      :options="companies" 
      label="name" 
      track-by="id" 
      placeholder="Select Company" 
    />

    <Multiselect 
      v-model="selectedDepartmentId" 
      :options="[{id:'all', name:'All Departments'}, ...departments]" 
      label="name" 
      track-by="id" 
      placeholder="Select Department" 
      :disabled="!selectedCompanyId"
    />

    <Multiselect 
      v-if="withType"
      v-model="selectedType" 
      :options="[{id:'all', name:'All Types'},{id:'executive', name:'Executive'},{id:'support_staff', name:'Support Staff'},{id:'doctor', name:'Doctor'},{id:'academy_body', name:'Academy Body'}]" 
      label="name" 
      track-by="id" 
      placeholder="Select Type" 
    />

    <Multiselect 
      v-model="selectedEmployeeId" 
      :options="filterEmployees" 
      label="name" 
      track-by="id" 
      placeholder="Select Employee" 
      :disabled="filterEmployees.length === 0"
    />
  </div>
</template>
