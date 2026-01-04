ii
<script setup>
import CommentBox from '@/components/CommentBox.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import OverlyModal from '@/components/common/OverlyModal.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import DepartmentChip from '@/components/DepartmentChip.vue'
import DescriptionView from '@/components/DescriptionView.vue'
import HTMLTextBody from '@/components/HTMLTextBody.vue'
import RequirementAttachments from '@/components/requirements/RequirementAttachments.vue'
import RequirementCloseInfo from '@/components/requirements/RequirementCloseInfo.vue'
import RequirementClosingForm from '@/components/requirements/RequirementClosingForm.vue'
import RequirementDetailDeleteForm from '@/components/requirements/RequirementDetailDeleteForm.vue'
import RequirementDetailTableRow from '@/components/requirements/RequirementDetailTableRow.vue'
import RequirementFeedbackEditForm from '@/components/requirements/RequirementFeedbackEditForm.vue'
import RequirementSubmissionHandler from '@/components/requirements/RequirementSubmissionHandler.vue'
import RequirementTaskCreateOrAssign from '@/components/requirements/RequirementTaskCreateOrAssign.vue'
import TaskAddForm from '@/components/tasks/TaskAddForm.vue'
import TaskEditForm from '@/components/tasks/TaskEditForm.vue'
import TaskTableRow from '@/components/tasks/TaskTableRow.vue'
import TaskUserAssignForm from '@/components/tasks/TaskUserAssignForm.vue'
import TextWithHr from '@/components/TextWithHr.vue'
import UserChip from '@/components/user/UserChip.vue'
import { getDisplayDate, getDisplayDateTime } from '@/libs/datetime'
import { createMutationObserver } from '@/libs/dom'
import { findRequirement } from '@/services/requirement'
import { useAuthStore } from '@/stores/auth'
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RequirementApprovalItem from './RequirementApprovalItem.vue'

const route = useRoute()
const router = useRouter()
const state = ref('')

const auth = useAuthStore()

const sidebarTop = ref()
const closingHistoryShown = ref(false)

const requirement = ref(null)
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

const editingId = ref()

const user_department_position = ref('')

const employeeAssignForm = ref({
  isOpen: false,
  taskId: null,
})

onMounted(async () => {
  await fetchRequirement()
  window.addEventListener('beforeprint', beforePrint)
  window.addEventListener('afterprint', afterPrint)
  window.addEventListener('resize', setShareComponentStyle)

  await nextTick()

  createMutationObserver(sidebarTop.value, () => {
    setShareComponentStyle()
  })

  setShareComponentStyle()
})

function setShareComponentStyle() {
  // const sidebarTopValue = sidebarTop.value
  // const shareComp = shareComponent.value?.$el
  // if (sidebarTopValue && shareComp && sidebarTopValue?.offsetHeight) {
  //   shareComp.style.top = `${sidebarTopValue?.offsetHeight + 90}px`
  // }
}

onBeforeUnmount(() => {
  window.removeEventListener('beforeprint', beforePrint)
  window.removeEventListener('afterprint', afterPrint)
  window.removeEventListener('resize', setShareComponentStyle)
})
async function fetchRequirement() {
  state.value = 'loading'
  const requirementData = (await findRequirement(route.params.id)).data
  requirement.value = requirementData?.requirement
  user_department_position.value = requirementData?.user_department_position
  state.value = ''
}

function goToTaskAdd() {
  //router.push({ name: 'TaskAdd' })

  if (
    auth.user.role !== 'super_admin' &&
    auth.user?.id !== requirement.value?.to_department?.incharge_id
  ) {
    return alert(
      `You can't create or assign task for this requirement. \nOnly ${requirement.value?.to_department?.name}'s In charge can create or assign.`,
    )
  }

  console.log({ requirement })
  addFormData.modalShown = true
  addFormData.from_department_id = requirement.value.from_department_id
  addFormData.to_department_id = requirement.value.to_department_id

  addFormData.taskDefaultValues = {
    title: '',
    description: '',
    from_department_id: requirement.value.from_department_id,
    to_department_id: requirement.value.to_department_id,
    is_important: requirement.value?.priority == 'IMPORTANT',
    is_urgent: requirement.value?.priority == 'URGENT',
    supervisor_ids: requirement.value?.supervisor_id ? [requirement.value?.supervisor_id] : [],
  }
  addFormData.requirement = requirement.value
}

