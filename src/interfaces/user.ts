export type TaskUser = {
  id: number
  name: string
  label: string
  photo: string
  task_weight: number
  task_started_at: string
  task_finished_at: string
}

export type TaskUserWithProgress = TaskUser & {
  task_progress: number
  user_progress: number
}

export type TaskUserWithTaskCount = TaskUser & {
  sub_task_infos: SubTaskInfo[]
  assigned_on_any_leaf_task: boolean
}

export type SubTaskInfo = {
  user_id: number
  total_assigned: number
  total_assigned_on_leaf_task: number
  completed_count: number
}
