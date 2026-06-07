from django.db import migrations
from django.db import models
from django.utils import timezone


def migrate_project_issue_status(apps, schema_editor):
    ProjectIssue = apps.get_model("documents", "ProjectIssue")

    for issue in ProjectIssue.objects.select_related("state").iterator():
        status = "open"
        state = issue.state
        if state:
            name = state.name.casefold()
            if state.is_completed:
                status = "completed"
            elif any(
                token in name for token in ["cancel", "cancelled", "canceled", "hủy"]
            ):
                status = "cancel"
            elif any(
                token in name
                for token in ["progress", "doing", "active", "đang", "dang"]
            ):
                status = "in_progress"
        issue.status = status
        issue.completed_at = timezone.now() if status == "completed" else None
        issue.save(update_fields=["status", "completed_at"])


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0022_project_management"),
    ]

    operations = [
        migrations.AddField(
            model_name="projectissue",
            name="status",
            field=models.CharField(
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
        migrations.RunPython(migrate_project_issue_status, migrations.RunPython.noop),
        migrations.RemoveIndex(
            model_name="projectissue",
            name="documents_p_project_22bb9b_idx",
        ),
        migrations.RemoveField(
            model_name="projectissue",
            name="state",
        ),
        migrations.DeleteModel(
            name="ProjectState",
        ),
        migrations.AddIndex(
            model_name="projectissue",
            index=models.Index(
                fields=["project", "status"],
                name="documents_p_project_dfd694_idx",
            ),
        ),
    ]
