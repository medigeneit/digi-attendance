<script setup>
import RequiredIcon from '@/components/RequiredIcon.vue'
import { useDepartmentStore } from '@/stores/department'
import { useUserStore } from '@/stores/user'
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

const userStore = useUserStore()

const form = ref({
  title: '',
  description: '',
  priority: '',
  better_to_complete_on: '',
  supervisor_id: '',
})

onMounted(async () => {
  // supervisors.value = await departmentStore.fetchDepartmentEmployee([props.fromDepartmentId])
  await userStore.fetchTypeWiseEmployees({ type: 'academy_body,doctor,executive' })
})

const handleRemoveClick = () => {
  confirm('Are you sure?') ? emit('removeClick', props.uuid) : null
}

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
      <button type="button" @click.prevent="handleRemoveClick" class="btn-2-red mt-8">
        Remove
      </button>
    </td>
    <td
      class="border-2 border-gray-800 px-2 pb-2 pt-8 text-gray-800 print:text-black text-base whitespace-nowrap"
    >
      <div class="mb-4">
        <label class="block text-gray-600 text-sm mb-1 font-medium"> Title <RequiredIcon /> </label>
        <input
          v-model="form.title"
          required
          placeholder="Ender Requirement detail title"
          class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="">
        <label class="block text-gray-600 text-sm mb-1 font-medium">Description</label>
        <textarea
          rows="5"
          v-model="form.description"
          placeholder="Enter Requirement description"
          class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        ></textarea>
      </div>

      <div class="flex items-center justify-between h-full"></div>

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
      class="border-2 border-gray-800 text-gray-800 print:text-black text-base px-3 whitespace-nowrap print:whitespace-normal print:p-0"
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

      <div class="mb-4">
        <label class="block text-gray-600 text-sm mb-1 font-medium">Supervisor </label>
        <SelectDropdown
          v-model="form.supervisor_id"
          :options="userStore.users"
          placeholder="--NO SUPERVISOR--"
          class="h-10 w-full"
          clearable
        >
          <template #option="{ option }">
            <UserChip :user="option || {}" class="w-full overflow-hidden border relative">
            </UserChip>
          </template>

          <template #selected-option="{ option }">
            <UserChip :user="option || {}" v-if="option"></UserChip>
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
    </td>
  </tr>
</template>
