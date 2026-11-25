
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.contests.models import Contest


class QuizQuestion(models.Model):

    contest = models.ForeignKey(
        Contest,
        on_delete=models.CASCADE,
        related_name="quiz_questions"
    )

    question_text = models.TextField()

    marks = models.PositiveIntegerField(default=1)

    order = models.PositiveIntegerField(default=1)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order"]
        constraints = [
            models.UniqueConstraint(
                fields=["contest", "order"],
                name="unique_question_order_per_contest"
            )
        ]

    def __str__(self):
        return f"{self.contest.title} - Question {self.order}"


class QuizOption(models.Model):

    question = models.ForeignKey(
        QuizQuestion,
        on_delete=models.CASCADE,
        related_name="options"
    )

    option_text = models.CharField(max_length=500)

    is_correct = models.BooleanField(default=False)

    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["order"]
        constraints = [
            models.UniqueConstraint(
                fields=["question", "order"],
                name="unique_option_order_per_question"
            )
        ]

    def __str__(self):
        return self.option_text


class QuizSubmission(models.Model):

    contest = models.ForeignKey(
        Contest,
        on_delete=models.CASCADE,
        related_name="quiz_submissions"
    )

    participant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="quiz_submissions"
    )

    score = models.PositiveIntegerField(default=0)

    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-score", "submitted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["contest", "participant"],
                name="unique_quiz_submission_per_participant"
            )
        ]

    def __str__(self):
        return f"{self.participant.email} - {self.contest.title}"


class QuizAnswer(models.Model):

    submission = models.ForeignKey(
        QuizSubmission,
        on_delete=models.CASCADE,
        related_name="answers"
    )

    question = models.ForeignKey(
        QuizQuestion,
        on_delete=models.CASCADE,
        related_name="submitted_answers"
    )

    selected_option = models.ForeignKey(
        QuizOption,
        on_delete=models.PROTECT,
        related_name="selected_answers"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["submission", "question"],
                name="unique_answer_per_question_submission"
            )
        ]

    def clean(self):

        if self.question.contest_id != self.submission.contest_id: #type:ignore
            raise ValidationError(
                "Question does not belong to this contest."
            )

        if self.selected_option.question_id != self.question_id: #type:ignore
            raise ValidationError(
                "Selected option does not belong to this question."
            )

    def __str__(self):
        return f"Answer to Question {self.question.order}"
