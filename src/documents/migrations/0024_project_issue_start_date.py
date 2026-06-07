from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0023_project_issue_fixed_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="projectissue",
            name="start_date",
            field=models.DateField(
                blank=True,
                null=True,
                verbose_name="start date",
            ),
        ),
    ]
