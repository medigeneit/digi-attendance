import { onlyDate } from "./datetime"

export const dateWiseTaskList = ( tasks, _day, _month, _year ) => {
  const selectedDate = new Date(_year, _month - 1, _day)
  return tasks
    .filter((task) => {
      const deadline = task.deadline ? new Date(task.deadline) : null
      const todayDate = onlyDate(new Date())

      if (task.assigned_at || task.created_at) {
        let assignDate = task.assigned_at ? onlyDate(new Date(task.assigned_at)) : null

        if (!assignDate && task.created_at) {
          assignDate = onlyDate(new Date(task.created_at))
        }

        let taskCompletedDate = null

        if (selectedDate < assignDate) {
          return false
        }

        if (task.completed_at) {
          taskCompletedDate = onlyDate(new Date(task.completed_at))
        }

        if (taskCompletedDate && taskCompletedDate < selectedDate) {
          return false
        }

        if (deadline && deadline < selectedDate && selectedDate > todayDate) {
          return false
        }

        return true
      }

      return false
    })
    .map((task) => {
      let deadline_crossed = false
      if (task.deadline) {
        deadline_crossed = new Date(task.deadline) < selectedDate
      }

      return {
        ...task,
        deadline_crossed,
      }
    })
}
