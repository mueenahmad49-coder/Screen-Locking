from django.contrib import admin
from django.forms.models import BaseInlineFormSet
from django import forms
from .models import QuizQuestion, QuizOption


class QuizOptionInlineFormSet(BaseInlineFormSet):

    def clean(self):
        super().clean()

        if any(self.errors):
            return

        correct_answers = 0
        valid_options = 0

        for form in self.forms:
            if not form.cleaned_data:
                continue

            if form.cleaned_data.get("DELETE"):
                continue

            if not form.cleaned_data.get("id") and not form.cleaned_data.get("option_text"):
                continue

            valid_options += 1

            if form.cleaned_data.get("is_correct"):
                correct_answers += 1

        if valid_options < 2:
            raise forms.ValidationError(
                "A question must have at least two options."
            )

        if correct_answers != 1:
            raise forms.ValidationError(
                "A question must have exactly one correct answer."
            )


class QuizOptionInline(admin.TabularInline):
    model = QuizOption
    formset = QuizOptionInlineFormSet
    extra = 4


@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "contest",
        "question_text",
        "marks",
        "order",
    )

    list_filter = ("contest",)
    search_fields = ("question_text", "contest__title")
    inlines = [QuizOptionInline]