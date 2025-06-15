<script setup>
import { getUserInitials } from '@/libs/user.js'
import { computed, ref } from 'vue'

const props = defineProps({
  user: Object,
  size: { type: String },
})

const showUserPhoto = ref(true)

const userInitial = computed(() => (props.user ? getUserInitials(props.user) : ''))
</script>

<template>
  <div class="min-w-max rounded-full object-cover overflow-hidden border">
    <div
      class="flex rounded-full overflow-hidden h-full aspect-square max-h-8 bg-teal-600 items-center justify-center"
    >
      <img
        v-if="user && user.photo && showUserPhoto"
        @error="showUserPhoto = false"
        :src="user.photo"
        :alt="userInitial"
      />
      <span v-else class="text-white font-bold pt-2 p-2">{{ userInitial }}</span>
    </div>
  </div>
</template>
