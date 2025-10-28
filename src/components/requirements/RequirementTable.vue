<script setup>
import { useAuthStore } from '@/stores/auth'
import UserChip from '../user/UserChip.vue'

defineProps({
  requirements: { type: Array, default: () => [] },
})

const auth = useAuthStore()
</script>
<template>
  <table class="min-w-full bg-white border overflow-hidden table table-fixed">
    <thead class="bg-gray-100 text-gray-400 text-xs">
      <tr>
        <th class="px-4 py-0.5 text-center whitespace-nowrap border w-[4%]">#</th>
        <th class="px-4 py-0.5 text-left whitespace-nowrap border w-[60%]">Requirement</th>
        <th class="px-4 py-0.5 text-center whitespace-nowrap w-[12%] border">From Department</th>
        <th class="px-4 py-0.5 text-center whitespace-nowrap w-[12%] border">To Department</th>
        <th class="px-4 py-0.5 text-center whitespace-nowrap w-[12%] border">Submitted At</th>
        <th class="px-4 py-0.5 text-center whitespace-nowrap w-[12%] border">Actions</th>
      </tr>
    </thead>
    <tbody>
      <template v-if="requirements?.length === 0">
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
          v-for="(req, serial) in requirements"
          :key="req.id"
          class="border-t hover:bg-blue-50 odd:bg-gray-50 group/item"
        >
          <td
            class="px-4 py-4 font-semibold text-xl text-gray-700 border border-gray-200 text-center"
          >
            {{ serial + 1 }}
          </td>
          <td class="px-4 py-4 min-w-[300px] md:min-w-[400px] border border-gray-200">
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

            <div class="flex gap-6 items-center mt-6">
              <div
                class="text-gray-600 text-xs flex items-center gap-2 whitespace-nowrap"
                v-if="req.created_at"
              >
                <i class="fas fa-clock text-sky-800/50"></i>
                <div>
                  {{
                    new Date(req.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })
                  }}
                </div>
              </div>
              <div class="flex items-center gap-2 whitespace-nowrap">
                <span class="text-xs text-gray-500">By:</span>
                <UserChip :user="req.created_by" v-if="req.created_by" avatar-size="xsmall" />
              </div>
            </div>
            <!-- <div class="flex items-center gap-2 mt-4">
                  <span class="text-gray-400">By</span> <UserChip :user="req.created_by" />
                </div> -->
          </td>
          <td class="px-4 py-4 whitespace-nowrap border border-gray-200">
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

            <div class="flex items-center gap-2 mt-4">
              <div class="text-xs text-gray-500">In Charge:</div>
              <UserChip
                :user="req?.from_department?.in_charge"
                v-if="req?.from_department?.in_charge"
                avatar-size="xsmall"
              />
              <div v-else>
                <span class="italic text-xs text-gray-400">N/A</span>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-1">
              <div class="text-xs text-gray-500">Coordinator:</div>
              <UserChip
                :user="req.from_coordinator"
                v-if="req.from_coordinator"
                avatar-size="xsmall"
              />
              <div v-else>
                <div v-if="req?.from_department?.coordinator_id" class="text-xs text-red-300">
                  Approval Pending
                </div>
                <div v-else class="italic text-xs text-gray-400">N/A</div>
              </div>
            </div>
          </td>
          <td class="px-4 py-4 whitespace-nowrap border border-gray-200">
            <span
              :title="req?.to_department?.name"
              :class="{
                'bg-sky-500 !text-white  ': req?.to_department?.id == auth?.user?.department_id,
              }"
              class="text-sky-500 font-semibold flex-shrink-0 border border-sky-500 bg-blue-50 rounded-full px-2 text-xs"
              >{{ req?.to_department?.short_name || req?.to_department?.name }}
            </span>

            <div class="flex items-center gap-2 mt-4">
              <div class="text-xs text-gray-500">In Charge:</div>
              <UserChip :user="req.to_incharge" v-if="req.to_incharge" avatar-size="xsmall" />
              <div v-else>
                <div v-if="req?.to_department?.incharge_id" class="text-xs text-red-300">
                  Approval Pending
                </div>
                <div v-else class="italic text-xs text-gray-400">N/A</div>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-2">
              <div class="text-xs text-gray-500">Coordinator:</div>
              <UserChip :user="req.to_coordinator" v-if="req.to_coordinator" avatar-size="xsmall" />
              <div v-else>
                <div v-if="req?.to_department?.coordinator_id" class="text-xs text-red-300">
                  Approval Pending
                </div>

                <div v-else class="italic text-xs text-gray-400">N/A</div>
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
</template>
