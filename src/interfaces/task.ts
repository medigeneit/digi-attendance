import type { TaskUser } from '@/interfaces/user.ts'

export type Task = {
  id: number
  parent_id: number
  title: string
  is_important: boolean
  is_urgent: boolean
  is_target: boolean
  description: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED' | 'BACK_LOG'
  priority: number
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  requirement_id?: number
  requirement?: object
  users: TaskUser[]
  task_reports: TaskReport[]
  todos?: []
  comments?: []
  created_at: string
  updated_at: string
}

export type TaskWithChildren = Task & {
  children_tasks: TaskWithChildren[]
}

export type TaskReport = {
  duration_hour: number
  duration_minute: number
  id: number
  progress: number
  report_date: string
  title: string
  user: TaskUser
  user_id: number
}
