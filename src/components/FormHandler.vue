<script setup>
const props = defineProps({
  isSubmitting: { type: Boolean, default: false },
  isLoading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['submit', 'clickCancel'])
</script>

<template>
  <form @submit.prevent="emit('submit')">
    <slot></slot>
    <div class="bg-white border-t px-4 py-4 sticky bottom-0 rounded-b-md">
      <div v-if="error" class="mb-4 text-red-500 font-medium">
        {{ error }}
      </div>
      <div v-if="isSubmitting" class="mb-4 text-blue-500 font-medium">Saving changes...</div>

      <slot name="footer">
        <div class="flex justify-between items-center gap-4">
          <button type="button" @click="emit('clickCancel')" class="btn-3">Cancel</button>
          <button :disabled="isSubmitting || isLoading" type="submit" class="btn-2">
            {{ isSubmitting ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </slot>
    </div>
  </form>
</template>
