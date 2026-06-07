import django.db.models.deletion
from django.conf import settings
from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0024_project_issue_start_date"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ProjectSubTask",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("title", models.CharField(max_length=255, verbose_name="title")),
                (
                    "description",
                    models.TextField(blank=True, verbose_name="description"),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("open", "Open"),
                            ("completed", "Completed"),
                            ("in_progress", "In progress"),
                            ("cancel", "Cancel"),
                        ],
                        default="open",
                        max_length=16,
                        verbose_name="status",
                    ),
                ),
                (
                    "start_date",
                    models.DateField(blank=True, null=True, verbose_name="start date"),
                ),
                (
                    "due_date",
                    models.DateField(blank=True, null=True, verbose_name="due date"),
                ),
                (
                    "estimate",
                    models.PositiveIntegerField(default=0, verbose_name="estimate"),
                ),
                (
                    "position",
                    models.PositiveIntegerField(default=0, verbose_name="position"),
                ),
                (
                    "completed_at",
                    models.DateTimeField(
                        blank=True,
                        null=True,
                        verbose_name="completed at",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="created at"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="updated at"),
                ),
                (
                    "assignee",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="assigned_project_subtasks",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="assignee",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_project_subtasks",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="created by",
                    ),
                ),
                (
                    "task",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="subtasks",
                        to="documents.projectissue",
                        verbose_name="task",
                    ),
                ),
            ],
            options={
                "verbose_name": "project subtask",
                "verbose_name_plural": "project subtasks",
                "ordering": ("task", "position", "created_at"),
            },
        ),
        migrations.AddIndex(
            model_name="projectsubtask",
            index=models.Index(
                fields=["task", "status"],
                name="documents_p_task_id_67a1ed_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="projectsubtask",
            index=models.Index(
                fields=["assignee", "created_at"],
                name="documents_p_assigne_1a4d13_idx",
            ),
        ),
    ]
