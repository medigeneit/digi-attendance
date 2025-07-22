<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import OverlyModal from '@/components/common/OverlyModal.vue'
import RequirementDetailAddForm from '@/components/requirements/RequirementDetailAddForm.vue'
import RequirementDetailCard from '@/components/requirements/RequirementDetailCard.vue'
import RequirementDetailDeleteForm from '@/components/requirements/RequirementDetailDeleteForm.vue'
import RequirementDetailEditForm from '@/components/requirements/RequirementDetailEditForm.vue'
import { findRequirement } from '@/services/requirement'
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
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
</script>
<template>
  <div class="container mx-auto p-6">
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

    <div class="bg-white rounded shadow p-4 relative">
      <div class="text-center text-xl font-bold mb-2">Requirement Form</div>
      <hr class="mb-4" />
      <div class="mb-4">
        <div class="text-gray-500 text-sm">Website</div>
        <div>
          <div v-for="website_tag in requirement?.website_tags || []" :key="website_tag.id">
            {{ website_tag.name }}
          </div>
        </div>
      </div>
      <div class="mb-4">
        <div class="text-gray-500 text-sm">From Department</div>
        <div>
          {{ requirement?.from_department?.name }}
        </div>
      </div>
      <div class="mb-4">
        <div class="text-gray-500 text-sm">To Department</div>
        <div>
          {{ requirement?.to_department?.name }}
        </div>
      </div>
      <hr class="mb-4" />
      <div>
        <div class="flex items-center mb-6">
          <h2 class="text-xl font-semibold">Requirement Details</h2>
          <div class="ml-auto">
            <button
              class="btn-4 font-semibold !pl-2 !pr-4"
              v-if="(requirement?.details || []).length > 0"
              @click.prevent="handleAddRequirementDetail"
            >
              <i class="fad fa-plus-circle text-2xl"></i>Add More Details
            </button>
          </div>
        </div>
        <div v-if="(requirement?.details || []).length > 0">
          <RequirementDetailCard
            v-for="(detail, index) in requirement?.details || []"
            :key="detail.id"
            :detail="detail"
            :serial="index + 1"
            @editClick="handleEditRequirementDetail"
            @deleteClick="handleDeleteRequirementDetail"
          />
        </div>
        <div v-else class="border min-h-28 rounded-md flex items-center justify-center">
          <button class="btn-4 font-semibold" @click.prevent="handleAddRequirementDetail">
            <i class="fad fa-plus-circle text-2xl"></i>Add Requirement Details
          </button>
        </div>
      </div>
      <LoaderView class="absolute inset-0 bg-opacity-90" v-if="state === 'loading'" />
    </div>
  </div>
</template>
