<script setup>
import CompanyDepartmentSelectInput from '@/components/common/CompanyDepartmentSelectInput.vue'
import RequiredIcon from '@/components/RequiredIcon.vue'
import { uniqueId } from '@/libs/uuid'
import { addRequirement } from '@/services/requirement'
import { useCompanyStore } from '@/stores/company'
import { useTagStore } from '@/stores/tags'
import { useUserStore } from '@/stores/user'
import { onMounted, ref } from 'vue'
import AttachmentPreview from '../AttachmentPreview.vue'
import LoaderView from '../common/LoaderView.vue'
import SelectDropdown from '../SelectDropdown.vue'
import TextEditor from '../TextEditor.vue'
import TextWithHr from '../TextWithHr.vue'
import UserChip from '../user/UserChip.vue'

const emit = defineEmits(['create', 'cancelClick', 'error'])

const tagStore = useTagStore()
const userStore = useUserStore()
const companyStore = useCompanyStore()
const state = ref('')
const error = ref('')

const form = ref({
  title: '',
  description: '',
  from_department_id: '',
  to_department_id: '',
  website_tags: [],
  priority: '',
  better_to_complete_on: '',
  supervisor_id: '',
  attachments: [],
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

  await userStore.fetchTypeWiseEmployees({ type: 'academy_body,doctor,executive' })

  state.value = ''
  handleDetailAdd()
})

// handle file input
function handleFiles(event) {
  form.value.attachments = [...form.value.attachments, ...Array.from(event.target.files)]
}

function removeFile(index) {
  form.value.attachments.splice(index, 1)
}

async function submit() {
  state.value = 'submitting'

  console.log({ form: form.value })

  const payload = new FormData()
  for (const key in form.value) {
    if (key === 'attachments') {
      form.value.attachments.forEach((file) => payload.append('attachments[]', file))
    } else if (key == 'website_tags') {
      if (Array.isArray(form.value[key])) {
        form.value[key].forEach((tag) => payload.append('website_tags[]', tag))
      }
    } else {
      payload.append(key, form.value[key])
    }
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

function handleDetailAdd() {
  form.value.details = [
    ...form.value.details,
    {
      uuid: uniqueId(),
      title: '',
      description: '',
      priority: '',
      better_to_complete_on: '',
      supervisor_id: '',
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
          <label class="text-gray-800 text-sm">Websites</label>
          <SelectDropdown
            :options="tagStore.tags"
            v-model="form.website_tags"
            taggable
            label="name"
            value="name"
          />
        </div>
      </template>

      <div class="col-span-full">
        <div class="mb-4 mt-5">
          <TextWithHr class="mb-5">
            <h3 class="font-semibold text-xl text-gray-800 mx-2">Requirement details</h3>
          </TextWithHr>

          <table class="w-full table-auto print:table-fixed mt-8">
            <thead>
              <tr>
                <!-- <th
                  class="border-2 border-gray-800 text-left px-4 text-gray-800 print:text-black text-xl font-semibold whitespace-nowrap w-[5%]"
                >
                  SL
                </th> -->
                <th
                  class="border-2 border-gray-800 text-center text-gray-800 print:text-black text-base font-semibold whitespace-nowrap w-[65%]"
                >
                  Requirement
                </th>
                <th
                  class="border-2 border-gray-800 text-center text-gray-800 print:text-black text-base px-3 font-semibold whitespace-nowrap print:whitespace-normal print:p-0 w-[15%]"
                >
                  Options
                </th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td
                  class="border-2 border-gray-800 px-2 pb-2 pt-8 text-gray-800 print:text-black text-base whitespace-nowrap"
                >
                  <div class="mb-4">
                    <label class="block text-gray-600 text-sm mb-1 font-medium">
                      Title <RequiredIcon />
                    </label>
                    <input
                      v-model="form.title"
                      required
                      placeholder="Enter Requirement title"
                      class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div class="">
                    <label class="block text-gray-600 text-sm mb-1 font-medium">Description</label>

                    <TextEditor v-model="form.description" class="w-full" />
                  </div>

                  <div class="mt-4">
                    <label class="block text-gray-600 text-sm mb-1 font-medium">Attachments</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      name="attachments"
                      @change="handleFiles"
                    />
                  </div>
                  <AttachmentPreview :files="form?.attachments || []" @remove="removeFile" />

                  <div class="flex items-center justify-between h-full"></div>
                </td>
                <td
                  class="border-2 border-gray-800 text-gray-800 print:text-black text-base px-3 whitespace-nowrap print:whitespace-normal print:p-0"
                >
                  <div class="mb-4">
                    <label class="block text-gray-600 text-sm mb-1 font-medium"
                      >Better to Complete
                    </label>
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
                        <UserChip
                          :user="option || {}"
                          class="w-full overflow-hidden border relative"
                        >
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

              <!--
              <RequirementFormDetailItem
                :serial="1"
                :uuid="requirementDetail.uuid"
                :from-department-id="form.from_department_id"
                @update="(updatedDetail) => handleDetailUpdate(updatedDetail)"
              />
              -->
            </tbody>
          </table>
        </div>

        <!--
        <div class="mb-4 rounded-md flex items-center justify-center">
          <button
            class="btn-icon flex justify-center items-center"
            @click.prevent="() => handleDetailAdd()"
          >
            <i class="fad fa-plus-circle text-2xl"></i>
          </button>
        </div>
        -->

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
