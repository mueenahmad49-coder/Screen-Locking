
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.contests.models import Contest
from apps.registrations.models import Registration


class RegistrationAPITests(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.participant = User.objects.create_user( #type:ignore
            email="participant@example.com",
            password="TestPassword123!",
            first_name="Test",
            last_name="Participant",
            role="PARTICIPANT"
        )

        self.participant2 = User.objects.create_user( #type:ignore
            email="participant2@example.com",
            password="TestPassword123!",
            first_name="Second",
            last_name="Participant",
            role="PARTICIPANT"
        )

        self.admin = User.objects.create_user( #type:ignore
            email="admin@example.com",
            password="TestPassword123!",
            first_name="Test",
            last_name="Admin",
            role="ADMIN",
            is_staff=True
        )

        now = timezone.now()

        self.published_contest = Contest.objects.create(
            title="Python Coding Challenge",
            description="Test contest",
            created_by=self.admin,
            start_time=now + timedelta(days=2),
            end_time=now + timedelta(days=2, hours=2),
            registration_deadline=now + timedelta(days=1),
            status=Contest.Status.PUBLISHED
        )

        self.draft_contest = Contest.objects.create(
            title="Java Programming Challenge",
            description="Draft contest",
            created_by=self.admin,
            start_time=now + timedelta(days=4),
            end_time=now + timedelta(days=4, hours=2),
            registration_deadline=now + timedelta(days=3),
            status=Contest.Status.DRAFT
        )

    def test_participant_can_register(self):
        self.client.force_authenticate(user=self.participant) #type:ignore

        response = self.client.post(
            "/api/v1/registrations/",
            {"contest": self.published_contest.id} #type:ignore
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Registration.objects.count(), 1)

    def test_duplicate_registration_is_rejected(self):
        Registration.objects.create(
            contest=self.published_contest,
            participant=self.participant
        )

        self.client.force_authenticate(user=self.participant) #type:ignore

        response = self.client.post(
            "/api/v1/registrations/",
            {"contest": self.published_contest.id} #type:ignore
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Registration.objects.count(), 1)

    def test_registration_for_draft_contest_is_rejected(self):
        self.client.force_authenticate(user=self.participant) #type:ignore

        response = self.client.post(
            "/api/v1/registrations/",
            {"contest": self.draft_contest.id} #type:ignore
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Registration.objects.count(), 0)

    def test_participant_can_only_see_own_registrations(self):
        Registration.objects.create(
            contest=self.published_contest,
            participant=self.participant
        )

        self.client.force_authenticate(user=self.participant) #type:ignore

        response = self.client.get("/api/v1/registrations/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1) #type:ignore
        self.assertEqual(
            response.data[0]["participant"], #type:ignore
            self.participant.id
        )

    def test_admin_can_view_all_registrations(self):
        Registration.objects.create(
            contest=self.published_contest,
            participant=self.participant
        )

        Registration.objects.create(
            contest=self.published_contest,
            participant=self.participant2
        )

        self.client.force_authenticate(user=self.admin) #type:ignore

        response = self.client.get("/api/v1/registrations/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2) #type:ignore

    def test_admin_cannot_register(self):
        self.client.force_authenticate(user=self.admin) #type:ignore

        response = self.client.post(
            "/api/v1/registrations/",
            {"contest": self.published_contest.id} #type:ignore
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Registration.objects.count(), 0)
