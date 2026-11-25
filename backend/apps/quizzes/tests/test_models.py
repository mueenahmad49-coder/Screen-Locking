from datetime import timedelta

from django.test import TestCase
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.contests.models import Contest
from apps.quizzes.models import QuizQuestion, QuizOption


class QuizModelTests(TestCase):

    def setUp(self):

        self.admin = User.objects.create_user(  #type:ignore
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
            start_time=now + timedelta(days=2),
            end_time=now + timedelta(days=2, hours=2),
            registration_deadline=now + timedelta(days=1),
            status=Contest.Status.PUBLISHED
        )

    def test_question_can_be_created(self):

        question = QuizQuestion.objects.create(
            contest=self.contest,
            question_text="What is Python?",
            marks=2,
            order=1
        )

        self.assertEqual(question.contest, self.contest)
        self.assertEqual(question.marks, 2)

    def test_options_can_be_created(self):

        question = QuizQuestion.objects.create(
            contest=self.contest,
            question_text="What is Python?",
            marks=2,
            order=1
        )

        option = QuizOption.objects.create(
            question=question,
            option_text="A programming language",
            is_correct=True,
            order=1
        )

        self.assertEqual(option.question, question)
        self.assertTrue(option.is_correct)

    def test_question_order_must_be_unique_per_contest(self):

        QuizQuestion.objects.create(
            contest=self.contest,
            question_text="Question 1",
            marks=1,
            order=1
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                QuizQuestion.objects.create(
                    contest=self.contest,
                    question_text="Question 2",
                    marks=1,
                    order=1
                )

    def test_option_order_must_be_unique_per_question(self):

        question = QuizQuestion.objects.create(
            contest=self.contest,
            question_text="What is Python?",
            marks=2,
            order=1
        )

        QuizOption.objects.create(
            question=question,
            option_text="Option A",
            order=1
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                QuizOption.objects.create(
                    question=question,
                    option_text="Option B",
                    order=1
                )