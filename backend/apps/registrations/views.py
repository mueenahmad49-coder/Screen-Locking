
from django.utils import timezone

from rest_framework import generics, serializers
from rest_framework.permissions import IsAuthenticated
from django.db import IntegrityError, transaction
from .models import Registration
from .serializers import RegistrationSerializer
from .permissions import IsParticipant


class RegistrationListCreateView(generics.ListCreateAPIView):

    serializer_class = RegistrationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self): #type: ignore
        user = self.request.user

        if user.role == "ADMIN": #type:ignore
            return Registration.objects.select_related(
                "contest",
                "participant"
            ).all()

        return Registration.objects.filter(
            participant=user
        ).select_related("contest", "participant")

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsParticipant()]

        return [IsAuthenticated()]
    def perform_create(self, serializer):
      contest = serializer.validated_data["contest"]

      if contest.status != contest.Status.PUBLISHED:
        raise serializers.ValidationError(
            {"contest": "This contest is not published."}
        )

      now = timezone.now()

      if now >= contest.registration_deadline:
        raise serializers.ValidationError(
            {"contest": "The registration deadline has passed."}
        )

      if now >= contest.start_time:
        raise serializers.ValidationError(
            {"contest": "Registration is closed because the contest has started."}
        )

      try:
        with transaction.atomic():
            serializer.save(participant=self.request.user)

      except IntegrityError:
        raise serializers.ValidationError(
            {"contest": "You are already registered for this contest."}
        )