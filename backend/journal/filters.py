import django_filters
from journal.models import MedicalRequest, MedicalService, RequestStatus


class MedicalRequestFilter(django_filters.FilterSet):
    status = django_filters.MultipleChoiceFilter(choices=RequestStatus.choices)
    service = django_filters.ModelMultipleChoiceFilter(queryset=MedicalService.objects.all())
    desired_date_from = django_filters.DateFilter(field_name='desired_date', lookup_expr='gte')
    desired_date_to = django_filters.DateFilter(field_name='desired_date', lookup_expr='lte')
    search = django_filters.CharFilter(method='filter_search')

    def filter_search(self, queryset, name, value):
        value = value.strip()
        if not value:
            return queryset
        return queryset.filter(patient_fio__icontains=value)

    class Meta:
        model = MedicalRequest
        fields = ['status', 'service', 'desired_date_from', 'desired_date_to', 'search']