<script setup>
import RequiredIcon from '@/components/RequiredIcon.vue'
import { useDepartmentStore } from '@/stores/department'
import { onMounted, ref, watch } from 'vue'
import SelectDropdown from '../SelectDropdown.vue'
import UserChip from '../user/UserChip.vue'

const props = defineProps({
  fromDepartmentId: {
    type: [Number, String],
    required: true,
  },
  serial: {
    type: Number,
    required: true,
  },
  uuid: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update', 'removeClick'])

const departmentStore = useDepartmentStore()

const form = ref({
  title: '',
  description: '',
  priority: '',
  better_to_complete_on: '',
  supervisor_id: '4',
})

const supervisors = ref([])

onMounted(async () => {
  supervisors.value = await departmentStore.fetchDepartmentEmployee([props.fromDepartmentId])
})

watch(
  () => props.fromDepartmentId,
  async () => {
    supervisors.value = await departmentStore.fetchDepartmentEmployee([props.fromDepartmentId])
  },
)

watch(
  () => ({ ...form.value }),
  (updatedData) => {
    emit('update', { ...updatedData, uuid: props.uuid })
  },
)
</script>

<template>
  <tr>
    <td
      class="border-2 border-gray-800 text-left px-4 py-4 text-gray-800 print:text-black align-top"
    >
      <div class="font-semibold whitespace-nowrap text-2xl">
        {{ props.serial }}
      </div>
      <button type="button" @click.prevent="emit('removeClick', uuid)" class="btn-2-red mt-8">
        Remove
      </button>
    </td>
    <td
      class="border-2 border-gray-800 px-2 py-8 text-gray-800 print:text-black text-base whitespace-nowrap"
    >
      <div class="mb-4">
        <label class="block text-gray-600 text-sm mb-1 font-medium"> Title <RequiredIcon /> </label>
        <input
          v-model="form.title"
          required
          placeholder="EnderRequirement detail title"
          class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="mb-4">
        <label class="block text-gray-600 text-sm mb-1 font-medium">Description</label>
        <textarea
          rows="3"
          v-model="form.description"
          placeholder="Enter requirement description"
          class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        ></textarea>
      </div>

      <div class="flex items-center justify-between h-full">
        <div class="max-w-xs w-full h-full">
          <label class="block text-gray-600 text-sm mb-1 font-medium">Supervisor </label>
          <SelectDropdown
            v-model="form.supervisor_id"
            :options="supervisors"
            placeholder="--NO SUPERVISOR--"
            class="h-10"
          >
            <template #option="{ option }">
              <UserChip :user="option || {}"></UserChip>
            </template>
            <template #selected-option="{ option }">
              <div v-if="option" class="relative w-full">
                <UserChip :user="option || {}"></UserChip>
                <div
                  class="absolute right-1 text-xl top-0 bottom-0 flex items-center"
                  v-if="form.supervisor_id"
                >
                  <button
                    @click.prevent="form.supervisor_id = null"
                    class="text-gray-6 font-semibold 00 hover:text-red-700"
                  >
                    &times;
                  </button>
                </div>
              </div>
            </template>
          </SelectDropdown>
        </div>

        <div>
          <label class="block text-gray-600 text-sm mb-1 font-medium">Priority </label>
          <select
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 h-10"
            v-model="form.priority"
          >
            <option value="">NORMAL</option>
            <option>IMPORTANT</option>
            <option>URGENT</option>
          </select>
        </div>
      </div>

      <!-- <div class="bg-white py-4 border-t -mx-6 px-6">
        <div class="flex items-center justify-between gap-4">
          <button
            type="button"
            @click.prevent="emit('onRemoveClick')"
            class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded transition"
          >
            Remove
          </button>
        </div>
      </div> -->
    </td>
    <td
      class="border-2 border-gray-800 text-center text-gray-800 print:text-black text-base px-3 whitespace-nowrap print:whitespace-normal print:p-0"
    >
      <div class="mb-4">
        <label class="block text-gray-600 text-sm mb-1 font-medium">Better to Complete </label>
        <input
          type="date"
          v-model="form.better_to_complete_on"
          placeholder="EnderRequirement detail title"
          class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </td>
  </tr>
</template>
