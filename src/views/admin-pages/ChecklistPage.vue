<script setup>
import { onMounted, watch, computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useChecklistStore } from '@/stores/checklist'
import ChecklistTable from '@/components/ChecklistTable.vue'

const route = useRoute()
const store = useChecklistStore()

const userId = computed(() => Number(route.params.userId))
const checklistId = computed(() => route.params.checklistId ? Number(route.params.checklistId) : null)
const templateId = computed(() => route.params.templateId ? Number(route.params.templateId) : null)

const pageLoading = ref(false)

function clamp(v, min = 0, max = 100) {
  const n = Number(v || 0)
  return Math.min(Math.max(n, min), max)
}
const completionPct = computed(() => clamp(store.completion))

async function loadFromRoute() {
  // defensive: avoid double fetches
  if (!userId.value) return
  pageLoading.value = true
  try {
    if (checklistId.value) {
      await store.fetchChecklist(userId.value, checklistId.value)
    } else if (templateId.value) {
      // create-if-needed / ensure
      await store.ensureChecklist(userId.value, templateId.value)
    } else {
      // no identifier, clear to safe state
      await store.reset()
    }
  } catch (e) {
    // store.error should already be set inside store methods
  } finally {
    pageLoading.value = false
  }
}

onMounted(loadFromRoute)
watch([userId, checklistId, templateId], loadFromRoute)
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">
          {{ store.checklist?.template?.name || 'Checklist' }} 
        </h1>
        <p class="text-sm text-gray-500">
          Type: {{ store.checklist?.template?.type || '-' }}
        </p>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600">Completion</span>
        <div class="w-48 bg-gray-200 rounded-full h-2 overflow-hidden" aria-label="Completion progress">
          <div class="bg-green-500 h-2" :style="{ width: completionPct + '%' }"></div>
        </div>
        <span class="text-sm font-medium">{{ completionPct }}%</span>
      </div>
    </div>

    <div v-if="pageLoading || store.loading" class="text-gray-500">Loading…</div>
    <div v-else-if="store.error" class="text-red-600">Failed to load.</div>

    <ChecklistTable
      v-else-if="store.checklist"
      :items="store.items"
    />

    <div v-else class="text-gray-500">No checklist found.</div>
  </div>
</template>
