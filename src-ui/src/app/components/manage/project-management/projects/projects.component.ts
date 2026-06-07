import { Component, OnInit, TemplateRef, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgbModal, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap'
import { NgxBootstrapIconsModule } from 'ngx-bootstrap-icons'
import { ConfirmDialogComponent } from 'src/app/components/common/confirm-dialog/confirm-dialog.component'
import { Project, Workspace } from 'src/app/data/project-management'
import { CustomDatePipe } from 'src/app/pipes/custom-date.pipe'
import { ProjectManagementService } from 'src/app/services/rest/project-management.service'
import { ToastService } from 'src/app/services/toast.service'
import { PageHeaderComponent } from '../../../common/page-header/page-header.component'

@Component({
  selector: 'pngx-projects',
  templateUrl: './projects.component.html',
  styleUrl: '../project-management.component.scss',
  imports: [
    CustomDatePipe,
    FormsModule,
    NgbPaginationModule,
    NgxBootstrapIconsModule,
    PageHeaderComponent,
  ],
})
export class ProjectsComponent implements OnInit {
  private readonly service = inject(ProjectManagementService)
  private readonly modalService = inject(NgbModal)
  private readonly toastService = inject(ToastService)

  loading = false
  workspaces: Workspace[] = []
  projects: Project[] = []
  selectedWorkspaceId: number = null
  draft: Partial<Project> = { name: '', key: '', description: '', members: [] }
  editingProject: Project = null
  search = ''
  page = 1
  pageSize = 25
  totalProjects = 0

  ngOnInit(): void {
    this.reloadWorkspaces()
  }

  reloadWorkspaces(): void {
    this.loading = true
    this.service.listWorkspaces().subscribe({
      next: (response) => {
        this.workspaces = response.results
        this.selectedWorkspaceId ??= this.workspaces[0]?.id ?? null
        this.searchProjects()
      },
      error: () => (this.loading = false),
    })
  }

  workspaceChanged(): void {
    this.page = 1
    this.reloadProjects()
  }

  reloadProjects(): void {
    if (!this.selectedWorkspaceId) {
      this.projects = []
      this.totalProjects = 0
      this.loading = false
      return
    }
    this.loading = true
    this.service
      .list<Project>('projects', {
        workspace: this.selectedWorkspaceId,
        page: this.page,
        page_size: this.pageSize,
        search: this.search.trim(),
      })
      .subscribe({
        next: (response) => {
          this.projects = response.results
          this.totalProjects = response.count
          this.loading = false
        },
        error: () => (this.loading = false),
      })
  }

  searchProjects(): void {
    this.page = 1
    this.reloadProjects()
  }

  clearSearch(): void {
    this.search = ''
    this.searchProjects()
  }

  openCreateDialog(content: TemplateRef<unknown>): void {
    this.editingProject = null
    this.draft = { name: '', key: '', description: '', members: [] }
    this.modalService.open(content, { backdrop: 'static' })
  }

  openEditDialog(
    content: TemplateRef<unknown>,
    project: Project,
    event?: Event
  ): void {
    event?.stopPropagation()
    this.editingProject = project
    this.draft = {
      id: project.id,
      workspace: project.workspace,
      key: project.key,
      name: project.name,
      description: project.description,
      lead: project.lead,
      members: project.members,
    }
    this.modalService.open(content, { backdrop: 'static' })
  }

  saveProject(modal: { close: () => void }): void {
    if (
      !this.selectedWorkspaceId ||
      !this.draft.key?.trim() ||
      !this.draft.name?.trim()
    ) {
      return
    }
    this.loading = true
    const payload: Partial<Project> = {
      workspace: this.selectedWorkspaceId,
      key: this.draft.key.trim().toUpperCase(),
      name: this.draft.name.trim(),
      description: this.draft.description ?? '',
      members: this.draft.members ?? [],
    }
    const request = this.editingProject
      ? this.service.patch<Project>('projects', {
          id: this.editingProject.id,
          ...payload,
        })
      : this.service.create<Project>('projects', payload)

    request.subscribe({
      next: () => {
        const wasEditing = !!this.editingProject
        modal.close()
        this.draft = { name: '', key: '', description: '', members: [] }
        this.editingProject = null
        this.page = 1
        this.reloadProjects()
        this.toastService.showInfo(
          wasEditing ? $localize`Đã cập nhật dự án.` : $localize`Đã tạo dự án.`
        )
      },
      error: (error) => {
        this.loading = false
        this.toastService.showError($localize`Lỗi khi lưu dự án.`, error)
      },
    })
  }

  openDeleteDialog(project: Project, event?: Event): void {
    event?.stopPropagation()
    const activeModal = this.modalService.open(ConfirmDialogComponent, {
      backdrop: 'static',
    })
    activeModal.componentInstance.title = $localize`Xác nhận xóa`
    activeModal.componentInstance.messageBold = $localize`Xóa dự án "${project.key}"?`
    activeModal.componentInstance.btnClass = 'btn-danger'
    activeModal.componentInstance.btnCaption = $localize`Xóa`
    activeModal.componentInstance.confirmClicked.subscribe(() => {
      activeModal.componentInstance.buttonsEnabled = false
      this.service.delete('projects', project.id).subscribe({
        next: () => {
          activeModal.close()
          this.reloadProjects()
          this.toastService.showInfo($localize`Đã xóa dự án.`)
        },
        error: (error) => {
          activeModal.componentInstance.buttonsEnabled = true
          this.toastService.showError($localize`Lỗi khi xóa dự án.`, error)
        },
      })
    })
  }
}
