from datetime import date

import pytest
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient

from documents.models import IntakeRequest
from documents.models import ProjectCycle
from documents.models import ProjectIssue
from documents.models import ProjectLabel
from documents.models import ProjectState
from documents.models import Workspace

pytestmark = pytest.mark.api


@pytest.mark.django_db()
class TestProjectManagementApi:
    def _create_project(self, client: APIClient) -> dict:
        workspace_response = client.post(
            "/api/workspaces/",
            {"name": "Operations", "description": "Department workspace"},
            format="json",
        )
        assert workspace_response.status_code == status.HTTP_201_CREATED

        project_response = client.post(
            "/api/projects/",
            {
                "workspace": workspace_response.data["id"],
                "name": "IT Support",
                "key": "it",
                "description": "Support desk",
            },
            format="json",
        )
        assert project_response.status_code == status.HTTP_201_CREATED
        assert project_response.data["key"] == "IT"
        return project_response.data

    def test_create_and_list_project(self, admin_client: APIClient) -> None:
        project = self._create_project(admin_client)

        response = admin_client.get("/api/projects/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == project["id"]

    def test_workspace_stores_creator_and_created_time(
        self,
        admin_client: APIClient,
        admin_user: User,
    ) -> None:
        response = admin_client.post(
            "/api/workspaces/",
            {"name": "Operations"},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["owner"] == admin_user.id
        assert response.data["owner_username"] == admin_user.username
        assert response.data["created_at"]
        workspace = Workspace.objects.get(pk=response.data["id"])
        assert workspace.owner == admin_user
        assert workspace.created_at is not None

    def test_workspace_searches_by_name_and_paginates(
        self,
        admin_client: APIClient,
    ) -> None:
        for name in ["Operations Alpha", "Operations Beta", "Finance"]:
            response = admin_client.post(
                "/api/workspaces/",
                {"name": name},
                format="json",
            )
            assert response.status_code == status.HTTP_201_CREATED

        response = admin_client.get(
            "/api/workspaces/",
            {"search": "Operations", "page_size": 1},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2
        assert len(response.data["results"]) == 1
        assert "Operations" in response.data["results"][0]["name"]

    def test_quick_add_parses_labels_and_assignee(
        self,
        admin_client: APIClient,
    ) -> None:
        project = self._create_project(admin_client)
        User.objects.create_user(username="alex")
        state_response = admin_client.post(
            "/api/project_states/",
            {
                "project": project["id"],
                "name": "Backlog",
                "position": 0,
                "is_default": True,
            },
            format="json",
        )
        assert state_response.status_code == status.HTTP_201_CREATED

        response = admin_client.post(
            "/api/project_issues/quick_add/",
            {"project": project["id"], "text": "Reset laptop access #it @alex"},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "Reset laptop access"
        assert response.data["assignee_username"] == "alex"
        assert response.data["state_name"] == "Backlog"
        assert ProjectLabel.objects.get(project_id=project["id"], name="it")

    def test_accept_intake_request_creates_issue(
        self,
        admin_client: APIClient,
    ) -> None:
        project = self._create_project(admin_client)
        request_response = admin_client.post(
            "/api/intake_requests/",
            {
                "project": project["id"],
                "title": "Need a campaign landing page",
                "description": "Marketing request",
                "source_department": "Marketing",
            },
            format="json",
        )
        assert request_response.status_code == status.HTTP_201_CREATED

        response = admin_client.post(
            f"/api/intake_requests/{request_response.data['id']}/accept/",
            {"review_comment": "Accepted for sprint planning"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == IntakeRequest.Status.ACCEPTED
        issue = ProjectIssue.objects.get(pk=response.data["accepted_issue"])
        assert issue.title == "Need a campaign landing page"

    def test_cycle_rollover_moves_incomplete_issues(
        self,
        admin_client: APIClient,
    ) -> None:
        project = self._create_project(admin_client)
        backlog = ProjectState.objects.create(
            project_id=project["id"],
            name="Backlog",
            is_default=True,
        )
        done = ProjectState.objects.create(
            project_id=project["id"],
            name="Done",
            is_completed=True,
        )
        current = ProjectCycle.objects.create(
            project_id=project["id"],
            name="Week 1",
            starts_at=date(2026, 6, 1),
            ends_at=date(2026, 6, 7),
        )
        next_cycle = ProjectCycle.objects.create(
            project_id=project["id"],
            name="Week 2",
            starts_at=date(2026, 6, 8),
            ends_at=date(2026, 6, 14),
        )
        incomplete = ProjectIssue.objects.create(
            project_id=project["id"],
            title="Open task",
            state=backlog,
            cycle=current,
        )
        completed = ProjectIssue.objects.create(
            project_id=project["id"],
            title="Done task",
            state=done,
            cycle=current,
        )

        response = admin_client.post(
            f"/api/project_cycles/{current.id}/rollover/",
            {"next_cycle": next_cycle.id},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["moved"] == 1
        incomplete.refresh_from_db()
        completed.refresh_from_db()
        current.refresh_from_db()
        assert incomplete.cycle == next_cycle
        assert completed.cycle == current
        assert current.is_active is False
