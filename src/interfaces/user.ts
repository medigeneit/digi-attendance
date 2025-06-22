export type TaskUser = {
  id: number
  name: string
  label: string
  photo: string
  task_weight: number
}

export type TaskUserWithProgress = {
  id: number
  name: string
  label: string
  photo: string
  task_weight: number
  task_progress: number
  user_progress: number
}
