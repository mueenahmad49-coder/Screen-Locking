
from rest_framework import serializers
from .models import Contest


class ContestSerializer(serializers.ModelSerializer):

    is_upcoming = serializers.BooleanField(read_only=True)
    is_ongoing = serializers.BooleanField(read_only=True)
    is_finished = serializers.BooleanField(read_only=True)

    class Meta:
        model = Contest

        fields = [
            "id",
            "title",
            "description",
            "created_by",
            "start_time",
            "end_time",
            "registration_deadline",
            "status",
            "is_upcoming",
            "is_ongoing",
            "is_finished",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_by",
            "is_upcoming",
            "is_ongoing",
            "is_finished",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        instance = self.instance

        start_time = attrs.get(
            "start_time",
            instance.start_time if instance else None
        )

        end_time = attrs.get(
            "end_time",
            instance.end_time if instance else None
        )

        registration_deadline = attrs.get(
            "registration_deadline",
            instance.registration_deadline if instance else None
        )

        errors = {}

        if start_time and end_time and end_time <= start_time:
            errors["end_time"] = "End time must be after start time."

        if (
            start_time
            and registration_deadline
            and registration_deadline > start_time
        ):
            errors["registration_deadline"] = (
                "Registration deadline cannot be after contest start time."
            )

        if errors:
            raise serializers.ValidationError(errors)

        return attrs
