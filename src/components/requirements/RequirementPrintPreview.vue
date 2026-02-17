<script setup>
import HTMLTextBody from '@/components/HTMLTextBody.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { fileUrl, isImage } from '@/libs/attachment-functions'
import { getDisplayDate, getDisplayDateTime } from '@/libs/datetime'
import { computed } from 'vue'

const props = defineProps({
  requirement: {
    type: Object,
    required: true,
  },
  options: {
    type: Object,
    required: true,
  },
  comments: {
    type: Array,
    default: () => [],
  },
})

const imageAttachments = computed(() => {
  return (props.requirement?.attachments || []).filter((file) => isImage(file))
})

const getApprovalData = (type) => {
  const req = props.requirement
  const allApprovals = {
    from_in_charge: !!(req?.status && req?.submission_date),
    from_coordinator: !!req?.from_coordinator,
    to_in_charge: !!req?.to_incharge,
    to_coordinator: !!req?.to_coordinator,
  }

  const departmentUsers = {
    from_in_charge: req?.from_department?.in_charge,
    from_coordinator: req?.from_department?.coordinator,
    to_in_charge: req?.to_department?.in_charge,
    to_coordinator: req?.to_department?.coordinator,
  }

  let department = null
  let approval_user = null
  let userType = ''
  let approval_note = ''

  if (type === 'from_in_charge') {
    department = req?.from_department
    approval_user = req?.from_department?.in_charge
    userType = 'In Charge'
    approval_note = req?.from_incharge_note
  }

  if (type === 'from_coordinator') {
    department = req?.from_department
    approval_user = req?.from_coordinator
    userType = 'Coordinator'
    approval_note = req?.from_coordinator_note
  }

  if (type === 'to_in_charge') {
    department = req?.to_department
    approval_user = req?.to_incharge
    userType = 'In Charge'
    approval_note = req?.to_incharge_note
  }

  if (type === 'to_coordinator') {
    department = req?.to_department
    approval_user = req?.to_coordinator
    userType = 'Coordinator'
    approval_note = req?.to_coordinator_note
  }

  return {
    department,
    approved: allApprovals[type],
    approval_user,
    is_rejected: req?.rejected_by_user_id && req?.rejected_by_user_id === departmentUsers[type]?.id,
    userType,
    approval_note,
  }
}
</script>

