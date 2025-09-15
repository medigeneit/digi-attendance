<script setup>
import { getUserInitials } from '@/libs/user.js'
import { computed, ref } from 'vue'

const props = defineProps({
  user: Object,
  size: { type: String, default: 'small' },
})

const showUserPhoto = ref(true)

const userInitial = computed(() => (props.user ? getUserInitials(props.user) : ''))
</script>

<template>
  <div class="min-w-max">
    <div
      class="flex justify-center items-center text-[#24A1DE] bg-white rounded-full overflow-hidden border border-white"
      :class="{
        'size-4 text-[9px]': size?.trim() == 'xsmall',
        'size-6 text-xs': size?.trim() == 'small',
        'size-9 text-base': size?.trim() == 'medium',
        'size-12 text-xl': size?.trim() == 'large',
        'size-14 text-2xl': size?.trim() == 'xlarge',
      }"
    >
      <img
        v-if="user && user.photo && showUserPhoto"
        @error="showUserPhoto = false"
        :src="user.photo"
        :alt="userInitial"
        class="object-cover w-full h-full"
      />
      <span v-else class="text-white font-bold pt-2 p-2">{{ userInitial }}</span>
    </div>
  </div>
</template>
