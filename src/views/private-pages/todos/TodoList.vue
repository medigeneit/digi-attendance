<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import TodoSection from '@/components/todo/TodoSection.vue'
import { useTodoStore } from '@/stores/useTodoStore'
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const todoStore = useTodoStore()
const route = useRoute()
const router = useRouter()

function handleTodoInputChange(changedSelected) {
  router.push({
    query: {
      ...route.query,
      ...changedSelected,
    },
  })
}

const status = computed({
  get: () => route.query?.status || '',
  set: (value) => {
    router.push({
      query: { ...route.query, status: value || undefined },
    })
  },
})

onMounted(() => {
  status.value = 'not-completed'
})
</script>

<template>
  <div class="container mx-auto px-4">
    <!-- <h2 class="text-2xl font-bold mb-6">Todo List</h2> -->

    <div class="flex mb-4 gap-4 mt-4 items-center flex-wrap">
      <EmployeeFilter
        :company_id="route.query?.company_id"
        :department_id="route.query?.department_id"
        :employee_id="route.query?.employee_id"
        :line_type="route.query?.line_type"
        :with-type="true"
        :initial-value="$route.query"
        @filter-change="handleTodoInputChange"
        class="flex-grow w-full lg:w-auto"
      />

      <div class="relative h-[44px] md:w-40 w-full">
        <div class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500 leading-none z-30">
          Company
        </div>
        <select
          class="border-2 border-gray-300 rounded-md cursor-pointer relative block px-4 text-gray-800 text-sm h-full w-full"
          v-model="status"
        >
          <option value="">--All Status--</option>
          <option value="not-completed">Not Completed</option>
          <option value="completed">Completed</option>
        </select>
      </div>
    </div>

    <div v-if="todoStore.error && !todoStore.loading" class="text-center py-4 text-red-500">
      {{ todoStore.error }}
    </div>

    <TodoSection
      :year="route.query.year"
      :month="route.query.month"
      :day="route.query.day"
      :type="route.query.type"
      :companyId="route.query?.company_id"
      :departmentId="route.query?.department_id"
      :employeeId="route.query?.employee_id"
      :lineType="route.query?.line_type"
      :status="status"
      @changeInput="handleTodoInputChange"
      userRole="admin"
    >
      <template #beforeHeader>
        <h2 class="text-md font-medium">Todo List</h2>
      </template>

      <template #typeSelection="{ types, changeType, selected }">
        <div class="flex items-center gap-2">
          <button
            @click.prevent="changeType(types[0]?.value)"
            :class="['rounded text-sm ', selected?.type == types[0]?.value ? 'btn-2' : 'btn-3']"
          >
            {{ types[0]?.label }}
          </button>

          <button
            @click.prevent="changeType(types[1]?.value)"
            :class="['rounded text-sm ', selected?.type == types[1]?.value ? 'btn-2 ' : 'btn-3']"
          >
            {{ types[1]?.label }}
          </button>
        </div>
      </template>
    </TodoSection>
  </div>
</template>
