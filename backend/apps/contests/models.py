
from django.conf import settings
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError

class Contest(models.Model):

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"
        CANCELLED = "CANCELLED", "Cancelled"

    title = models.CharField(max_length=200)

    description = models.TextField()

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_contests"
    )

    start_time = models.DateTimeField()

    end_time = models.DateTimeField()

    registration_deadline = models.DateTimeField()

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)
    
    def clean(self):
     errors = {}

     if self.start_time and self.end_time:
        if self.end_time <= self.start_time:
            errors["end_time"] = "End time must be after start time."

     if self.registration_deadline and self.start_time:
        if self.registration_deadline > self.start_time:
            errors["registration_deadline"] = (
                "Registration deadline cannot be after contest start time."
            )

     if errors:
        raise ValidationError(errors)

    class Meta:
     ordering = ["-start_time"]

    constraints = [
        models.CheckConstraint(
            condition=models.Q(end_time__gt=models.F("start_time")),
            name="contest_end_after_start"
        ),
        models.CheckConstraint(
            condition=models.Q(
                registration_deadline__lte=models.F("start_time")
            ),
            name="contest_registration_before_start"
        ),
    ]

    def __str__(self):
        return self.title

    @property
    def is_upcoming(self):
        return (
            self.status == self.Status.PUBLISHED
            and timezone.now() < self.start_time
        )

    @property
    def is_ongoing(self):
        now = timezone.now()
        return (
            self.status == self.Status.PUBLISHED
            and self.start_time <= now < self.end_time
        )

    @property
    def is_finished(self):
        return timezone.now() >= self.end_time
