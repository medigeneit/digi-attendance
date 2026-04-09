<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLifecycleStore } from '@/stores/lifecycle'

const store = useLifecycleStore()
const router = useRouter()

const q = ref('')
const sortBy = ref('progress_desc')

const clamp = (v, min = 0, max = 100) => Math.min(Math.max(Number(v || 0), min), max)

const filteredRows = computed(() => {
  const needle = String(q.value || '').trim().toLowerCase()
  let list = Array.isArray(store.rows) ? [...store.rows] : []

  if (needle) {
    list = list.filter((row) => {
      const emp = row?.employee || {}
      return [emp.name, emp.employee_id, emp.department?.name, emp.designation?.title]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    })
  }

  if (sortBy.value === 'name_asc') {
    list.sort((a, b) => String(a?.employee?.name || '').localeCompare(String(b?.employee?.name || '')))
  } else if (sortBy.value === 'progress_asc') {
    list.sort((a, b) => clamp(a?.lifecycle?.overall_progress) - clamp(b?.lifecycle?.overall_progress))
  } else {
    list.sort((a, b) => clamp(b?.lifecycle?.overall_progress) - clamp(a?.lifecycle?.overall_progress))
  }

  return list
})

const flowLabel = computed(() => store.flowLabel)

function openDetail(row) {
  router.push({
    name: 'lifecycle.detail',
    params: {
      flowType: store.flowType,
      userId: row?.employee?.id,
    },
  })
}

function prettyStage(value) {
  return String(value || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative">
        <input
          v-model="q"
          type="search"
          placeholder="Search name / ID / dept / designation..."
          class="w-64 md:w-80 max-w-full rounded-lg border bg-white/90 px-8 py-2 text-sm outline-none focus:border-gray-400"
        />
        <svg class="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l3.387 3.387a1 1 0 01-1.414 1.414L12.9 14.32zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clip-rule="evenodd"/></svg>
      </div>

      <select v-model="sortBy" class="rounded-md border bg-white px-2 py-2 text-xs outline-none">
        <option value="progress_desc">Sort: Progress Desc</option>
        <option value="progress_asc">Sort: Progress Asc</option>
        <option value="name_asc">Sort: Name A-Z</option>
      </select>

      <div class="ml-auto">
        <span class="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">
          Flow: <span class="ml-1 font-medium">{{ flowLabel }}</span>
        </span>
      </div>
    </div>

    <div class="overflow-x-auto rounded-xl border shadow-sm">
      <table class="min-w-full text-[13px]">
        <thead class="sticky top-0 bg-gray-50/90 backdrop-blur">
          <tr class="border-b text-left">
            <th class="p-2 w-10">#</th>
            <th class="p-2 min-w-[240px]">Employee</th>
            <th class="p-2 min-w-[180px]">Current Stage</th>
            <th class="p-2 min-w-[220px]">Lifecycle Progress</th>
            <th class="p-2 min-w-[160px]">Checklist</th>
            <th class="p-2 w-36">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(row, idx) in filteredRows" :key="row.id" class="border-b hover:bg-gray-50/70">
            <td class="p-2">{{ idx + 1 }}</td>

            <td class="p-2">
              <div class="min-w-0">
                <div class="font-medium truncate">{{ row?.employee?.name || '-' }}</div>
                <div class="text-[11px] text-gray-500">
                  <span>{{ row?.employee?.employee_id || 'No ID' }}</span>
                  <span class="mx-1">•</span>
                  <span>{{ row?.employee?.department?.name || 'No department' }}</span>
                </div>
              </div>
            </td>

            <td class="p-2">
              <div class="font-medium text-gray-800">{{ prettyStage(row?.lifecycle?.current_stage) || '-' }}</div>
              <div class="text-[11px] text-gray-500">{{ row?.lifecycle?.status || '-' }}</div>
            </td>

            <td class="p-2">
              <div class="w-full">
                <div class="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    class="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500"
                    :style="{ width: `${clamp(row?.lifecycle?.overall_progress)}%` }"
                  />
                </div>
                <div class="mt-1 flex items-center justify-between text-[11px] text-gray-600">
                  <span>{{ clamp(row?.lifecycle?.overall_progress) }}%</span>
                  <span>{{ flowLabel }}</span>
                </div>
              </div>
            </td>

            <td class="p-2">
              <div class="font-medium text-gray-700">{{ row?.checklist?.template_name || 'Not created' }}</div>
              <div class="text-[11px] text-gray-500">{{ clamp(row?.checklist?.progress) }}% checklist done</div>
            </td>

            <td class="p-2">
              <button
                class="rounded-md bg-gray-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-black"
                @click="openDetail(row)"
              >
                Open
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="!store.loading && filteredRows.length === 0"
      class="rounded-xl border border-dashed p-10 text-center text-sm text-gray-500"
    >
      No lifecycle records found for the current filters.
    </div>
  </div>
</template>
