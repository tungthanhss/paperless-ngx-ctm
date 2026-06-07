import { NgStyle } from '@angular/common'
import { Component, OnInit, TemplateRef, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import {
  NgbModal,
  NgbPaginationModule,
  NgbTypeaheadModule,
} from '@ng-bootstrap/ng-bootstrap'
import { NgSelectModule } from '@ng-select/ng-select'
import { NgxBootstrapIconsModule } from 'ngx-bootstrap-icons'
import { Observable, firstValueFrom, of } from 'rxjs'
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  switchMap,
} from 'rxjs/operators'
import { ConfirmDialogComponent } from 'src/app/components/common/confirm-dialog/confirm-dialog.component'
import {
  Project,
  ProjectLabel,
  ProjectSubTask,
  ProjectTask,
  ProjectTaskPriority,
  ProjectTaskStatus,
  Workspace,
} from 'src/app/data/project-management'
import { User } from 'src/app/data/user'
import { CustomDatePipe } from 'src/app/pipes/custom-date.pipe'
import { ProjectManagementService } from 'src/app/services/rest/project-management.service'
import { UserService } from 'src/app/services/rest/user.service'
import { ToastService } from 'src/app/services/toast.service'
import { PageHeaderComponent } from '../../../common/page-header/page-header.component'

@Component({
  selector: 'pngx-project-tasks',
  templateUrl: './tasks.component.html',
  styleUrl: '../project-management.component.scss',
  imports: [
    CustomDatePipe,
    FormsModule,
    NgStyle,
    NgbPaginationModule,
    NgbTypeaheadModule,
    NgSelectModule,
    NgxBootstrapIconsModule,
    PageHeaderComponent,
  ],
})
export class ProjectTasksComponent implements OnInit {
  private readonly service = inject(ProjectManagementService)
  private readonly userService = inject(UserService)
  private readonly modalService = inject(NgbModal)
  private readonly toastService = inject(ToastService)

