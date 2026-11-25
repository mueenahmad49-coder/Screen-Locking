
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import IntegrityError, transaction

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.contests.models import Contest
from apps.contests.permissions import IsAdminRole
from apps.registrations.models import Registration
from apps.registrations.permissions import IsParticipant

from .models import QuizQuestion, QuizSubmission
from .serializers import (
    QuizQuestionSerializer,
    ParticipantQuizQuestionSerializer,
    QuizSubmissionCreateSerializer,
    QuizSubmissionResultSerializer,
    QuizAnswerResultSerializer,
)


class ContestTimingView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsParticipant,
    ]

    def get(self, request, contest_id):

        contest = get_object_or_404(
            Contest,
            id=contest_id,
            status=Contest.Status.PUBLISHED,
        )

        # Capture server time once for a consistent response.
        now = timezone.now()

        if now < contest.start_time:
            timing_status = "UPCOMING"
        elif now < contest.end_time:
            timing_status = "ONGOING"
        else:
            timing_status = "ENDED"

        return Response({
            "server_time": now,
            "start_time": contest.start_time,
            "end_time": contest.end_time,
            "status": timing_status,
        })


class AdminQuizQuestionListCreateView(generics.ListCreateAPIView):

    serializer_class = QuizQuestionSerializer

    permission_classes = [
        IsAuthenticated,
        IsAdminRole,
    ]

    queryset = QuizQuestion.objects.select_related(
        "contest"
    ).prefetch_related("options")


class AdminQuizQuestionDetailView(generics.RetrieveUpdateDestroyAPIView):

    serializer_class = QuizQuestionSerializer

    permission_classes = [
        IsAuthenticated,
        IsAdminRole,
    ]

    queryset = QuizQuestion.objects.select_related(
        "contest"
    ).prefetch_related("options")


class ParticipantQuizQuestionListView(generics.ListAPIView):

    serializer_class = ParticipantQuizQuestionSerializer

    permission_classes = [
        IsAuthenticated,
        IsParticipant,
    ]

    def get_queryset(self):  # type:ignore

        contest = get_object_or_404(
            Contest,
            id=self.kwargs.get("contest_id"),
            status=Contest.Status.PUBLISHED,
        )

        now = timezone.now()

        if not (contest.start_time <= now < contest.end_time):
            raise NotFound("This contest is not currently ongoing.")

        is_registered = Registration.objects.filter(
            contest=contest,
            participant=self.request.user,
        ).exists()

        if not is_registered:
            raise PermissionDenied(
                "You are not registered for this contest."
            )

        return QuizQuestion.objects.filter(
            contest=contest
        ).prefetch_related("options")


class ParticipantQuizSubmissionCreateView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsParticipant,
    ]

    def post(self, request, contest_id):

        contest = get_object_or_404(
            Contest,
            id=contest_id,
            status=Contest.Status.PUBLISHED,
        )

        now = timezone.now()

        if not (contest.start_time <= now < contest.end_time):
            raise PermissionDenied(
                "Quiz submissions are allowed only during an ongoing contest."
            )

        is_registered = Registration.objects.filter(
            contest=contest,
            participant=request.user,
        ).exists()

        if not is_registered:
            raise PermissionDenied(
                "You are not registered for this contest."
            )

        if QuizSubmission.objects.filter(
            contest=contest,
            participant=request.user,
        ).exists():
            raise PermissionDenied(
                "You have already submitted this quiz."
            )

        serializer = QuizSubmissionCreateSerializer(
            data=request.data,
            context={
                "request": request,
                "contest": contest,
            }
        )

        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                submission = serializer.save()

        except IntegrityError:
            return Response(
                {
                    "message": "You have already submitted this quiz."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        result_serializer = QuizSubmissionResultSerializer(submission)

        return Response(
            {
                "message": "Quiz submitted successfully.",
                "result": result_serializer.data
            },
            status=status.HTTP_201_CREATED
        )


class ParticipantQuizSubmissionResultView(generics.RetrieveAPIView):

    serializer_class = QuizSubmissionResultSerializer

    permission_classes = [
        IsAuthenticated,
        IsParticipant,
    ]

    def get_queryset(self):  # type:ignore

        return QuizSubmission.objects.filter(
            participant=self.request.user
        ).select_related(
            "contest",
            "participant"
        )


class ParticipantQuizAnswerResultView(generics.ListAPIView):

    serializer_class = QuizAnswerResultSerializer

    permission_classes = [
        IsAuthenticated,
        IsParticipant,
    ]

    def get_queryset(self):

        submission = get_object_or_404(
            QuizSubmission,
            id=self.kwargs.get("submission_id"),
            participant=self.request.user,
        )

        return submission.answers.select_related( #type:ignore
            "question",
            "selected_option"
        )


class AdminQuizSubmissionListView(generics.ListAPIView):

    serializer_class = QuizSubmissionResultSerializer

    permission_classes = [
        IsAuthenticated,
        IsAdminRole,
    ]

    def get_queryset(self):  # type:ignore

        queryset = QuizSubmission.objects.select_related(
            "contest",
            "participant"
        )

        contest_id = self.request.query_params.get("contest")  # type:ignore

        if contest_id:
            queryset = queryset.filter(contest_id=contest_id)

        return queryset
