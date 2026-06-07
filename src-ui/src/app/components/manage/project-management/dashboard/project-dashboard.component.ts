import { Component, OnInit, inject } from '@angular/core'
import { NgxBootstrapIconsModule } from 'ngx-bootstrap-icons'
import {
  Project,
  ProjectTask,
  Workspace,
} from 'src/app/data/project-management'
import { ProjectManagementService } from 'src/app/services/rest/project-management.service'
import { PageHeaderComponent } from '../../../common/page-header/page-header.component'

@Component({
  selector: 'pngx-project-dashboard',
  templateUrl: './project-dashboard.component.html',
  styleUrl: '../project-management.component.scss',
  imports: [NgxBootstrapIconsModule, PageHeaderComponent],
})
export class ProjectDashboardComponent implements OnInit {
  private readonly service = inject(ProjectManagementService)

  loading = true
  workspaces: Workspace[] = []
  projects: Project[] = []
  tasks: ProjectTask[] = []
  openIntakeCount = 0

  ngOnInit(): void {
    this.reload()
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

  reload(): void {
    this.loading = true
    this.service.listWorkspaces().subscribe({
      next: (workspaceResponse) => {
        this.workspaces = workspaceResponse.results
        this.loadProjects()
      },
      error: () => (this.loading = false),
    })
  }

  private loadProjects(): void {
    if (!this.workspaces.length) {
      this.loading = false
      return
    }

    let remaining = this.workspaces.length
    this.projects = []
    this.workspaces.forEach((workspace) => {
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
}
