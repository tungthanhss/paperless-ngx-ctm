import { NgClass, NgStyle } from '@angular/common'
import { Component, OnInit, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgxBootstrapIconsModule } from 'ngx-bootstrap-icons'
import {
  Project,
  ProjectLabel,
  ProjectState,
  ProjectTask,
  ProjectTaskPriority,
  Workspace,
} from 'src/app/data/project-management'
import { ProjectManagementService } from 'src/app/services/rest/project-management.service'
import { PageHeaderComponent } from '../../../common/page-header/page-header.component'

type TaskView = 'board' | 'list'

@Component({
  selector: 'pngx-project-tasks',
  templateUrl: './tasks.component.html',
  styleUrl: '../project-management.component.scss',
  imports: [
    FormsModule,
    NgClass,
    NgStyle,
    NgxBootstrapIconsModule,
    PageHeaderComponent,
  ],
})
export class ProjectTasksComponent implements OnInit {
  private readonly service = inject(ProjectManagementService)

  loading = false
  workspaces: Workspace[] = []
  projects: Project[] = []
  states: ProjectState[] = []
  labels: ProjectLabel[] = []
  tasks: ProjectTask[] = []
  selectedWorkspaceId: number = null
  selectedProjectId: number = null
  quickAddText = ''
  view: TaskView = 'board'

  ngOnInit(): void {
    this.reloadWorkspaces()
  }

  get completedTasks(): number {
    return this.tasks.filter((task) => this.isCompleted(task)).length
  }

  get progress(): number {
    if (!this.tasks.length) {
      return 0
    }
    return Math.round((this.completedTasks / this.tasks.length) * 100)
  }

  reloadWorkspaces(): void {
    this.loading = true
    this.service.listWorkspaces().subscribe({
      next: (response) => {
        this.workspaces = response.results
        this.selectedWorkspaceId ??= this.workspaces[0]?.id ?? null
        this.reloadProjects()
      },
      error: () => (this.loading = false),
    })
  }

  reloadProjects(): void {
    if (!this.selectedWorkspaceId) {
      this.projects = []
      this.selectedProjectId = null
      this.clearProjectData()
      return
    }
    this.service.listProjects(this.selectedWorkspaceId).subscribe({
      next: (response) => {
        this.projects = response.results
        if (
          !this.projects.some(
            (project) => project.id === this.selectedProjectId
          )
        ) {
          this.selectedProjectId = this.projects[0]?.id ?? null
        }
        this.reloadProjectData()
      },
      error: () => (this.loading = false),
    })
  }

  reloadProjectData(): void {
    if (!this.selectedProjectId) {
      this.clearProjectData()
      return
    }
    const projectId = this.selectedProjectId
    this.loading = true
    this.service.listStates(projectId).subscribe({
      next: (states) => (this.states = states.results),
      error: () => (this.loading = false),
    })
    this.service.listLabels(projectId).subscribe({
      next: (labels) => (this.labels = labels.results),
      error: () => (this.loading = false),
    })
    this.service.listTasks(projectId).subscribe({
      next: (tasks) => {
        this.tasks = tasks.results
        this.loading = false
      },
      error: () => (this.loading = false),
    })
  }

  quickAddTask(): void {
    if (!this.selectedProjectId || !this.quickAddText.trim()) {
      return
    }
    this.service
      .quickAddTask(this.selectedProjectId, this.quickAddText)
      .subscribe({
        next: () => {
          this.quickAddText = ''
          this.reloadProjectData()
        },
        error: () => (this.loading = false),
      })
  }

  moveTask(task: ProjectTask, state: ProjectState): void {
    this.service
      .patch<ProjectTask>('project_issues', { id: task.id, state: state.id })
      .subscribe({
        next: () => this.reloadProjectData(),
        error: () => (this.loading = false),
      })
  }

  setPriority(task: ProjectTask, priority: ProjectTaskPriority): void {
    this.service
      .patch<ProjectTask>('project_issues', { id: task.id, priority })
      .subscribe({
        next: () => this.reloadProjectData(),
        error: () => (this.loading = false),
      })
  }

  tasksForState(state: ProjectState): ProjectTask[] {
    return this.tasks.filter((task) => task.state === state.id)
  }

  stateName(task: ProjectTask): string {
    return (
      task.state_name ||
      this.states.find((state) => state.id === task.state)?.name ||
      ''
    )
  }

  labelName(labelId: number): string {
    return this.labels.find((label) => label.id === labelId)?.name || ''
  }

  labelColor(labelId: number): string {
    return this.labels.find((label) => label.id === labelId)?.color || '#6b7280'
  }

  isCompleted(task: ProjectTask): boolean {
    return this.states.some(
      (state) => state.id === task.state && state.is_completed
    )
  }

  priorityClass(priority: string): string {
    return `priority-${priority}`
  }

  private clearProjectData(): void {
    this.states = []
    this.labels = []
    this.tasks = []
    this.loading = false
  }
}
