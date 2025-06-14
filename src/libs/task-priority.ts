import { useTaskStore } from '@/stores/useTaskStore'
import { computed, ref } from 'vue'

export default function useTaskPriorityUpdate(getOldTaskList: Function, parentId: number = 0) {
  const rearrangedTaskIds = ref<number[]>([])
  const { updateTaskPriorities } = useTaskStore()

  const oldTaskList = computed<object[]>(() => {
    console.log({ getOldTaskList })
    return getOldTaskList()
  })

  function handleItemsPriorityUpdate(taskItems: object[]) {
    const oldIds: number[] = oldTaskList.value.map((item) => item.id)
    const newIds: number[] = taskItems.map((it) => it.id)

    if (isReordered(oldIds, newIds)) {
      rearrangedTaskIds.value = newIds
    } else {
      rearrangedTaskIds.value = []
    }
    console.log({ reordered: isReordered(oldIds, newIds) })
  }

  function isReordered(oldArray: number[], newArray: number[]) {
    if (oldArray.length !== newArray.length) return false // assume same items

    for (let i = 0; i < oldArray.length; i++) {
      if (oldArray[i] !== newArray[i]) {
        return true // found a different position
      }
    }

    return false // all items are in the same order
  }

  function discardTaskPriority() {
    rearrangedTaskIds.value = []
  }

  async function saveTaskPriority() {
    const response = await updateTaskPriorities(parentId, rearrangedTaskIds.value)
    rearrangedTaskIds.value = []
    return response
  }

  const listHasRearranged = computed<boolean>(() => rearrangedTaskIds.value.length > 0)

  return {
    handleItemsPriorityUpdate,
    saveTaskPriority,
    listHasRearranged,
    discardTaskPriority,
  }
}
