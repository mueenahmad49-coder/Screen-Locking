from django.urls import path
from .views import ContestListCreateView, ContestDetailView


urlpatterns = [
    path(
        "",
        ContestListCreateView.as_view(),
        name="contest-list-create"
    ),

    path(
        "<int:pk>/",
        ContestDetailView.as_view(),
        name="contest-detail"
    ),
]