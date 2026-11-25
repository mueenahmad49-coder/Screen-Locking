
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Contest
from .serializers import ContestSerializer
from .permissions import IsAdminRole


class ContestListCreateView(generics.ListCreateAPIView):

    serializer_class = ContestSerializer

    def get_queryset(self): #type:ignore
        user = self.request.user

        if user.role == "ADMIN": #type:ignore
            return Contest.objects.all()

        return Contest.objects.filter(
            status=Contest.Status.PUBLISHED
        )

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsAdminRole()]

        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ContestDetailView(generics.RetrieveUpdateDestroyAPIView):

    serializer_class = ContestSerializer

    def get_queryset(self): #type:ignore
        user = self.request.user

        if user.role == "ADMIN": #type:ignore
            return Contest.objects.all()

        return Contest.objects.filter(
            status=Contest.Status.PUBLISHED
        )

    def get_permissions(self):
        if self.request.method in ["PUT", "PATCH", "DELETE"]:
            return [IsAuthenticated(), IsAdminRole()]

        return [IsAuthenticated()]
