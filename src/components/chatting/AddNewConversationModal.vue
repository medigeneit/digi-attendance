<!-- AddNewConversationModal.vue -->
<script setup>
import { useChatStore } from '@/stores/chat'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import ConversationTypeSelector from './add-conversation/ConversationTypeSelector.vue'
import GroupTitleInput from './add-conversation/GroupTitleInput.vue'
import UserPicker from './add-conversation/UserPicker.vue'

const TYPES = { DIRECT: 'direct', GROUP: 'group' }

const chatStore = useChatStore()

const router = useRouter()

// state
const conversationType = ref('')
const companyId = ref('')
const departmentId = ref('')
const groupTitle = ref('')
const selectedUserIds = ref([])
const errorMsg = ref('')

// helpers
const closeModal = () => {
  chatStore.openAddModal = false
  resetAll()
}

function resetAll() {
  conversationType.value = ''
  companyId.value = ''
  departmentId.value = ''
  groupTitle.value = ''
  selectedUserIds.value = []
  errorMsg.value = ''
}

// submit
async function submit() {
  errorMsg.value = ''
  if (!conversationType.value) {
    errorMsg.value = 'দয়া করে Conversation টাইপ নির্বাচন করুন।'
    return
  }
  if (selectedUserIds.value?.length == 0) {
    errorMsg.value = 'User নির্বাচন করুন।'
    return
  }

  // 👉 এখানে আপনার create conversation API কল করুন
  // direct: selectedUserIds.value.length === 1
  // group : groupTitle.value && selectedUserIds.value.length >= 2

  const conversationId = await chatStore.createConversation({
    type: conversationType.value,
    title: conversationType.value == 'group' ? groupTitle.value : '',
    user_ids: selectedUserIds.value,
  })

  chatStore.openAddModal = false

  router.push({
    name: 'Conversation Message',
    params: { conversationId },
  })

  chatStore.fetchUserConversations()
}
</script>

<template>
  <div
    v-if="chatStore.openAddModal"
    class="fixed inset-0 w-screen h-screen bg-black/50 flex justify-center items-center z-[9999999]"
  >
    <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[100vh] md:max-h-[90%] overflow-y-auto">
      <div class="flex flex-col gap-y-2 md:flex-row justify-between items-center">
        <h2 class="text-xl text-center font-semibold">Add New Conversation</h2>

        <ConversationTypeSelector
          v-model="conversationType"
          :onSelect="() => (selectedUserIds = [])"
        />
      </div>

      <hr class="mt-4" />

      <div v-if="!conversationType" class="mt-4">
        <div class="rounded-md border border-dashed p-4 text-center text-gray-600">
          <div class="py-4 text-xl leading-loose">
            Conversation টাইপ (Direct / Group) সিলেক্ট করুন, <br />
            তারপর নিচে ফিল্টার দেখাবে।
          </div>
          <p class="pb-1">অথবা,</p>
          <button
            type="button"
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            @click="closeModal"
          >
            Cancel
          </button>
        </div>
      </div>

      <form v-else class="space-y-3 mt-3" @submit.prevent="submit">
        <GroupTitleInput v-if="conversationType === TYPES.GROUP" v-model="groupTitle" />

        <!-- ✅ Filter + Users picker এক কম্পোনেন্টেই -->
        <UserPicker
          :mode="conversationType"
          v-model:company-id="companyId"
          v-model:department-id="departmentId"
          v-model:selectedUserIds="selectedUserIds"
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
            :disabled="
              conversationType === TYPES.DIRECT
                ? selectedUserIds.length !== 1
                : !groupTitle.trim() || selectedUserIds.length < 2
            "
          >
            Create
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
