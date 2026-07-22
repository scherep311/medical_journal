import pytest
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from journal.exceptions import InvalidTransitionError
from journal.models import ALLOWED_TRANSITIONS, MedicalRequest, MedicalService, RequestStatus
from journal.validators import validate_snils


VALID_SNILS = '112-233-445 95'
INVALID_SNILS = '112-233-445 00'


@pytest.fixture
def operator(db):
    return User.objects.create_user(username='operator', password='pass123', role=UserRole.OPERATOR)


@pytest.fixture
def viewer(db):
    return User.objects.create_user(username='viewer', password='pass123', role=UserRole.VIEWER)


@pytest.fixture
def service(db):
    return MedicalService.objects.create(name='Терапевт')


@pytest.fixture
def api_client():
    return APIClient()


def create_request(user, service, patient_fio='Иванов Иван Иванович', snils=VALID_SNILS):
    return MedicalRequest.objects.create(
        patient_fio=patient_fio,
        patient_snils=snils,
        patient_phone='+79990001122',
        service=service,
        desired_date=timezone.now().date() + timedelta(days=3),
        created_by=user,
        updated_by=user,
    )


def test_snils_validation():
    validate_snils(VALID_SNILS)
    with pytest.raises(ValidationError):
        validate_snils(INVALID_SNILS)


def test_status_transitions(api_client, operator, service):
    api_client.force_authenticate(user=operator)
    medical_request = create_request(operator, service)
    url = f'/api/requests/{medical_request.pk}/change-status/'

    response = api_client.post(url, {'status': RequestStatus.IN_PROGRESS}, format='json')
    assert response.status_code == status.HTTP_200_OK
    medical_request.refresh_from_db()
    assert medical_request.status == RequestStatus.IN_PROGRESS

    response = api_client.post(url, {'status': RequestStatus.NEW}, format='json')
    assert response.status_code == status.HTTP_409_CONFLICT


@pytest.mark.parametrize(
    "from_status,to_status",
    [(f, t) for f in RequestStatus.values for t in RequestStatus.values if f != t],
)
def test_status_transition_matrix(operator, service, from_status, to_status):
    medical_request = create_request(operator, service)
    medical_request.status = from_status
    medical_request.save(update_fields=["status"])

    allowed = to_status in ALLOWED_TRANSITIONS.get(from_status, set())

    if allowed:
        reason = "Отмена по просьбе пациента" if to_status == RequestStatus.CANCELLED else None
        medical_request.change_status(to_status, operator, reason=reason)
        medical_request.refresh_from_db()
        assert medical_request.status == to_status
    else:
        with pytest.raises(InvalidTransitionError):
            medical_request.change_status(to_status, operator)


def test_viewer_cannot_change_status(api_client, viewer, operator, service):
    medical_request = create_request(operator, service)
    api_client.force_authenticate(user=viewer)

    url = f'/api/requests/{medical_request.pk}/change-status/'
    response = api_client.post(url, {'status': RequestStatus.IN_PROGRESS}, format='json')
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_pagination_and_search_filter(api_client, operator, service):
    for i in range(11):
        create_request(operator, service, patient_fio=f'Пациент {i}')
    api_client.force_authenticate(user=operator)

    response = api_client.get('/api/requests/')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['count'] == 11
    assert len(response.data['results']) == 10
    assert response.data['next'] is not None

    create_request(operator, service, patient_fio='Петров Пётр Петрович')
    response = api_client.get('/api/requests/', {'search': 'Петров'})
    assert response.status_code == status.HTTP_200_OK
    assert response.data['count'] == 1
    assert response.data['results'][0]['patient_fio'] == 'Петров Пётр Петрович'


def test_statistics_aggregation(api_client, operator, service):
    cardiology = MedicalService.objects.create(name='Кардиолог')
    req1 = create_request(operator, service)
    req2 = create_request(operator, cardiology, patient_fio='Петров Пётр Петрович')

    req1.change_status(RequestStatus.IN_PROGRESS, operator)
    req2.change_status(RequestStatus.IN_PROGRESS, operator)
    req2.change_status(RequestStatus.DONE, operator)

    api_client.force_authenticate(user=operator)
    response = api_client.get('/api/requests/statistics/')

    assert response.status_code == status.HTTP_200_OK
    assert response.data['total'] == 2
    assert response.data['by_status'][RequestStatus.IN_PROGRESS] == 1
    assert response.data['by_status'][RequestStatus.DONE] == 1
    assert len(response.data['by_services']) == 2


def test_statistics_groups_requests_with_the_same_status(api_client, operator, service):
    create_request(operator, service, patient_fio='Иванов Иван Иванович')
    create_request(operator, service, patient_fio='Петров Пётр Петрович')

    api_client.force_authenticate(user=operator)
    response = api_client.get('/api/requests/statistics/')

    assert response.status_code == status.HTTP_200_OK
    assert response.data['total'] == 2
    assert response.data['by_status'][RequestStatus.NEW] == 2
    assert response.data['by_services'] == [{'service_name': service.name, 'count': 2}]
