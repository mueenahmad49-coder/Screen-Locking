from django.contrib import admin
from django.urls import path, include


urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/v1/auth/", include("apps.accounts.urls")),

    path("api/v1/contests/", include("apps.contests.urls")),

    path("api/v1/registrations/", include("apps.registrations.urls")),

    path("api/v1/quizzes/", include("apps.quizzes.urls")),
]