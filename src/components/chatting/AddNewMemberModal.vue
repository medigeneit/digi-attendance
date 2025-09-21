<!-- AddNewConversationModal.vue -->
<script setup>
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import UserPicker from './add-conversation/UserPicker.vue'

const chatStore = useChatStore()
const authStore = useAuthStore()

const router = useRouter()

const companyId = ref('')
const departmentId = ref('')

const selectedUserIds = ref([])
const errorMsg = ref('')

// helpers
const closeModal = () => {
  chatStore.openAddMemberModal = false
  resetAll()
}

function resetAll() {
  companyId.value = ''
  departmentId.value = ''

  selectedUserIds.value = []
  errorMsg.value = ''
}

// submit
async function submit() {
  errorMsg.value = ''

  if (selectedUserIds.value?.length == 0) {
    errorMsg.value = 'User নির্বাচন করুন।'
    return
  }

  if (chatStore.activeConversationId) {
    const conversationId = await chatStore.addConversationMembers(chatStore.activeConversationId, {
      user_ids: selectedUserIds.value,
    })
  }

  chatStore.openAddMemberModal = false
}

onMounted(async () => {
  if (chatStore.activeConversationId) {
    await chatStore.fetchConversationById(chatStore.activeConversationId)
  }
})
</script>

<template>
  <div
    v-if="
      chatStore.openAddMemberModal &&
      chatStore.activeConversationId &&
      chatStore.activeConversation.type === 'group' &&
      ['admin', 'super_admin', 'developer'].includes(authStore.user?.role)
    "
    class="fixed inset-0 w-screen h-screen bg-black/50 flex justify-center items-center z-[9999999]"
  >
    <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90%] overflow-y-auto">
      <div class="flex justify-between items-center">
        <h2 class="text-xl text-center">Add New Members</h2>

        <button
          class="bg-sky-600 text-white border-sky-600 cursor-pointer px-6 py-1 border rounded-lg transition font-bold"
        >
          <i class="fas fa-users"></i>
          Group
        </button>
      </div>

      <hr class="mt-4" />

      <form class="space-y-3 mt-3" @submit.prevent="submit">
        <!-- ✅ Filter + Users picker এক কম্পোনেন্টেই -->
        <UserPicker
          mode="group"
          v-model:company-id="companyId"
          v-model:department-id="departmentId"
          v-model:selectedUserIds="selectedUserIds"
          :alreadyAddedUserIds="chatStore.conversation?.user_ids || []"
        />

        <p v-if="errorMsg" class="text-red-600 text-sm">
          {{ errorMsg }}
        </p>

        <hr />

        <div class="flex justify-between">
          <button
            type="button"
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            @click="closeModal"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-60"
            :disabled="selectedUserIds.length < 1"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
