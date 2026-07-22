import Modal from './Modal';
import Field from './Field';
import MaskedInput, { SNILS_PATTERN, PHONE_PATTERN } from './MaskedInput';

export default function RequestForm({ mode, values, errors, services = [], onChange, onSubmit, onClose, saving }) {
  const isCreate = mode === 'create';

  return (
    <Modal onClose={onClose} onSubmit={onSubmit}>
      <h2>{isCreate ? 'Новая заявка' : 'Редактирование заявки'}</h2>

      <Field label="ФИО" error={errors.patient_fio}>
        <input
          className="input"
          type="text"
          placeholder="Иванов Иван Иванович"
          value={values.patient_fio}
          onChange={(e) => onChange('patient_fio', e.target.value)}
        />
      </Field>

      {isCreate && (
        <Field label="СНИЛС" error={errors.patient_snils}>
          <MaskedInput
            className="input"
            pattern={SNILS_PATTERN}
            placeholder="112-233-445 95"
            value={values.patient_snils}
            onChange={(v) => onChange('patient_snils', v)}
          />
        </Field>
      )}

      <Field label="Телефон" error={errors.patient_phone}>
        <div className="phone-input">
          <span className="phone-prefix">+7</span>
          <MaskedInput
            className="input"
            pattern={PHONE_PATTERN}
            placeholder="(___) ___-__-__"
            value={values.patient_phone.replace(/^\+7\s*/, '')}
            onChange={(core) => onChange('patient_phone', `+7 ${core}`)}
          />
        </div>
      </Field>

      {isCreate && (
        <Field label="Услуга" error={errors.service}>
          <select className="input" value={values.service} onChange={(e) => onChange('service', e.target.value)}>
            <option value="">Выберите услугу</option>
            {services.filter((s) => s.is_active).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Дата приёма" error={errors.desired_date}>
        <input
          className="input"
          type="date"
          lang="ru"
          value={values.desired_date}
          onChange={(e) => onChange('desired_date', e.target.value)}
        />
      </Field>

      <Field label="Комментарий">
        <textarea
          className="input"
          rows={2}
          value={values.comment}
          onChange={(e) => onChange('comment', e.target.value)}
        />
      </Field>

      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Отмена</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
      </div>
    </Modal>
  );
}
