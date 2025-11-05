<script setup>
import { closeRequirement, reOpenRequirement } from '@/services/requirement'
import { computed, ref } from 'vue'

const props = defineProps({
  loading: { type: Boolean, default: false },
  requirement: { type: Object, default: () => {} },
})
const emit = defineEmits(['clickCancel', 'updateStatus', 'error', 'update:loading'])

const isLoading = computed({
  get: () => props.loading,
  set: () => emit('update:loading'),
})

const note = ref('')

const error = ref('')

const acceptedCharacterCount = ref(255)
const remainingCharacter = computed(() => {
  return acceptedCharacterCount.value - note.value.length
})

async function handleStatusSubmit() {
  isLoading.value = true
  try {
    if (props.requirement?.closed_at) {
      await reOpenRequirement(props.requirement.id, note.value)
    } else {
      await closeRequirement(props.requirement.id, note.value)
    }

    emit('updateStatus')
  } catch (err) {
    error.value = err.response?.data?.message
    emit('error')
  } finally {
    isLoading.value = false
  }
}
</script>
<template>
  <form class="p-4 rounded relative border" @submit.prevent="handleStatusSubmit">
    <LoaderView
      v-if="isLoading"
      class="absolute inset-0 flex items-center justify-center bg-opacity-90"
    >
      Submitting!
    </LoaderView>
    <h3 class="border-b -mx-4 px-4 -mt-4 py-2 text-xl bg-gray-50">
      {{ requirement?.closed_at ? 'Re Open Requirement' : 'Requirement Closing' }}
    </h3>
    <div class="my-6">
      <div class="text-center font-semibold text-blue-800 mb-4">
        {{ requirement?.title }}
      </div>
      <div class="text-center my-1 text-lg">Are you sure?</div>
      <div class="text-center my-1">
        Want to
        <span
          class="border px-2 rounded-md bg-gray-50 border-blue-300 text-blue-400 inline-flex items-center gap-1"
        >
          {{ requirement?.closed_at ? 'Re-Open' : 'Close' }}
        </span>
        the requirement?
      </div>

      <div class="mt-4">
        <textarea
          v-model="note"
          rows="4"
          :placeholder="`Write about why are you ${requirement?.closed_at ? 'Re-Opening' : 'Closing'} the requirement?`"
          class="w-full border rounded-lg p-2 text-gray-700 border-gray-400 placeholder:text-gray-400"
          :required="currentAction === 'reject'"
          @input="
            note.length > acceptedCharacterCount
              ? (note = note.slice(0, acceptedCharacterCount))
              : null
          "
        ></textarea>
        <div class="flex">
          <div
            class="ml-auto inline-block text-sm text-gray-500"
            :class="note.length >= acceptedCharacterCount ? 'text-red-500' : ''"
          >
            left {{ remainingCharacter }}/{{ acceptedCharacterCount }} words
          </div>
        </div>
      </div>
    </div>
    <hr class="mt-3 -mx-4" />
    <div>
      <div class="text-red-600 text-center mt-2 text-sm">{{ error }}</div>
      <div class="flex justify-between mt-3">
        <button class="btn-3" @click.prevent="emit('clickCancel')">Cancel</button>
        <button class="btn-2">
          {{ requirement?.closed_at ? 'Re-Open' : 'Close' }}
        </button>
      </div>
    </div>
  </form>
</template>
