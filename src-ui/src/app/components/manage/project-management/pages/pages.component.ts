import { Component, OnInit, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgxBootstrapIconsModule } from 'ngx-bootstrap-icons'
import {
  Project,
  ProjectPage,
  Workspace,
} from 'src/app/data/project-management'
import { ProjectManagementService } from 'src/app/services/rest/project-management.service'
import { PageHeaderComponent } from '../../../common/page-header/page-header.component'

@Component({
  selector: 'pngx-project-pages',
  templateUrl: './pages.component.html',
  styleUrl: '../project-management.component.scss',
  imports: [FormsModule, NgxBootstrapIconsModule, PageHeaderComponent],
})
export class ProjectPagesComponent implements OnInit {
  private readonly service = inject(ProjectManagementService)

  loading = false
  workspaces: Workspace[] = []
  projects: Project[] = []
  pages: ProjectPage[] = []
  selectedWorkspaceId: number = null
  selectedProjectId: number = null
  draft: Partial<ProjectPage> = { title: '', content: [] }

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
      this.pages = []
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
        this.reloadPages()
      },
      error: () => (this.loading = false),
    })
  }

  reloadPages(): void {
    if (!this.selectedProjectId) {
      this.pages = []
      this.loading = false
      return
    }
    this.loading = true
    this.service.listPages(this.selectedProjectId).subscribe({
      next: (response) => {
        this.pages = response.results
        this.loading = false
      },
      error: () => (this.loading = false),
    })
  }

  createPage(): void {
    if (!this.selectedProjectId || !this.draft.title?.trim()) {
      return
    }
    this.service
      .create<ProjectPage>('project_pages', {
        ...this.draft,
        project: this.selectedProjectId,
      })
      .subscribe({
        next: () => {
          this.draft = { title: '', content: [] }
          this.reloadPages()
        },
        error: () => (this.loading = false),
      })
  }
}
