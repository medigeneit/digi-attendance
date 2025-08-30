<script setup>
import { ref } from 'vue'
import TaskUserChip from '../tasks/TaskUserChip.vue'

const props = defineProps({
  detail: { type: Object },
  serial: { type: Number },
})

const emit = defineEmits(['editClick', 'deleteClick', 'taskCreateClick'])

const descriptionLineClampClass = ref('line-clamp-2')

function handleShowMoreClick() {
  descriptionLineClampClass.value = descriptionLineClampClass.value ? '' : 'line-clamp-2'
}
</script>
<template>
  <tr class="group/item border text-gray-800 py-4 shadow-sm mb-4 px-4 rounded-md hover:bg-blue-50">
    <td class="border-2 border-gray-700 p-3 align-top">
      <span class="text-2xl font-medium">{{ serial }}</span>
    </td>

    <td class="border-2 border-gray-700 p-3">
      <div>
        <div class="text-lg font-semibold mb-2">
          <span>{{ detail.title }}</span>
        </div>
        <hr class="mb-4 -mx-4" />
        <div class="mb-5">
          <div class="text-gray-400 mr-2 text-xs uppercase font-semibold">Description</div>
          <div class="text-justify">
            <p
              class="print:line-clamp-none"
              :class="descriptionLineClampClass"
              v-html="detail.description"
            ></p>
            <button
              class="text-blue-500 group-hover/item:underline hover:text-sky-400 ml-auto text-sm print:hidden"
              @click.prevent="handleShowMoreClick"
            >
              {{ descriptionLineClampClass ? 'Show More' : 'Show Less' }}
            </button>
          </div>
        </div>
      </div>

      <div class="flex items-end">
        <div>
          <div class="flex items-center gap-1 mb-3">
            <span class="text-gray-400 mr-2 text-xs uppercase font-semibold">Supervisor:</span>
            <TaskUserChip v-if="detail.supervisor" :user="detail.supervisor" />
          </div>
          <div>
            <span class="text-gray-500 mr-2 text-xs uppercase font-semibold">Priority:</span>
            <span class="text-blue-400 font-semibold">{{ detail.priority }}</span>
          </div>
        </div>

        <div class="ml-auto flex gap-6 items-center">
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
      class="border-2 border-gray-700 p-3 whitespace-nowrap print:whitespace-break-spaces print:px-0 text-center"
    >
      <div>
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

    <template v-if="detail?.tasks?.length > 0">
      <td class="border-2 border-gray-700 p-3 text-center">
        <RouterLink
          v-for="task in detail?.tasks || []"
          :key="task.id"
          :to="{ name: 'TaskShow', params: { id: task.id } }"
          class="hover:underline text-gray-900 hover:text-blue-600 whitespace-nowrap block"
          target="_blank"
        >
          {{ task.id }}
        </RouterLink>
      </td>
      <td class="border-2 border-gray-700 p-3">
        <div
          v-for="task in detail?.tasks || []"
          :key="task.id"
          class="whitespace-nowrap text-center print:whitespace-break-spaces"
        >
          <div v-if="task.deadline">
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
      <td colspan="2" class="border-2 border-gray-700 p-3 text-center">
        <button
          @click.prevent="emit('taskCreateClick', detail)"
          class="print:hidden hover:border-2 group-hover/item:bg-blue-200 hover:border-blue-700 text-blue-500 hover:text-white hover:!bg-blue-500 rounded-md px-4 py-1"
        >
          Create Task
        </button>
      </td>
    </template>
  </tr>
</template>
