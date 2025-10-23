ii
<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import OverlyModal from '@/components/common/OverlyModal.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import DescriptionView from '@/components/DescriptionView.vue'
import RequirementDetailAddForm from '@/components/requirements/RequirementDetailAddForm.vue'
import RequirementDetailDeleteForm from '@/components/requirements/RequirementDetailDeleteForm.vue'
import RequirementDetailEditForm from '@/components/requirements/RequirementDetailEditForm.vue'
import RequirementDetailTableRow from '@/components/requirements/RequirementDetailTableRow.vue'
import RequirementFeedbackEditForm from '@/components/requirements/RequirementFeedbackEditForm.vue'
import RequirementSubmissionHandler from '@/components/requirements/RequirementSubmissionHandler.vue'
import RequirementTaskCreateOrAssign from '@/components/requirements/RequirementTaskCreateOrAssign.vue'
import TaskAddForm from '@/components/tasks/TaskAddForm.vue'
import { findRequirement } from '@/services/requirement'
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RequirementApprovalItem from './RequirementApprovalItem.vue'

const route = useRoute()
const router = useRouter()
const state = ref('')

const requirement = ref(null)
const detailAddForm = reactive({
  open: false,
})
const detailEditForm = reactive({
  detail: null,
  open: false,
})

const feedbackEditForm = reactive({
  detail: null,
  open: false,
})

const detailDeleteForm = reactive({
  detail: null,
  open: false,
})

const isPrinting = ref(false)

const beforePrint = () => (isPrinting.value = true)
const afterPrint = () => (isPrinting.value = false)

onMounted(async () => {
  await fetchRequirement()
  window.addEventListener('beforeprint', beforePrint)
  window.addEventListener('afterprint', afterPrint)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeprint', beforePrint)
  window.removeEventListener('afterprint', afterPrint)
})
async function fetchRequirement() {
  state.value = 'loading'
  requirement.value = (await findRequirement(route.params.id)).data?.requirement
  state.value = ''
}

function goToTaskAdd(detail) {
  //router.push({ name: 'TaskAdd' })

  console.log({ detail })
  addFormData.modalShown = true
  addFormData.from_department_id = requirement.value.from_department_id
  addFormData.to_department_id = requirement.value.to_department_id

  addFormData.taskDefaultValues = {
    title: '',
    description: '',
    from_department_id: requirement.value.from_department_id,
    to_department_id: requirement.value.to_department_id,
    is_important: detail?.priority == 'IMPORTANT',
    is_urgent: detail?.priority == 'URGENT',
    supervisor_ids: detail?.supervisor_id ? [detail?.supervisor_id] : [],
  }
  addFormData.requirementDetail = detail
}

function handleAddRequirementDetail() {
  detailAddForm.open = true
}

function handleEditRequirementDetail(detail) {
  detailEditForm.open = true
  detailEditForm.detail = detail
}

function handleDeleteRequirementDetail(detail) {
  detailDeleteForm.open = true
  detailDeleteForm.detail = detail
}

function handlePrint() {
  setTimeout(() => window.print())
  isPrinting.value = true
}

const addFormData = reactive({
  parentId: null,
  modalShown: false,
  requirementId: 0,
  taskDefaultValues: {},
  requirementDetail: null,
  creating: false,
})

async function handleTaskUpdate() {
  addFormData.parentId = 0
  addFormData.parentId = null
  addFormData.modalShown = false
  addFormData.requirementDetail = null
  state.value = 'loading'
  await fetchRequirement()
}

