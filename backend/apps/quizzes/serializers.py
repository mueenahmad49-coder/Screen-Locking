
from django.db import transaction
from rest_framework import serializers

from .models import (
    QuizQuestion,
    QuizOption,
    QuizSubmission,
    QuizAnswer,
)


class QuizOptionSerializer(serializers.ModelSerializer):

    class Meta:
        model = QuizOption
        fields = [
            "id",
            "option_text",
            "is_correct",
            "order",
        ]


class QuizQuestionSerializer(serializers.ModelSerializer):

    options = QuizOptionSerializer(many=True)

    class Meta:
        model = QuizQuestion
        fields = [
            "id",
            "contest",
            "question_text",
            "marks",
            "order",
            "options",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate_options(self, value):

        if len(value) < 2:
            raise serializers.ValidationError(
                "A question must have at least two options."
            )

        correct_answers = sum(
            1 for option in value if option.get("is_correct")
        )

        if correct_answers != 1:
            raise serializers.ValidationError(
                "A question must have exactly one correct answer."
            )

        return value

    @transaction.atomic
    def create(self, validated_data):

        options_data = validated_data.pop("options")

        question = QuizQuestion.objects.create(**validated_data)

        for option_data in options_data:
            QuizOption.objects.create(
                question=question,
                **option_data
            )

        return question

    @transaction.atomic
    def update(self, instance, validated_data):

        options_data = validated_data.pop("options", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if options_data is not None:

            instance.options.all().delete()

            for option_data in options_data:
                QuizOption.objects.create(
                    question=instance,
                    **option_data
                )

        return instance


class ParticipantQuizOptionSerializer(serializers.ModelSerializer):

    class Meta:
        model = QuizOption
        fields = [
            "id",
            "option_text",
            "order",
        ]


class ParticipantQuizQuestionSerializer(serializers.ModelSerializer):

    options = ParticipantQuizOptionSerializer(many=True)

    class Meta:
        model = QuizQuestion
        fields = [
            "id",
            "question_text",
            "marks",
            "order",
            "options",
        ]


class QuizAnswerInputSerializer(serializers.Serializer):

    question_id = serializers.IntegerField()

    selected_option_id = serializers.IntegerField()


class QuizSubmissionCreateSerializer(serializers.Serializer):

    answers = QuizAnswerInputSerializer(many=True)

    def validate_answers(self, value):

        if not value:
            raise serializers.ValidationError(
                "At least one answer is required."
            )

        question_ids = [answer["question_id"] for answer in value]

        if len(question_ids) != len(set(question_ids)):
            raise serializers.ValidationError(
                "A question cannot be answered more than once."
            )

        contest = self.context["contest"]

        questions = {
            question.id: question #type:ignore
            for question in QuizQuestion.objects.filter(
                contest=contest
            ).prefetch_related("options")
        }

        if set(question_ids) != set(questions.keys()):
            raise serializers.ValidationError(
                "You must answer every question in the contest exactly once."
            )

        for answer in value:

            question = questions.get(answer["question_id"])

            if question is None:
                raise serializers.ValidationError(
                    "Invalid question."
                )

            if not question.options.filter( #type:ignore
                id=answer["selected_option_id"]
            ).exists():
                raise serializers.ValidationError(
                    "Selected option does not belong to the question."
                )

        return value

    @transaction.atomic
    def create(self, validated_data):

        contest = self.context["contest"]
        participant = self.context["request"].user

        answers_data = validated_data["answers"]

        submission = QuizSubmission.objects.create(
            contest=contest,
            participant=participant,
            score=0
        )

        total_score = 0

        for answer_data in answers_data:

            question = QuizQuestion.objects.get(
                id=answer_data["question_id"]
            )

            selected_option = QuizOption.objects.get(
                id=answer_data["selected_option_id"]
            )

            QuizAnswer.objects.create(
                submission=submission,
                question=question,
                selected_option=selected_option
            )

            if selected_option.is_correct:
                total_score += question.marks

        submission.score = total_score
        submission.save(update_fields=["score"])

        return submission


class QuizSubmissionResultSerializer(serializers.ModelSerializer):

    contest_title = serializers.CharField(
        source="contest.title",
        read_only=True
    )

    participant_email = serializers.EmailField(
        source="participant.email",
        read_only=True
    )

    class Meta:
        model = QuizSubmission
        fields = [
            "id",
            "contest",
            "contest_title",
            "participant",
            "participant_email",
            "score",
            "submitted_at",
        ]
        read_only_fields = fields


class QuizAnswerResultSerializer(serializers.ModelSerializer):

    question_text = serializers.CharField(
        source="question.question_text",
        read_only=True
    )

    selected_option_text = serializers.CharField(
        source="selected_option.option_text",
        read_only=True
    )

    is_correct = serializers.BooleanField(
        source="selected_option.is_correct",
        read_only=True
    )

    marks = serializers.IntegerField(
        source="question.marks",
        read_only=True
    )

    class Meta:
        model = QuizAnswer
        fields = [
            "question",
            "question_text",
            "selected_option",
            "selected_option_text",
            "is_correct",
            "marks",
        ]
