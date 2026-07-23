import { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import { STATUS_LABELS } from '../constants';
import { formatDuration } from '../utils/format';
import DateRangeFilter from '../components/DateRangeFilter';
import AsyncState from '../components/AsyncState';

export default function Statistics() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('desired_date_from', dateFrom);
    if (dateTo) params.set('desired_date_to', dateTo);

    setLoading(true);
    setError(null);
    apiFetch(`/requests/statistics/?${params}`)
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  const maxStatusCount = stats ? Math.max(...Object.values(stats.by_status), 1) : 1;

  return (
    <div>
      <div className="toolbar">
        <DateRangeFilter label="Период" from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
      </div>

      <AsyncState loading={loading} error={error} empty={!stats || stats.total === 0} emptyMessage="За период заявок нет.">
        <div className="stats-grid">
          <div className="card stats-card">
            <p className="stats-total-big">Всего заявок: {stats?.total}</p>
            <p>Среднее время в статусе «В работе»: {formatDuration(stats?.avg_in_progress_seconds)}</p>
            {stats && Object.entries(stats.by_status).map(([status, count]) => (
              <div key={status} className="bar-row">
                <div className="bar-row-labels">
                  <span>{STATUS_LABELS[status]}</span>
                  <span>{count}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(count / maxStatusCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="card stats-card">
            <table className="table">
              <thead>
                <tr>
                  <th>Услуга</th>
                  <th>Кол-во</th>
                </tr>
              </thead>
              <tbody>
                {stats?.by_services.map((row, index) => (
                  <tr key={index}>
                    <td>{row.service_name}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AsyncState>
    </div>
  );
}
