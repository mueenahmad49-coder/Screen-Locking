
from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.contests.models import Contest


class Registration(models.Model):

    contest = models.ForeignKey(
        Contest,
        on_delete=models.CASCADE,
        related_name="registrations"
    )

    participant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="contest_registrations"
    )

    registered_at = models.DateTimeField(
        default=timezone.now
    )

    class Meta:
        ordering = ["-registered_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["contest", "participant"],
                name="unique_contest_participant_registration"
            )
        ]

    def __str__(self):
        return f"{self.participant.email} - {self.contest.title}"
