import { Component, OnInit, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgxBootstrapIconsModule } from 'ngx-bootstrap-icons'
import {
  Project,
  ProjectCycle,
  ProjectModule,
  Workspace,
} from 'src/app/data/project-management'
import { ProjectManagementService } from 'src/app/services/rest/project-management.service'
import { ToastService } from 'src/app/services/toast.service'
import { PageHeaderComponent } from '../../../common/page-header/page-header.component'

@Component({
  selector: 'pngx-project-planning',
  templateUrl: './planning.component.html',
  styleUrl: '../project-management.component.scss',
  imports: [FormsModule, NgxBootstrapIconsModule, PageHeaderComponent],
})
export class ProjectPlanningComponent implements OnInit {
  private readonly service = inject(ProjectManagementService)
  private readonly toastService = inject(ToastService)

  loading = false
  workspaces: Workspace[] = []
  projects: Project[] = []
  cycles: ProjectCycle[] = []
  modules: ProjectModule[] = []
  selectedWorkspaceId: number = null
  selectedProjectId: number = null
  cycleDraft: Partial<ProjectCycle> = {
    name: '',
    starts_at: this.today(),
    ends_at: this.today(),
    is_active: true,
  }
  moduleDraft: Partial<ProjectModule> = { name: '', description: '' }

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
    this.service.listCycles(projectId).subscribe({
      next: (cycles) => (this.cycles = cycles.results),
      error: () => (this.loading = false),
    })
    this.service.listModules(projectId).subscribe({
      next: (modules) => {
        this.modules = modules.results
        this.loading = false
      },
      error: () => (this.loading = false),
    })
  }

  createCycle(): void {
    if (!this.selectedProjectId || !this.cycleDraft.name?.trim()) {
      return
    }
    this.service
      .create<ProjectCycle>('project_cycles', {
        ...this.cycleDraft,
        project: this.selectedProjectId,
      })
      .subscribe({
        next: () => {
          this.cycleDraft = {
            name: '',
            starts_at: this.today(),
            ends_at: this.today(),
            is_active: true,
          }
          this.reloadProjectData()
        },
        error: () => (this.loading = false),
      })
  }

  createModule(): void {
    if (!this.selectedProjectId || !this.moduleDraft.name?.trim()) {
      return
    }
    this.service
      .create<ProjectModule>('project_modules', {
        ...this.moduleDraft,
        project: this.selectedProjectId,
      })
      .subscribe({
        next: () => {
          this.moduleDraft = { name: '', description: '' }
          this.reloadProjectData()
        },
        error: () => (this.loading = false),
      })
  }

  rolloverCycle(cycle: ProjectCycle, nextCycleId: number | string): void {
    const nextCycle = Number(nextCycleId)
    if (!nextCycle) {
      return
    }
    this.service.rolloverCycle(cycle.id, nextCycle).subscribe({
      next: (result) => {
        this.toastService.showInfo($localize`${result.moved} task(s) moved.`)
        this.reloadProjectData()
      },
      error: () => (this.loading = false),
    })
  }

  private clearProjectData(): void {
    this.cycles = []
    this.modules = []
    this.loading = false
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10)
  }
}
