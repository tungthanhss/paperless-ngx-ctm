import { Component, OnInit, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgxBootstrapIconsModule } from 'ngx-bootstrap-icons'
import {
  IntakeRequest,
  Project,
  Workspace,
} from 'src/app/data/project-management'
import { ProjectManagementService } from 'src/app/services/rest/project-management.service'
import { PageHeaderComponent } from '../../../common/page-header/page-header.component'

@Component({
  selector: 'pngx-project-intake',
  templateUrl: './intake.component.html',
  styleUrl: '../project-management.component.scss',
  imports: [FormsModule, NgxBootstrapIconsModule, PageHeaderComponent],
})
export class ProjectIntakeComponent implements OnInit {
  private readonly service = inject(ProjectManagementService)

  loading = false
  workspaces: Workspace[] = []
  projects: Project[] = []
  requests: IntakeRequest[] = []
  selectedWorkspaceId: number = null
  selectedProjectId: number = null
  reviewComment = ''
  draft: Partial<IntakeRequest> = {
    title: '',
    description: '',
    source_department: '',
  }

  ngOnInit(): void {
    this.reloadWorkspaces()
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
      this.requests = []
      this.loading = false
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
        this.reloadRequests()
      },
      error: () => (this.loading = false),
    })
  }

  reloadRequests(): void {
    if (!this.selectedProjectId) {
      this.requests = []
      this.loading = false
      return
    }
    this.loading = true
    this.service.listIntake(this.selectedProjectId).subscribe({
      next: (response) => {
        this.requests = response.results
        this.loading = false
      },
      error: () => (this.loading = false),
    })
  }

  createRequest(): void {
    if (!this.selectedProjectId || !this.draft.title?.trim()) {
      return
    }
    this.service
      .create<IntakeRequest>('intake_requests', {
        ...this.draft,
        project: this.selectedProjectId,
      })
      .subscribe({
        next: () => {
          this.draft = { title: '', description: '', source_department: '' }
          this.reloadRequests()
        },
        error: () => (this.loading = false),
      })
  }

  accept(request: IntakeRequest): void {
    this.service.acceptIntake(request.id, this.reviewComment).subscribe({
      next: () => {
        this.reviewComment = ''
        this.reloadRequests()
      },
      error: () => (this.loading = false),
    })
  }

  decline(request: IntakeRequest): void {
    this.service.declineIntake(request.id, this.reviewComment).subscribe({
      next: () => {
        this.reviewComment = ''
        this.reloadRequests()
      },
      error: () => (this.loading = false),
    })
  }
}
