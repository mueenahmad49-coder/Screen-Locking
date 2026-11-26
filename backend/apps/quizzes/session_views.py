
from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction, IntegrityError

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from apps.contests.models import Contest
from apps.registrations.models import Registration
from apps.registrations.permissions import IsParticipant

from .models import QuizSession, QuizSubmission
from .serializers import QuizSessionTokenSerializer


SESSION_TIMEOUT = 90


class QuizSessionStartView(APIView):

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

        if now >= contest.end_time:
            raise PermissionDenied(
                "This contest has already ended."
            )

        if not Registration.objects.filter(
            contest=contest,
            participant=request.user,
        ).exists():
            raise PermissionDenied(
                "You are not registered for this contest."
            )

        cutoff = now - timedelta(seconds=SESSION_TIMEOUT)

        try:
            with transaction.atomic():

                QuizSession.objects.filter(
                    contest=contest,
                    participant=request.user,
                    is_active=True,
                    last_heartbeat__lte=cutoff,
                ).update(
                    is_active=False,
                    ended_at=now,
                )

                if QuizSubmission.objects.filter(
                    contest=contest,
                    participant=request.user,
                ).exists():
                    raise PermissionDenied(
                        "You have already submitted this quiz."
                    )

                if QuizSession.objects.filter(
                    contest=contest,
                    participant=request.user,
                    is_active=True,
                ).exists():

                    return Response(
                        {
                            "message": "Another quiz window is already active."
                        },
                        status=status.HTTP_409_CONFLICT,
                    )

                session = QuizSession.objects.create(
                    contest=contest,
                    participant=request.user,
                    last_heartbeat=now,
                )

        except IntegrityError:
            return Response(
                {
                    "message": "Another quiz window is already active."
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {
                "message": "Quiz session started successfully.",
                "session_token": str(session.session_token),
                "heartbeat_interval": 15,
                "session_timeout": SESSION_TIMEOUT,
            },
            status=status.HTTP_201_CREATED,
        )


class QuizSessionHeartbeatView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsParticipant,
    ]

    def post(self, request, contest_id):

        serializer = QuizSessionTokenSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["session_token"]

        now = timezone.now()

        cutoff = now - timedelta(seconds=SESSION_TIMEOUT)

        updated = QuizSession.objects.filter(
            contest_id=contest_id,
            participant=request.user,
            session_token=token,
            is_active=True,
            last_heartbeat__gt=cutoff,
            contest__end_time__gt=now,
            contest__status=Contest.Status.PUBLISHED,
        ).update(
            last_heartbeat=now
        )

        if not updated:
            return Response(
                {
                    "message": "Quiz session is invalid or expired."
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response({
            "message": "Heartbeat received.",
            "is_active": True,
        })


class QuizSessionEndView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsParticipant,
    ]

    def post(self, request, contest_id):

        serializer = QuizSessionTokenSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["session_token"]

        session = get_object_or_404(
            QuizSession,
            contest_id=contest_id,
            participant=request.user,
            session_token=token,
        )

        QuizSession.objects.filter(
            pk=session.pk,
            is_active=True,
        ).update(
            is_active=False,
            ended_at=timezone.now(),
        )

        return Response({
            "message": "Quiz session closed successfully.",
            "is_active": False,
        })


def validate_quiz_session(request, contest_id):

    serializer = QuizSessionTokenSerializer(
        data={
            "session_token": request.headers.get(
                "X-Quiz-Session"
            )
        }
    )

    serializer.is_valid(raise_exception=True)

    token = serializer.validated_data["session_token"]

    now = timezone.now()

    cutoff = now - timedelta(seconds=SESSION_TIMEOUT)

    session = QuizSession.objects.filter(
        contest_id=contest_id,
        participant=request.user,
        session_token=token,
        is_active=True,
        last_heartbeat__gt=cutoff,
        contest__end_time__gt=now,
        contest__status=Contest.Status.PUBLISHED,
    ).first()

    if session is None:
        raise PermissionDenied(
            "Quiz session is invalid or expired."
        )

    return session
