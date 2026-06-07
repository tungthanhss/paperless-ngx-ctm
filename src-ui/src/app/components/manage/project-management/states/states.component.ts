import { Component, OnInit, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgxBootstrapIconsModule } from 'ngx-bootstrap-icons'
import {
  Project,
  ProjectState,
  Workspace,
} from 'src/app/data/project-management'
import { ProjectManagementService } from 'src/app/services/rest/project-management.service'
import { PageHeaderComponent } from '../../../common/page-header/page-header.component'

@Component({
  selector: 'pngx-project-states',
  templateUrl: './states.component.html',
  styleUrl: '../project-management.component.scss',
  imports: [FormsModule, NgxBootstrapIconsModule, PageHeaderComponent],
})
export class StatesComponent implements OnInit {
  private readonly service = inject(ProjectManagementService)

  loading = false
  workspaces: Workspace[] = []
  projects: Project[] = []
  states: ProjectState[] = []
  selectedWorkspaceId: number = null
  selectedProjectId: number = null
  draft: Partial<ProjectState> = {
    name: '',
    position: 0,
    is_default: false,
    is_completed: false,
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
      this.states = []
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
        this.reloadStates()
      },
      error: () => (this.loading = false),
    })
  }

  reloadStates(): void {
    if (!this.selectedProjectId) {
      this.states = []
      this.loading = false
      return
    }
    this.loading = true
    this.service.listStates(this.selectedProjectId).subscribe({
      next: (response) => {
        this.states = response.results
        this.loading = false
      },
      error: () => (this.loading = false),
    })
  }

  createState(): void {
    if (!this.selectedProjectId || !this.draft.name?.trim()) {
      return
    }
    this.service
      .create<ProjectState>('project_states', {
        ...this.draft,
        project: this.selectedProjectId,
      })
      .subscribe({
        next: () => {
          this.draft = {
            name: '',
            position: this.states.length,
            is_default: false,
            is_completed: false,
          }
          this.reloadStates()
        },
        error: () => (this.loading = false),
      })
  }

  setDefaultState(state: ProjectState): void {
    this.service.setDefaultState(state.id).subscribe({
      next: () => this.reloadStates(),
      error: () => (this.loading = false),
    })
  }
}
