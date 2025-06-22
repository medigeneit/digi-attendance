export type TaskUser = {
  id: number
  name: string
  label: string
  photo: string
  task_weight: number
}

export type TaskUserWithProgress = TaskUser & {
  task_progress: number
  user_progress: number
  started_at: string
  finished_at: string
}
