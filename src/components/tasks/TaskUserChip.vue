<script setup>
import { computed } from 'vue'
import UserChip from '../user/UserChip.vue'

const props = defineProps({
  user: Object,
  isRemovable: { type: Boolean, default: true },
  isSortable: { type: Boolean, default: false },
  /**
   *employee, main-employee, supervisor
   */
  userType: { type: String, default: 'employee' }, //employee, main-employee, supervisor
})

const emit = defineEmits(['removeClick'])

const mainClass = computed(() => {
  return {
    'mr-auto w-full h-10 border-blue-500 !bg-blue-100': props.userType === 'main-employee',
  }
})

const avatarClass = computed(() => {
  return {
    '!h-8 !w-8 !bg-green-500': props.userType === 'main-employee',
  }
})
</script>

<template>
  <UserChip :user="user" :class="mainClass" :avatarClass="avatarClass">
    <template #user-bottom v-if="userType === 'main-employee'">
      <div class="text-blue-500">Responsible Employee</div>
    </template>

    <template #after>
      <div class="ml-auto flex gap-1">
        <span
          v-if="userType === 'main-employee'"
          class="size-8 border rounded-full bg-blue-200 text-blue-800 border-blue-300 text-center flex items-center justify-center"
        >
          <i class="fas fa-user-crown text-xl"></i>
        </span>

        <button
          v-if="isRemovable"
          class="size-6 border rounded-full hover:bg-red-400 hover:text-white"
          @click.prevent="emit('removeClick', user)"
        >
          &times;
        </button>
        <button
          type="button"
          v-if="isSortable && userType !== 'supervisor'"
          class="size-6 border rounded-full bg-red-100 text-red-400 border-red-200 hover:text-red-800 hover:bg-red-200 handle"
        >
          <i class="fas fa-arrows"></i>
        </button>
      </div>
    </template>
  </UserChip>
</template>