async function handleTaskAddClose() {
  addFormData.parentId = null
  addFormData.modalShown = false
  addFormData.requirementDetail = null
  addFormData.creating = false
}
</script>
<template>
  <div class="container mx-auto p-6 print:p-0 w-full print:max-w-full">
    <OverlyModal v-if="detailAddForm.open" class="*:max-w-4xl">
      <RequirementDetailAddForm
        :requirementId="requirement.id"
        @closeClick="detailAddForm.open = false"
        @create="
          async () => {
            detailAddForm.open = false
            await fetchRequirement()
          }
        "
      />
    </OverlyModal>

    <OverlyModal v-if="detailEditForm.open">
      <RequirementDetailEditForm
        :requirementId="requirement.id"
        :detailId="detailEditForm.detail?.id"
        @closeClick="detailEditForm.open = false"
        @update="
          async () => {
            detailEditForm.open = false
            await fetchRequirement()
          }
        "
      />
    </OverlyModal>

    <OverlyModal v-if="feedbackEditForm.open">
      <RequirementFeedbackEditForm
        :requirementId="requirement.id"
        :detailId="feedbackEditForm.detail?.id"
        @closeClick="feedbackEditForm.open = false"
        @update="
          async () => {
            feedbackEditForm.open = false
            await fetchRequirement()
          }
        "
      />
    </OverlyModal>

    <OverlyModal v-if="detailDeleteForm.open">
      <RequirementDetailDeleteForm
        :requirementId="requirement.id"
        :detailId="detailDeleteForm.detail?.id"
        @closeClick="detailDeleteForm.open = false"
        @delete="
          async () => {
            detailDeleteForm.open = false
            await fetchRequirement()
          }
        "
      />
    </OverlyModal>

    <OverlyModal v-if="addFormData.modalShown" class="*:relative">
      <button
        @click.prevent="handleTaskAddClose"
        class="absolute right-3 top-2 text-xl text-red-500 hover:text-red-400"
      >
        <i class="fas fa-times-circle"></i>
      </button>

      <RequirementTaskCreateOrAssign
        v-if="!addFormData?.creating"
        :from-department-id="requirement?.from_department_id"
        :requirementDetail="addFormData?.requirementDetail"
        @cancelClick="handleTaskAddClose"
        @addNewTaskClick="
          () => {
            addFormData.modalShown = true
            addFormData.creating = true
          }
        "
        @assignTask="handleTaskUpdate"
      >
      </RequirementTaskCreateOrAssign>

      <TaskAddForm
        v-if="addFormData?.creating"
        :requirementDetailId="addFormData?.requirementDetail?.id"
        :requirementId="requirement.id"
        @close="handleTaskAddClose"
        @taskCreated="handleTaskUpdate"
        :defaultValues="addFormData.taskDefaultValues"
        :readonlyFields="{
          from_department_id: true,
          to_department_id: true,
        }"
      />
    </OverlyModal>

    <div class="bg-white rounded shadow print:shadow-none p-4 print:p-0 relative mb-6 print:mb-0">
      <div class="flex items-start">
        <div class="mb-4 text-lg print:black print:font-bold">
          <div class="text-gray-800 leading-none">To</div>
          <div>
            {{ requirement?.to_department?.name }}
          </div>
        </div>
        <div class="ml-auto print:hidden flex gap-2 items-center">
          <button
            class="btn-3 font-semibold !pl-2 !pr-4"
            v-if="(requirement?.details || []).length > 0"
            @click.prevent="handlePrint"
          >
            <i class="fad fa-print text-xl"></i>Print
          </button>
          <button class="btn-3" @click.prevent="() => router.back()">Back</button>
          <RouterLink class="btn-2" :to="`/requirements/edit/${requirement?.id}`">Edit</RouterLink>
        </div>
      </div>

      <div class="text-center text-xl font-bold mb-2 underline">Requirement Form</div>
      <div class="mb-4 flex items-center gap-1 print:mb-1">
        <div class="text-gray-500 text-sm">Requirement ID:</div>
        <div class="font-bold print:text-gray-900">
          {{ requirement?.id }}
        </div>
      </div>

      <div class="mb-3 flex items-center gap-3 print:mb-1">
        <div class="text-gray-500 text-sm">From</div>
        <div class="print:text-gray-900">
          {{ requirement?.from_department?.name }}
        </div>
      </div>

      <div
        class="mb-3 flex items-center gap-3 print:mb-1"
        v-if="requirement?.website_tags?.length > 0"
      >
        <div class="text-gray-500 text-sm">Website</div>

        <div class="flex items-center gap-2 print:text-gray-900 flex-wrap">
          <div
            v-for="website_tag in requirement?.website_tags || []"
            :key="website_tag.id"
            class="border px-2 rounded-md bg-gray-50 shadow-sm whitespace-nowrap"
          >
            {{ website_tag.name }}
          </div>
        </div>
      </div>

      <div class="mb-3 flex items-center gap-3 print:mb-1" v-if="requirement?.submission_date">
        <div class="text-gray-500 text-sm">Submission Date</div>
        <div class="print:text-gray-900">
          {{
            new Date(requirement?.submission_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          }}
        </div>
      </div>

      <hr class="mb-4" />

      <div>
        <div class="flex items-end mb-3">
          <h2 class="text-xl font-semibold">Requirements</h2>
          <div class="ml-auto print:hidden flex gap-2 text-sm"></div>
        </div>

        <div
          v-if="(requirement?.details || []).length > 0"
          class="overflow-x-auto print:overflow-visible"
        >
          <table class="w-full table-auto print:table-fixed">
            <thead>
              <tr>
                <th
                  rowspan="2"
                  class="border-2 border-gray-800 text-left px-4 print:px-2 text-gray-800 print:text-black text-xl font-semibold whitespace-nowrap w-[8%]"
                >
                  SL
                </th>
                <th
                  rowspan="2"
                  class="border-2 border-gray-800 text-center text-gray-800 print:text-black text-base font-semibold whitespace-nowrap print:whitespace-normal w-[65%]"
                >
                  Requirement Details
                </th>
                <th
                  rowspan="2"
                  class="border-2 border-gray-800 text-center text-gray-800 print:text-black text-base px-3 font-semibold whitespace-nowrap print:whitespace-normal print:p-0 w-[15%]"
                >
                  Better To Complete
                </th>
                <th
                  colspan="2"
                  class="w-[30%] border-2 border-gray-800 text-center text-gray-800 print:text-black text-base font-semibold whitespace-nowrap px-3 py-1 print:whitespace-normal"
                >
                  For '{{
                    requirement.to_department?.short_name || requirement.to_department?.name
                  }}' Use
                </th>
              </tr>
              <tr>
                <td
                  class="whitespace-nowrap border-2 border-gray-800 text-center text-gray-800 print:text-black text-sm font-semibold print:text-xs"
                >
                  Task No
                </td>
                <td
                  class="border-2 border-gray-800 text-center text-gray-800 print:text-black text-sm font-semibold whitespace-nowrap p-3 print:text-xs print:p-0"
                >
                  Expected Date
                </td>
              </tr>
            </thead>

            <tbody>
              <template v-for="(detail, index) in requirement?.details || []" :key="detail.id">
                <RequirementDetailTableRow
                  :requirement="requirement"
                  :detail="detail"
                  :serial="index + 1"
                  @editClick="handleEditRequirementDetail"
                  @deleteClick="handleDeleteRequirementDetail"
                  @taskCreateClick="goToTaskAdd"
                  :isPrinting="isPrinting"
                />
                <tr class="">
                  <td class="p-3 border-2 border-gray-800" colspan="5">
                    <div class="font-semibold text-gray-500 print:text-gray-800 text-sm mb-1">
                      '{{
                        requirement.to_department?.short_name || requirement.to_department?.name
                      }}' Feedback
                    </div>
                    <div v-if="state != 'loading' && requirement?.status">
                      <DescriptionView
                        v-if="detail?.feedback"
                        lineClamp="2"
                        :className="{ button: '  underline' }"
                        class="mb-4 print:mb-0"
                      >
                        <p class="text-sky-800 text-sm text-justify" v-html="detail?.feedback"></p>
                      </DescriptionView>
                      <div>
                        <button
                          class="btn-3 print:hidden"
                          @click.prevent="
                            () => {
                              feedbackEditForm.open = true
                              feedbackEditForm.detail = detail
                            }
                          "
                        >
                          {{ detail.feedback ? 'Update Feedback' : 'Add feedback' }}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div
          class="mt-8 border rounded-md p-8 flex items-start justify-between bg-gray-50 print:hidden"
          v-if="state != 'loading' && !requirement?.status"
        >
          <button class="btn-2 pl-2 text-base" @click.prevent="handleAddRequirementDetail">
            <i class="fad fa-plus-circle text-2xl mr-2"></i>Add Requirement
          </button>

          <div class="flex flex-col items-end">
            <RequirementSubmissionHandler
              :requirement-id="requirement?.id"
              @success="fetchRequirement"
            >
              <template #heading> Requirement Submission </template>
              <template #acceptButtonLabel>
                <span class="btn-2 pl-2 text-base">
                  <i class="fad fa-paper-plane text-lg mr-2"></i>Submit Requirement
                </span>
              </template>
              <template #submitButtonLabel> Submit Requirement </template>
            </RequirementSubmissionHandler>
          </div>
        </div>

        <div class="mt-12 mb-8">
          <div class="whitespace-nowrap border-gray-200 grid grid-cols-2 mb-12 items-center">
            <RequirementApprovalItem
              :requirement="requirement"
              approval-type="from_department_in_charge"
            />

            <RequirementApprovalItem
              :requirement="requirement"
              approval-type="from_department_coordinator"
            />
          </div>

          <div class="whitespace-nowrap border-gray-200 grid grid-cols-2 gap-2 items-center">
            <RequirementApprovalItem
              :requirement="requirement"
              approval-type="to_department_in_charge"
            />

            <RequirementApprovalItem
              :requirement="requirement"
              approval-type="to_department_coordinator"
            />
          </div>
        </div>

        <div class="mt-2 text-right print:hidden" v-if="state != 'loading' && !requirement?.status">
          <p class="text-yellow-800 text-sm">
            <span class="fas fa-exclamation-circle"></span>
            After submitting you cannot add requirement no more
          </p>
        </div>
      </div>

      <LoaderView class="absolute inset-0 bg-opacity-90" v-if="state === 'loading'" />
    </div>

    <ShareComponent />
  </div>
</template>
