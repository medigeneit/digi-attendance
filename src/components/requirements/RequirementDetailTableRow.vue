<script setup>
import { useAuthStore } from '@/stores/auth'
import { computed } from 'vue'
import DescriptionView from '../DescriptionView.vue'
import TaskUserChip from '../tasks/TaskUserChip.vue'

const props = defineProps({
  detail: { type: Object },
  requirement: { type: Object },
  serial: { type: Number },
  isPrinting: { type: Boolean },
})

const emit = defineEmits(['editClick', 'deleteClick', 'taskCreateClick'])
const auth = useAuthStore()

const rowsOfTask = computed(() => {
  if (props.detail?.tasks?.length > 0) {
    return props.detail?.tasks
  }
  return [{ id: 0 }]
})

function handleCreateAssignButtonClick() {
  if (
    auth.user.role !== 'super_admin' &&
    auth.user?.id !== props.requirement?.to_department?.incharge_id
  ) {
    return alert(
      `You can't create or assign task for this requirement. \nOnly ${props.requirement?.to_department?.name}'s In charge can create or assign.`,
    )
  }
  emit('taskCreateClick', props.detail)
}
</script>
<template>
  <template v-for="(task, taskIndex) in rowsOfTask" :key="task.id">
    <tr
      class="group/item border text-gray-800 py-4 shadow-sm mb-4 px-4 rounded-md hover:bg-blue-50"
    >
      <template v-if="taskIndex === 0">
        <td
          class="border-2 border-gray-700 p-3 align-top"
          :rowspan="(detail?.tasks?.length || 1) + (isPrinting ? 0 : 1)"
        >
          <span class="text-2xl font-medium">{{ serial }}</span>
        </td>

        <td
          class="border-2 border-gray-700 p-3"
          :rowspan="(detail?.tasks?.length || 1) + (isPrinting ? 0 : 1)"
        >
          <!-- {{ requirement.to_department }} -->
          <div>
            <div class="text-lg font-semibold mb-2 flex items-start gap-3">
              <DescriptionView line-clamp="3" class="grow">
                <template #default>
                  {{ detail.title }}
                </template>
                <template #btnText="{ lineClampClass }">
                  {{ lineClampClass ? 'More' : 'Less' }}
                </template>
              </DescriptionView>
              <div v-if="detail.priority">
                <span
                  :class="[
                    'font-semibold text-sm',
                    {
                      'text-yellow-600 ': detail.priority == 'IMPORTANT',
                      'text-red-700 ': detail.priority == 'URGENT',
                    },
                  ]"
                  >{{ detail.priority }}</span
                >
              </div>
            </div>
            <hr class="mb-4 -mx-4" />

            <div class="mb-5" v-if="detail.description">
              <div class="text-gray-400 mr-2 text-xs uppercase font-semibold">Description</div>

              <DescriptionView
                :line-clamp="4"
                :class-name="{ button: 'group-hover/item:underline' }"
              >
                <p v-html="detail.description" class="text-justify"></p>
              </DescriptionView>
            </div>
          </div>

          <div class="flex items-end">
            <div class="mt-4 flex justify-between items-end print:pb-0" v-if="detail.supervisor">
              <div class="">
                <div class="text-gray-400 mr-2 text-xs uppercase font-semibold">Supervisor:</div>
                <TaskUserChip :user="detail.supervisor" />
              </div>
            </div>
            <div
              class="ml-auto flex gap-6 items-center"
              v-if="state != 'loading' && !requirement?.status"
            >
              <button class="btn-2" @click.prevent="emit('editClick', detail)">
                <i class="fas fa-edit"></i>Edit
              </button>

              <button class="btn-2-red" @click.prevent="emit('deleteClick', detail)">
                <i class="fas fa-trash-alt"></i>Delete
              </button>
            </div>
          </div>
        </td>

        <td
          class="border-2 border-gray-700 p-3 whitespace-nowrap print:whitespace-break-spaces print:px-0"
          :rowspan="(detail?.tasks?.length || 1) + (isPrinting ? 0 : 1)"
        >
          <div class="text-center print:text-xs">
            {{
              new Date(detail.better_to_complete_on).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                weekday: 'short',
              })
            }}
          </div>
        </td>
      </template>

      <template v-if="task.id">
        <td class="border-2 border-gray-700 p-3 text-center">
          <RouterLink
            :to="{ name: 'TaskShow', params: { id: task.id } }"
            class="hover:underline text-gray-900 hover:text-blue-600 whitespace-nowrap block"
            target="_blank"
          >
            {{ task.id }}
            <i
              :title="task.status"
              :class="[
                'ml-1',
                {
                  'fad fa-exclamation-circle text-red-600': task.status == 'PENDING',
                  'fad fa-exclamation-square text-yellow-600': task.status == 'IN_PROGRESS',
                  'fad fa-check-circle text-green-600': task.status == 'COMPLETED',
                },
              ]"
            />
          </RouterLink>
        </td>
        <td class="border-2 border-gray-700 p-3">
          <div class="whitespace-nowrap text-center print:whitespace-break-spaces">
            <div v-if="task.deadline" class="print:text-xs">
              {{
                new Date(task.deadline).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  weekday: 'short',
                })
              }}
            </div>
            <div v-else class="text-gray-500">-</div>
          </div>
        </td>
      </template>
      <template v-else>
        <td colspan="2" class="border-2 border-gray-700 p-3 text-center" v-if="isPrinting">
          <button
            v-if="requirement.status == 'approved'"
            @click.prevent="handleCreateAssignButtonClick"
            class="print:hidden border-2 border-transparent group-hover/item:bg-blue-200 hover:border-blue-700 text-blue-500 hover:text-white hover:!bg-blue-500 rounded-md px-4 py-1 whitespace-nowrap"
          >
            <i class="fas fa-plus-circle"></i> Create / Assign Task
          </button>
          <div v-else-if="requirement.status == 'rejected'" class="text-red-400">Task Rejected</div>
          <div v-else class="text-blue-400">Approval Pending</div>
        </td>
      </template>
    </tr>
  </template>
  <tr v-if="!isPrinting">
    <td colspan="2" class="border-2 border-gray-700 p-3 text-center">
      <button
        v-if="requirement.status == 'approved'"
        @click.prevent="handleCreateAssignButtonClick"
        class="print:hidden border-2 border-transparent group-hover/item:bg-blue-200 hover:border-blue-700 text-blue-500 hover:text-white hover:!bg-blue-500 rounded-md px-4 py-1 whitespace-nowrap"
      >
        <i class="fas fa-plus-circle"></i> Create / Assign Task
      </button>
      <div v-else-if="requirement.status == 'rejected'" class="text-red-400">Task Rejected</div>
      <div v-else class="text-blue-400">Approval Pending</div>
    </td>
  </tr>
</template>
