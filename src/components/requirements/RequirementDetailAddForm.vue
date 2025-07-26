<script setup>
import RequiredIcon from '@/components/RequiredIcon.vue'
import { findRequirement } from '@/services/requirement'
import { addRequirementDetail } from '@/services/requirement-detail'
import { useDepartmentStore } from '@/stores/department'
import { onMounted, ref } from 'vue'
import LoaderView from '../common/LoaderView.vue'
import SelectDropdown from '../SelectDropdown.vue'
import UserChip from '../user/UserChip.vue'

const props = defineProps({
  requirementId: {
    type: [Number, String],
    required: true,
  },
})

const emit = defineEmits(['create', 'closeClick', 'error'])

const departmentStore = useDepartmentStore()
const formContainerRef = ref()
const state = ref('')
const error = ref()
const form = ref({
  title: '',
  description: '',
  priority: '',
  better_to_complete_on: '',
  supervisor_id: null,
})

const selectedSupervisor = ref(null)
const supervisors = ref([])

async function submit() {
  state.value = 'submitting'

  const payload = {
    ...form.value,
    supervisor_id: selectedSupervisor.value?.id,
  }

  console.log({ payload })

  try {
    const response = await addRequirementDetail(props.requirementId, payload)
    emit('create', response)
    state.value = 'create'
  } catch (err) {
    state.value = 'error'
    error.value = err.response?.data?.message || 'Failed to create requirement detail'
    emit('error', error.value)
  }
}

onMounted(async () => {
  const requirement = (await findRequirement(props.requirementId)).data?.requirement || {}
  supervisors.value = await departmentStore.fetchDepartmentEmployee([
    requirement.from_department_id,
  ])
})
</script>

<template>
  <div
    class="max-h-[90vh] overflow-auto w-full mx-auto bg-white shadow-lg rounded-lg p-6 pb-0 pt-0 relative"
    ref="formContainerRef"
  >
    <div class="sticky top-0 pt-4 bg-white z-10">
      <h2 class="text-2xl font-semibold text-gray-800">Add Requirement</h2>

      <hr class="mb-4" />

      <div
        class="text-purple-600/80 mb-4 text-xs border-b border-dashed"
        @click.prevent="emit('ok')"
      >
        Fields that must be filled in will be marked with an asterisk.
      </div>
    </div>

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
            v-model="selectedSupervisor"
            :options="supervisors"
            placeholder="--NO SUPERVISOR--"
            :containment="formContainerRef"
          >
            <template #option="{ option }">
              <UserChip :user="option || {}"></UserChip>
            </template>
            <template #selected-option="{ option }">
              <div v-if="option" class="relative w-full">
                <UserChip :user="option || {}"></UserChip>
                <div
                  class="absolute right-1 text-xl top-0 bottom-0 flex items-center"
                  v-if="selectedSupervisor"
                >
                  <button
                    @click.prevent="selectedSupervisor = null"
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

      <div class="sticky bottom-0 bg-white py-4 border-t -mx-6 px-6">
        <div v-if="error" class="mb-4 text-red-500 font-medium">
          {{ error }}
        </div>
        <hr v-if="error" class="mb-4" />

        <div class="flex items-center justify-between gap-4">
          <button
            type="button"
            @click.prevent="emit('closeClick')"
            class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded transition"
          >
            Cancel
          </button>
          <button
            :disabled="state == 'loading' || state == 'submitting'"
            type="submit"
            class="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded transition"
          >
            {{ state == 'submitting' ? 'Saving...' : 'Add Requirement' }}
          </button>
        </div>
      </div>
    </form>
    <LoaderView
      v-if="state === 'loading' || state === 'submitting'"
      class="z-20 absolute inset-0 flex items-center justify-center bg-opacity-30"
    />
  </div>
</template>
