
from rest_framework import serializers

from .models import Registration


class RegistrationSerializer(serializers.ModelSerializer):

    contest_title = serializers.CharField(
        source="contest.title",
        read_only=True
    )

    participant_email = serializers.EmailField(
        source="participant.email",
        read_only=True
    )

    class Meta:
        model = Registration

        fields = [
            "id",
            "contest",
            "contest_title",
            "participant",
            "participant_email",
            "registered_at",
        ]

        read_only_fields = [
            "id",
            "participant",
            "participant_email",
            "registered_at",
        ]
