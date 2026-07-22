export default function AsyncState({ loading, error, empty, emptyMessage, children }) {
  if (loading) return <p className="state-message">Загрузка...</p>;
  if (error) return <p className="state-message state-error">{error}</p>;
  if (empty) return <p className="state-message">{emptyMessage}</p>;
  return children;
}
