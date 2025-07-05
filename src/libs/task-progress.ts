import { TaskReport, TaskWithChildren } from '@/interfaces/task'
import type {
  SubTaskInfo,
  TaskUser,
  TaskUserWithProgress,
  TaskUserWithTaskCount,
} from '@/interfaces/user.ts'

export const getTaskUserTotalWeight = (taskUsers: TaskUser[]): number => {
  return taskUsers?.reduce<number>((w, u) => w + u.task_weight, 0)
}

export const getTaskProgressUsers = (
  taskUsers: TaskUser[],
  taskReports: TaskReport[],
): TaskUserWithProgress[] => {
  const taskTotalWeight: number = getTaskUserTotalWeight(taskUsers)

  return taskUsers.map((user: TaskUser) => {
    const userProgress: number = taskReports
      .filter((report: TaskReport) => report.user_id === user.id)
      .reduce<number>((sum, report: TaskReport) => {
        return sum + report.progress
      }, 0)

    return {
      ...user,
      task_progress: Math.floor(userProgress * (user.task_weight / taskTotalWeight)),
      user_progress: userProgress,
    }
  })
}

export const getSubTaskProgress = (tasksWithChildren: TaskWithChildren) => {
  if (tasksWithChildren.children_tasks.length === 0) {
    return tasksWithChildren.status === 'COMPLETED' ? 1 : 0
  }

  const getChildrenCompletedCount = (childrenTasks: TaskWithChildren[]) => {
    let count = 0

    for (let i = 0; i < childrenTasks.length; i++) {
      const child = childrenTasks[i]

      if (child.children_tasks.length === 0) {
        if (child.status === 'COMPLETED') count += 1
      } else {
        // Recursive call

        const completed = getChildrenCompletedCount(child.children_tasks)
        if (completed === child.children_tasks.length) count += 1
      }
    }

    return count
  }

  return {
    completed: getChildrenCompletedCount(tasksWithChildren.children_tasks),
  }
}

const getUserSubTaskCount = (subTasks: TaskWithChildren[], userId: number) => {
  let leaf_task_completed_count = 0,
    assigned_on_any_leaf_task_count = 0

  const sub_task_infos: SubTaskInfo[] = []

  const userCompleted = (subTask: TaskWithChildren) => {
    return subTask.status === 'COMPLETED'
  }

  const userAssigned = (subTask: TaskWithChildren) => {
    return subTask.users.some((user) => user.id === userId)
  }

  const calculateSubTask = (subTasks: TaskWithChildren[], level: number) => {
    subTasks.forEach((subTask: TaskWithChildren) => {
      const user_assigned = userAssigned(subTask)

      sub_task_infos[level] = sub_task_infos[level] || {
        user_id: userId,
        total_assigned: 0,
        total_assigned_on_leaf_task: 0,
        completed_count: 0,
      }

      const assignedOnLeaf = user_assigned && subTask.children_tasks.length === 0

      sub_task_infos[level].total_assigned += user_assigned ? 1 : 0
      sub_task_infos[level].total_assigned_on_leaf_task += assignedOnLeaf ? 1 : 0
      assigned_on_any_leaf_task_count += assignedOnLeaf ? 1 : 0

      if (user_assigned && userCompleted(subTask)) {
        sub_task_infos[level].completed_count++

        if (subTask.children_tasks.length === 0) {
          leaf_task_completed_count++
        }
      }

      if (subTask.children_tasks.length > 0) {
        calculateSubTask(subTask.children_tasks, level + 1)
      }
    })
  }

  calculateSubTask(subTasks, 0)

  return {
    sub_task_infos,
    assigned_on_any_leaf_task: assigned_on_any_leaf_task_count > 0,
  }
}

export const getSubTasksProgressUsers = (
  taskUsers: TaskUser[],
  subTasks: TaskWithChildren[],
): TaskUserWithTaskCount[] => {
  return taskUsers.map((user) => {
    return {
      ...user,
      ...getUserSubTaskCount(subTasks, user.id),
    }
  })
}
