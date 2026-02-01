<script setup>
import RequirementTaskList from '@/components/tasks/RequirementTaskList.vue'
import TaskHeader from '@/components/tasks/TaskHeader.vue'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const taskListRef = ref(null)

const showOnlyMyTasks = computed(() => route.name === 'MyRequirementTaskList')

const taskFilters = computed({
  get() {
    return { ...route.query }
  },
  set(value) {
    router.push({ query: { ...value } })
  },
})

function handleUpdateTaskFilter(newFilter) {
  router.push({ query: { ...newFilter } })
}

function onClickAddTask(params, readonlyValues) {
  if (taskListRef.value && taskListRef.value.openAdd)
    taskListRef.value.openAdd(params, readonlyValues)
}

function onClickPrioritySave() {
  if (taskListRef.value && taskListRef.value.savePriority) taskListRef.value.savePriority()
}

function onClickPriorityDiscard() {
  if (taskListRef.value && taskListRef.value.discardPriority) taskListRef.value.discardPriority()
}
</script>

<template>
  <div
    class="p-6 mt-2 container mx-auto relative bg-white rounded-md shadow-md min-h-[calc(100vh-12rem)]"
  >
    <TaskHeader
      v-model="taskFilters"
      @clickAddTask="onClickAddTask"
      @clickPrioritySave="onClickPrioritySave"
      @clickPriorityDiscard="onClickPriorityDiscard"
      :isMyTask="showOnlyMyTasks"
      class="mb-4"
    />

    <RequirementTaskList
      ref="taskListRef"
      :inContainer="false"
      :taskFilters="taskFilters"
      :showOnlyMyTasks="showOnlyMyTasks"
      @update:taskFilters="handleUpdateTaskFilter"
    />
  </div>
</template>
