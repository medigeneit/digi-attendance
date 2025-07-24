<script setup>
import { deleteRequirementDetail, findRequirementDetail } from '@/services/requirement-detail'
import { useUserStore } from '@/stores/user'
import { onMounted, ref } from 'vue'
import LoaderView from '../common/LoaderView.vue'

const props = defineProps({
  requirementId: {
    type: [Number, String],
    required: true,
  },
  detailId: {
    type: [Number, String],
    required: true,
  },
})

const emit = defineEmits(['delete', 'closeClick', 'error'])

const userStore = useUserStore()
const detail = ref(null)
const state = ref('')
const error = ref()
const employees = ref([])

async function submit() {
  state.value = 'submitting'

  try {
    const response = await deleteRequirementDetail(props.requirementId, props.detailId)
    emit('delete', response)
    state.value = 'create'
  } catch (err) {
    state.value = 'error'
    error.value = err.response?.data?.message || 'Failed to update requirement detail: ' + err
    emit('error', error.value)
  }
}
onMounted(async () => {
  state.value = 'loading'
  try {
    employees.value = await userStore.fetchDepartmentWiseEmployees()
    detail.value = (await findRequirementDetail(props.requirementId, props.detailId)).data?.detail
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to fetch requirement detail'
  } finally {
    state.value = ''
  }
})
</script>

<template>
  <div
    class="max-h-[90vh] overflow-auto w-full mx-auto bg-white shadow-lg rounded-lg p-6 pb-0 pt-0 relative"
  >
    <div class="sticky top-0 -mx-6 px-6 z-10 bg-gray-50">
      <h2 class="text-xl font-semibold text-gray-800 py-2">Delete Requirement Details</h2>
      <hr class="mb-4 -mx-6" />
    </div>

    <form @submit.prevent="submit" class="z-0">
      <template v-if="state !== 'loading'">
        <div class="mb-4">
          <div class="block text-gray-600 text-sm mb-1 font-medium">Title</div>
          <div class="font-semibold">{{ detail?.title }}</div>
        </div>
        <div class="mb-4">
          <div class="block text-gray-600 text-sm mb-1 font-medium">Description</div>
          <div class="line-clamp-2">{{ detail?.description }}</div>
        </div>

        <div class="my-8 text-center text-xl text-red-600">Are you sure want to delete?</div>
      </template>
      <div v-else class="min-h-40"></div>

      <div class="sticky bottom-0 bg-white py-4 border-t -mx-6 px-6">
        <div v-if="error" class="mb-4 text-red-500 font-medium">
          {{ error }}
        </div>
        <hr v-if="error" class="mb-4" />

        <div class="flex items-center justify-between gap-4">
          <button
            type="button"
            @click.prevent="emit('closeClick')"
            class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded transition"
          >
            Cancel
          </button>
          <button
            :disabled="state == 'loading' || state == 'submitting'"
            type="submit"
            class="bg-red-700 hover:bg-red-500 text-white font-semibold px-5 py-2 rounded transition"
          >
            {{ state == 'submitting' ? 'Deleting...' : 'Delete' }}
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
