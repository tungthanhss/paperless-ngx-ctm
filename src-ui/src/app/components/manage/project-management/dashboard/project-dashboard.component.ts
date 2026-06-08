import { Component, OnInit, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgxBootstrapIconsModule } from 'ngx-bootstrap-icons'
import {
  Project,
  ProjectTask,
  Workspace,
} from 'src/app/data/project-management'
import { ProjectManagementService } from 'src/app/services/rest/project-management.service'
import { PageHeaderComponent } from '../../../common/page-header/page-header.component'

interface TaskTrendPoint {
  date: string
  label: string
  inProgress: number
  completed: number
  x: number
  inProgressY: number
  completedY: number
}

@Component({
  selector: 'pngx-project-dashboard',
  templateUrl: './project-dashboard.component.html',
  styleUrl: '../project-management.component.scss',
  imports: [FormsModule, NgxBootstrapIconsModule, PageHeaderComponent],
})
export class ProjectDashboardComponent implements OnInit {
  private readonly service = inject(ProjectManagementService)

  loading = true
  workspaces: Workspace[] = []
  projects: Project[] = []
  tasks: ProjectTask[] = []
  openIntakeCount = 0
  selectedWorkspaceId: number = null

  readonly chartWidth = 720
  readonly chartHeight = 240
  readonly chartPadding = 32
  readonly pieRadius = 44
  readonly pieCircumference = 2 * Math.PI * this.pieRadius

  ngOnInit(): void {
    this.reload()
  }

  get selectedWorkspaces(): Workspace[] {
    if (!this.selectedWorkspaceId) {
      return this.workspaces
    }
    return this.workspaces.filter(
      (workspace) => workspace.id === this.selectedWorkspaceId
    )
  }

  get completedTasks(): number {
    return this.tasks.filter((task) => this.isCompleted(task)).length
  }

  get openTasks(): number {
    return this.tasks.length - this.completedTasks
  }

  get overdueTasks(): number {
    const today = new Date().toISOString().slice(0, 10)
    return this.tasks.filter((task) => {
      return task.due_date && task.due_date < today && !this.isCompleted(task)
    }).length
  }

  get progress(): number {
    if (!this.tasks.length) {
      return 0
    }
    return Math.round((this.completedTasks / this.tasks.length) * 100)
  }

  get incompleteTasks(): number {
    return this.tasks.length - this.completedTasks
  }

  get completedPieDasharray(): string {
    return this.toPieDasharray(this.completedTasks)
  }

  get incompletePieDasharray(): string {
    return this.toPieDasharray(this.incompleteTasks)
  }

  get incompletePieDashoffset(): number {
    return -this.getPieLength(this.completedTasks)
  }

  get taskTrend(): TaskTrendPoint[] {
    const dates = Array.from(
      new Set(
        this.tasks
          .flatMap((task) => [
            this.getCreatedDate(task),
            this.getCompletedDate(task),
          ])
          .filter((date) => !!date)
      )
    ).sort((a, b) => a.localeCompare(b))

    const points = dates.map((date) => ({
      date,
      label: this.formatTrendLabel(date),
      inProgress: this.tasks.filter((task) => this.isOpenOnDate(task, date))
        .length,
      completed: this.tasks.filter((task) => this.isCompletedOnDate(task, date))
        .length,
    }))
    const maxValue = Math.max(
      1,
      ...points.map((point) => Math.max(point.inProgress, point.completed))
    )
    const innerWidth = this.chartWidth - this.chartPadding * 2
    const innerHeight = this.chartHeight - this.chartPadding * 2
    const divisor = Math.max(points.length - 1, 1)

    return points.map((point, index) => ({
      ...point,
      x: this.chartPadding + (innerWidth / divisor) * index,
      inProgressY:
        this.chartHeight -
        this.chartPadding -
        (point.inProgress / maxValue) * innerHeight,
      completedY:
        this.chartHeight -
        this.chartPadding -
        (point.completed / maxValue) * innerHeight,
    }))
  }

  get trendMax(): number {
    return Math.max(
      0,
      ...this.taskTrend.map((point) =>
        Math.max(point.inProgress, point.completed)
      )
    )
  }

