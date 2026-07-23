from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from django.db.models import Avg, Count, DurationField, ExpressionWrapper, F, OuterRef, Subquery

from journal.models import MedicalService, MedicalRequest, RequestStatus, StatusHistory
from journal.filters import MedicalRequestFilter
from journal.exceptions import RequestEditNotAllowedError
from journal.serializers import (
    MedicalServiceSerializer,
    MedicalRequestListSerializer,
    MedicalRequestDetailSerializer,
    MedicalRequestCreateSerializer,
    MedicalRequestUpdateSerializer,
    ChangeStatusSerializer,
)
from accounts.models import UserRole
from accounts.permissions import IsOperator

EDITABLE_STATUSES = (RequestStatus.NEW, RequestStatus.IN_PROGRESS)


class MedicalServiceViewSet(viewsets.ModelViewSet):
    serializer_class = MedicalServiceSerializer
    http_method_names = ['get', 'post', 'patch']

    def get_queryset(self):
        qs = MedicalService.objects.order_by('name')
        user = self.request.user
        is_operator = user.is_authenticated and user.role == UserRole.OPERATOR
        show_inactive = is_operator and self.request.query_params.get('include_inactive')
        if self.action == 'list' and not show_inactive:
            return qs.filter(is_active=True)
        return qs

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update'):
            return [permissions.IsAuthenticated(), IsOperator()]
        return [permissions.IsAuthenticated()]


class MedicalRequestViewSet(viewsets.ModelViewSet):
    queryset = MedicalRequest.objects.select_related('service', 'created_by', 'updated_by')
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = MedicalRequestFilter
    ordering_fields = ['created_at', 'desired_date']
    ordering = ['-created_at']
    http_method_names = ['get', 'post', 'patch']

    def get_serializer_class(self):
        if self.action == 'list':
            return MedicalRequestListSerializer
        if self.action == 'create':
            return MedicalRequestCreateSerializer
        if self.action in ('update', 'partial_update'):
            return MedicalRequestUpdateSerializer
        return MedicalRequestDetailSerializer

    def get_permissions(self):
        if self.action in ('create', 'change_status', 'update', 'partial_update'):
            return [permissions.IsAuthenticated(), IsOperator()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == 'retrieve':
            qs = qs.prefetch_related('history', 'history__changed_by')
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(MedicalRequestDetailSerializer(instance).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        if instance.status not in EDITABLE_STATUSES:
            raise RequestEditNotAllowedError(
                "Редактирование недоступно: заявка находится в финальном статусе."
            )
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(MedicalRequestDetailSerializer(instance).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='change-status')
    def change_status(self, request, pk=None):
        request_obj = self.get_object()
        serializer = ChangeStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(request_obj=request_obj, user=request.user)
        return Response(MedicalRequestDetailSerializer(request_obj).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='statistics')
    def statistics(self, request):
        queryset = self.filter_queryset(self.get_queryset()).order_by()

        status_counts = {
            row['status']: row['count']
            for row in queryset.values('status').annotate(count=Count('id'))
        }
        by_status = {value: status_counts.get(value, 0) for value in RequestStatus.values}
        total_count = sum(by_status.values())

        services = (
            queryset.values('service__name')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        entered_in_progress_at = StatusHistory.objects.filter(
            request_id=OuterRef('request_id'),
            to_status=RequestStatus.IN_PROGRESS,
        ).values('changed_at')[:1]

        avg_in_progress_duration = (
            StatusHistory.objects
            .filter(request__in=queryset, from_status=RequestStatus.IN_PROGRESS)
            .annotate(entered_at=Subquery(entered_in_progress_at))
            .annotate(
                in_progress_duration=ExpressionWrapper(
                    F('changed_at') - F('entered_at'), output_field=DurationField()
                )
            )
            .aggregate(avg=Avg('in_progress_duration'))['avg']
        )
        avg_in_progress_seconds = (
            round(avg_in_progress_duration.total_seconds())
            if avg_in_progress_duration is not None else None
        )

        return Response({
            'total': total_count,
            'by_status': by_status,
            'by_services': [
                {'service_name': s['service__name'], 'count': s['count']}
                for s in services
            ],
            'avg_in_progress_seconds': avg_in_progress_seconds,
        }, status=status.HTTP_200_OK)
