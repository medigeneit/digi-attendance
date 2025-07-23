<script setup>
import TaskUserChip from '../tasks/TaskUserChip.vue'

const props = defineProps({
  detail: { type: Object },
  serial: { type: Number },
})

const emit = defineEmits(['editClick', 'deleteClick'])
</script>
<template>
  <tr class="border text-gray-800 py-4 shadow-sm mb-4 px-4 rounded-md hover:bg-blue-50">
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
          <p class="text-justify line-clamp-2">
            {{ detail.description }}
          </p>
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

    <td class="border-2 border-gray-700 p-3 whitespace-nowrap text-center">
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

    <td class="border-2 border-gray-700 p-3"></td>
    <td class="border-2 border-gray-700 p-3"></td>
  </tr>
</template>
