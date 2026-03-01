<template>
  <div class="card-bg p-4 pt-2">
    <div>
      <h4 class="text-gray-900 font-semibold mb-3 border-b font-e">Attachments</h4>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
        <template v-if="attachments && attachments.length">
          <div
            v-for="(file, index) in attachments"
            :key="index"
            class="border p-1 rounded aspect-square flex items-center justify-center bg-gray-50 relative cursor-pointer hover:bg-gray-100"
            tabindex="0"
            @click.prevent="
              () => {
                attachmentShow.show = true
                attachmentShow.selectedFile = file
              }
            "
          >
            <!-- Image preview -->
            <img
              v-if="isImage(file)"
              :src="fileUrl(file)"
              alt="attachment"
              class="object-cover w-full h-full rounded"
            />

            <!-- PDF preview -->
            <a
              v-else-if="isPDF(file)"
              :href="fileUrl(file)"
              target="_blank"
              class="text-xs text-blue-600 text-center break-words hover:underline"
            >
              <i class="fas fa-file-pdf fa-2x mb-1 text-amber-700"></i>
              <div class="whitespace-nowrap text-xs mt-1">Open PDF</div>
            </a>

            <!-- Unknown file type -->
            <span v-else class="text-xs text-gray-500 text-center">Unknown</span>
          </div>
        </template>

        <button
          title="Add Attachments"
          @click.prevent="addAttachmentForm.show = !addAttachmentForm.show"
          class="border rounded aspect-square flex items-center justify-center bg-sky-50 hover:bg-sky-100 relative cursor-pointer group/btn"
        >
          <i class="fas fa-plus-circle text-2xl text-blue-300 group-hover/btn:text-blue-500"></i>
        </button>
      </div>
    </div>

    <OverlyModal v-if="addAttachmentForm.show">
      <RequirementAttachmentForm
        @clickBack="addAttachmentForm.show = false"
        @uploaded="addAttachmentForm.show = false"
        :requirementId="requirement.id"
        class="max-h-[70vh]"
      />
    </OverlyModal>

    <OverlyModal v-if="attachmentShow.show" class="*:max-w-4xl *:min-h-[60vh]">
      <RequirementAttachmentShow
        :attachments="attachments"
        :selected="attachmentShow.selectedFile"
        @clickClose="attachmentShow.show = false"
      />
    </OverlyModal>
  </div>
</template>

<script setup>
import { fileUrl, isImage, isPDF } from '@/libs/attachment-functions'
import { computed, reactive } from 'vue'
import OverlyModal from '../common/OverlyModal.vue'
import RequirementAttachmentForm from './RequirementAttachmentForm.vue'
import RequirementAttachmentShow from './RequirementAttachmentShow.vue'

// Props
const props = defineProps({
  requirement: {
    type: Array,
    default: () => [],
  },
})
const attachments = computed(() => {
  return props.requirement?.attachments || []
})

const addAttachmentForm = reactive({
  show: false,
})

const attachmentShow = reactive({
  show: false,
  selectedFile: '',
})

// handle file input
</script>
