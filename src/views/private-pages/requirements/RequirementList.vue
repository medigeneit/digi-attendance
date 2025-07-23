<script setup>
import { useRequirementStore } from '@/stores/useRequirementStore'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const store = useRequirementStore()
const router = useRouter()

onMounted(() => {
  store.fetchRequirements()
})

const goToAdd = () => {
  router.push({ name: 'RequirementAdd' })
}
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="bg-white shadow-md rounded-lg p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Requirements</h2>
        <button @click="goToAdd" class="btn-1">Add Requirement</button>
      </div>

      <div v-if="store.loading" class="text-center py-4 text-gray-500">Loading requirements...</div>

      <div v-else-if="store.error" class="text-center py-4 text-red-500">
        {{ store.error }}
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full bg-white border overflow-hidden table table-fixed">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-4 py-2 text-left whitespace-nowrap">#</th>
              <th class="px-4 py-2 text-left whitespace-nowrap">Department</th>
              <th class="px-4 py-2 text-center whitespace-nowrap">Submitted On</th>
              <th class="px-4 py-2 text-center whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(req, serial) in store.requirements"
              :key="req.id"
              class="border-t hover:bg-blue-50 odd:bg-gray-50"
            >
              <td class="px-4 py-2">{{ serial + 1 }}</td>
              <td class="px-4 py-2 max-w-[60px] md:max-w-[300px]">
                <div class="flex flex-col lg:flex-row items-start lg:items-center gap-2">
                  <span class="text-gray-500">From </span>
                  <span class="text-blue-700 font-semibold flex-shrink-0"
                    >{{ req?.from_department?.name }}
                  </span>
                  <span class="text-gray-500">To </span>
                  <span class="text-blue-700 font-semibold flex-shrink-0">{{
                    req?.to_department?.name
                  }}</span>
                </div>

                <div class="">
                  <div
                    class="text-blue-800"
                    v-if="req?.details?.length > 0 && Array.isArray(req?.details)"
                  >
                    <div class="line-clamp-3 text-sm">
                      {{ req?.details[0].title }}
                    </div>
                  </div>
                  <div v-else class="text-gray-400 text-sm">No Details added</div>
                  <RouterLink
                    :to="{ name: 'RequirementShow', params: { id: req?.id } }"
                    class="text-blue-600 text-sm hover:underline hover:text-blue-800"
                  >
                    <span v-if="req?.details?.length - 1 > 0">
                      {{ req?.details?.length - 1 }} More details
                    </span>
                    <span v-else>Show Details</span>
                  </RouterLink>
                </div>
              </td>
              <td class="px-4 py-2 text-center whitespace-nowrap">
                <div class="text-gray-600">
                  {{
                    new Date(req.submission_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  }}
                </div>
              </td>

              <td class="px-4 py-2 text-center">
                <div class="flex gap-4 items-center justify-center">
                  <RouterLink
                    :to="{ name: 'RequirementShow', params: { id: req?.id } }"
                    class="btn-2"
                    @click="$event.stopPropagation()"
                  >
                    <i class="fad fa-eye"></i> Show
                  </RouterLink>
                  <RouterLink
                    :to="{ name: 'RequirementEdit', params: { id: req?.id } }"
                    class="btn-4 border border-blue-500 hover:bg-blue-500 hover:text-white"
                    @click="$event.stopPropagation()"
                  >
                    <i class="fad fa-edit"></i> Edit
                  </RouterLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
