<script setup>
import { onMounted, watch, ref } from 'vue'
import BoardFilters from '@/components/BoardFilters.vue'
import ChecklistBoardTable from '@/components/ChecklistBoardTable.vue'
import { useChecklistBoardStore } from '@/stores/checklistBoard'

const store = useChecklistBoardStore()

const companies = ref([])
const departments = ref([])

const filterModel = ref({
  type: store.type,
  companyId: store.companyId,
  departmentId: store.departmentId,
  search: store.search
})

watch(filterModel, (v) => {
  store.type = v.type
  store.companyId = v.companyId
  store.departmentId = v.departmentId
  store.search = v.search
}, { deep: true })

async function applyFilters() {
  await store.loadBoard()
}

onMounted(async () => {
  await store.loadBoard()
  await store.loadUsers()
})
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Checklist Board</h1>
      <div class="text-sm text-gray-500">
        Template: <b>{{ store.templateByType?.name || '—' }}</b>
      </div>
    </div>

    <BoardFilters v-model="filterModel" :companies="companies" :departments="departments" @submit="applyFilters" />

    <div v-if="store.loading" class="text-gray-600">Loading…</div>
    <div v-else-if="store.error" class="text-red-600">Failed to load.</div>
    <ChecklistBoardTable v-else />
  </div>
</template>
