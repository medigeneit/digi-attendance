<script setup>
import RequiredIcon from '@/components/RequiredIcon.vue'
import { useUserStore } from '@/stores/user'
import { onMounted, ref, watch } from 'vue'
import SelectDropdown from '../SelectDropdown.vue'
import TextEditor from '../TextEditor.vue'
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

        <TextEditor v-model="form.description" class="w-full" />
      </div>

      <div class="flex items-center justify-between h-full"></div>
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
