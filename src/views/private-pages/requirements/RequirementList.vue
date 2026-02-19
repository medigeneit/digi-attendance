<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import DepartmentChip from '@/components/DepartmentChip.vue'
import RequirementTable from '@/components/requirements/RequirementTable.vue'
import RequirementHeader from '@/components/tasks/RequirementHeader.vue'
import { getDisplayDateTime } from '@/libs/datetime'
import { useCompanyStore } from '@/stores/company'
import { useRequirementStore } from '@/stores/useRequirementStore'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const store = useRequirementStore()
const companyStore = useCompanyStore()
const router = useRouter()
const route = useRoute()

const printingGroup = ref(null)

const filters = computed({
  get() {
    return { ...route.query }
  },
  set(value) {
    router.push({ query: { ...value } })
  },
})

const readableFilters = computed(() => {
  const items = []

  if (filters.value.status)
    items.push({ label: 'Status', value: filters.value.status.toUpperCase() })
  if (filters.value.priority)
    items.push({ label: 'Priority', value: filters.value.priority.toUpperCase() })

  if (filters.value.month) {
    const [year, month] = filters.value.month.split('-')
    const date = new Date(year, month - 1)
    items.push({
      label: 'Month',
      value: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    })
  }

  if (filters.value['company-id']) {
    const company = companyStore.companies.find((c) => c.id == filters.value['company-id'])
    items.push({ label: 'Company', value: company?.name || filters.value['company-id'] })
  }

  if (filters.value['created-by']) {
    const reqWithAuthor = store.requirements.find(
      (r) => r.created_by?.id == filters.value['created-by'],
    )
    items.push({
      label: 'Created By',
      value: reqWithAuthor?.created_by?.name || `User ID: ${filters.value['created-by']}`,
    })
  }

  if (filters.value['from-department-id']) {
    const dept = store.requirements.find(
      (r) => r.from_department_id == filters.value['from-department-id'],
    )?.from_department
    if (dept) items.push({ label: 'Filter From Dept', value: dept.name })
  }

  if (filters.value['to-department-id']) {
    const dept = store.requirements.find(
      (r) => r.to_department_id == filters.value['to-department-id'],
    )?.to_department
    if (dept) items.push({ label: 'Filter To Dept', value: dept.name })
  }

  if (filters.value['is-closed']) {
    items.push({ label: 'Include Closed', value: 'Yes' })
  }

  if (filters.value.search) items.push({ label: 'Keywords', value: filters.value.search })

  return items
})

onMounted(() => {
  console.log('Requirement List Mounted')
  store.fetchRequirements(filters.value)
})

watch(
  () => ({ ...filters.value }),
  async function (changedFilters) {
    store.fetchRequirements(changedFilters)
  },
)

const goToAdd = () => {
  router.push({ name: 'RequirementAdd' })
}

const printDeptGroup = async (group) => {
  printingGroup.value = group
  await nextTick()
  window.print()
  printingGroup.value = null
}

const requirementDepartmentGroups = computed(() => {
  // return []
  return (store.requirements || []).reduce((deptGroups, requirement) => {
    const groupKey = `${requirement.from_department_id}-${requirement.to_department_id}`

    const foundGroup = deptGroups.find((g) => g.key == groupKey)

    if (!foundGroup) {
      deptGroups.push({
        key: groupKey,
        from_department: requirement.from_department,
        to_department: requirement.to_department,
        requirements: [requirement],
      })
    } else {
      foundGroup.requirements = [...foundGroup.requirements, requirement]
    }

    return deptGroups
  }, [])
})
</script>