  loading = false
  workspaces: Workspace[] = []
  projects: Project[] = []
  labels: ProjectLabel[] = []
  tasks: ProjectTask[] = []
  statuses: ProjectTaskStatus[] = ['open', 'in_progress', 'completed', 'cancel']
  selectedWorkspaceId: number = null
  selectedProjectId: number = null
  draft: Partial<ProjectTask> = {
    title: '',
    description: '',
    status: 'open',
    priority: 'medium',
    labels: [],
    estimate: 0,
  }
  editingTask: ProjectTask = null
  subtasks: ProjectSubTask[] = []
  subtaskDraft: Partial<ProjectSubTask> = {
    title: '',
    status: 'open',
    estimate: 0,
  }
  subtasksLoading = false
  assigneeSearch = ''
  selectedAssigneeUsername = ''
  search = ''
  page = 1
  pageSize = 25
  totalTasks = 0

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
        this.workspaceChanged()
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
      this.selectedProjectId = null
      this.clearProjectData()
      return
    }
    this.loading = true
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
        this.projectChanged()
      },
      error: () => (this.loading = false),
    })
  }

  projectChanged(): void {
    this.page = 1
    this.reloadProjectData()
  }

  reloadProjectData(): void {
    if (!this.selectedProjectId) {
      this.clearProjectData()
      return
    }
    const projectId = this.selectedProjectId
    this.loading = true
    this.service.listLabels(projectId).subscribe({
      next: (labels) => (this.labels = labels.results),
      error: () => (this.loading = false),
    })
    this.reloadTasks()
  }

  reloadTasks(): void {
    if (!this.selectedProjectId) {
      this.tasks = []
      this.totalTasks = 0
      this.loading = false
      return
    }
    this.loading = true
    this.service
      .list<ProjectTask>('project_issues', {
        project: this.selectedProjectId,
        page: this.page,
        page_size: this.pageSize,
        search: this.search.trim(),
      })
      .subscribe({
        next: (tasks) => {
          this.tasks = tasks.results
          this.totalTasks = tasks.count
          this.loading = false
        },
        error: () => (this.loading = false),
      })
  }

  searchTasks(): void {
    this.page = 1
    this.reloadTasks()
  }

  clearSearch(): void {
    this.search = ''
    this.searchTasks()
  }

  openCreateDialog(content: TemplateRef<unknown>): void {
    this.editingTask = null
    this.draft = {
      title: '',
      description: '',
      priority: 'medium',
      status: 'open',
      labels: [],
      estimate: 0,
    }
    this.assigneeSearch = ''
    this.selectedAssigneeUsername = ''
    this.clearSubtasks()
    this.modalService.open(content, { backdrop: 'static', size: 'xl' })
  }

  openEditDialog(
    content: TemplateRef<unknown>,
    task: ProjectTask,
    event?: Event
  ): void {
    event?.stopPropagation()
    this.editingTask = task
    this.draft = {
      id: task.id,
      project: task.project,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      labels: task.labels ?? [],
      estimate: task.estimate,
      assignee: task.assignee,
      start_date: task.start_date,
      due_date: task.due_date,
    }
    this.assigneeSearch =
      task.assignee_username || task.assignee?.toString() || ''
    this.selectedAssigneeUsername = task.assignee_username || ''
    this.reloadSubtasks(task.id)
    this.modalService.open(content, { backdrop: 'static', size: 'xl' })
  }

  saveTask(modal: { close: () => void }): void {
    if (!this.selectedProjectId || !this.draft.title?.trim()) {
      return
    }
    this.loading = true
    const payload: Partial<ProjectTask> = {
      project: this.selectedProjectId,
      title: this.draft.title.trim(),
      description: this.draft.description ?? '',
      status: this.draft.status ?? 'open',
      priority: this.draft.priority ?? 'medium',
      labels: this.draft.labels ?? [],
      estimate: this.draft.estimate ?? 0,
      assignee: this.draft.assignee || null,
      start_date: this.draft.start_date || null,
      due_date: this.draft.due_date || null,
    }
    const request = this.editingTask
      ? this.service.patch<ProjectTask>('project_issues', {
          id: this.editingTask.id,
          ...payload,
        })
      : this.service.create<ProjectTask>('project_issues', payload)

    request.subscribe({
      next: () => {
        const wasEditing = !!this.editingTask
        modal.close()
        this.draft = {
          title: '',
          description: '',
          status: 'open',
          priority: 'medium',
          labels: [],
          estimate: 0,
        }
        this.assigneeSearch = ''
        this.selectedAssigneeUsername = ''
        this.editingTask = null
        this.clearSubtasks()
        this.page = 1
        this.reloadProjectData()
        this.toastService.showInfo(
          wasEditing
            ? $localize`Đã cập nhật công việc.`
            : $localize`Đã tạo công việc.`
        )
      },
      error: (error) => {
        this.loading = false
        this.toastService.showError($localize`Lỗi khi lưu công việc.`, error)
      },
    })
  }

  openDeleteDialog(task: ProjectTask, event?: Event): void {
    event?.stopPropagation()
    const activeModal = this.modalService.open(ConfirmDialogComponent, {
      backdrop: 'static',
    })
    activeModal.componentInstance.title = $localize`Xác nhận xóa`
    activeModal.componentInstance.messageBold = $localize`Xóa công việc "${task.title}"?`
    activeModal.componentInstance.btnClass = 'btn-danger'
    activeModal.componentInstance.btnCaption = $localize`Xóa`
    activeModal.componentInstance.confirmClicked.subscribe(() => {
      activeModal.componentInstance.buttonsEnabled = false
      this.service.delete('project_issues', task.id).subscribe({
        next: () => {
          activeModal.close()
          this.reloadProjectData()
          this.toastService.showInfo($localize`Đã xóa công việc.`)
        },
        error: (error) => {
          activeModal.componentInstance.buttonsEnabled = true
          this.toastService.showError($localize`Lỗi khi xóa công việc.`, error)
        },
      })
    })
  }

  moveTask(task: ProjectTask, status: ProjectTaskStatus): void {
    this.service
      .patch<ProjectTask>('project_issues', { id: task.id, status })
      .subscribe({
        next: () => this.reloadProjectData(),
        error: () => (this.loading = false),
      })
  }

  searchAssignees = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap((term) =>
        term.trim().length < 2
          ? of([])
          : this.userService
              .list(1, 10, 'username', false, {
                username__icontains: term.trim(),
              })
              .pipe(
                map((response) => response.results),
                catchError(() => of([]))
              )
      )
    )

  assigneeFormatter = (user: User | string) =>
    typeof user === 'string' ? user : user?.username || ''

  selectAssignee(event): void {
    event.preventDefault()
    const user = event.item as User
    this.draft.assignee = user.id
    this.assigneeSearch = user.username || ''
    this.selectedAssigneeUsername = this.assigneeSearch
  }

  assigneeChanged(value: string): void {
    if (!value?.trim()) {
      this.draft.assignee = null
      this.assigneeSearch = ''
      this.selectedAssigneeUsername = ''
    } else if (value !== this.selectedAssigneeUsername) {
      this.draft.assignee = null
    }
  }

  addProjectLabel = async (name: string): Promise<ProjectLabel> => {
    const labelName = name.trim()
    const existingLabel = this.labels.find(
      (label) => label.name.toLowerCase() === labelName.toLowerCase()
    )
    if (existingLabel) {
      return existingLabel
    }
    const label = await firstValueFrom(
      this.service.create<ProjectLabel>('project_labels', {
        project: this.selectedProjectId,
        name: labelName,
        color: '#6b7280',
      })
    )
    this.labels = [...this.labels, label]
    return label
  }

  reloadSubtasks(taskId: number = this.editingTask?.id): void {
    if (!taskId) {
      this.clearSubtasks()
      return
    }
    this.subtasksLoading = true
    this.service.listSubTasks(taskId).subscribe({
      next: (response) => {
        this.subtasks = response.results
        this.subtasksLoading = false
      },
      error: () => (this.subtasksLoading = false),
    })
  }

  createSubtask(): void {
    const title = this.subtaskDraft.title?.trim()
    if (!this.editingTask?.id || !title) {
      return
    }
    this.subtasksLoading = true
    const position =
      Math.max(0, ...this.subtasks.map((subtask) => subtask.position ?? 0)) + 1
    this.service
      .create<ProjectSubTask>('project_subtasks', {
        task: this.editingTask.id,
        title,
        description: this.subtaskDraft.description ?? '',
        status: this.subtaskDraft.status ?? 'open',
        estimate: this.subtaskDraft.estimate ?? 0,
        position,
      })
      .subscribe({
        next: (subtask) => {
          this.subtasks = [...this.subtasks, subtask]
          this.subtaskDraft = { title: '', status: 'open', estimate: 0 }
          this.subtasksLoading = false
          this.reloadTasks()
        },
        error: (error) => {
          this.subtasksLoading = false
          this.toastService.showError($localize`Lỗi khi tạo subtask.`, error)
        },
      })
  }

  setSubtaskStatus(subtask: ProjectSubTask, status: ProjectTaskStatus): void {
    this.service
      .patch<ProjectSubTask>('project_subtasks', { id: subtask.id, status })
      .subscribe({
        next: (updatedSubtask) => {
          this.subtasks = this.subtasks.map((item) =>
            item.id === updatedSubtask.id ? updatedSubtask : item
          )
          this.reloadTasks()
        },
        error: (error) =>
          this.toastService.showError(
            $localize`Lỗi khi cập nhật subtask.`,
            error
          ),
      })
  }

  toggleSubtask(subtask: ProjectSubTask): void {
    this.setSubtaskStatus(
      subtask,
      subtask.status === 'completed' ? 'open' : 'completed'
    )
  }

  deleteSubtask(subtask: ProjectSubTask): void {
    this.service.delete('project_subtasks', subtask.id).subscribe({
      next: () => {
        this.subtasks = this.subtasks.filter((item) => item.id !== subtask.id)
        this.reloadTasks()
      },
      error: (error) =>
        this.toastService.showError($localize`Lỗi khi xóa subtask.`, error),
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

  tasksForStatus(status: ProjectTaskStatus): ProjectTask[] {
    return this.tasks.filter((task) => task.status === status)
  }

  statusLabel(status: ProjectTaskStatus): string {
    switch (status) {
      case 'open':
        return $localize`Open`
      case 'completed':
        return $localize`Completed`
      case 'in_progress':
        return $localize`In progress`
      case 'cancel':
        return $localize`Cancel`
      default:
        return status
    }
  }

  taskStatusLabel(task: ProjectTask): string {
    return task.status_display || this.statusLabel(task.status)
  }

  labelName(labelId: number): string {
    return this.labels.find((label) => label.id === labelId)?.name || ''
  }

  labelColor(labelId: number): string {
    return this.labels.find((label) => label.id === labelId)?.color || '#6b7280'
  }

  isCompleted(task: ProjectTask): boolean {
    return task.status === 'completed'
  }

  priorityClass(priority: string): string {
    return `priority-${priority}`
  }

  priorityLabel(priority: ProjectTaskPriority): string {
    switch (priority) {
      case 'urgent':
        return $localize`Khẩn cấp`
      case 'high':
        return $localize`Cao`
      case 'medium':
        return $localize`Trung bình`
      case 'low':
        return $localize`Thấp`
      default:
        return priority
    }
  }

  private clearProjectData(): void {
    this.labels = []
    this.tasks = []
    this.totalTasks = 0
    this.loading = false
  }

  private clearSubtasks(): void {
    this.subtasks = []
    this.subtaskDraft = { title: '', status: 'open', estimate: 0 }
    this.subtasksLoading = false
  }
}
