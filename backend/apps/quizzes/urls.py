
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

from .session_views import (
    QuizSessionStartView,
    QuizSessionHeartbeatView,
    QuizSessionEndView,
)


urlpatterns = [

    path(
        "contests/<int:contest_id>/timing/",
        ContestTimingView.as_view(),
        name="contest-timing"
    ),

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

    path(
        "contests/<int:contest_id>/questions/",
        ParticipantQuizQuestionListView.as_view(),
        name="participant-quiz-question-list"
    ),

    path(
        "contests/<int:contest_id>/submit/",
        ParticipantQuizSubmissionCreateView.as_view(),
        name="participant-quiz-submit"
    ),

    path(
        "submissions/<int:pk>/",
        ParticipantQuizSubmissionResultView.as_view(),
        name="participant-quiz-submission-result"
    ),

    path(
        "submissions/<int:submission_id>/answers/",
        ParticipantQuizAnswerResultView.as_view(),
        name="participant-quiz-answer-results"
    ),

    path(
        "admin/submissions/",
        AdminQuizSubmissionListView.as_view(),
        name="admin-quiz-submission-list"
    ),

    # Screen Locking Session APIs

    path(
        "contests/<int:contest_id>/session/start/",
        QuizSessionStartView.as_view(),
        name="quiz-session-start"
    ),

    path(
        "contests/<int:contest_id>/session/heartbeat/",
        QuizSessionHeartbeatView.as_view(),
        name="quiz-session-heartbeat"
    ),

    path(
        "contests/<int:contest_id>/session/end/",
        QuizSessionEndView.as_view(),
        name="quiz-session-end"
    ),
]
