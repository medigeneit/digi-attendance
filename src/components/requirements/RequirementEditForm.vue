<script setup>
import CompanyDepartmentSelectInput from '@/components/common/CompanyDepartmentSelectInput.vue'
import RequiredIcon from '@/components/RequiredIcon.vue'
import { findRequirement, updateRequirement } from '@/services/requirement'
import { useCompanyStore } from '@/stores/company'
import { useTagStore } from '@/stores/tags'
import { computed, onMounted, ref, watch } from 'vue'
import LoaderView from '../common/LoaderView.vue'
import SelectDropdown from '../SelectDropdown.vue'

const props = defineProps({
  requirementId: {
    type: [Number, String],
  },
})

const emit = defineEmits(['update', 'cancelClick', 'error'])

const tagStore = useTagStore()
const companyStore = useCompanyStore()
const state = ref('')
const requirement = ref()
const error = ref('')
const containerRef = ref()

const form = ref({
  from_department_id: '',
  to_department_id: '',
  website_tags: [],
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

  requirement.value = (await findRequirement(props.requirementId)).data?.requirement

  state.value = ''
})

watch(requirement, function (fetchedRequirement) {
  if (fetchedRequirement) {
    form.value.title = fetchedRequirement.title
    form.value.description = fetchedRequirement.description
    form.value.from_department_id = fetchedRequirement.from_department_id
    form.value.to_department_id = fetchedRequirement.to_department_id

    if (
      Array.isArray(fetchedRequirement?.website_tags) &&
      fetchedRequirement.website_tags?.length > 0
    ) {
      form.value.website_tags = fetchedRequirement.website_tags.map((tag) => tag.name)
    }
  }
})

async function submit() {
  state.value = 'submitting'

  const payload = {
    ...form.value,
  }

  console.log({ payload })

  try {
    const response = await updateRequirement(props.requirementId, payload)
    emit('update', response)
    state.value = 'created'
    error.value = response?.data?.message
  } catch (err) {
    emit('error', err?.response?.data)
    error.value = err?.response?.data?.message
    state.value = 'error'
  }
}

const hasAccessOnMyCompanyDepartment = computed(() => {
  for (let companyIndex in companyStore.myCompanies) {
    const companyDepartments = companyStore?.myCompanies?.[companyIndex]?.departments || []

    if (companyDepartments.some((department) => department.id == form.value.from_department_id)) {
      return true
    }
  }

  return false

  // return form.value.from_department_id
})
</script>

<template>
  <div
    ref="containerRef"
    class="max-w-2xl mx-auto bg-white shadow-lg rounded-lg p-6 pb-0 pt-0 relative"
  >
    <div class="sticky top-0 pt-4 bg-white z-10">
      <h2 class="text-2xl font-semibold text-gray-800">Edit Requirement</h2>

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
        <div class="mb-4">
          <label class="text-gray-800">Title</label>
          <input
            v-model="form.title"
            required
            placeholder="Ender Requirement detail title"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div class="mb-4">
          <label class="text-gray-800">Description</label>
          <textarea
            v-model="form.description"
            placeholder="Ender Requirement detail title"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div class="mb-4">
          <label class="text-gray-800">Websites</label>

          <SelectDropdown
            :options="tagStore.tags"
            v-model="form.website_tags"
            taggable
            label="name"
            value="name"
            class="py-2"
          />
        </div>

        <!-- <pre>{{ hasAccessOnMyCompanyDepartment }}</pre> -->

        <div v-if="!hasAccessOnMyCompanyDepartment" class="mb-4">
          <label class="block text-gray-600 text-sm mb1 font-medium"> From Department </label>
          <div class="border rounded px-2 py-1 text-gray-600 bg-gray-50">
            {{ requirement?.from_department?.name }}
          </div>
        </div>

        <CompanyDepartmentSelectInput
          v-else
          v-model="form.from_department_id"
          :companies="companyStore?.myCompanies || []"
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
        <div
          v-if="error"
          class="mb-4 font-medium text-center"
          :class="{ 'text-red-500': state == 'error', 'text-green-500': state == 'created' }"
        >
          {{ error }}
        </div>

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
