import { Component, OnInit, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap'
import { NgxBootstrapIconsModule } from 'ngx-bootstrap-icons'
import { Workspace } from 'src/app/data/project-management'
import { CustomDatePipe } from 'src/app/pipes/custom-date.pipe'
import { ProjectManagementService } from 'src/app/services/rest/project-management.service'
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

  loading = false
  workspaces: Workspace[] = []
  draft: Partial<Workspace> = { name: '', description: '' }
  search = ''
  page = 1
  readonly pageSize = 10
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

  createWorkspace(): void {
    if (!this.draft.name?.trim()) {
      return
    }
    this.loading = true
    this.service.create<Workspace>('workspaces', this.draft).subscribe({
      next: () => {
        this.draft = { name: '', description: '' }
        this.page = 1
        this.reload()
      },
      error: () => (this.loading = false),
    })
  }
}
