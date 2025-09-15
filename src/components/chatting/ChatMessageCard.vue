<script setup>
import { useAuthStore } from '@/stores/auth'
import { computed } from 'vue'
import UserAvatar from '../UserAvatar.vue'

const authStore = useAuthStore()

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
})

const isOwnMessage = computed(() => {
  return parseInt(props.message?.sender?.id) === parseInt(authStore?.user?.id)
})
</script>

<template>
  <div
    class="w-full flex"
    :class="{
      'justify-end pl-12': isOwnMessage,
      'justify-start pr-12': !isOwnMessage,
    }"
  >
    <div>
      <div class="border rounded-lg max-w-lg w-full">
        <div
          class="flex justify-between items-center p-1 rounded-t-lg"
          :class="{
            'bg-[#24A1DE] text-white': isOwnMessage,
            'bg-gray-200 text-black': !isOwnMessage,
          }"
        >
          <div class="flex items-center gap-1">
            <UserAvatar :user="message.sender" size="small" />
            <div class="font-semibold hidden sm:inline-block text-sm">
              {{ message.sender.name }}
            </div>
          </div>
          <div class="text-xs mt-1" :class="isOwnMessage ? 'text-right' : 'text-left'">
            {{ new Date(message.created_at).toLocaleString() }}
          </div>
        </div>
        <div class="block py-1 px-2 rounded-b-lg bg-white text-sm whitespace-pre-wrap break-words">
          {{ message.body }}
        </div>
      </div>
      <div
        class="flex"
        :class="{
          'justify-end': isOwnMessage,
          'justify-start': !isOwnMessage,
        }"
      >
        <div
          class="flex flex-wrap gap-1 max-w-[280px] pt-1"
          :class="{
            'justify-end': isOwnMessage,
            'justify-start': !isOwnMessage,
          }"
        >
          <template
            v-for="last_read_participant in message.last_read_participants"
            :key="last_read_participant.id"
          >
            <UserAvatar
              v-if="last_read_participant?.user?.id"
              :user="last_read_participant.user"
              size="xsmall"
            />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
