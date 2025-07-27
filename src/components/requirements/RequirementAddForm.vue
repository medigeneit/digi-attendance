<script setup>
import CompanyDepartmentSelectInput from '@/components/common/CompanyDepartmentSelectInput.vue'
import RequiredIcon from '@/components/RequiredIcon.vue'
import { addRequirement } from '@/services/requirement'
import { useCompanyStore } from '@/stores/company'
import { useTagStore } from '@/stores/tags'
import { useTaskStore } from '@/stores/useTaskStore'
import { onMounted, ref } from 'vue'
import LoaderView from '../common/LoaderView.vue'
import SelectDropdown from '../SelectDropdown.vue'
import RequirementFormDetailItem from './RequirementFormDetailItem.vue'

const emit = defineEmits(['create', 'cancelClick', 'error'])

const store = useTaskStore()
const tagStore = useTagStore()
const companyStore = useCompanyStore()
const state = ref('')
const selectedWebsiteTags = ref([])

const form = ref({
  from_department_id: '1',
  to_department_id: '',
  website_tags: [1, 4],
  details: [],
})

onMounted(async () => {
  state.value = 'loading'
  tagStore.fetchTags('website')

  await companyStore.fetchCompanies({
    with: 'departments',
    ignore_permission: true,
  })

  await companyStore.fetchMyCompanies({
    with: 'departments',
  })
  state.value = ''
})

async function submit() {
  state.value = 'submitting'

  const payload = {
    ...form.value,
    ...(selectedWebsiteTags.value && Array.isArray(selectedWebsiteTags.value)
      ? {
          website_tags: selectedWebsiteTags.value.map((tag) => tag.id),
        }
      : {}),
  }

  try {
    const response = await addRequirement(payload)
    emit('create', response)
    state.value = 'create'
  } catch (err) {
    emit('error', store.error)
    state.value = 'error'
  }
}

function handleDetailUpdate(detailData) {
  console.log({ detailData })
}

const testingTags = ref(['India', 'Pakistan', 'Nepal', 'Japan'])
</script>

<template>
  <div class="w-full mx-auto bg-white shadow-lg rounded-lg p-6 pb-0 pt-0 relative">
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
      <template v-if="state !== 'loading' && state !== 'submitting'">
        <CompanyDepartmentSelectInput
          v-model="form.from_department_id"
          :companies="companyStore?.myCompanies || []"
          class="mb-4"
        >
          <template #label>
            <label class="block text-gray-600 text-sm mb1 font-medium">
              From <RequiredIcon />
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
              To <RequiredIcon />
            </label>
          </template>
        </CompanyDepartmentSelectInput>

        <div class="mb-4">
          <label class="text-gray-800">Websites {{ form.website_tags }}</label>
          <SelectDropdown
            :options="tagStore.tags"
            v-model="form.website_tags"
            multiple
            label="name"
            value="id"
          />
        </div>

        <div class="mb-4">
          <label class="text-gray-800">Tags {{ testingTags }}</label>

          <SelectDropdown
            :options="tagStore.tags"
            v-model="testingTags"
            taggable
            label="name"
            value="name"
          />
        </div>
      </template>

      <div class="mb-8">
        <h3 class="font-semibold text-xl">Requirement details</h3>
        <hr class="mb-2" />

        <div>dsdf</div>
        <RequirementFormDetailItem
          :from-department-id="form.from_department_id"
          @update="handleDetailUpdate"
        />
      </div>

      <div class="sticky bottom-0 bg-white py-4 border-t -mx-6 px-6">
        <div v-if="store.error" class="mb-4 text-red-500 font-medium">
          {{ store.error }}
        </div>
        <hr v-if="store.error" class="mb-4" />

        <div class="flex items-center justify-between gap-4">
          <button
            type="button"
            @click.prevent="emit('cancelClick')"
            class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded transition"
          >
            Cancel
          </button>

          <button
            :disabled="state == 'loading' || state == 'submitting'"
            type="submit"
            class="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded transition"
          >
            {{ state == 'submitting' ? 'Saving...' : 'Save' }}
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
