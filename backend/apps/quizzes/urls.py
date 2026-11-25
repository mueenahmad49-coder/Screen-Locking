
from django.urls import path

from .views import (
    ContestTimingView,
    AdminQuizQuestionListCreateView,
    AdminQuizQuestionDetailView,
    ParticipantQuizQuestionListView,
    ParticipantQuizSubmissionCreateView,
    ParticipantQuizSubmissionResultView,
    ParticipantQuizAnswerResultView,
    AdminQuizSubmissionListView,
)


urlpatterns = [

    # Contest timing
    path(
        "contests/<int:contest_id>/timing/",
        ContestTimingView.as_view(),
        name="contest-timing"
    ),

    # Admin question management
    path(
        "admin/questions/",
        AdminQuizQuestionListCreateView.as_view(),
        name="admin-quiz-question-list-create"
    ),

    path(
        "admin/questions/<int:pk>/",
        AdminQuizQuestionDetailView.as_view(),
        name="admin-quiz-question-detail"
    ),

    # Participant quiz questions
    path(
        "contests/<int:contest_id>/questions/",
        ParticipantQuizQuestionListView.as_view(),
        name="participant-quiz-question-list"
    ),

    # Participant quiz submission
    path(
        "contests/<int:contest_id>/submit/",
        ParticipantQuizSubmissionCreateView.as_view(),
        name="participant-quiz-submit"
    ),

    # Participant submission result
    path(
        "submissions/<int:pk>/",
        ParticipantQuizSubmissionResultView.as_view(),
        name="participant-quiz-submission-result"
    ),

    # Participant answer breakdown
    path(
        "submissions/<int:submission_id>/answers/",
        ParticipantQuizAnswerResultView.as_view(),
        name="participant-quiz-answer-results"
    ),

    # Admin submission management
    path(
        "admin/submissions/",
        AdminQuizSubmissionListView.as_view(),
        name="admin-quiz-submission-list"
    ),

]
