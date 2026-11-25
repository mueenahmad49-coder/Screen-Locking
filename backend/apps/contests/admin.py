
from django.contrib import admin
from .models import Contest


@admin.register(Contest)
class ContestAdmin(admin.ModelAdmin):

    list_display = (
        "title",
        "created_by",
        "start_time",
        "end_time",
        "registration_deadline",
        "status",
    )

    list_filter = (
        "status",
        "start_time",
        "created_at",
    )

    search_fields = (
        "title",
        "description",
        "created_by__email",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    ordering = ("-start_time",)

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user

        obj.full_clean()
        super().save_model(request, obj, form, change)
