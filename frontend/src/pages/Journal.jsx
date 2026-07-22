import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api';
import { STATUS_LABELS, isOperator } from '../constants';
import { validateSnils, validateFutureDate, validateFio, validatePhone } from '../utils/validators';
import { formatDate, formatHistoryDate } from '../utils/format';
import { DEFAULT_FILTERS, buildQuery, getFiltersFromUrl } from '../utils/urlFilters';
import FilterDropdown from '../components/FilterDropdown';
import DateRangeFilter from '../components/DateRangeFilter';
import AsyncState from '../components/AsyncState';
import RequestForm from '../components/RequestForm';

const EMPTY_REQUEST = {
  patient_fio: '',
  patient_snils: '',
  patient_phone: '',
  service: '',
  desired_date: '',
  comment: '',
};

const EMPTY_EDIT_REQUEST = {
  patient_fio: '',
  patient_phone: '',
  desired_date: '',
  comment: '',
};

const EDITABLE_STATUSES = ['NEW', 'IN_PROGRESS'];

export default function Journal({ role }) {
  const [filters, setFilters] = useState(getFiltersFromUrl);
  const [data, setData] = useState({ results: [], count: 0, next: null, previous: null });
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonError, setCancelReasonError] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [newRequest, setNewRequest] = useState(EMPTY_REQUEST);
  const [editRequest, setEditRequest] = useState(EMPTY_EDIT_REQUEST);

  const loadRequests = useCallback(async () => {
    const query = buildQuery(filters);
    window.history.replaceState({}, '', `${window.location.pathname}?${query}`);

    setLoading(true);
    setError(null);
    try {
      setData(await apiFetch(`/requests/?${query}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    apiFetch('/services/')
      .then((res) => setServices(res.results || res))
      .catch(() => setServices([]));
  }, []);

  const updateFilters = (patch) => setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const handleSort = (field) => {
    setFilters((prev) => ({
      ...prev,
      ordering: prev.ordering === field ? `-${field}` : field,
      page: 1,
    }));
  };

  const toggleStatus = (statusValue) => {
    setFilters((prev) => {
      const status = prev.status.includes(statusValue)
        ? prev.status.filter((s) => s !== statusValue)
        : [...prev.status, statusValue];
      return { ...prev, status, page: 1 };
    });
  };

  const toggleService = (serviceId) => {
    setFilters((prev) => {
      const service = prev.service.includes(serviceId)
        ? prev.service.filter((s) => s !== serviceId)
        : [...prev.service, serviceId];
      return { ...prev, service, page: 1 };
    });
  };

  const closeForm = () => setFormMode(null);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    const errors = {};
    const fioError = validateFio(newRequest.patient_fio);
    if (fioError) errors.patient_fio = [fioError];
    const snilsError = validateSnils(newRequest.patient_snils);
    if (snilsError) errors.patient_snils = [snilsError];
    const phoneError = validatePhone(newRequest.patient_phone);
    if (phoneError) errors.patient_phone = [phoneError];
    if (!newRequest.service) errors.service = ['Выберите услугу.'];
    const dateError = validateFutureDate(newRequest.desired_date);
    if (dateError) errors.desired_date = [dateError];
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setSaving(true);
    try {
      await apiFetch('/requests/', {
        method: 'POST',
        body: JSON.stringify({ ...newRequest, service: Number(newRequest.service) }),
      });
      setFormMode(null);
      setNewRequest(EMPTY_REQUEST);
      loadRequests();
    } catch (err) {
      if (err.data?.errors) setFormErrors(err.data.errors);
    } finally {
      setSaving(false);
    }
  };

  const openEditForm = (req) => {
    setEditRequest({
      patient_fio: req.patient_fio,
      patient_phone: req.patient_phone,
      desired_date: req.desired_date,
      comment: req.comment || '',
    });
    setFormErrors({});
    setFormMode('edit');
  };

  const handleEditRequest = async (e) => {
    e.preventDefault();
    const errors = {};
    const fioError = validateFio(editRequest.patient_fio);
    if (fioError) errors.patient_fio = [fioError];
    const phoneError = validatePhone(editRequest.patient_phone);
    if (phoneError) errors.patient_phone = [phoneError];
    const dateError = validateFutureDate(editRequest.desired_date);
    if (dateError) errors.desired_date = [dateError];
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setSaving(true);
    try {
      const updated = await apiFetch(`/requests/${selectedRequest.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(editRequest),
      });
      setFormMode(null);
      setSelectedRequest(updated);
      loadRequests();
    } catch (err) {
      if (err.data?.errors) setFormErrors(err.data.errors);
      else alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStatus = async (requestId, nextStatus) => {
    if (nextStatus === 'CANCELLED' && !cancelReason.trim()) {
      setCancelReasonError(true);
      return;
    }
    try {
      await apiFetch(`/requests/${requestId}/change-status/`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus, reason: cancelReason }),
      });
      setCancelReason('');
      setCancelReasonError(false);
      setSelectedRequest(await apiFetch(`/requests/${requestId}/`));
      loadRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const openDetails = async (id) => {
    try {
      setSelectedRequest(await apiFetch(`/requests/${id}/`));
    } catch (err) {
      alert(err.message);
    }
  };

  const sortMark = (field) => {
    if (!filters.ordering.includes(field)) return '';
    return filters.ordering.startsWith('-') ? ' ↓' : ' ↑';
  };

  return (
    <div>
      <div className="toolbar">
        <input
          className="input search-input"
          type="text"
          placeholder="Поиск по ФИО"
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
        />

        <FilterDropdown
          label="Статус"
          options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          selected={filters.status}
          onToggle={toggleStatus}
        />

        <FilterDropdown
          label="Услуга"
          options={services.map((s) => ({ value: String(s.id), label: s.is_active ? s.name : `${s.name} (архив)` }))}
          selected={filters.service}
          onToggle={toggleService}
        />

        <DateRangeFilter
          from={filters.desired_date_from}
          to={filters.desired_date_to}
          onFromChange={(v) => updateFilters({ desired_date_from: v })}
          onToChange={(v) => updateFilters({ desired_date_to: v })}
        />

        <button type="button" className="btn btn-secondary" onClick={resetFilters}>
          Сбросить фильтры
        </button>

        {isOperator(role) && (
          <button type="button" className="btn btn-primary toolbar-right" onClick={() => { setNewRequest(EMPTY_REQUEST); setFormErrors({}); setFormMode('create'); }}>
            Новая заявка
          </button>
        )}
      </div>

      <AsyncState loading={loading} error={error} empty={data.results.length === 0} emptyMessage="Заявок не найдено.">
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>ФИО</th>
                <th>Услуга</th>
                <th className="sortable" onClick={() => handleSort('desired_date')}>
                  Дата приёма{sortMark('desired_date')}
                </th>
                <th className="sortable" onClick={() => handleSort('created_at')}>
                  Создана{sortMark('created_at')}
                </th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.results.map((req) => (
                <tr key={req.id}>
                  <td>{req.patient_fio}</td>
                  <td>{req.service_name}</td>
                  <td>{formatDate(req.desired_date)}</td>
                  <td>{new Date(req.created_at).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge status-${req.status.toLowerCase()}`}>
                      {STATUS_LABELS[req.status]}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="btn btn-secondary" onClick={() => openDetails(req.id)}>
                      Открыть
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <button type="button" className="btn btn-secondary" disabled={!data.previous} onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}>
              Назад
            </button>
            <span>Страница {filters.page}</span>
            <button type="button" className="btn btn-secondary" disabled={!data.next} onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}>
              Вперёд
            </button>
          </div>
        </div>
      </AsyncState>

      {formMode === 'create' && (
        <RequestForm
          mode="create"
          values={newRequest}
          errors={formErrors}
          services={services}
          onChange={(field, value) => setNewRequest((prev) => ({ ...prev, [field]: value }))}
          onSubmit={handleCreateRequest}
          onClose={closeForm}
          saving={saving}
        />
      )}

      {formMode === 'edit' && (
        <RequestForm
          mode="edit"
          values={editRequest}
          errors={formErrors}
          onChange={(field, value) => setEditRequest((prev) => ({ ...prev, [field]: value }))}
          onSubmit={handleEditRequest}
          onClose={closeForm}
          saving={saving}
        />
      )}

      {selectedRequest && (
        <div className="drawer">
          <div className="drawer-header">
            <button type="button" className="icon-btn" aria-label="Закрыть" onClick={() => setSelectedRequest(null)}>×</button>
          </div>

          <dl className="details">
            <dt>Пациент</dt><dd>{selectedRequest.patient_fio}</dd>
            <dt>СНИЛС</dt><dd>{selectedRequest.patient_snils}</dd>
            <dt>Телефон</dt><dd>{selectedRequest.patient_phone}</dd>
            <dt>Услуга</dt><dd>{selectedRequest.service_name}</dd>
            <dt>Дата приёма</dt><dd>{formatDate(selectedRequest.desired_date)}</dd>
            <dt>Статус</dt>
            <dd>
              <span className={`status-badge status-${selectedRequest.status.toLowerCase()}`}>
                {STATUS_LABELS[selectedRequest.status]}
              </span>
            </dd>
            <dt>Комментарий</dt><dd>{selectedRequest.comment || '—'}</dd>
          </dl>

          {isOperator(role) && EDITABLE_STATUSES.includes(selectedRequest.status) && (
            <div className="status-actions">
              <button type="button" className="btn btn-secondary" onClick={() => openEditForm(selectedRequest)}>
                Редактировать
              </button>
              {selectedRequest.status === 'NEW' && (
                <button type="button" className="btn btn-primary" onClick={() => handleChangeStatus(selectedRequest.id, 'IN_PROGRESS')}>
                  В работу
                </button>
              )}
              {selectedRequest.status === 'IN_PROGRESS' && (
                <button type="button" className="btn btn-primary" onClick={() => handleChangeStatus(selectedRequest.id, 'DONE')}>
                  Завершить
                </button>
              )}
              <button type="button" className="btn btn-danger" onClick={() => handleChangeStatus(selectedRequest.id, 'CANCELLED')}>
                Отменить
              </button>
              <div>
                <input
                  className="input"
                  type="text"
                  placeholder="Причина отмены"
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value);
                    if (cancelReasonError) setCancelReasonError(false);
                  }}
                />
                {cancelReasonError && <span className="field-error">Укажите причину отмены</span>}
              </div>
            </div>
          )}

          <h3>История статусов</h3>
          {!selectedRequest.history?.length ? (
            <p className="state-message">Изменений пока нет</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Изменение статуса</th>
                  <th>Кто</th>
                  <th>Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {selectedRequest.history.map((h) => (
                  <tr key={h.id}>
                    <td>{formatHistoryDate(h.changed_at)}</td>
                    <td>{STATUS_LABELS[h.from_status]} → {STATUS_LABELS[h.to_status]}</td>
                    <td>{h.changed_by}</td>
                    <td>{h.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
