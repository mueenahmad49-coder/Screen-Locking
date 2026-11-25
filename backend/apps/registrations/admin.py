
from django.contrib import admin

from .models import Registration


@admin.register(Registration)
class RegistrationAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "participant",
        "contest",
        "registered_at",
    )

    list_filter = (
        "contest",
        "registered_at",
    )

    search_fields = (
        "participant__email",
        "contest__title",
    )

    readonly_fields = (
        "registered_at",
    )

    ordering = ("-registered_at",)
