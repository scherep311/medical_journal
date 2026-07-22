export default function DateRangeFilter({ label, from, to, onFromChange, onToChange }) {
  return (
    <div className="date-range">
      {label && <span className="date-range-label">{label}</span>}
      <div className="date-field">
        <input
          className={`input date-input${from ? '' : ' date-input-empty'}`}
          type="date"
          lang="ru"
          value={from}
          max={to || undefined}
          onChange={(e) => onFromChange(e.target.value)}
        />
        {!from && <span className="date-field-placeholder">дд.мм.гггг</span>}
      </div>
      <span>—</span>
      <div className="date-field">
        <input
          className={`input date-input${to ? '' : ' date-input-empty'}`}
          type="date"
          lang="ru"
          value={to}
          min={from || undefined}
          onChange={(e) => onToChange(e.target.value)}
        />
        {!to && <span className="date-field-placeholder">дд.мм.гггг</span>}
      </div>
    </div>
  );
}
