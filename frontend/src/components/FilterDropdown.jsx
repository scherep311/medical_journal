export default function FilterDropdown({ label, options, selected, onToggle }) {
  return (
    <details className="filter-dropdown">
      <summary>{label}{selected.length > 0 ? ` (${selected.length})` : ''}</summary>
      <div className="filter-dropdown-body">
        {options.length === 0 && <span className="state-message">Нет вариантов</span>}
        {options.map((opt) => (
          <label key={opt.value}>
            <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => onToggle(opt.value)} />
            {opt.label}
          </label>
        ))}
      </div>
    </details>
  );
}
