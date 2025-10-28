<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import DepartmentChip from '@/components/DepartmentChip.vue'
import RequirementTable from '@/components/requirements/RequirementTable.vue'
import RequirementHeader from '@/components/tasks/RequirementHeader.vue'
import { useRequirementStore } from '@/stores/useRequirementStore'
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const store = useRequirementStore()
const router = useRouter()
const route = useRoute()

const filters = computed({
  get() {
    return { ...route.query }
  },
  set(value) {
    router.push({ query: { ...value } })
  },
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
  <div class="container mx-auto p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Requirements</h2>
      <button @click="goToAdd" class="btn-1">Add Requirement</button>
    </div>

    <div class="bg-white shadow-md rounded-lg p-4">
      <RequirementHeader v-model="filters" class="mt-2 mb-6" />

      <LoaderView
        v-if="store.loading"
        class="sm:min-h-64 lg:min-h-96 shadow-none flex items-center justify-center"
      >
        Loading requirements...
      </LoaderView>

      <div v-else-if="store.error" class="text-center py-4 text-red-500">
        {{ store.error }}
      </div>

      <template v-else>
        <div
          v-for="deptGroup in requirementDepartmentGroups"
          :key="deptGroup.key"
          class="mt-8 rounded-md border-2 border-sky-300"
        >
          <div
            class="sticky top-14 z-40 text-gray-700 bg-gradient-to-tl from-sky-400/60 to-sky-400 py-2 px-4 flex items-center"
          >
            <div class="font-semibold flex items-center gap-2">
              <span class="text-white text-sm">From</span>
              <DepartmentChip :department="deptGroup.from_department" />
              <span class="text-white text-sm">To</span>
              <DepartmentChip :department="deptGroup.to_department" />
            </div>
          </div>

          <div class="rounded-b-md overflow-x-auto border-x xl:border-x-0">
            <RequirementTable :requirements="deptGroup.requirements" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
