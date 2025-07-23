ii
<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import OverlyModal from '@/components/common/OverlyModal.vue'
import RequirementDetailAddForm from '@/components/requirements/RequirementDetailAddForm.vue'
import RequirementDetailDeleteForm from '@/components/requirements/RequirementDetailDeleteForm.vue'
import RequirementDetailEditForm from '@/components/requirements/RequirementDetailEditForm.vue'
import RequirementDetailTableRow from '@/components/requirements/RequirementDetailTableRow.vue'
import { findRequirement } from '@/services/requirement'
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

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
const detailDeleteForm = reactive({
  detail: null,
  open: false,
})

onMounted(async () => {
  await fetchRequirement()
})

async function fetchRequirement() {
  state.value = 'loading'
  requirement.value = (await findRequirement(route.params.id)).data?.requirement
  state.value = ''
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
  window.print()
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

    <div class="bg-white rounded shadow print:shadow-none p-4 print:p-0 relative">
      <div class="flex items-start">
        <div class="mb-4 text-lg print:black print:font-bold">
          <div class="text-gray-800">To</div>
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
        </div>
      </div>
      <div class="text-center text-xl font-bold mb-2 underline">Requirement Form</div>
      <div class="mb-4 flex items-center gap-1 print:mb-1">
        <div class="text-gray-800 text-sm">Requirement ID:</div>
        <div class="font-bold print:text-gray-900">
          {{ requirement?.id }}
        </div>
      </div>

      <div class="mb-4 print:flex print:items-center print:gap-3 print:mb-1">
        <div class="text-gray-800 text-sm">From</div>
        <div class="print:text-gray-900">
          {{ requirement?.from_department?.name }}
        </div>
      </div>
      <div class="mb-4 print:flex print:items-center print:gap-3 print:mb-1">
        <div class="text-gray-500 text-sm">Website</div>
        <div class="print:text-gray-900">
          <div v-for="website_tag in requirement?.website_tags || []" :key="website_tag.id">
            {{ website_tag.name }}
          </div>
        </div>
      </div>
      <div class="mb-4 print:flex print:items-center print:gap-3 print:mb-1">
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
        <div class="flex items-center mb-6">
          <h2 class="text-xl font-semibold">Requirement Details</h2>
          <div class="ml-auto print:hidden flex gap-2 text-sm">
            <button
              class="btn-4 font-semibold !pl-2 !pr-4 border-2 border-blue-800 hover:bg-blue-800 hover:text-white"
              v-if="(requirement?.details || []).length > 0"
              @click.prevent="handleAddRequirementDetail"
            >
              <i class="fad fa-plus-circle text-xl"></i>Add Requirement
            </button>
          </div>
        </div>

        <div v-if="(requirement?.details || []).length > 0">
          <table class="w-full table-auto print:table-fixed">
            <thead>
              <tr>
                <th
                  rowspan="2"
                  class="border-2 border-gray-800 text-left px-4 text-gray-800 print:text-black text-xl font-semibold whitespace-nowrap w-[15%]"
                >
                  SL
                </th>
                <th
                  rowspan="2"
                  class="border-2 border-gray-800 text-center text-gray-800 print:text-black text-base font-semibold whitespace-nowrap w-[65%]"
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
                  class="border-2 border-gray-800 text-center text-gray-800 print:text-black text-base font-semibold whitespace-nowrap px-3 py-1 print:whitespace-normal w-[25%]"
                >
                  For IT Use
                </th>
              </tr>
              <tr>
                <td
                  class="border-2 border-gray-800 text-center text-gray-800 print:text-black text-sm font-semibold whitespace-nowrap p-3 print:whitespace-normal"
                >
                  Issue No
                </td>
                <td
                  class="border-2 border-gray-800 text-center text-gray-800 print:text-black text-sm font-semibold whitespace-nowrap p-3 print:whitespace-normal print:p-0"
                >
                  Expected Date
                </td>
              </tr>
            </thead>

            <tbody>
              <template v-for="(detail, index) in requirement?.details || []" :key="detail.id">
                <RequirementDetailTableRow
                  :detail="detail"
                  :serial="index + 1"
                  @editClick="handleEditRequirementDetail"
                  @deleteClick="handleDeleteRequirementDetail"
                />
                <tr>
                  <td
                    class="whitespace-nowrap print:whitespace-break-spaces print:px-0 p-3 text-center border-2 border-gray-800"
                  >
                    <div class="text-gray-900 text-base">For IT Use</div>
                    <div class="text-gray-800 text-xs">(Feedback)</div>
                  </td>
                  <td
                    class="whitespace-nowrap p-3 text-center border-2 border-gray-800"
                    colspan="4"
                  ></td>
                </tr>
                <tr>
                  <td class="whitespace-nowrap p-3 text-center border-2 border-gray-800 min-h-96">
                    &nbsp;
                  </td>
                  <td
                    class="whitespace-nowrap p-3 text-center border-2 border-gray-800 min-h-96"
                    colspan="4"
                  >
                    &nbsp;
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div v-else class="border min-h-64 rounded-md flex items-center justify-center group">
          <button
            class="btn-4 font-semibold pl-2 group-hover:border border-blue-300"
            @click.prevent="handleAddRequirementDetail"
          >
            <i class="fad fa-plus-circle text-2xl"></i>Add Requirement
          </button>
        </div>
      </div>

      <LoaderView class="absolute inset-0 bg-opacity-90" v-if="state === 'loading'" />
    </div>
  </div>
</template>
