<script setup>
import { addRequirementAttachments } from '@/services/requirement'
import { ref } from 'vue'
import AttachmentPreview from '../AttachmentPreview.vue'
import LoaderView from '../common/LoaderView.vue'
import FileUploadInput from '../FileUploadInput.vue'

const props = defineProps({ requirementId: [String, Number], default: () => null })
const form = ref({ attachments: [] })
const state = ref('')
const error = ref('')
const emit = defineEmits(['uploaded', 'error', 'clickBack'])

// handle file input
function handleFiles(event) {
  form.value.attachments = [...form.value.attachments, ...Array.from(event.target.files)]
}

function removeFile(index) {
  form.value.attachments.splice(index, 1)
}

async function submit() {
  state.value = 'submitting'

  const payload = new FormData()

  for (const key in form.value) {
    if (key === 'attachments') {
      form.value.attachments.forEach((file) => payload.append('attachments[]', file))
    } else {
      payload.append(key, form.value[key])
    }
  }

  try {
    const response = await addRequirementAttachments(props.requirementId, payload)
    form.value.attachments = []
    emit('uploaded', response)
    state.value = 'uploaded'
  } catch (err) {
    emit('error', err.response?.data?.message)
    error.value = err.response?.data?.message
    state.value = 'error'
  }
}
</script>

<template>
  <form class="p-4 flex flex-col relative" @submit.prevent="submit">
    <LoaderView
      class="absolute inset-0 bg-opacity-80 flex items-center justify-center"
      v-if="state == 'submitting'"
    />
    <div class="flex items-center border-b w-full pb-2">
      <h3>Requirement Attachment</h3>
      <button
        class="btn-icon ml-auto"
        @click.prevent="
          () => {
            emit('clickBack')
          }
        "
      >
        <span class="fas fa-times"></span>
      </button>
    </div>
    <div class="">
      <label
        class="mt-4 border h-40 flex items-center flex-col justify-center rounded border-dashed bg-red-50 text-center"
      >
        <div class="block text-gray-600 font-medium text-sm md:text-xl mb-4">
          Click to Select files or Drop Here
        </div>
        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          name="attachments"
          class="border rounded-r-md text-gray-600 bg-gray-50"
          @change="handleFiles"
        />
      </label>
    </div>

    <!-- <FileUploadInput class="mt-4" /> -->
    <AttachmentPreview
      :files="form?.attachments || []"
      @remove="removeFile"
      class="border p-1 rounded overflow-y-auto flex-grow"
    />

    <hr class="mt-4" />

    <div class="text-red-500 text-center mt-2" v-if="error">{{ error }}</div>

    <div class="flex items-center justify-between mt-4">
      <button class="btn-3" @click.prevent="emit('clickBack')">Cancel</button>
      <button class="btn-2">Save</button>
    </div>
  </form>
</template>
