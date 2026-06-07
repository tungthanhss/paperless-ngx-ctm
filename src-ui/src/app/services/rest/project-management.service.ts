import { HttpClient, HttpParams } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { ObjectWithId } from 'src/app/data/object-with-id'
import {
  IntakeRequest,
  Project,
  ProjectCycle,
  ProjectLabel,
  ProjectModule,
  ProjectPage,
  ProjectState,
  ProjectTask,
  Workspace,
} from 'src/app/data/project-management'
import { Results } from 'src/app/data/results'
import { environment } from 'src/environments/environment'

type ResourceName =
  | 'workspaces'
  | 'projects'
  | 'project_states'
  | 'project_labels'
  | 'project_cycles'
  | 'project_modules'
  | 'project_issues'
  | 'intake_requests'
  | 'project_pages'

@Injectable({
  providedIn: 'root',
})
export class ProjectManagementService {
  private readonly http = inject(HttpClient)
  private readonly baseUrl = environment.apiBaseUrl

  list<T extends ObjectWithId>(
    resource: ResourceName,
    params?: Record<string, string | number | boolean>
  ): Observable<Results<T>> {
    let httpParams = new HttpParams().set('page_size', '1000')
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        httpParams = httpParams.set(key, value.toString())
      }
    })
    return this.http.get<Results<T>>(this.url(resource), { params: httpParams })
  }

  create<T extends ObjectWithId>(
    resource: ResourceName,
    payload: Partial<T>
  ): Observable<T> {
    return this.http.post<T>(this.url(resource), payload)
  }

  patch<T extends ObjectWithId>(
    resource: ResourceName,
    payload: Partial<T> & Pick<ObjectWithId, 'id'>
  ): Observable<T> {
    return this.http.patch<T>(this.url(resource, payload.id), payload)
  }

  delete(resource: ResourceName, id: number): Observable<void> {
    return this.http.delete<void>(this.url(resource, id))
  }

  setDefaultState(id: number): Observable<ProjectState> {
    return this.http.post<ProjectState>(
      this.url('project_states', id, 'set_default'),
      {}
    )
  }

  quickAddTask(project: number, text: string): Observable<ProjectTask> {
    return this.http.post<ProjectTask>(
      this.url('project_issues', null, 'quick_add'),
      { project, text }
    )
  }

  quickAddIssue(project: number, text: string): Observable<ProjectTask> {
    return this.quickAddTask(project, text)
  }

  rolloverCycle(
    id: number,
    nextCycle: number
  ): Observable<{
    moved: number
    cycle: ProjectCycle
  }> {
    return this.http.post<{ moved: number; cycle: ProjectCycle }>(
      this.url('project_cycles', id, 'rollover'),
      { next_cycle: nextCycle }
    )
  }

  acceptIntake(id: number, reviewComment: string): Observable<IntakeRequest> {
    return this.http.post<IntakeRequest>(
      this.url('intake_requests', id, 'accept'),
      { review_comment: reviewComment }
    )
  }

  declineIntake(id: number, reviewComment: string): Observable<IntakeRequest> {
    return this.http.post<IntakeRequest>(
      this.url('intake_requests', id, 'decline'),
      { review_comment: reviewComment }
    )
  }

  listWorkspaces(params?: Record<string, string | number | boolean>) {
    return this.list<Workspace>('workspaces', params)
  }

  listProjects(workspace?: number) {
    return this.list<Project>('projects', { workspace })
  }

  listStates(project: number) {
    return this.list<ProjectState>('project_states', { project })
  }

  listLabels(project: number) {
    return this.list<ProjectLabel>('project_labels', { project })
  }

  listCycles(project: number) {
    return this.list<ProjectCycle>('project_cycles', { project })
  }

  listModules(project: number) {
    return this.list<ProjectModule>('project_modules', { project })
  }

  listTasks(project: number) {
    return this.list<ProjectTask>('project_issues', { project })
  }

  listIssues(project: number) {
    return this.listTasks(project)
  }

  listIntake(project: number) {
    return this.list<IntakeRequest>('intake_requests', { project })
  }

  listPages(project: number) {
    return this.list<ProjectPage>('project_pages', { project })
  }

  private url(
    resource: ResourceName,
    id: number = null,
    action: string = null
  ): string {
    let url = `${this.baseUrl}${resource}/`
    if (id !== null) {
      url += `${id}/`
    }
    if (action) {
      url += `${action}/`
    }
    return url
  }
}
