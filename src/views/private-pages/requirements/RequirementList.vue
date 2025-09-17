<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import RequirementHeader from '@/components/tasks/RequirementHeader.vue'
import UserChip from '@/components/user/UserChip.vue'
import { useAuthStore } from '@/stores/auth'
import { useRequirementStore } from '@/stores/useRequirementStore'
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const store = useRequirementStore()
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

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

      <div v-else class="overflow-x-auto border-x xl:border-x-0">
        <table class="min-w-full bg-white border overflow-hidden table table-fixed">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-4 py-2 text-center whitespace-nowrap border w-[4%]">#</th>
              <th class="px-4 py-2 text-left whitespace-nowrap border w-[60%]">Requirement</th>
              <th class="px-4 py-2 text-center whitespace-nowrap w-[12%] border">User</th>
              <th class="px-4 py-2 text-center whitespace-nowrap w-[12%] border">Submitted At</th>
              <th class="px-4 py-2 text-center whitespace-nowrap w-[12%] border">Actions</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="store.requirements?.length === 0">
              <tr>
                <td colspan="10" class="p-4">
                  <div class="text-gray-500 italic w-full h-64 flex items-center justify-center">
                    No Requirement Found
                  </div>
                </td>
              </tr>
            </template>
            <template v-else>
              <tr
                v-for="(req, serial) in store.requirements"
                :key="req.id"
                class="border-t hover:bg-blue-50 odd:bg-gray-50 group/item"
              >
                <td
                  class="px-4 py-4 font-semibold text-xl text-gray-700 border border-gray-200 text-center"
                >
                  {{ serial + 1 }}
                </td>
                <td class="px-4 py-4 min-w-[300px] md:min-w-[400px] border border-gray-200">
                  <div
                    class="flex flex-col lg:flex-row items-start lg:items-center lg:flex-wrap gap-2 text-sm mb-3"
                  >
                    <span class="text-gray-400">From </span>
                    <span
                      :title="req?.from_department?.name"
                      :class="{
                        'bg-green-500 text-white group-hover/item:text-white':
                          req?.from_department?.id == auth?.user?.department_id,
                      }"
                      class="text-blue-500 font-semibold flex-shrink-0 border border-blue-500 bg-blue-50 rounded-full px-2 text-xs"
                    >
                      {{ req?.from_department?.short_name || req?.from_department?.name }}
                    </span>
                    <span class="text-gray-400">To </span>
                    <span
                      :title="req?.to_department?.name"
                      :class="{
                        'bg-sky-500 !text-white  ':
                          req?.to_department?.id == auth?.user?.department_id,
                      }"
                      class="text-sky-500 font-semibold flex-shrink-0 border border-sky-500 bg-blue-50 rounded-full px-2 text-xs"
                      >{{ req?.to_department?.short_name || req?.to_department?.name }}</span
                    >
                  </div>
                  <div class="space-y-4">
                    <div
                      class="text-blue-800"
                      v-if="req?.details?.length > 0 && Array.isArray(req?.details)"
                    >
                      <div class="line-clamp-1 font-semibold" :title="req?.details[0].title">
                        {{ req?.details[0].title }}
                      </div>
                    </div>
                    <div v-else class="text-gray-400 text-sm italic">No Requirement added</div>
                    <RouterLink
                      :to="{ name: 'RequirementShow', params: { id: req?.id } }"
                      class="text-blue-600 text-sm hover:underline hover:text-blue-800"
                    >
                      <span v-if="req?.details?.length - 1 > 0">
                        {{ req?.details?.length - 1 }} More Requirement
                      </span>
                      <span v-else class="">Show Form</span>
                    </RouterLink>
                  </div>
                  <!-- <div class="flex items-center gap-2 mt-4">
                  <span class="text-gray-400">By</span> <UserChip :user="req.created_by" />
                </div> -->
                </td>
                <td class="px-4 py-4 whitespace-nowrap border border-gray-200">
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-500">Created:</span>
                    <UserChip :user="req.created_by" v-if="req.created_by" avatar-size="xsmall" />
                  </div>

                  <div class="flex items-center gap-2 mt-2">
                    <div class="text-xs text-gray-500">From Coordinator:</div>
                    <UserChip
                      :user="req.from_coordinator"
                      v-if="req.from_coordinator"
                      avatar-size="xsmall"
                    />
                    <div v-else>
                      <span v-if="req?.from_department?.coordinator_id">-</span>
                      <span v-else class="italic text-xs text-gray-400">N/A</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 mt-2">
                    <div class="text-xs text-gray-500">To Coordinator:</div>
                    <UserChip
                      :user="req.to_coordinator"
                      v-if="req.to_coordinator"
                      avatar-size="xsmall"
                    />
                    <div v-else>
                      <span v-if="req?.to_department?.coordinator_id">-</span>
                      <span v-else class="italic text-xs text-gray-400">N/A</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 mt-2">
                    <div class="text-xs text-gray-500">To In Charge:</div>
                    <UserChip :user="req.to_incharge" v-if="req.to_incharge" avatar-size="xsmall" />
                    <div v-else>
                      <span v-if="req?.to_department?.incharge_id">-</span>
                      <span v-else class="italic text-xs text-gray-400">N/A</span>
                    </div>
                  </div>
                </td>

                <td class="px-4 py-4 text-center whitespace-nowrap border border-gray-200">
                  <div class="text-gray-600" v-if="req.submission_date">
                    <div>
                      {{
                        new Date(req.submission_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      }}
                    </div>
                    <div>
                      {{
                        new Date(req.submission_date).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })
                      }}
                    </div>
                  </div>
                  <div v-else>-</div>
                </td>

                <td class="px-4 py-4 text-center border border-gray-200">
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
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