  get inProgressTrendPath(): string {
    return this.toTrendPath(this.taskTrend, 'inProgressY')
  }

  get completedTrendPath(): string {
    return this.toTrendPath(this.taskTrend, 'completedY')
  }

  reload(): void {
    this.loading = true
    this.service.listWorkspaces().subscribe({
      next: (workspaceResponse) => {
        this.workspaces = workspaceResponse.results
        if (
          this.selectedWorkspaceId &&
          !this.workspaces.some(
            (workspace) => workspace.id === this.selectedWorkspaceId
          )
        ) {
          this.selectedWorkspaceId = null
        }
        this.loadProjects()
      },
      error: () => (this.loading = false),
    })
  }

  workspaceChanged(): void {
    this.loadProjects()
  }

  private loadProjects(): void {
    const workspaces = this.selectedWorkspaces
    if (!workspaces.length) {
      this.projects = []
      this.tasks = []
      this.openIntakeCount = 0
      this.loading = false
      return
    }

    this.loading = true
    let remaining = workspaces.length
    this.projects = []
    workspaces.forEach((workspace) => {
      this.service.listProjects(workspace.id).subscribe({
        next: (projectResponse) => {
          this.projects.push(...projectResponse.results)
          remaining--
          if (remaining === 0) {
            this.loadProjectData()
          }
        },
        error: () => {
          remaining--
          if (remaining === 0) {
            this.loadProjectData()
          }
        },
      })
    })
  }

  private loadProjectData(): void {
    if (!this.projects.length) {
      this.tasks = []
      this.openIntakeCount = 0
      this.loading = false
      return
    }

    let remaining = this.projects.length * 2
    this.tasks = []
    this.openIntakeCount = 0
    const finish = () => {
      remaining--
      if (remaining === 0) {
        this.loading = false
      }
    }

    this.projects.forEach((project) => {
      this.service.listTasks(project.id).subscribe({
        next: (response) => {
          this.tasks.push(...response.results)
          finish()
        },
        error: finish,
      })
      this.service.listIntake(project.id).subscribe({
        next: (response) => {
          this.openIntakeCount += response.results.filter(
            (request) => request.status === 'open'
          ).length
          finish()
        },
        error: finish,
      })
    })
  }

  private isCompleted(task: ProjectTask): boolean {
    return task.status === 'completed'
  }

  private isOpenOnDate(task: ProjectTask, date: string): boolean {
    const createdDate = this.getCreatedDate(task)
    const completedDate = this.getCompletedDate(task)
    return (
      !!createdDate &&
      createdDate <= date &&
      (!completedDate || completedDate > date)
    )
  }

  private isCompletedOnDate(task: ProjectTask, date: string): boolean {
    const completedDate = this.getCompletedDate(task)
    return !!completedDate && completedDate <= date
  }

  private getCreatedDate(task: ProjectTask): string {
    return (
      task.created_at?.slice(0, 10) ??
      task.updated_at?.slice(0, 10) ??
      task.completed_at?.slice(0, 10) ??
      ''
    )
  }

  private getCompletedDate(task: ProjectTask): string {
    if (!this.isCompleted(task)) {
      return ''
    }
    return (
      task.completed_at?.slice(0, 10) ??
      task.updated_at?.slice(0, 10) ??
      task.created_at?.slice(0, 10) ??
      ''
    )
  }

  private formatTrendLabel(date: string): string {
    const [year, month, day] = date.split('-')
    return `${day}/${month}/${year}`
  }

  private toTrendPath(
    points: TaskTrendPoint[],
    key: 'inProgressY' | 'completedY'
  ): string {
    return points
      .map(
        (point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point[key]}`
      )
      .join(' ')
  }

  private getPieLength(value: number): number {
    if (!this.tasks.length) {
      return 0
    }
    return (value / this.tasks.length) * this.pieCircumference
  }

  private toPieDasharray(value: number): string {
    const length = this.getPieLength(value)
    return `${length} ${this.pieCircumference - length}`
  }
}
