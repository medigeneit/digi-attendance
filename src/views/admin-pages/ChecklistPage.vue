<script setup>
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useChecklistStore } from '@/stores/checklist'
import ChecklistTable from '@/components/ChecklistTable.vue'

const route = useRoute()
const store = useChecklistStore()

const userId = computed(() => route.params.userId)
const checklistId = computed(() => route.params.checklistId)
const templateId = computed(() => route.params.templateId)

onMounted(async () => {
  if (checklistId.value) {
    await store.fetchChecklist(userId.value, checklistId.value)
  } else if (templateId.value) {
    await store.ensureChecklist(userId.value, templateId.value)
  }
})
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">
          {{ store.checklist?.template?.name || 'Checklist' }}
        </h1>
        <p class="text-sm text-gray-500">Type: {{ store.checklist?.template?.type || '-' }}</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600">Completion</span>
        <div class="w-48 bg-gray-200 rounded-full h-2 overflow-hidden">
          <div class="bg-green-500 h-2" :style="{ width: store.completion + '%' }"></div>
        </div>
        <span class="text-sm font-medium">{{ store.completion }}%</span>
      </div>
    </div>

    <div v-if="store.loading" class="text-gray-500">Loading…</div>
    <div v-else-if="store.error" class="text-red-600">Failed to load.</div>
    <ChecklistTable v-else-if="store.checklist" :items="store.items" />
    <div v-else class="text-gray-500">No checklist found.</div>
  </div>
</template>
