import { Component, OnInit, TemplateRef, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgbModal, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap'
import { NgxBootstrapIconsModule } from 'ngx-bootstrap-icons'
import { ConfirmDialogComponent } from 'src/app/components/common/confirm-dialog/confirm-dialog.component'
import { Workspace } from 'src/app/data/project-management'
import { CustomDatePipe } from 'src/app/pipes/custom-date.pipe'
import { ProjectManagementService } from 'src/app/services/rest/project-management.service'
import { ToastService } from 'src/app/services/toast.service'
import { PageHeaderComponent } from '../../../common/page-header/page-header.component'

@Component({
  selector: 'pngx-workspaces',
  templateUrl: './workspaces.component.html',
  styleUrl: '../project-management.component.scss',
  imports: [
    CustomDatePipe,
    FormsModule,
    NgbPaginationModule,
    NgxBootstrapIconsModule,
    PageHeaderComponent,
  ],
})
export class WorkspacesComponent implements OnInit {
  private readonly service = inject(ProjectManagementService)
  private readonly modalService = inject(NgbModal)
  private readonly toastService = inject(ToastService)

  loading = false
  workspaces: Workspace[] = []
  draft: Partial<Workspace> = { name: '', description: '' }
  editingWorkspace: Workspace = null
  search = ''
  page = 1
  pageSize = 25
  totalWorkspaces = 0

  ngOnInit(): void {
    this.reload()
  }

  reload(): void {
    this.loading = true
    this.service
      .listWorkspaces({
        page: this.page,
        page_size: this.pageSize,
        search: this.search.trim(),
      })
      .subscribe({
        next: (response) => {
          this.workspaces = response.results
          this.totalWorkspaces = response.count
          this.loading = false
        },
        error: () => (this.loading = false),
      })
  }

  searchWorkspaces(): void {
    this.page = 1
    this.reload()
  }

  clearSearch(): void {
    this.search = ''
    this.searchWorkspaces()
  }

  openCreateDialog(content: TemplateRef<unknown>): void {
    this.editingWorkspace = null
    this.draft = { name: '', description: '' }
    this.modalService.open(content, { backdrop: 'static' })
  }

  openEditDialog(
    content: TemplateRef<unknown>,
    workspace: Workspace,
    event?: Event
  ): void {
    event?.stopPropagation()
    this.editingWorkspace = workspace
    this.draft = {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
    }
    this.modalService.open(content, { backdrop: 'static' })
  }

  saveWorkspace(modal: { close: () => void }): void {
    if (!this.draft.name?.trim()) {
      return
    }
    this.loading = true
    const request = this.editingWorkspace
      ? this.service.patch<Workspace>('workspaces', {
          id: this.editingWorkspace.id,
          name: this.draft.name.trim(),
          description: this.draft.description ?? '',
        })
      : this.service.create<Workspace>('workspaces', {
          name: this.draft.name.trim(),
          description: this.draft.description ?? '',
        })

    request.subscribe({
      next: () => {
        const wasEditing = !!this.editingWorkspace
        modal.close()
        this.draft = { name: '', description: '' }
        this.editingWorkspace = null
        this.page = 1
        this.reload()
        this.toastService.showInfo(
          wasEditing
            ? $localize`Đã cập nhật không gian làm việc.`
            : $localize`Đã tạo không gian làm việc.`
        )
      },
      error: (error) => {
        this.loading = false
        this.toastService.showError(
          $localize`Lỗi khi lưu không gian làm việc.`,
          error
        )
      },
    })
  }

  openDeleteDialog(workspace: Workspace, event?: Event): void {
    event?.stopPropagation()
    const activeModal = this.modalService.open(ConfirmDialogComponent, {
      backdrop: 'static',
    })
    activeModal.componentInstance.title = $localize`Xác nhận xóa`
    activeModal.componentInstance.messageBold = $localize`Xóa không gian làm việc "${workspace.name}"?`
    activeModal.componentInstance.btnClass = 'btn-danger'
    activeModal.componentInstance.btnCaption = $localize`Xóa`
    activeModal.componentInstance.confirmClicked.subscribe(() => {
      activeModal.componentInstance.buttonsEnabled = false
      this.service.delete('workspaces', workspace.id).subscribe({
        next: () => {
          activeModal.close()
          this.reload()
          this.toastService.showInfo($localize`Đã xóa không gian làm việc.`)
        },
        error: (error) => {
          activeModal.componentInstance.buttonsEnabled = true
          this.toastService.showError(
            $localize`Lỗi khi xóa không gian làm việc.`,
            error
          )
        },
      })
    })
  }
}
