import logging

from rest_framework import serializers
from journal.models import MedicalService, MedicalRequest, StatusHistory, RequestStatus

logger = logging.getLogger(__name__)


class MedicalServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalService
        fields = ['id', 'name', 'is_active']


class StatusHistorySerializer(serializers.ModelSerializer):
    changed_by = serializers.CharField(source='changed_by.username', read_only=True)

    class Meta:
        model = StatusHistory
        fields = ['id', 'from_status', 'to_status', 'changed_by', 'changed_at', 'reason']


class MedicalRequestListSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)

    class Meta:
        model = MedicalRequest
        fields = [
            'id', 'patient_fio', 'service', 'service_name',
            'desired_date', 'status', 'created_at',
        ]


class MedicalRequestDetailSerializer(serializers.ModelSerializer):
    history = StatusHistorySerializer(many=True, read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)

    class Meta:
        model = MedicalRequest
        fields = [
            'id', 'patient_fio', 'patient_snils', 'patient_phone',
            'service', 'service_name', 'desired_date', 'comment',
            'status', 'created_by', 'created_at', 'updated_by', 'updated_at',
            'history',
        ]
        read_only_fields = ['status', 'created_by', 'created_at', 'updated_by', 'updated_at']


class MedicalRequestCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = MedicalRequest
        fields = ['patient_fio', 'patient_snils', 'patient_phone', 'service', 'desired_date', 'comment']

    def validate_service(self, service):
        if not service.is_active:
            raise serializers.ValidationError("Выбранная услуга неактивна.")
        return service

    def create(self, validated_data):
        user = self.context['request'].user
        instance = MedicalRequest.objects.create(
            **validated_data,
            created_by=user,
            updated_by=user,
        )
        logger.info(
            "request_created request_id=%s user=%s service_id=%s desired_date=%s",
            instance.pk, user.username, instance.service_id, instance.desired_date,
        )
        return instance


class MedicalRequestUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = MedicalRequest
        fields = ['patient_fio', 'patient_phone', 'desired_date', 'comment']

    def update(self, instance, validated_data):
        user = self.context['request'].user
        instance = super().update(instance, {**validated_data, 'updated_by': user})
        logger.info(
            "request_updated request_id=%s user=%s",
            instance.pk, user.username,
        )
        return instance


class ChangeStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=RequestStatus.choices)
    reason = serializers.CharField(required=False, allow_blank=True)

    def save(self, request_obj, user):
        request_obj.change_status(
            new_status=self.validated_data['status'],
            user=user,
            reason=self.validated_data.get('reason'),
        )
        return request_obj