<script setup>
import UserChip from '../user/UserChip.vue'

defineProps({
  requirement: { type: Object, default: () => {} },
})
const emit = defineEmits(['reOpenClick'])
</script>

<template>
  <div
    v-if="requirement?.closed_at"
    class="mb-4 flex flex-col gap-2 items-center justify-center bg-gray-50 bg-opacity-70 hover:bg-opacity-90 p-6 border border-gray-100 rounded-md"
  >
    <div class="text-red-400 font-bold text-xl">Requirement Closed</div>
    <div class="text-sm flex items-center gap-2 text-red-400 font-semibold">
      <span class="fad fa-lock"></span>
      <span class="mt-[2px]">CLOSED AT</span>
      <span class="mt-[2px]">
        {{
          new Date(requirement.closed_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
        }}
      </span>
    </div>
    <div class="text-gray-800 flex items-center gap-2" v-if="requirement.closed_by_user">
      <span class="text-sm">Closed by</span>
      <UserChip :user="requirement.closed_by_user" avatar-size="xsmall" />
    </div>
    <div class="text-gray-800 w-full my-2 text-center" v-if="requirement.closing_note">
      <div class="text-x">Closing Note</div>
      <div
        class="text-gray-800 border w-full rounded-md border-dashed py-2 px-3 border-gray-400 text-sm bg-white"
      >
        <p v-html="requirement.closing_note"></p>
      </div>
    </div>
    <div class="flex gap-4 items-center justify-center mt-2">
      <button class="btn-2 h-8" @click.prevent="emit('reOpenClick')">Re Open</button>
    </div>
  </div>
</template>
