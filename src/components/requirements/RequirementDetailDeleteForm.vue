<script setup>
import CompanyDepartmentSelectInput from '@/components/common/CompanyDepartmentSelectInput.vue'
import RequiredIcon from '@/components/RequiredIcon.vue'
import { addRequirement } from '@/services/requirement'
import { useCompanyStore } from '@/stores/company'
import { useTagStore } from '@/stores/tags'
import { useRequirementStore } from '@/stores/useRequirementStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import LoaderView from '../common/LoaderView.vue'
import MultiselectDropdown from '../MultiselectDropdown.vue'

const props = defineProps({
  parentTaskId: {
    type: [Number, String],
    required: true,
  },
  requirementId: {
    type: [Number, String],
  },
})

const emit = defineEmits(['taskCreated', 'closeClick', 'error'])

const store = useTaskStore()
const tagStore = useTagStore()
const companyStore = useCompanyStore()
const requirementStore = useRequirementStore()
const { requirement } = storeToRefs(requirementStore)
const task = ref()
const selectedUser = ref([])
const user_ids = computed(() => selectedUser.value.map((u) => u.id))

const state = ref('')
const selectedWebsiteTag = ref([])

const form = ref({
  from_department_id: '',
  to_department_id: '',
  website_tags: [],
})

watch(user_ids, (val) => {
  form.value.user_ids = val
})

onMounted(async () => {
  state.value = 'loading'
  tagStore.fetchTags('website')

  await companyStore.fetchCompanies({
    with: 'departments',
    ignore_permission: true,
  })
  state.value = ''
})

async function submit() {
  state.value = 'submitting'

  const payload = {
    ...form.value,
    website_tags: [selectedWebsiteTag.value.id],
  }

  console.log({ payload })

  try {
    const response = await addRequirement(payload)
    emit('create', response)
    state.value = 'create'
  } catch (err) {
    emit('error', store.error)
    state.value = 'error'
  }
}
</script>

<template>
  <div
    class="max-h-[90vh] overflow-auto max-w-2xl mx-auto bg-white shadow-lg rounded-lg p-6 pb-0 pt-0 relative"
  >
    <div class="sticky top-0 pt-4 bg-white z-10">
      <h2 class="text-2xl font-semibold text-gray-800">Add New Requirement</h2>

      <hr class="mb-4" />

      <div
        class="text-purple-600/80 mb-4 text-xs border-b border-dashed"
        @click.prevent="emit('ok')"
      >
        Fields that must be filled in will be marked with an asterisk.
      </div>
    </div>

    <form @submit.prevent="submit" class="z-0">
      <p class="text-center mt-2 mb-6" v-if="requirementId && requirement?.title">
        Task under requirement <span class="text-sky-600">{{ requirement.title }}</span>
      </p>
      <p class="text-center mt-2 mb-6" v-if="parentTaskId && task?.title">
        Sub task under <span class="text-sky-600">{{ task.title }}</span>
      </p>

      <div class="mb-4">
        <label class="text-gray-800">Websites</label>
        <MultiselectDropdown
          :options="tagStore.tags"
          v-model="selectedWebsiteTag"
          label="name"
          track-by="id"
        />
      </div>

      <template v-if="state !== 'loading' && !(parentTaskId && task?.title)">
        <CompanyDepartmentSelectInput
          v-model="form.from_department_id"
          :companies="companyStore?.companies || []"
          class="mb-4"
        >
          <template #label>
            <label class="block text-gray-600 text-sm mb1 font-medium">
              From Department <RequiredIcon />
            </label>
          </template>
        </CompanyDepartmentSelectInput>

        <CompanyDepartmentSelectInput
          v-model="form.to_department_id"
          :companies="companyStore?.companies || []"
          class="mb-4"
        >
          <template #label>
            <label class="block text-gray-600 text-sm mb-1 font-medium">
              To Department <RequiredIcon />
            </label>
          </template>
        </CompanyDepartmentSelectInput>
      </template>

      <div class="sticky bottom-0 bg-white py-4 border-t -mx-6 px-6">
        <div v-if="store.error" class="mb-4 text-red-500 font-medium">
          {{ store.error }}
        </div>
        <hr v-if="store.error" class="mb-4" />

        <div class="flex items-center justify-between gap-4">
          <button
            :disabled="state == 'loading' || state == 'submitting'"
            type="submit"
            class="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded transition"
          >
            {{ state == 'submitting' ? 'Saving...' : 'Next' }}
          </button>

          <button
            type="button"
            @click.prevent="emit('closeClick')"
            class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded transition"
          >
            Cancel
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
