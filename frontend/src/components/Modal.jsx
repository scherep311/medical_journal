export default function Modal({ onClose, onSubmit, children }) {
  const Tag = onSubmit ? 'form' : 'div';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <Tag className="modal-card" onSubmit={onSubmit} onClick={(e) => e.stopPropagation()}>
        {children}
      </Tag>
    </div>
  );
}
