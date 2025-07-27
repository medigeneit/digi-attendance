<script setup>
import CompanyDepartmentSelectInput from '@/components/common/CompanyDepartmentSelectInput.vue'
import RequiredIcon from '@/components/RequiredIcon.vue'
import { uniqueId } from '@/libs/uuid'
import { addRequirement } from '@/services/requirement'
import { useCompanyStore } from '@/stores/company'
import { useTagStore } from '@/stores/tags'
import { onMounted, ref } from 'vue'
import LoaderView from '../common/LoaderView.vue'
import SelectDropdown from '../SelectDropdown.vue'
import TextWithHr from '../TextWithHr.vue'
import RequirementFormDetailItem from './RequirementFormDetailItem.vue'

const emit = defineEmits(['create', 'cancelClick', 'error'])

const tagStore = useTagStore()
const companyStore = useCompanyStore()
const state = ref('')
const error = ref('')

const form = ref({
  from_department_id: '',
  to_department_id: '',
  website_tags: [],
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

  handleDetailAdd()
})

async function submit() {
  state.value = 'submitting'

  const payload = {
    ...form.value,
  }

  try {
    const response = await addRequirement(payload)
    emit('create', response)
    state.value = 'create'
  } catch (err) {
    emit('error', err.response?.data?.message)
    error.value = err.response?.data?.message
    state.value = 'error'
  }
}

function handleDetailUpdate(uuid, detailData) {
  form.value.details = form.value.details.map((detail) => {
    if (detail.uuid === uuid) {
      console.log({ uuid })
      return { ...detail, ...detailData }
    }

    return {
      ...detail,
    }
  })
}

function handleDetailRemove(uuid) {
  form.value.details = form.value.details.filter((detail) => {
    return detail.uuid !== uuid
  })
}

function handleDetailAdd() {
  form.value.details = [
    ...form.value.details,
    {
      uuid: uniqueId(),
      title: '',
      description: '',
      priority: '',
      better_to_complete_on: '',
      supervisor_id: '4',
    },
  ]
}
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
    <form @submit.prevent="submit" class="z-0 grid grid-cols-8 gap-4">
      <template v-if="state !== 'loading' && state !== 'submitting'">
        <CompanyDepartmentSelectInput
          v-model="form.from_department_id"
          :companies="companyStore?.myCompanies || []"
          class="mb-4 col-span-2"
          :className="{ select: 'h-10' }"
        >
          <template #label>
            <label class="block text-gray-600 text-sm mb-1 font-medium">
              From <RequiredIcon />
            </label>
          </template>
        </CompanyDepartmentSelectInput>

        <CompanyDepartmentSelectInput
          v-model="form.to_department_id"
          :companies="companyStore?.companies || []"
          class="mb-4 col-span-2"
          :className="{ select: 'h-10' }"
        >
          <template #label>
            <label class="block text-gray-600 text-sm mb-1 font-medium">
              To <RequiredIcon />
            </label>
          </template>
        </CompanyDepartmentSelectInput>

        <div class="mb-4 col-span-4">
          <label class="text-gray-800">Websites</label>
          <SelectDropdown
            :options="tagStore.tags"
            v-model="form.website_tags"
            taggable
            label="name"
            value="name"
            class="min-h-10"
          />
        </div>
      </template>

      <div class="col-span-full">
        <div class="mb-8 mt-10">
          <TextWithHr class="mb-5">
            <h3 class="font-semibold text-xl text-gray-800 mx-2">Requirement details</h3>
          </TextWithHr>

          <table class="w-full table-auto print:table-fixed mt-8">
            <thead>
              <tr>
                <th
                  class="border-2 border-gray-800 text-left px-4 text-gray-800 print:text-black text-xl font-semibold whitespace-nowrap w-[5%]"
                >
                  SL
                </th>
                <th
                  class="border-2 border-gray-800 text-center text-gray-800 print:text-black text-base font-semibold whitespace-nowrap w-[65%]"
                >
                  Requirement Details
                </th>
                <th
                  class="border-2 border-gray-800 text-center text-gray-800 print:text-black text-base px-3 font-semibold whitespace-nowrap print:whitespace-normal print:p-0 w-[15%]"
                >
                  Better To Complete
                </th>
              </tr>
            </thead>

            <tbody>
              <template v-for="(detail, index) in form?.details || []" :key="detail.uuid">
                <RequirementFormDetailItem
                  :serial="index + 1"
                  :uuid="detail.uuid"
                  :from-department-id="form.from_department_id"
                  @update="(updatedDetail) => handleDetailUpdate(detail.uuid, updatedDetail)"
                  @removeClick="(uuid) => handleDetailRemove(uuid)"
                />
              </template>
            </tbody>
          </table>
        </div>
        <div class="mb-8 border rounded-md p-8 flex items-center justify-center bg-gray-50">
          <button class="btn-2 pl-2 text-base" @click.prevent="() => handleDetailAdd()">
            <i class="fad fa-plus-circle text-2xl mr-2"></i>Add Requirement
          </button>
        </div>

        <div class="sticky bottom-0 bg-white py-4 border-t -mx-6 px-6">
          <div v-if="error" class="mb-4 text-red-500 font-medium">
            {{ error }}
          </div>
          <hr v-if="error" class="mb-4" />

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
      </div>
    </form>
    <LoaderView
      v-if="state === 'loading' || state === 'submitting'"
      class="z-20 absolute inset-0 flex items-center justify-center bg-opacity-30"
    />
  </div>
</template>
