<script setup>
import { findRequirement, updateRequirementFeedback } from '@/services/requirement'
import { onMounted, ref } from 'vue'
import LoaderView from '../common/LoaderView.vue'
import DescriptionView from '../DescriptionView.vue'
import TextEditor from '../TextEditor.vue'

const props = defineProps({
  requirementId: {
    type: [Number, String],
    required: true,
  },
})

const emit = defineEmits(['update', 'closeClick', 'error'])

const formContainerRef = ref()
const requirement = ref(null)
const state = ref('')
const error = ref()
const form = ref({
  feedback: '',
})

async function submit() {
  state.value = 'submitting'

  try {
    const response = await updateRequirementFeedback(props.requirementId, form.value.feedback)
    emit('update', response)
    state.value = 'create'
  } catch (err) {
    state.value = 'error'
    error.value = err.response?.data?.message || 'Failed to update requirement requirement'
    emit('error', error.value)
  }
}

onMounted(async () => {
  state.value = 'loading'
  try {
    await findRequirement(props.requirementId)

    requirement.value = (await findRequirement(props.requirementId)).data?.requirement
    form.value = {
      feedback: requirement.value?.feedback,
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to fetch requirement requirement'
  } finally {
    state.value = ''
  }
})
</script>

<template>
  <div
    ref="formContainerRef"
    class="max-h-[90vh] w-full mx-auto overflow-auto bg-white shadow-lg rounded-lg p-6 pb-0 pt-0 relative"
  >
    <div class="sticky top-0 pt-4 bg-white z-10">
      <h2 class="text-2xl font-semibold text-gray-800">Requirement Feedback</h2>
      <hr class="mb-4" />
      <div
        class="text-purple-600/80 mb-4 text-xs border-b border-dashed"
        @click.prevent="emit('ok')"
      >
        Fields that must be filled in will be marked with an asterisk.
      </div>
    </div>

    <form @submit.prevent="submit" class="z-0">
      <template v-if="state !== 'loading'">
        <div class="mb-4">
          <label class="block text-gray-600 text-sm font-medium">Title </label>
          <DescriptionView
            line-clamp="1"
            :className="{
              paragraph: 'whitespace-pre-wrap text-justify ',
              button: 'mt-0',
            }"
          >
            {{ requirement?.title }}
          </DescriptionView>
        </div>

        <div class="mb-4">
          <label class="block text-gray-600 text-sm mb-1 font-medium">Feedback</label>
          <TextEditor v-model="form.feedback" />
          <!-- <textarea
            rows="5"
            v-model="form.feedback"
            placeholder="Enter requirement feedback"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          ></textarea> -->
        </div>
      </template>

      <div class="sticky bottom-0 bg-white py-4 border-t -mx-6 px-6">
        <div v-if="error" class="mb-4 text-red-500 font-medium">
          {{ error }}
        </div>
        <hr v-if="error" class="mb-4" />

        <div class="flex items-center justify-between gap-4">
          <button type="button" @click.prevent="emit('closeClick')" class="btn-3">Cancel</button>
          <button
            :disabled="state == 'loading' || state == 'submitting'"
            type="submit"
            class="btn-2"
          >
            {{
              state == 'submitting'
                ? 'Saving...'
                : requirement?.feedback
                  ? 'Update Feedback'
                  : 'Add Feedback'
            }}
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
