import { ObjectWithId } from './object-with-id'

export interface Workspace extends ObjectWithId {
  name: string
  description: string
  owner?: number
  owner_username?: string
  members: number[]
  settings: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface Project extends ObjectWithId {
  workspace: number
  workspace_name?: string
  name: string
  key: string
  description: string
  owner?: number
  lead?: number
  lead_username?: string
  members: number[]
  created_at?: string
  updated_at?: string
}

export interface ProjectLabel extends ObjectWithId {
  project: number
  name: string
  color: string
}

export interface ProjectCycle extends ObjectWithId {
  project: number
  name: string
  starts_at: string
  ends_at: string
  is_active: boolean
  completed_issues?: number
  total_issues?: number
  progress?: number
}

export interface ProjectModule extends ObjectWithId {
  project: number
  name: string
  description: string
  target_date?: string
  completed_issues?: number
  total_issues?: number
  progress?: number
}

export type ProjectTaskPriority = 'urgent' | 'high' | 'medium' | 'low'
export type ProjectTaskStatus = 'open' | 'completed' | 'in_progress' | 'cancel'

export interface ProjectTask extends ObjectWithId {
  project: number
  title: string
  description: string
  assignee?: number
  assignee_username?: string
  created_by?: number
  created_by_username?: string
  status: ProjectTaskStatus
  status_display?: string
  priority: ProjectTaskPriority
  labels: number[]
  cycle?: number
  module?: number
  estimate: number
  start_date?: string
  due_date?: string
  completed_at?: string
  subtasks_total?: number
  subtasks_completed?: number
  subtasks_progress?: number
  created_at?: string
  updated_at?: string
}

export type ProjectIssuePriority = ProjectTaskPriority
export type ProjectIssue = ProjectTask

export interface ProjectSubTask extends ObjectWithId {
  task: number
  title: string
  description: string
  assignee?: number
  assignee_username?: string
  created_by?: number
  created_by_username?: string
  status: ProjectTaskStatus
  status_display?: string
  start_date?: string
  due_date?: string
  estimate: number
  position: number
  completed_at?: string
  created_at?: string
  updated_at?: string
}

export type IntakeRequestStatus = 'open' | 'accepted' | 'declined'

export interface IntakeRequest extends ObjectWithId {
  project: number
  title: string
  description: string
  requester?: number
  requester_username?: string
  source_department: string
  status: IntakeRequestStatus
  review_comment: string
  accepted_issue?: number
  created_at?: string
  updated_at?: string
}