<template>
  <div class="requirement-print-preview bg-white text-black p-8 font-serif leading-relaxed">
    <!-- Header/Info Section -->
    <div class="border-b-2 border-gray-800 pb-4 mb-6">
      <div class="flex justify-between items-start">
        <div>
          <h1 class="text-xl font-bold uppercase tracking-wider">Requirement Report</h1>
          <p class="text-sm text-gray-600 mt-1">
            Generated on <span class="font-semibold"> {{ getDisplayDateTime(new Date()) }}</span>
          </p>
        </div>
        <div class="text-right">
          <div class="text-lg font-bold text-indigo-700">#{{ requirement.id }}</div>
          <div
            class="text-sm font-semibold uppercase px-2 py-0.5 rounded border inline-block mt-1"
            :class="
              requirement.status === 'approved'
                ? 'bg-green-100 border-green-400 text-green-800'
                : requirement.status === 'rejected'
                  ? 'bg-red-100 border-red-400 text-red-800'
                  : 'bg-yellow-100 border-yellow-400 text-yellow-800'
            "
          >
            <i
              class="mr-1"
              :class="
                requirement.status === 'approved'
                  ? 'fas fa-check-circle'
                  : requirement.status === 'rejected'
                    ? 'fas fa-times-circle'
                    : 'fas fa-clock'
              "
            ></i>
            {{ requirement.status || 'PENDING' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Metadata Grid -->
    <div class="grid grid-cols-2 gap-x-12 gap-y-4 mb-6 text-sm">
      <div class="space-y-2">
        <div class="flex justify-between border-b border-gray-100 pb-1">
          <span class="text-gray-500 font-semibold whitespace-nowrap ml-1">Website:</span>
          <span class="font-medium text-right">
            {{ (requirement.website_tags || []).map((t) => t.name).join(', ') || 'N/A' }}
          </span>
        </div>
        <div class="flex justify-between border-b border-gray-100 pb-1">
          <span class="text-gray-500 font-semibold whitespace-nowrap ml-1">Submission Date:</span>
          <span class="font-medium text-right">
            {{
              requirement.submission_date ? getDisplayDateTime(requirement.submission_date) : 'N/A'
            }}
          </span>
        </div>
        <div class="flex justify-between border-b border-gray-100 pb-1">
          <span class="text-gray-500 font-semibold whitespace-nowrap ml-1"
            >Better To Complete:</span
          >
          <span class="font-medium text-right">
            {{
              requirement.better_to_complete_on
                ? getDisplayDate(requirement.better_to_complete_on)
                : 'N/A'
            }}
          </span>
        </div>
      </div>
      <div class="space-y-2">
        <div class="flex justify-between border-b border-gray-100 pb-1">
          <span class="text-gray-500 font-semibold whitespace-nowrap ml-1">Priority:</span>
          <span
            class="font-bold uppercase"
            :class="
              requirement.priority === 'URGENT'
                ? 'text-red-600'
                : requirement.priority === 'IMPORTANT'
                  ? 'text-orange-600'
                  : ''
            "
          >
            {{ requirement.priority || 'NORMAL' }}
          </span>
        </div>
        <div class="flex justify-between border-b border-gray-100 pb-1">
          <span class="text-gray-500 font-semibold whitespace-nowrap ml-1">From Dept:</span>
          <span class="font-medium text-right">{{ requirement.from_department?.name }}</span>
        </div>
        <div class="flex justify-between border-b border-gray-100 pb-1">
          <span class="text-gray-500 font-semibold whitespace-nowrap ml-1">To Dept:</span>
          <span class="font-medium text-right">{{ requirement.to_department?.name }}</span>
        </div>
      </div>
    </div>

    <!-- Supervisor Section -->
    <div class="mb-6 p-3 bg-gray-50 rounded border flex items-center gap-4">
      <span class="text-gray-500 font-bold uppercase text-xs">Supervisor:</span>
      <div v-if="requirement.supervisor" class="flex items-center gap-2">
        <UserAvatar :user="requirement.supervisor" size="xsmall" />
        <span class="font-semibold">{{ requirement.supervisor.name }}</span>
        <span v-if="requirement.supervisor.designation" class="text-xs text-gray-500"
          >({{ requirement.supervisor.designation }})</span
        >
      </div>
      <span v-else class="text-gray-400">Not Assigned</span>
    </div>

    <!-- Title & Description -->
    <div class="mb-6">
      <h2 class="text-xl mb-2">
        <span class="font-bold">{{ requirement.title }}</span>
      </h2>
      <div
        v-if="requirement.description"
        class="print-description prose prose-sm max-w-none text-gray-800 p-0"
      >
        <HTMLTextBody :message="requirement.description" />
      </div>
    </div>

    <!-- Tasks Section -->
    <div v-if="options.withTasks" class="mb-6 break-inside-avoid">
      <div class="flex justify-between items-center mb-4 border-b pb-2">
        <h3 class="text-lg font-bold uppercase">Tasks</h3>
        <span class="font-semibold text-sm bg-gray-800 text-white px-3 py-1 rounded-full">
          {{ requirement.completed_tasks_count }} / {{ requirement.tasks_count }} Completed
        </span>
      </div>

      <div v-if="options.taskOption === 'list'" class="overflow-hidden border rounded">
        <table class="w-full border-collapse text-sm">
          <thead class="bg-gray-100">
            <tr>
              <th class="border p-2 text-left w-12 text-gray-600">SL</th>
              <th class="border p-2 text-left text-gray-600">Task Title</th>
              <th class="border p-2 text-left text-gray-600 w-48">Assigned To</th>
              <th class="border p-2 text-center text-gray-600 w-32">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(task, index) in requirement.tasks"
              :key="task.id"
              class="border-b hover:bg-gray-50"
            >
              <td class="border p-2 text-center font-bold text-gray-400">{{ index + 1 }}</td>
              <td class="border p-2">
                <div class="font-semibold">{{ task.title }}</div>
                <div
                  v-if="task.description"
                  class="text-xs text-gray-500 mt-1"
                  v-html="task.description"
                ></div>
              </td>
              <td class="border p-2">
                <div
                  v-for="user in task.users"
                  :key="user.id"
                  class="text-xs mb-1 last:mb-0 flex items-center gap-1"
                >
                  <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                  {{ user.name }}
                </div>
                <span v-if="!task.users?.length" class="text-gray-400 text-xs italic"
                  >Unassigned</span
                >
              </td>
              <td class="border p-2 text-center">
                <span
                  :class="[
                    'px-2 py-0.5 rounded-full text-[10px] uppercase font-bold',
                    task.status === 'COMPLETED'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700',
                  ]"
                >
                  {{ task.status }}
                </span>
              </td>
            </tr>
            <tr v-if="!requirement.tasks?.length">
              <td colspan="4" class="p-8 text-center text-gray-400 italic">
                No tasks found for this requirement.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="p-4 border rounded bg-gray-50 text-center italic text-gray-600">
        Task list hidden based on print options. (Summary: {{ requirement.completed_tasks_count }} /
        {{ requirement.tasks_count }} tasks completed)
      </div>
    </div>

    <!-- Messages Section -->
    <div v-if="options.withMessages && comments.length" class="mb-10">
      <h3 class="text-lg font-bold uppercase mb-4 border-b pb-2">Message History</h3>
      <div class="space-y-4 break-before-page">
        <div
          v-for="comment in comments"
          :key="comment.id"
          class="border-l-4 border-gray-200 pl-4 py-1"
        >
          <div class="flex items-center gap-2 mb-1">
            <UserAvatar :user="comment.user" size="xsmall" />
            <span class="font-bold text-sm">{{ comment.user?.name }}</span>
            <span class="text-xs text-gray-400">{{ getDisplayDateTime(comment.created_at) }}</span>
            <span v-if="comment.parent" class="text-[10px] text-gray-400 italic">
              (In reply to {{ comment.parent.user?.name }})
            </span>
          </div>
          <div v-if="comment.message" class="text-sm text-gray-700">
            <HTMLTextBody :message="comment.message" />
          </div>
        </div>
      </div>
    </div>

    <!-- Submitted By Section -->
    <div
      class="mb-10 p-4 bg-blue-50/50 rounded-lg flex items-center justify-between border-l-4 border-blue-400"
    >
      <div class="flex items-center gap-4">
        <span class="text-xs font-bold text-blue-700 uppercase tracking-widest">Submitted By:</span>
        <div class="flex items-center gap-2">
          <UserAvatar :user="requirement.created_by" size="xsmall" />
          <span class="font-bold text-gray-800">{{ requirement.created_by?.name }}</span>
        </div>
      </div>
      <div class="text-right">
        <p class="text-[10px] text-gray-500 font-bold uppercase">Submission Date</p>
        <p class="text-sm font-semibold">{{ getDisplayDateTime(requirement.created_at) }}</p>
      </div>
    </div>
    <!-- Approval List -->
    <div v-if="options.withApprovals" class="mb-6">
      <div class="break-inside-avoid">
        <h3 class="text-lg font-bold uppercase mb-6 border-b pb-2">Approvals</h3>

        <!-- From Department Row -->
        <div class="mb-8">
          <h4
            class="text-xs font-bold text-gray-700 text-center uppercase tracking-widest border-b border-dashed pb-1 mb-4"
          >
            {{ requirement.from_department?.name }} Approvals
          </h4>
          <div class="grid grid-cols-2 gap-8">
            <div
              v-for="type in ['from_in_charge', 'from_coordinator']"
              :key="type"
              class="approval-box p-4 flex flex-col items-center text-center"
            >
              <div v-if="getApprovalData(type)" class="w-full">
                <p class="text-[10px] text-gray-500 uppercase font-bold mb-3">
                  {{ getApprovalData(type).userType }}
                </p>

                <div v-if="getApprovalData(type).approval_user" class="space-y-2">
                  <div class="flex flex-col items-center gap-2">
                    <UserAvatar :user="getApprovalData(type).approval_user" size="small" />
                    <div class="relative inline-block">
                      <span class="font-bold text-indigo-700">{{
                        getApprovalData(type).approval_user.name
                      }}</span>
                      <hr class="border-t-2 border-indigo-100 mt-0.5" />
                    </div>
                  </div>

                  <p
                    v-if="getApprovalData(type).is_rejected && requirement.rejection_reason"
                    class="text-xs text-red-600 font-semibold italic"
                  >
                    {{ requirement.rejection_reason }}
                  </p>
                  <p
                    v-else-if="getApprovalData(type).approval_note"
                    class="text-xs text-gray-600 italic"
                  >
                    {{ getApprovalData(type).approval_note }}
                  </p>

                  <div
                    v-if="getApprovalData(type).is_rejected"
                    class="mt-1 text-[10px] text-red-600 font-bold px-2 py-0.5 rounded inline-block"
                  >
                    <i class="fas fa-times-circle mr-1"></i> REJECTED
                  </div>
                  <div
                    v-else-if="getApprovalData(type).approved"
                    class="mt-1 text-[10px] text-green-600 font-bold px-2 py-0.5 rounded inline-block"
                  >
                    <i class="fas fa-check-circle mr-1"></i>
                    {{ type === 'from_in_charge' ? 'SUBMITTED' : 'APPROVED' }}
                  </div>
                  <div
                    v-else
                    class="mt-1 text-[10px] text-yellow-600 font-bold px-2 py-0.5 rounded inline-block"
                  >
                    <i class="fas fa-clock mr-1"></i> PENDING
                  </div>
                </div>
                <div
                  v-else
                  class="h-12 flex items-center justify-center text-gray-300 italic text-xs"
                >
                  N/A
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- To Department Row -->
      <div
        v-if="requirement.from_department_id !== requirement.to_department_id"
        class="break-inside-avoid"
      >
        <h4
          class="text-xs font-bold text-center text-gray-700 uppercase tracking-widest border-b border-dashed pb-1 mb-4"
        >
          {{ requirement.to_department?.name }} Approvals
        </h4>
        <div class="grid grid-cols-2 gap-8">
          <div
            v-for="type in ['to_in_charge', 'to_coordinator']"
            :key="type"
            class="approval-box p-4 flex flex-col items-center text-center"
          >
            <div v-if="getApprovalData(type)" class="w-full">
              <p class="text-[10px] text-gray-500 uppercase font-bold mb-3">
                {{ getApprovalData(type).userType }}
              </p>

              <div v-if="getApprovalData(type).approval_user" class="space-y-2">
                <div class="flex flex-col items-center gap-2">
                  <UserAvatar :user="getApprovalData(type).approval_user" size="small" />
                  <div class="relative inline-block">
                    <span class="font-bold text-indigo-700">{{
                      getApprovalData(type).approval_user.name
                    }}</span>
                    <hr class="border-t-2 border-indigo-100 mt-0.5" />
                  </div>
                </div>

                <p
                  v-if="getApprovalData(type).is_rejected && requirement.rejection_reason"
                  class="text-xs text-red-600 font-semibold italic"
                >
                  {{ requirement.rejection_reason }}
                </p>
                <p
                  v-else-if="getApprovalData(type).approval_note"
                  class="text-xs text-gray-600 italic"
                >
                  {{ getApprovalData(type).approval_note }}
                </p>

                <div
                  v-if="getApprovalData(type).is_rejected"
                  class="mt-1 text-[10px] text-red-600 font-bold px-2 py-0.5 rounded inline-block"
                >
                  <i class="fas fa-times-circle mr-1"></i> REJECTED
                </div>
                <div
                  v-else-if="getApprovalData(type).approved"
                  class="mt-1 text-[10px] text-green-600 font-bold px-2 py-0.5 rounded inline-block"
                >
                  <i class="fas fa-check-circle mr-1"></i> APPROVED
                </div>
                <div
                  v-else
                  class="mt-1 text-[10px] text-yellow-600 font-bold px-2 py-0.5 rounded inline-block"
                >
                  <i class="fas fa-clock mr-1"></i> PENDING
                </div>
              </div>
              <div
                v-else
                class="h-12 flex items-center justify-center text-gray-300 italic text-xs"
              >
                N/A
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Image Attachments on Separate Page -->
    <div v-if="options.withAttachments && imageAttachments.length" class="break-before-page mt-12">
      <h3 class="text-lg font-bold uppercase mb-6 border-b pb-2">Image Attachments</h3>
      <div class="grid grid-cols-1 gap-8">
        <div
          v-for="(file, index) in imageAttachments"
          :key="index"
          class="break-inside-avoid border p-4 rounded bg-gray-50 shadow-sm"
        >
          <p class="text-xs text-gray-500 mb-2 font-mono">Attachment #{{ index + 1 }}</p>
          <img
            :src="fileUrl(file)"
            class="max-w-full h-auto rounded border shadow-inner mx-auto"
            alt="Requirement Attachment"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .requirement-print-preview {
    padding: 0;
    margin: 0;
  }
}

.break-before-page {
  break-before: avoid;
}

.break-inside-avoid {
  break-inside: avoid;
}

.prose img {
  max-width: 100%;
  height: auto;
}
</style>
