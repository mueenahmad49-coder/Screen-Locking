from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from unittest.mock import patch
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.contests.models import Contest
from apps.registrations.models import Registration
from apps.quizzes.models import (
    QuizQuestion,
    QuizOption,
    QuizSubmission,
    QuizAnswer,
)


class QuizAPITests(TestCase):

    def setUp(self):

        self.client = APIClient()

        self.participant = User.objects.create_user(  # type:ignore
            email="participant@example.com",
            password="TestPassword123!",
            first_name="Test",
            last_name="Participant",
            role="PARTICIPANT"
        )

        self.participant2 = User.objects.create_user(  # type:ignore
            email="participant2@example.com",
            password="TestPassword123!",
            first_name="Second",
            last_name="Participant",
            role="PARTICIPANT"
        )

        self.admin = User.objects.create_user(  # type:ignore
            email="admin@example.com",
            password="TestPassword123!",
            first_name="Test",
            last_name="Admin",
            role="ADMIN",
            is_staff=True
        )

        now = timezone.now()

        self.contest = Contest.objects.create(
            title="Python Quiz Challenge",
            description="Test quiz contest",
            created_by=self.admin,
            start_time=now - timedelta(hours=1),
            end_time=now + timedelta(hours=1),
            registration_deadline=now - timedelta(hours=2),
            status=Contest.Status.PUBLISHED
        )

        self.question = QuizQuestion.objects.create(
            contest=self.contest,
            question_text="What is the correct Python file extension?",
            marks=2,
            order=1
        )

        QuizOption.objects.create(
            question=self.question,
            option_text=".py",
            is_correct=True,
            order=1
        )

        QuizOption.objects.create(
            question=self.question,
            option_text=".java",
            is_correct=False,
            order=2
        )

        QuizOption.objects.create(
            question=self.question,
            option_text=".cpp",
            is_correct=False,
            order=3
        )

    def test_admin_can_create_question(self):

        self.client.force_authenticate(user=self.admin)  # type:ignore

        response = self.client.post(
            "/api/v1/quizzes/admin/questions/",
            {
                "contest": self.contest.id,  # type:ignore
                "question_text": "What is Python?",
                "marks": 3,
                "order": 2,
                "options": [
                    {
                        "option_text": "A programming language",
                        "is_correct": True,
                        "order": 1
                    },
                    {
                        "option_text": "An operating system",
                        "is_correct": False,
                        "order": 2
                    }
                ]
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED
        )

        self.assertEqual(QuizQuestion.objects.count(), 2)

        self.assertEqual(
            QuizOption.objects.filter(
                question_id=response.data["id"] #type:ignore
            ).count(),  # type:ignore
            2
        )

    def test_admin_can_view_questions(self):

        self.client.force_authenticate(user=self.admin)  # type:ignore

        response = self.client.get(
            "/api/v1/quizzes/admin/questions/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)  # type:ignore

    def test_participant_cannot_access_admin_questions(self):

        self.client.force_authenticate(user=self.participant)  # type:ignore

        response = self.client.get(
            "/api/v1/quizzes/admin/questions/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )

    def test_registered_participant_can_view_questions(self):

        Registration.objects.create(
            contest=self.contest,
            participant=self.participant
        )

        self.client.force_authenticate(user=self.participant)  # type:ignore

        response = self.client.get(
            f"/api/v1/quizzes/contests/{self.contest.id}/questions/" #type:ignore
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)  # type:ignore

        options = response.data[0]["options"]  # type:ignore

        self.assertEqual(len(options), 3)

        self.assertNotIn("is_correct", options[0])

    def test_unregistered_participant_cannot_view_questions(self):

        self.client.force_authenticate(user=self.participant2)  # type:ignore

        response = self.client.get(
            f"/api/v1/quizzes/contests/{self.contest.id}/questions/" #type:ignore
        ) 

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )
        
        
    def test_question_rejects_no_correct_answer(self):

        self.client.force_authenticate(user=self.admin)  # type:ignore

        response = self.client.post(
            "/api/v1/quizzes/admin/questions/",
            {
                "contest": self.contest.id,  # type:ignore
                "question_text": "What is Python?",
                "marks": 2,
                "order": 2,
                "options": [
                    {
                        "option_text": "A programming language",
                        "is_correct": False,
                        "order": 1
                    },
                    {
                        "option_text": "An operating system",
                        "is_correct": False,
                        "order": 2
                    }
                ]
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

        self.assertEqual(QuizQuestion.objects.count(), 1)


    def test_question_rejects_multiple_correct_answers(self):

        self.client.force_authenticate(user=self.admin)  # type:ignore

        response = self.client.post(
            "/api/v1/quizzes/admin/questions/",
            {
                "contest": self.contest.id,  # type:ignore
                "question_text": "What is Python?",
                "marks": 2,
                "order": 2,
                "options": [
                    {
                        "option_text": "A programming language",
                        "is_correct": True,
                        "order": 1
                    },
                    {
                        "option_text": "An operating system",
                        "is_correct": True,
                        "order": 2
                    }
                ]
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

        self.assertEqual(QuizQuestion.objects.count(), 1)
        
    def test_admin_can_update_question(self):

        self.client.force_authenticate(user=self.admin)  # type:ignore

        response = self.client.patch(
            f"/api/v1/quizzes/admin/questions/{self.question.id}/",  #type:ignore
            {
                "question_text": "What is the extension of a Python file?",
                "marks": 5
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.question.refresh_from_db() 

        self.assertEqual(
            self.question.question_text,
            "What is the extension of a Python file?"
        )

        self.assertEqual(self.question.marks, 5)
        
        
        
    def test_admin_can_delete_question(self):

        self.client.force_authenticate(user=self.admin)  # type:ignore

        response = self.client.delete(
            f"/api/v1/quizzes/admin/questions/{self.question.id}/" #type:ignore
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT
        )

        self.assertFalse(
            QuizQuestion.objects.filter(
                id=self.question.id #type:ignore
            ).exists()
        )
    def test_participant_cannot_update_question(self):

        self.client.force_authenticate(user=self.participant)  # type:ignore

        response = self.client.patch(
            f"/api/v1/quizzes/admin/questions/{self.question.id}/", #type:ignore
            {
                "question_text": "Updated by participant",
                "marks": 10
            },
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.question.refresh_from_db()

        self.assertNotEqual(
            self.question.question_text,
            "Updated by participant"
        )


    def test_participant_cannot_delete_question(self):

        self.client.force_authenticate(user=self.participant)  # type:ignore

        response = self.client.delete(
            f"/api/v1/quizzes/admin/questions/{self.question.id}/" #type:ignore
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.assertTrue(
            QuizQuestion.objects.filter(id=self.question.id).exists() #type:ignore
        )


    def test_unauthenticated_user_cannot_view_questions(self):

        response = self.client.get(
            "/api/v1/quizzes/admin/questions/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED
        )
        
        
    
    def test_registered_participant_can_submit_quiz(self):

        Registration.objects.create(
            contest=self.contest,
            participant=self.participant
        )

        self.client.force_authenticate(user=self.participant)  # type:ignore

        correct_option = self.question.options.get(is_correct=True) #type:ignore

        response = self.client.post(
            f"/api/v1/quizzes/contests/{self.contest.id}/submit/", #type:ignore
            {
                "answers": [
                    {
                        "question_id": self.question.id,#type:ignore
                        "selected_option_id": correct_option.id
                    }
                ]
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED
        )

        self.assertEqual(
            response.data["result"]["score"],  # type:ignore
            2
        )

        self.assertEqual(QuizSubmission.objects.count(), 1)#type:ignore
        self.assertEqual(QuizAnswer.objects.count(), 1)#type:ignore


    def test_incorrect_answer_gets_zero_marks(self):

        Registration.objects.create(
            contest=self.contest,
            participant=self.participant
        )

        self.client.force_authenticate(user=self.participant)  # type:ignore

        incorrect_option = self.question.options.filter(is_correct=False).first() # type:ignore

        response = self.client.post(
            f"/api/v1/quizzes/contests/{self.contest.id}/submit/",#type:ignore
            {
                "answers": [
                    {
                        "question_id": self.question.id,#type:ignore
                        "selected_option_id": incorrect_option.id
                    }
                ]
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED
        )

        self.assertEqual(
            response.data["result"]["score"],  # type:ignore
            0
        )


    def test_participant_cannot_submit_twice(self):

        Registration.objects.create(
            contest=self.contest,
            participant=self.participant
        )

        self.client.force_authenticate(user=self.participant)  # type:ignore

        correct_option = self.question.options.get(is_correct=True)#type:ignore

        data = {
            "answers": [
                {
                    "question_id": self.question.id,#type:ignore
                    "selected_option_id": correct_option.id
                }
            ]
        }

        first_response = self.client.post(
            f"/api/v1/quizzes/contests/{self.contest.id}/submit/",#type:ignore
            data,
            format="json"
        )

        second_response = self.client.post(
            f"/api/v1/quizzes/contests/{self.contest.id}/submit/",#type:ignore
            data,
            format="json"
        )

        self.assertEqual(
            first_response.status_code,
            status.HTTP_201_CREATED
        )

        self.assertEqual(
            second_response.status_code,
            status.HTTP_403_FORBIDDEN
        )

        self.assertEqual(QuizSubmission.objects.count(), 1)#type:ignore


    def test_unregistered_participant_cannot_submit_quiz(self):

        self.client.force_authenticate(user=self.participant)  # type:ignore

        correct_option = self.question.options.get(is_correct=True)#type:ignore

        response = self.client.post(
            f"/api/v1/quizzes/contests/{self.contest.id}/submit/",#type:ignore
            {
                "answers": [
                    {
                        "question_id": self.question.id,#type:ignore
                        "selected_option_id": correct_option.id
                    }
                ]
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )


    def test_submission_rejects_option_from_another_question(self):

        Registration.objects.create(
            contest=self.contest,
            participant=self.participant
        )

        second_question = QuizQuestion.objects.create(
            contest=self.contest,
            question_text="What is Django?",
            marks=3,
            order=2
        )

        QuizOption.objects.create(
            question=second_question,
            option_text="Python web framework",
            is_correct=True,
            order=1
        )

        QuizOption.objects.create(
            question=second_question,
            option_text="Database",
            is_correct=False,
            order=2
        )

        correct_option = self.question.options.get(is_correct=True)#type:ignore

        self.client.force_authenticate(user=self.participant)  # type:ignore

        response = self.client.post(
            f"/api/v1/quizzes/contests/{self.contest.id}/submit/",#type:ignore
            {
                "answers": [
                    {
                        "question_id": self.question.id,#type:ignore
                        "selected_option_id": correct_option.id
                    },
                    {
                        "question_id": second_question.id,#type:ignore
                        "selected_option_id": correct_option.id
                    }
                ]
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

        self.assertEqual(QuizSubmission.objects.count(), 0)#type:ignore


    def test_submission_rejects_missing_answers(self):

        Registration.objects.create(
            contest=self.contest,
            participant=self.participant
        )

        self.client.force_authenticate(user=self.participant)  # type:ignore

        response = self.client.post(
            f"/api/v1/quizzes/contests/{self.contest.id}/submit/",#type:ignore
            {
                "answers": []
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )


    def test_admin_can_view_all_submissions(self):

        Registration.objects.create(
            contest=self.contest,
            participant=self.participant
        )

        correct_option = self.question.options.get(is_correct=True)#type:ignore

        QuizSubmission.objects.create(#type:ignore
            contest=self.contest,
            participant=self.participant,
            score=2
        )

        self.client.force_authenticate(user=self.admin)  # type:ignore

        response = self.client.get(
            "/api/v1/quizzes/admin/submissions/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.assertEqual(len(response.data), 1)  # type:ignore


    def test_participant_cannot_view_admin_submissions(self):

        self.client.force_authenticate(user=self.participant)  # type:ignore

        response = self.client.get(
            "/api/v1/quizzes/admin/submissions/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )


    def test_participant_cannot_view_another_participants_result(self):

        Registration.objects.create(
            contest=self.contest,
            participant=self.participant
        )

        submission = QuizSubmission.objects.create(#type:ignore
            contest=self.contest,
            participant=self.participant,
            score=2
        )

        self.client.force_authenticate(user=self.participant2)  # type:ignore

        response = self.client.get(
            f"/api/v1/quizzes/submissions/{submission.id}/" # type:ignore
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND
        )


    def test_participant_can_view_own_answer_results(self):

        Registration.objects.create(
            contest=self.contest,
            participant=self.participant
        )

        correct_option = self.question.options.get(is_correct=True)#type:ignore

        submission = QuizSubmission.objects.create(#type:ignore
            contest=self.contest,
            participant=self.participant,
            score=2
        )

        QuizAnswer.objects.create(#type:ignore
            submission=submission,
            question=self.question,
            selected_option=correct_option
        )

        self.client.force_authenticate(user=self.participant)  # type:ignore

        response = self.client.get(
            f"/api/v1/quizzes/submissions/{submission.id}/answers/" # type:ignore
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.assertEqual(len(response.data), 1)  # type:ignore

        self.assertTrue(
            response.data[0]["is_correct"]  # type:ignore
        )
  
    def test_contest_timing_returns_upcoming_status(self):

        self.client.force_authenticate(user=self.participant)  # type:ignore

        server_time = self.contest.start_time - timedelta(minutes=10)

        with patch(
            "apps.quizzes.views.timezone.now",
            return_value=server_time
        ):
            response = self.client.get(
                f"/api/v1/quizzes/contests/{self.contest.id}/timing/"  # type:ignore
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "UPCOMING")  # type:ignore
        self.assertEqual(response.data["server_time"], server_time)  # type:ignore
        self.assertEqual(
            response.data["start_time"],  # type:ignore
            self.contest.start_time
        )
        self.assertEqual(
            response.data["end_time"],  # type:ignore
            self.contest.end_time
        )

    def test_contest_timing_returns_ongoing_status(self):

        self.client.force_authenticate(user=self.participant)  # type:ignore

        server_time = self.contest.start_time + timedelta(minutes=10)

        with patch(
            "apps.quizzes.views.timezone.now",
            return_value=server_time
        ):
            response = self.client.get(
                f"/api/v1/quizzes/contests/{self.contest.id}/timing/"  # type:ignore
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ONGOING")  # type:ignore

    def test_contest_timing_returns_ended_at_exact_end_time(self):

        self.client.force_authenticate(user=self.participant)  # type:ignore

        server_time = self.contest.end_time

        with patch(
            "apps.quizzes.views.timezone.now",
            return_value=server_time
        ):
            response = self.client.get(
                f"/api/v1/quizzes/contests/{self.contest.id}/timing/"  # type:ignore
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ENDED")  # type:ignore

    def test_unregistered_participant_can_view_contest_timing(self):

        self.client.force_authenticate(user=self.participant2)  # type:ignore

        response = self.client.get(
            f"/api/v1/quizzes/contests/{self.contest.id}/timing/"  # type:ignore
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ONGOING")  # type:ignore
