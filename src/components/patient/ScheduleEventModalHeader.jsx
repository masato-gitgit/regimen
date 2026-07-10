import React from 'react';

export default function ScheduleEventModalHeader({ selectedEvent, onClose }) {
  if (!selectedEvent) return null;

  return (
    <div className="modal-header-section">
      <div>
        <h4 className="modal-title-text">
          予定日調整: {selectedEvent.date} (Day {selectedEvent.dayNumber})
        </h4>
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
          {selectedEvent.status === 'completed' && <span className="badge badge-success">投与完了</span>}
          {selectedEvent.status === 'skipped' && <span className="badge badge-danger">休薬</span>}
          {selectedEvent.status === 'running' && <span className="badge badge-warning">投与中</span>}
          {selectedEvent.status === 'pending' && <span className="badge badge-info">未実施</span>}
          {selectedEvent.doseReduced && (
            <span className="badge badge-danger" style={{ backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #ef4444' }}>
              20% 減量適用中
            </span>
          )}
        </div>
      </div>
      <button type="button" className="modal-close-btn" onClick={onClose} aria-label="閉じる">
        &times;
      </button>
    </div>
  );
}
