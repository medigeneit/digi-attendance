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
})

const emit = defineEmits(['update', 'onRemoveClick'])

const departmentStore = useDepartmentStore()
const state = ref('')
const form = ref({
  title: '',
  description: '',
  priority: '',
  better_to_complete_on: '',
  supervisor_id: '',
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
    emit('update', updatedData)
  },
)
</script>

<template>
  <div>
    <form @submit.prevent="submit" class="z-0">
      <template v-if="state !== 'loading'">
        <div class="mb-4">
          <label class="block text-gray-600 text-sm mb-1 font-medium"
            >Title <RequiredIcon />
          </label>
          <input
            v-model="form.title"
            required
            placeholder="EnderRequirement detail title"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="mb-4">
          <label class="block text-gray-600 text-sm mb-1 font-medium">Details</label>
          <textarea
            rows="10"
            v-model="form.description"
            placeholder="Enter requirement description"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          ></textarea>
        </div>

        <div class="mb-4">
          <label class="block text-gray-600 text-sm mb-1 font-medium">Supervisor</label>

          <SelectDropdown
            v-model="form.supervisor_id"
            :options="supervisors"
            placeholder="--NO SUPERVISOR--"
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

        <div class="mb-4">
          <label class="block text-gray-600 text-sm mb-1 font-medium">Priority </label>
          <select
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            v-model="form.priority"
          >
            <option value="">NORMAL</option>
            <option>IMPORTANT</option>
            <option>URGENT</option>
          </select>
        </div>

        <div class="mb-4">
          <label class="block text-gray-600 text-sm mb-1 font-medium">Better to Complete </label>
          <input
            type="date"
            v-model="form.better_to_complete_on"
            placeholder="EnderRequirement detail title"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </template>

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
    </form>
  </div>
</template>
