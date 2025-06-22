import { TaskReport, TaskWithChildren } from '@/interfaces/task'
import type { TaskUser, TaskUserWithProgress } from '@/interfaces/user.ts'

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
