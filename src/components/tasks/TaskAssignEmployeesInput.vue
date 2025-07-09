<script setup>
import DraggableList from '../common/DraggableList.vue'
import MultiselectDropdown from '../MultiselectDropdown.vue'
import UserChip from '../user/UserChip.vue'

const props = defineProps({
  selectedUsers: { type: Array, default: () => [] },
  employees: { type: Array, required: true },
})

const emit = defineEmits(['updateValues'])

function handlePriorityUpdate(items) {
  emit('updateValues', items)
}
</script>

<template>
  <MultiselectDropdown
    :modelValue="selectedUsers"
    @update="handlePriorityUpdate"
    :options="employees"
    :multiple="true"
    track-by="id"
    label="label"
    placeholder="Select users"
  >
    <template #selection="{ ...attrs }">
      <DraggableList
        :items="attrs?.values || []"
        handle="handle"
        class="mb-2 flex flex-wrap gap-x-4 gap-y-3"
        @itemsUpdate="handlePriorityUpdate"
      >
        <!-- @itemsUpdate="handleItemsPriorityUpdate" -->
        <!-- ref="draggableTaskList" -->
        <template #item="{ item: user, index }">
          <UserChip
            :user="user"
            class=""
            :avatarClass="{ '!h-8 !w-8 !bg-green-500': index == 0 }"
            :class="{ 'mr-auto w-full h-10 border-blue-500 !bg-blue-100': index == 0 }"
          >
            <template #name-bottom v-if="index == 0">
              <div class="text-blue-500">Responsible Employee</div>
            </template>
            <template #after="{ user }">
              <div class="ml-auto flex gap-1" v-if="index === 0">
                <span
                  class="size-8 border rounded-full bg-blue-200 text-blue-800 border-blue-300 text-center flex items-center justify-center"
                >
                  <i class="fad fa-user-crown text-xl"></i>
                </span>
              </div>
              <div class="ml-auto flex gap-1" v-if="index > 0">
                <button
                  class="size-6 border rounded-full hover:bg-red-400 hover:text-white"
                  @click.prevent="selectedUsers = selectedUsers.filter((su) => su.id !== user.id)"
                >
                  &times;
                </button>
                <button
                  class="size-6 border rounded-full bg-red-200 text-red-800 border-red-300 hover:bg-red-400 hover:text-white handle"
                >
                  <i class="fad fa-arrows"></i>
                </button>
              </div>
            </template>
          </UserChip>
        </template>
      </DraggableList>

      <!-- <pre>{{ attrs }}</pre> -->
    </template>
    <template #option="{ option: user }">
      <UserChip :user="user" />
    </template>
  </MultiselectDropdown>
</template>