<template>
  <div class="container mx-auto" :class="{ 'print:hidden': !!printingGroup }">
    <div class="bg-white shadow-md rounded-lg p-4">
      <RequirementHeader v-model="filters" @clickAdd="goToAdd" class="mb-2" />

      <LoaderView
        v-if="store.loading"
        class="sm:min-h-64 lg:min-h-96 shadow-none flex items-center justify-center"
      >
        Loading requirements...
      </LoaderView>

      <div v-else-if="store.error" class="text-center py-4 text-red-500">
        {{ store.error }}
      </div>

      <div
        v-else-if="store.requirements?.length === 0"
        class="text-center py-4 text-gray-500 min-h-[50vh] flex items-center justify-center border rounded-md"
      >
        No Requirements
      </div>

      <div v-else class="space-y-6">
        <div
          v-for="deptGroup in requirementDepartmentGroups"
          :key="deptGroup.key"
          class="rounded-md border-2 border-sky-300"
        >
          <div
            class="sticky top-14 z-40 text-gray-700 bg-gradient-to-tl from-sky-400/60 to-sky-400 py-2 px-4 flex items-center"
          >
            <div class="font-semibold flex items-center gap-2">
              <span class="text-white text-sm">From</span>
              <DepartmentChip :department="deptGroup.from_department" :shortName="true" />
              <span class="text-white text-sm">To</span>
              <DepartmentChip :department="deptGroup.to_department" :shortName="true" />
            </div>
            <div class="flex items-center gap-2 ml-auto">
              <button
                @click="printDeptGroup(deptGroup)"
                class="border rounded text-sm px-2 py-0.5 text-white bg-sky-700 hover:bg-sky-800 transition-colors"
                title="Print Group"
              >
                <i class="fas fa-print mr-1"></i> PRINT
              </button>
              <div class="border rounded text-sm px-2 text-white bg-sky-600">
                {{ deptGroup.requirements.length }}
                <span class="hidden md:inline">
                  requirement{{ deptGroup.requirements.length > 1 ? 's' : '' }}</span
                >
              </div>
            </div>
          </div>

          <div class="rounded-b-md overflow-x-auto border-x xl:border-x-0">
            <RequirementTable :requirements="deptGroup.requirements" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Print View -->
  <div
    v-if="printingGroup"
    class="hidden print:block bg-white text-black p-8 font-serif leading-relaxed"
  >
    <div class="border-b-2 border-gray-800 pb-4 mb-6">
      <div class="flex justify-between items-start">
        <div>
          <h1 class="text-xl font-bold uppercase tracking-wider">Requirement Report</h1>
          <p class="text-sm text-gray-600 mt-1">
            Generated on <span class="font-semibold">{{ getDisplayDateTime(new Date()) }}</span>
          </p>
        </div>
        <div class="text-right">
          <div class="bg-gray-100 px-3 py-1 rounded text-xl">
            <span class="font-bold">Total Requirements:</span>
            {{ printingGroup.requirements.length }}
          </div>
        </div>
      </div>
    </div>

    <!-- Dept Pair Info -->
    <div class="grid grid-cols-2 gap-x-12 gap-y-4 mb-4 text-sm border-b pb-4">
      <div class="flex justify-between border-b border-gray-100 pb-1">
        <span class="text-gray-500 font-semibold whitespace-nowrap">From Department:</span>
        <span class="font-medium text-right">{{ printingGroup.from_department?.name }}</span>
      </div>
      <div class="flex justify-between border-b border-gray-100 pb-1">
        <span class="text-gray-500 font-semibold whitespace-nowrap">To Department:</span>
        <span class="font-medium text-right">{{ printingGroup.to_department?.name }}</span>
      </div>
    </div>

    <!-- Active Filters -->
    <div
      v-if="readableFilters.length > 0"
      class="flex flex-wrap gap-x-8 gap-y-2 mb-8 text-xs bg-gray-50 p-2 rounded border border-dashed border-gray-300"
    >
      <div v-for="filter in readableFilters" :key="filter.label" class="flex gap-2">
        <span class="text-gray-500 font-bold uppercase">{{ filter.label }}:</span>
        <span class="font-semibold">{{ filter.value }}</span>
      </div>
    </div>

    <div class="space-y-12">
      <div
        v-for="(req, index) in printingGroup.requirements"
        :key="req.id"
        class="border-b-2 border-dashed border-gray-300 pb-12 last:border-0 break-inside-avoid"
      >
        <div class="flex justify-between items-start gap-4 mb-6">
          <div class="flex items-start gap-4">
            <div class="flex flex-col items-center">
              <div class="text-2xl font-bold text-gray-800 leading-none mb-1">
                {{ String(index + 1).padStart(2, '0') }}
              </div>
              <div class="text-xs font-mono text-indigo-700 bg-indigo-50 px-1 rounded">
                #{{ req.id }}
              </div>
            </div>
            <div>
              <h2 class="text-xl font-bold leading-tight">{{ req.title }}</h2>
              <div class="flex gap-4 mt-1 text-sm text-gray-500">
                <span>By: {{ req.created_by?.name }}</span>
                <span>At: {{ getDisplayDateTime(req.created_at) }}</span>
              </div>
            </div>
          </div>
          <div class="flex flex-col items-end gap-2">
            <div
              class="text-sm font-semibold uppercase px-2 py-0.5 rounded border"
              :class="
                req.status === 'approved'
                  ? 'bg-green-100 border-green-400 text-green-800'
                  : 'bg-yellow-100 border-yellow-400 text-yellow-800'
              "
            >
              {{ req.status || 'PENDING' }}
            </div>
            <div
              v-if="req.priority"
              class="px-2 py-0.5 rounded text-xs font-bold border uppercase"
              :class="{
                'bg-red-600 text-white border-red-700': req.priority === 'URGENT',
                'bg-yellow-100 text-yellow-800 border-yellow-300': req.priority === 'IMPORTANT',
              }"
            >
              {{ req.priority }}
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-x-12 gap-y-4 mb-6 text-sm">
          <div class="space-y-2">
            <div class="flex justify-between border-b border-gray-100 pb-1">
              <span class="text-gray-500 font-semibold uppercase text-xs">Supervisor:</span>
              <span class="font-medium text-right">{{ req.supervisor?.name || 'N/A' }}</span>
            </div>
          </div>
          <div class="space-y-2">
            <div class="flex justify-between border-b border-gray-100 pb-1">
              <span class="text-gray-500 font-semibold uppercase text-xs">Tasks Done:</span>
              <div class="font-bold">
                <span class="text-indigo-700">{{ req.completed_tasks_count }}</span>
                <span class="text-gray-400 mx-1">/</span>
                <span>{{ req.tasks_count }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4" v-if="req.description">
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 border-b">
            Detailed Description
          </h3>
          <div
            v-html="req.description"
            class="prose prose-sm max-w-none text-gray-800 text-sm"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
