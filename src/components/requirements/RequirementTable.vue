<script setup>
import { useAuthStore } from '@/stores/auth'
import UserChip from '../user/UserChip.vue'

defineProps({
  requirements: { type: Array, default: () => [] },
})

const auth = useAuthStore()
</script>
<template>
  <table class="min-w-full bg-white border table table-fixed">
    <thead class="bg-gray-100 text-gray-400 text-xs">
      <tr>
        <th class="px-4 py-0.5 text-center whitespace-nowrap border w-[4%]">#</th>
        <th class="px-4 py-0.5 text-left whitespace-nowrap border w-[60%]">Requirement</th>
        <th class="px-4 py-0.5 text-center whitespace-nowrap w-[12%] border">From Department</th>
        <th class="px-4 py-0.5 text-center whitespace-nowrap w-[12%] border">To Department</th>
        <th class="px-4 py-0.5 text-center whitespace-nowrap w-[12%] border"></th>
        <th class="px-4 py-0.5 text-center whitespace-nowrap w-[12%] border">Status</th>
        <th
          class="px-4 py-0.5 text-center whitespace-nowrap w-[12%] border bg-sky-50 sm:sticky right-0"
        >
          Actions
        </th>
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
          class="border-t hover:bg-blue-50 odd:bg-gray-50 group/item relative"
        >
          <td
            class="px-4 py-4 font-semibold text-xl text-gray-700 border border-gray-200 text-center"
          >
            {{ serial + 1 }}
          </td>
          <td class="px-4 py-4 min-w-[300px] md:min-w-[400px] border border-gray-200">
            <div class="space-y-4">
              <RouterLink
                :to="{ name: 'RequirementShow', params: { id: req?.id } }"
                class="text-blue-600 hover:underline hover:text-blue-800 z-20"
              >
                <div class="text-xl mb-4" :title="req?.title">
                  <!-- <span class="text-gray-400 mr-1">ID:</span> -->
                  <span class="text-sky-800 font-bold">{{ req?.id }}</span>
                </div>
                <div class="text-blue-800">
                  <div class="line-clamp-2 font-semibold" :title="req?.title">
                    {{ req?.title }}
                  </div>
                </div>

                <div class="text-gray-400 text-xs mt-4">
                  <div class="line-clamp-2" :title="req?.description" v-html="req?.description" />
                </div>

                <span v-if="req?.details?.length - 1 > 0">
                  {{ req?.details?.length - 1 }} More Requirement
                </span>
              </RouterLink>
            </div>

            <div class="flex gap-6 items-center mt-4">
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
              <span
                v-if="req.priority"
                :class="[
                  'font-semibold text-sm border rounded-full px-2',
                  {
                    'bg-yellow-50 text-yellow-700 border-yellow-700 ': req.priority == 'IMPORTANT',
                    'bg-red-700 text-red-50 ': req.priority == 'URGENT',
                  },
                ]"
                >{{ req.priority }}</span
              >
            </div>

            <div
              class="flex gap-2 items-center bg-gray-50 bg-opacity-70 hover:bg-opacity-90 border-gray-100 rounded-md mt-1"
              v-if="req.closed_at"
            >
              <div class="text-sm flex items-center gap-2 text-red-400 font-semibold">
                <span class="fad fa-lock"></span>
                <span class="mt-[2px] whitespace-nowrap mr-2">CLOSED AT</span>
                <span class="mt-[2px] whitespace-nowrap">
                  {{
                    new Date(req.closed_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })
                  }}
                </span>
              </div>
              <div class="text-gray-800 flex items-center gap-2">
                <span class="text-sm whitespace-nowrap">Closed by</span>
                <UserChip :user="req.closed_by_user" avatar-size="xsmall" />
              </div>
            </div>
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
              <div class="text-xs text-gray-500 w-16 mr-1">In Charge:</div>
              <UserChip
                :user="req?.from_department?.in_charge"
                v-if="req?.from_department?.in_charge"
                avatar-size="xsmall"
              />
              <div v-else>
                <span class="italic text-xs text-gray-400">N/A</span>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-3">
              <div class="text-xs text-gray-500 w-16 mr-1">Coordinator:</div>
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
              <div class="text-xs text-gray-500 w-16 mr-1">In Charge:</div>
              <UserChip :user="req.to_incharge" v-if="req.to_incharge" avatar-size="xsmall" />
              <div v-else>
                <div v-if="req?.to_department?.incharge_id" class="text-xs text-red-300">
                  Approval Pending
                </div>
                <div v-else class="italic text-xs text-gray-400">N/A</div>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-3">
              <div class="text-xs text-gray-500 w-16 mr-1">Coordinator:</div>
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
            <div class="text-gray-600 text-sm" v-if="req.submission_date">
              <div class="mb-4 w-full flex flex-col justify-between items-start">
                <span class="text-xs font-bold">Submitted:</span>
                <div>
                  {{
                    new Date(req.submission_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  }}

                  {{
                    new Date(req.submission_date).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })
                  }}
                </div>
              </div>
              <div class="w-full flex flex-col justify-between items-start">
                <span class="text-xs font-bold">Better To Complete:</span>
                <div>
                  {{
                    new Date(req.submission_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  }}
                </div>
              </div>
            </div>
            <div v-else>-</div>
          </td>

          <td class="px-4 py-4 text-center border border-gray-200">
            <div class="flex justify-center items-center gap-1">
              <span
                class="border rounded-lg px-2 py-0.5 text-xs"
                :class="{
                  'bg-red-300 text-red-700 border-red-400': req.status != 'approved',
                  'bg-green-300 text-green-700 border-green-400': req.status == 'approved',
                }"
              >
                {{ String(req.status).toUpperCase() }}
              </span>
            </div>
            <div
              class="whitespace-nowrap text-sm mt-4"
              :class="[
                {
                  'text-green-700 font-semibold':
                    req.tasks_count > 0 && req.completed_tasks_count == req.tasks_count,
                  'text-red-700 font-semibold':
                    req.tasks_count == 0 || req.completed_tasks_count != req.tasks_count,
                },
              ]"
            >
              {{ req.completed_tasks_count }}/{{ req.tasks_count }} task(s) done
            </div>
          </td>
          <td
            class="px-4 py-2 md:py-4 text-center border border-gray-200 bg-sky-50 sm:sticky right-0"
          >
            <div class="flex gap-2 md:gap-4 items-center justify-center">
              <RouterLink
                :to="{ name: 'RequirementShow', params: { id: req?.id } }"
                class="btn-2 px-4"
                @click="$event.stopPropagation()"
              >
                <i class="fad fa-eye"></i>
              </RouterLink>
              <RouterLink
                :to="{ name: 'RequirementEdit', params: { id: req?.id } }"
                class="btn-4 px-4 border border-blue-500 hover:bg-blue-500 hover:text-white"
                @click="$event.stopPropagation()"
              >
                <i class="fad fa-edit"></i>
              </RouterLink>
            </div>

            <div
              class="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-50"
              v-if="req.closed_at && false"
            >
              <div
                class="flex flex-col gap-2 items-center justify-center bg-gray-50 bg-opacity-70 hover:bg-opacity-90 p-6 border-gray-100 rounded-md"
              >
                <div class="text-sm flex items-center gap-2 text-red-400 font-semibold">
                  <span class="fad fa-lock"></span>
                  <span class="mt-[2px]">CLOSED AT</span>
                  <span class="mt-[2px]">
                    {{
                      new Date(req.closed_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })
                    }}
                  </span>
                </div>
                <div class="text-gray-800 flex items-center gap-2">
                  <span class="text-sm">Closed by</span>
                  <UserChip :user="req.closed_by_user" avatar-size="xsmall" />
                </div>
                <div class="flex gap-4 items-center justify-center">
                  <RouterLink
                    :to="{ name: 'RequirementShow', params: { id: req?.id } }"
                    class="btn-2 h-6"
                    @click="$event.stopPropagation()"
                  >
                    <i class="fad fa-eye"></i> Show
                  </RouterLink>
                  <RouterLink
                    :to="{ name: 'RequirementEdit', params: { id: req?.id } }"
                    class="btn-4 h-6 border border-blue-500 hover:bg-blue-500 hover:text-white"
                    @click="$event.stopPropagation()"
                  >
                    <i class="fad fa-edit"></i> Edit
                  </RouterLink>
                </div>
              </div>
            </div>
          </td>
        </tr>
      </template>
    </tbody>
  </table>
</template>
