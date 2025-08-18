<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import UpdateOrCreate from '@/components/paycut/UpdateOrCreate.vue'
import { useAuthStore } from '@/stores/auth'
import { usePaycutStore } from '@/stores/paycut'
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const payCutStore = usePaycutStore()

const selectedMonth = ref(route.query.month || new Date().toISOString().slice(0, 7))
const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  type: route.query.type || 'all',
  employee_id: route.query.employee_id || ''
})
const loading = ref(false)

const fetchPaycutListData = async () => {
  if (!selectedMonth.value || !filters.value.company_id) return

  const query = {
    month: selectedMonth.value,
    company_id: filters.value.company_id
  }

  if (filters.value.employee_id) {
    query.user_id = filters.value.employee_id
  }

  loading.value = true

  await payCutStore.fetchPaycuts(query)

  loading.value = false
}

const deletePaycut = async (id) => {
  const confirmed = confirm('Are you sure you want to delete this paycut?')
  if (!confirmed) return
  await payCutStore.deletePaycut(id)
  await fetchPaycutListData()
}


</script>

<template>
  <div class="px-4 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button type="button" class="btn-3" @click="router.go(-1)">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-lg text-center">Monthly Paycut</h1>
      <div />
    </div>

    <div class="flex flex-wrap gap-4 items-center">
      
        <EmployeeFilter
         v-model:company_id="filters.company_id"
          v-model:department_id="filters.department_id"
          v-model:employee_id="filters.employee_id"
          v-model:category="filters.category"
          :with-type="true"
          :initial-value="$route.query"
         @filter-change="handleFilterChange"
      />
      <input type="month" v-model="selectedMonth" class="input-1" />
    </div>

    <!-- <button
      type="button"
      class="btn-2"
      @click="openModal(filters.employee_id, selectedMonth)"
      v-if="filters.employee_id"
    >
      <i class="fa fa-plus"></i> Add Paycut
    </button> -->

    <LoaderView v-if="loading" />

    <div v-else-if="payCutStore.paycuts.length">
      <table class="table-auto w-full border mt-4 text-sm">
        <thead class="bg-gray-100 text-left">
          <tr>
            <th class="p-2">#</th>
            <th class="p-2">Employee</th>
            <th class="p-2">Paycut Hours</th>
            <th class="p-2">Reason</th>
            <th class="p-2">Note</th>
            <th class="p-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(cut, index) in payCutStore.paycuts" :key="cut.id" class="border-t">
            <td class="p-2">{{ index + 1 }}</td>
            <td class="p-2">{{ cut.user?.name || 'N/A' }}</td>
            <td class="p-2">{{ cut.paycut_hours }}</td>
            <td class="p-2">{{ cut.reason || '-' }}</td>
            <td class="p-2">{{ cut.note || '-' }}</td>
            <td class="p-2 text-center flex gap-2">
              <UpdateOrCreate
                :userId="cut.user_id"
                :month="selectedMonth"
                v-if="authStore.user?.id === 8"
                @updated="fetchPaycutListData" />
              
              <button type="button" class="text-red-500" @click="deletePaycut(cut.id)">
                <i class="fa fa-trash"></i>
              </button>
             
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else-if="!filters.company_id" class="text-red-500 text-sm text-center">
      Please select a company to load paycut data.
    </p>

    <p v-else class="text-gray-400 text-sm text-center">
      No paycuts found for the selected filters.
    </p>
  </div>
</template>
