import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api';
import { isOperator } from '../constants';
import AsyncState from '../components/AsyncState';

export default function Services({ role }) {
  const canEdit = isOperator(role);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newName, setNewName] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = canEdit ? '?include_inactive=true' : '';
      const res = await apiFetch(`/services/${query}`);
      setServices(res.results || res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [canEdit]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setFormError('');
    setSaving(true);
    try {
      await apiFetch('/services/', { method: 'POST', body: JSON.stringify({ name: newName.trim() }) });
      setNewName('');
      setShowAddForm(false);
      load();
    } catch (err) {
      setFormError(err.data?.errors?.name?.[0] || err.message);
    } finally {
      setSaving(false);
    }
  };

  const openAddForm = () => {
    setFormError('');
    setNewName('');
    setShowAddForm(true);
  };

  const closeAddForm = () => {
    setShowAddForm(false);
    setNewName('');
    setFormError('');
  };

  const toggleActive = async (service) => {
    await apiFetch(`/services/${service.id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: !service.is_active }),
    });
    load();
  };

  return (
    <div>
      {canEdit && (showAddForm ? (
        <form className="toolbar" onSubmit={handleCreate}>
          <input
            className="input"
            type="text"
            placeholder="Название новой услуги..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn btn-primary" disabled={saving}>Добавить</button>
          <button type="button" className="icon-btn" aria-label="Отмена" onClick={closeAddForm}>×</button>
          {formError && <span className="field-error">{formError}</span>}
        </form>
      ) : (
        <div className="toolbar">
          <button type="button" className="btn btn-primary" onClick={openAddForm}>Добавить услугу</button>
        </div>
      ))}

      <AsyncState loading={loading} error={error} empty={services.length === 0} emptyMessage="Услуг пока нет.">
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Статус</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.is_active ? 'Активна' : 'В архиве'}</td>
                  {canEdit && (
                    <td className="table-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => toggleActive(s)}>
                        {s.is_active ? 'В архив' : 'Восстановить'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AsyncState>
    </div>
  );
}
