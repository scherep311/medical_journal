import logging

from django.conf import settings
from django.db import models, transaction

from journal.validators import validate_snils, validate_future_date, validate_fio, validate_phone
from journal.exceptions import (
    InvalidTransitionError,
    StatusChangeValidationError,
)

logger = logging.getLogger(__name__)


class MedicalService(models.Model):
    name = models.CharField(max_length=255, unique=True, verbose_name="Название услуги")
    is_active = models.BooleanField(default=True, verbose_name="Активна")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата добавления")

    class Meta:
        db_table = 'services'
        ordering = ['name']
        verbose_name = 'Медицинская услуга'
        verbose_name_plural = 'Медицинские услуги'

    def __str__(self):
        return self.name


class RequestStatus(models.TextChoices):
    NEW = 'NEW', 'Новая'
    IN_PROGRESS = 'IN_PROGRESS', 'В работе'
    DONE = 'DONE', 'Завершена'
    CANCELLED = 'CANCELLED', 'Отменена'

ALLOWED_TRANSITIONS = {
    RequestStatus.NEW: {RequestStatus.IN_PROGRESS, RequestStatus.CANCELLED},
    RequestStatus.IN_PROGRESS: {RequestStatus.DONE, RequestStatus.CANCELLED},
    RequestStatus.DONE: set(),
    RequestStatus.CANCELLED: set(),
}


class MedicalRequest(models.Model):
    patient_fio = models.CharField(max_length=255, validators=[validate_fio], verbose_name="ФИО пациента")
    patient_snils = models.CharField(max_length=14, validators=[validate_snils], verbose_name="СНИЛС")
    patient_phone = models.CharField(max_length=20, validators=[validate_phone], verbose_name="Телефон")

    service = models.ForeignKey(
        MedicalService,
        on_delete=models.PROTECT,
        related_name="requests",
        verbose_name="Услуга"
    )
    desired_date = models.DateField(
        validators=[validate_future_date],
        verbose_name="Желаемая дата приёма"
    )
    comment = models.TextField(blank=True, null=True, verbose_name="Комментарий")
    status = models.CharField(
        max_length=40,
        choices=RequestStatus.choices,
        default=RequestStatus.NEW,
        verbose_name="Статус"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_requests",
        verbose_name="Кем создана"
    )
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name="Дата создания")
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="updated_requests",
        verbose_name="Кем изменена"
    )
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата изменения")


    class Meta:
        db_table = 'requests'
        ordering = ['-created_at']
        verbose_name = 'Заявка'
        verbose_name_plural = 'Заявки'

    def __str__(self):
        return f"Заявка #{self.pk} ({self.patient_fio})"

    @transaction.atomic
    def change_status(self, new_status: str, user, reason: str = None):
        request = MedicalRequest.objects.select_for_update().get(pk=self.pk)
        old_status = request.status

        allowed = ALLOWED_TRANSITIONS.get(old_status, set())
        if new_status not in allowed:
            logger.warning(
                "REJECTED status_change request_id=%s user=%s from=%s to=%s",
                request.pk, getattr(user, "username", None), old_status, new_status,
            )
            raise InvalidTransitionError(f"Недопустимый переход из '{old_status}' в '{new_status}'.")

        if new_status == RequestStatus.CANCELLED and not reason:
            raise StatusChangeValidationError("При отмене заявки необходимо указать причину.")

        request.status = new_status
        request.updated_by = user
        request.save(update_fields=["status", "updated_by", "updated_at"])

        StatusHistory.objects.create(
            request=request,
            from_status=old_status,
            to_status=new_status,
            changed_by=user,
            reason=reason if new_status == RequestStatus.CANCELLED else ""
        )

        logger.info(
            "status_change request_id=%s user=%s from=%s to=%s reason=%r",
            request.pk, getattr(user, "username", None), old_status, new_status, reason or "",
        )

        self.status = request.status
        self.updated_by = user


class StatusHistory(models.Model):
    request = models.ForeignKey(
        MedicalRequest,
        on_delete=models.CASCADE,
        related_name="history",
        verbose_name="Заявка"
    )
    from_status = models.CharField(max_length=20, choices=RequestStatus.choices, verbose_name="Статус ИЗ")
    to_status = models.CharField(max_length=20, choices=RequestStatus.choices, verbose_name="Статус В")
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, verbose_name="Кто изменил")
    changed_at = models.DateTimeField(auto_now_add=True, verbose_name="Момент изменения")
    reason = models.TextField(blank=True, null=True, verbose_name="Причина отмены")

    class Meta:
        db_table = 'request_status_history'
        ordering = ['-changed_at']
        verbose_name = 'История статуса'
        verbose_name_plural = 'Истории статусов'