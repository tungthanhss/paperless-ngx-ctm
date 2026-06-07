import { Component, OnInit, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgxBootstrapIconsModule } from 'ngx-bootstrap-icons'
import { Project, Workspace } from 'src/app/data/project-management'
import { ProjectManagementService } from 'src/app/services/rest/project-management.service'
import { PageHeaderComponent } from '../../../common/page-header/page-header.component'

@Component({
  selector: 'pngx-projects',
  templateUrl: './projects.component.html',
  styleUrl: '../project-management.component.scss',
  imports: [FormsModule, NgxBootstrapIconsModule, PageHeaderComponent],
})
export class ProjectsComponent implements OnInit {
  private readonly service = inject(ProjectManagementService)

  loading = false
  workspaces: Workspace[] = []
  projects: Project[] = []
  selectedWorkspaceId: number = null
  draft: Partial<Project> = { name: '', key: '', description: '', members: [] }

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
      this.loading = false
      return
    }
    this.loading = true
    this.service.listProjects(this.selectedWorkspaceId).subscribe({
      next: (response) => {
        this.projects = response.results
        this.loading = false
      },
      error: () => (this.loading = false),
    })
  }

  createProject(): void {
    if (!this.selectedWorkspaceId || !this.draft.name?.trim()) {
      return
    }
    this.service
      .create<Project>('projects', {
        ...this.draft,
        workspace: this.selectedWorkspaceId,
      })
      .subscribe({
        next: () => {
          this.draft = { name: '', key: '', description: '', members: [] }
          this.reloadProjects()
        },
        error: () => (this.loading = false),
      })
  }
}