function handleEditRequirementDetail(detail) {
  detailEditForm.open = true
  detailEditForm.detail = detail
}

function handleDeleteRequirementDetail(detail) {
  detailDeleteForm.open = true
  detailDeleteForm.detail = detail
}

const addFormData = reactive({
  modalShown: false,
  requirementId: 0,
  taskDefaultValues: {},
  requirement: null,
  creating: false,
})

async function handleTaskUpdate() {
  editingId.value = null
  addFormData.modalShown = false
  await fetchRequirement()
}

async function handleTaskAddClose() {
  addFormData.modalShown = false
  addFormData.requirement = null
  addFormData.creating = false
}

const reqClosingModal = ref({
  open: false,
})
</script>
<template>
  <div class="container mx-auto print:p-0 w-full print:max-w-full">
    <OverlyModal v-if="feedbackEditForm.open">
      <RequirementFeedbackEditForm
        :requirementId="requirement.id"
        :detailId="feedbackEditForm.requirement.value?.id"
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
        :detailId="detailDeleteForm.requirement.value?.id"
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
        :requirement="addFormData?.requirement"
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
        :requirementDetailId="addFormData?.requirement.value?.id"
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

    <OverlyModal v-if="editingId">
      <TaskEditForm :taskId="editingId" @close="editingId = null" @updated="handleTaskUpdate" />
    </OverlyModal>

    <OverlyModal v-if="employeeAssignForm.isOpen" class="*:max-w-4xl">
      <TaskUserAssignForm
        :taskId="employeeAssignForm.taskId"
        @cancelClick="
          () => {
            employeeAssignForm.isOpen = false
            employeeAssignForm.taskId = 0
          }
        "
        @success="
          () => {
            employeeAssignForm.isOpen = false
            employeeAssignForm.taskId = 0
            state = 'loading'
            fetchRequirement()
          }
        "
      />
    </OverlyModal>

    <OverlyModal v-if="reqClosingModal.open">
      <RequirementClosingForm
        :requirement="requirement"
        @clickCancel="reqClosingModal.open = false"
        @updateStatus="
          () => {
            fetchRequirement()
            reqClosingModal.open = false
          }
        "
      />
    </OverlyModal>

    <OverlyModal v-if="closingHistoryShown">
      <div class="border-b px-3 py-1 bg-gray-50 flex items-center justify-between rounded-t-md">
        <h3 class="text-xl font-semibold">Closing History</h3>
        <button class="btn-icon size-8" @click.prevent="closingHistoryShown = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div
        v-if="requirement?.closing_history && requirement?.closing_history?.length"
        class="p-3 max-h-[50vh] overflow-auto"
      >
        <table class="border table-auto w-full">
          <thead>
            <tr>
              <th class="border-y py-1 text-sm px-4 text-right">Close/Open</th>
              <th class="border-y py-1 text-sm px-4 text-left">Closed AT</th>
              <th class="border-y py-1 text-sm px-4 text-left">Note</th>
              <th class="border-y py-1 text-sm px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="history in requirement?.closing_history || []"
              :key="history.at"
              class="text-sm"
            >
              <td class="border-y px-4 py-2 text-right">{{ history?.type }}</td>
              <td class="border-y pr-4 py-2 whitespace-nowrap">
                {{ history.at ? getDisplayDateTime(history.at) : '' }}
              </td>
              <td class="border-y px-4 py-2">
                <div class="line-clamp-2 text-sm text-amber-950">
                  {{ history?.closing_note }}
                </div>
              </td>
              <td class="border-y px-4 py-2 text-center">{{ history?.status }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </OverlyModal>

    <div class="print:shadow-none print:p-0 relative min-h-[50vh] mx-4">
      <div class="grid grid-cols-12 gap-x-4 gap-y-3" v-if="requirement">
        <div
          class="col-span-full md:col-span-8 xl:col-span-8 2xl:col-span-9 row-span-10 bg-white shadow rounded-lg p-6"
        >
          <div class="text-center text-xl font-bold mb-2 flex items-center">
            <button class="btn-3 h-8 px-4" @click.prevent="() => router.back()">Back</button>
            <div class="text-2xl ml-4">Requirement Form</div>
          </div>

          <hr class="mb-4" />

          <div>
            <div class="mb-8">
              <div>
                <div class="text-lg font-semibold mb-2">
                  <DescriptionView line-clamp="3" class="mb-2">
                    <template #default>
                      {{ requirement.title }}
                    </template>
                    <template #btnText="{ lineClampClass }">
                      {{ lineClampClass ? 'More' : 'Less' }}
                    </template>
                  </DescriptionView>
                  <div class="flex gap-4 items-center text-gray-500">
                    <div class="text-sm">
                      <span class="fas fa-calendar text-sm text-gray-400"></span>
                      {{ getDisplayDateTime(requirement.created_at) }}
                    </div>
                    <div v-if="requirement.created_by" class="flex items-center gap-1">
                      <span class="text-gray-400 text-sm">By</span>
                      <UserChip
                        :show-details-on-avatar-hover="auth.isAdminMood"
                        avatar-size="xsmall"
                        :user="requirement.created_by"
                        class="border-sky-300"
                      />
                    </div>
                  </div>
                </div>

                <div class="mb-5" v-if="requirement.description">
                  <div class="text-gray-400 mr-2 text-xs uppercase font-semibold">Description</div>

                  <DescriptionView
                    :line-clamp="4"
                    :class-name="{ button: 'group-hover/item:underline' }"
                    class="text-sm"
                  >
                    <HTMLTextBody :message="requirement.description" />
                  </DescriptionView>
                </div>
              </div>
            </div>

            <div class="mb-8">
              <TextWithHr class="mb-4">
                <h2 class="font-semibold text-lg px-2">
                  <span>Task List </span>
                  <span
                    v-if="requirement.status == 'approved'"
                    class="whitespace-nowrap mt-4"
                    :class="[
                      {
                        'text-green-700 font-semibold':
                          requirement.tasks_count > 0 &&
                          requirement.completed_tasks_count == requirement.tasks_count,
                        'text-red-700 font-semibold':
                          requirement.tasks_count == 0 ||
                          requirement.completed_tasks_count != requirement.tasks_count,
                      },
                    ]"
                  >
                    ({{ requirement.completed_tasks_count }}/{{ requirement.tasks_count }} task(s)
                    done)
                  </span>
                </h2>
              </TextWithHr>
              <div class="w-full border rounded-lg border-gray-300 overflow-y-auto">
                <table class="w-full border-collapse">
                  <thead>
                    <tr>
                      <th class="border-x px-1 font-medium text-xs text-gray-400">SL</th>
                      <th class="border-x px-1 font-medium text-xs text-gray-400">Task</th>
                      <th class="border-x px-1 font-medium text-xs text-gray-400">Assigns</th>
                      <th class="border-x px-1 font-medium text-xs text-gray-400">Deadline</th>
                      <th
                        class="border-x px-1 font-medium text-xs text-gray-400 sticky right-0 bg-gray-50"
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="state != 'loading' && requirement?.tasks?.length === 0">
                      <td class="py-4 px-3 border-t text-center text-gray-400 text-sm" colspan="10">
                        No Task
                      </td>
                    </tr>
                    <template v-else>
                      <TaskTableRow
                        v-for="(task, index) in requirement?.tasks || []"
                        :key="task.id"
                        :task="task"
                        :indexing="index + 1"
                        class="*:py-3 *:border-b-0"
                        @editClick="(taskId) => (editingId = taskId)"
                        @employeeAssignClick="
                          (taskId) => {
                            employeeAssignForm.isOpen = true
                            employeeAssignForm.taskId = taskId
                          }
                        "
                      />
                      <!-- hide-buttons -->
                    </template>
                  </tbody>
                </table>

                <!-- {{ requirement.tasks }} -->
              </div>
            </div>

            <div class="mb-8">
              <TextWithHr class="mb-4">
                <h2 class="font-semibold text-lg px-2">Comments</h2>
              </TextWithHr>
              <CommentBox
                commentable-type="requirement"
                :commentable-id="requirement.id"
                :current-user="auth.user"
              />
            </div>

            <div v-if="false" class="mb-8">
              <TextWithHr class="mb-4">
                <h2 class="font-semibold text-lg px-2">
                  '{{ requirement?.to_department?.short_name || requirement?.to_department?.name }}'
                  Feedback
                </h2>
              </TextWithHr>

              <div
                class="px-3 border border-dashed rounded-lg border-sky-600"
                colspan="5"
                :class="[requirement?.feedback ? 'py-3' : 'py-8']"
              >
                <div v-if="state != 'loading' && requirement?.status">
                  <DescriptionView
                    v-if="String(requirement?.feedback || '').trim().length > 0"
                    lineClamp="2"
                    :className="{ button: '  underline' }"
                    class="mb-4 print:mb-0"
                  >
                    <p class="text-sm text-justify" v-html="requirement?.feedback"></p>
                  </DescriptionView>
                  <div v-else class="text-center my-2 text-gray-400">No Feedback</div>

                  <div
                    :class="[
                      !requirement?.feedback
                        ? 'w-full flex justify-center'
                        : 'w-full flex justify-center',
                    ]"
                  >
                    <button
                      class="btn-3 print:hidden"
                      @click.prevent="
                        () => {
                          feedbackEditForm.open = true
                          feedbackEditForm.requirement = requirement
                        }
                      "
                      v-if="!requirement.closed_at"
                    >
                      {{ requirement.feedback ? 'Update Feedback' : 'Add feedback' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="overflow-x-auto print:overflow-visible" v-if="requirement && false">
              <table class="w-full table-auto print:table-fixed">
                <thead>
                  <tr>
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
                        requirement?.to_department?.short_name || requirement?.to_department?.name
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
                  <RequirementDetailTableRow
                    :requirement="requirement"
                    :serial="index + 1"
                    @editClick="handleEditRequirementDetail"
                    @deleteClick="handleDeleteRequirementDetail"
                    @taskCreateClick="goToTaskAdd"
                    :isPrinting="isPrinting"
                  />
                </tbody>
              </table>
            </div>

            <!-- {{ requirement }} -->
            <div
              class="mt-8 border rounded-md p-8 flex items-start justify-between bg-gray-50 print:hidden"
              v-if="state != 'loading' && !requirement?.submission_date"
            >
              <div class="flex flex-col items-end">
                <RequirementSubmissionHandler
                  :requirement-id="requirement?.id"
                  @success="fetchRequirement"
                  :requirement-note="user_department_position == 'in_charge'"
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

            <div class="mt-6 mb-8 break-before-avoid-page" v-if="requirement?.submission_date">
              <TextWithHr>
                <h2 class="font-semibold text-lg px-2">Approvals</h2>
              </TextWithHr>
              <div
                class="whitespace-nowrap border-gray-200 grid grid-cols-1 lg:grid-cols-2 items-stretch"
              >
                <RequirementApprovalItem
                  class="pt-12"
                  v-for="approvalType in ['from_in_charge', 'from_coordinator']"
                  :key="approvalType"
                  :requirement="requirement"
                  :approval-type="approvalType"
                  @update-approval="() => fetchRequirement()"
                />
              </div>

              <div
                class="whitespace-nowrap border-gray-200 grid grid-cols-1 lg:grid-cols-2 gap-2 items-stretch"
                v-if="requirement?.from_department_id !== requirement?.to_department_id"
              >
                <RequirementApprovalItem
                  class="pt-12"
                  v-for="approvalType in ['to_in_charge', 'to_coordinator']"
                  :key="approvalType"
                  :requirement="requirement"
                  :approval-type="approvalType"
                  @update-approval="() => fetchRequirement()"
                />
              </div>
            </div>
          </div>
        </div>

        <div
          class="col-span-full md:col-span-4 xl:col-span-4 2xl:col-span-3 sticky top-[74px] break-before-avoid-page"
          ref="sidebarTop"
        >
          <div class="bg-white shadow rounded-lg space-y-4 p-4 mb-4">
            <div class="border col-span-3 p-3 rounded-md">
              <div>
                <div class="flex items-center gap-2 mb-4">
                  <div class="text-gray-500 text-sm">From</div>
                  <DepartmentChip :department="requirement?.from_department" :short-name="true" />
                </div>
                <div class="text-gray-600 text-sm mb-2 border-b border-dashed">Supervisor</div>
                <div class="flex items-center gap-x-3 gap-y-2 flex-wrap">
                  <UserChip
                    :show-details-on-avatar-hover="auth.isAdminMood"
                    :user="requirement?.supervisor"
                    v-if="requirement?.supervisor"
                  />
                </div>
              </div>

              <hr class="my-4" />

              <div>
                <div class="flex items-center gap-2 mb-4">
                  <div class="text-gray-500 text-sm">To</div>
                  <DepartmentChip :department="requirement?.to_department" :short-name="true" />
                </div>
              </div>
            </div>

            <div class="mb-4 flex items-center justify-between gap-1 print:mb-1">
              <div class="text-gray-500 text-sm">Requirement ID:</div>
              <div class="font-bold print:text-gray-900">
                {{ requirement?.id }}
              </div>
            </div>

            <div
              class="mb-3 flex items-start gap-3 print:mb-1"
              v-if="requirement?.website_tags?.length > 0"
            >
              <div class="text-gray-500 text-sm">Website</div>

              <div class="flex items-center gap-2 print:text-gray-900 flex-wrap">
                <div
                  v-for="website_tag in requirement?.website_tags || []"
                  :key="website_tag.id"
                  class="border px-1 rounded-md bg-sky-100 border-sky-400 text-sky-700 whitespace-nowrap text-xs"
                >
                  {{ website_tag.name }}
                </div>
              </div>
            </div>

            <div
              class="mb-3 flex items-center justify-between gap-3 print:mb-1"
              v-if="requirement?.submission_date"
            >
              <div class="text-gray-500 text-sm">Submission Date</div>
              <div class="print:text-gray-900 text-sm text-right">
                {{ getDisplayDateTime(requirement?.submission_date) }}
              </div>
            </div>

            <div
              class="mb-3 flex items-center justify-between gap-3 print:mb-1"
              v-if="requirement?.better_to_complete_on"
            >
              <div class="text-gray-500 text-sm">Better To Complete</div>
              <div class="print:text-gray-900 text-sm text-right">
                {{ getDisplayDate(requirement?.better_to_complete_on, { weekDay: 'long' }) }}
              </div>
            </div>

            <div>
              <div class="flex justify-between items-center mb-4">
                <span class="text-gray-500 text-sm">Priority:</span>
                <div>
                  <span
                    :class="[
                      'font-semibold text-sm',
                      {
                        'text-yellow-600 ': requirement.priority == 'IMPORTANT',
                        'text-red-700 ': requirement.priority == 'URGENT',
                      },
                    ]"
                    >{{ requirement.priority || 'NORMAL' }}</span
                  >
                </div>
              </div>

              <div class="mb-4">
                <div class="flex justify-between items-center">
                  <span class="text-gray-500 text-sm">Status:</span>
                  <span
                    v-if="requirement.status"
                    class="border rounded-lg px-2 text-sm py-0.5"
                    :class="{
                      'bg-red-300 text-red-700 border-red-400': requirement.status != 'approved',
                      'bg-green-300 text-green-700 border-green-400':
                        requirement.status == 'approved',
                    }"
                  >
                    {{ String(requirement.status).toUpperCase() }}
                  </span>
                  <span v-else class="text-red-600">...</span>
                </div>
              </div>

              <div class="mb-2" v-if="requirement.rejected_by">
                <div class="flex justify-between items-center">
                  <span class="text-gray-500 text-sm">Rejected By:</span>
                  <UserChip :user="requirement.rejected_by" />
                </div>
              </div>

              <div
                class="mb-4 text-red-700 text-sm flex justify-between"
                v-if="requirement.rejection_reason"
              >
                <p class="text-gray-600 mb-1">Reason:</p>
                <p>{{ requirement.rejection_reason }}</p>
              </div>

              <hr class="mb-3" />

              <div
                v-if="!requirement?.closed_at"
                class="print:hidden flex gap-2 items-center justify-between w-full text-sm"
              >
                <button
                  class="btn-3 font-semibold h-8 !pl-2 !pr-4"
                  @click.prevent="goToTaskAdd"
                  v-if="requirement.status == 'approved'"
                >
                  <i class="fas fa-plus text-sm"></i> Add/Assign Task
                </button>
                <!-- <button class="btn-3 font-semibold !pl-2 !pr-4" @click.prevent="handlePrint">
                <i class="fad fa-print text-xl"></i>Print
              </button> -->

                <RouterLink class="btn-2 h-8" :to="`/requirements/edit/${requirement?.id}`">
                  Edit
                </RouterLink>
              </div>
            </div>
          </div>

          <RequirementCloseInfo
            :requirement="requirement"
            @reOpenClick="reqClosingModal.open = true"
            class="mb-4 card-bg bg-white"
            @closeClick="reqClosingModal.open = true"
            @showHistoryClick="closingHistoryShown = !closingHistoryShown"
          />

          <RequirementAttachments :requirement="requirement" class="mb-4" />

          <ShareComponent
            class="mt-4 md:col-span-4 xl:col-span-4 2xl:col-span-3"
            ref="shareComponent"
          />
        </div>
      </div>

      <LoaderView class="absolute inset-0 bg-opacity-90" v-if="state === 'loading'" />
    </div>
  </div>
</template>
