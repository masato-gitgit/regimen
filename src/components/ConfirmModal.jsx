import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

/**
 * ConfirmModal
 * useConfirm フックと組み合わせて使用するカスタム確認ダイアログ。
 * window.confirm の代替として、スタイル統一されたモーダルを提供する。
 *
 * Props は useConfirm() の modalProps をそのまま展開して渡す:
 *   <ConfirmModal {...modalProps} />
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'キャンセル',
  variant = 'default',
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const isDanger = variant === 'danger';

  const accentColor = isDanger ? '#dc2626' : '#1e3a8a';
  const confirmBg   = isDanger ? '#dc2626' : '#1e3a8a';
  const confirmHover = isDanger ? '#b91c1c' : '#172554';

  return (
    /* オーバーレイ */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(2px)',
        padding: '16px',
        animation: 'confirmFadeIn 0.15s ease',
      }}
      onClick={(e) => {
        // オーバーレイクリックでキャンセル
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <style>{`
        @keyframes confirmFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        .confirm-modal-ok-btn:hover { background-color: ${confirmHover} !important; }
        .confirm-modal-cancel-btn:hover { background-color: #f1f5f9 !important; }
      `}</style>

      {/* ダイアログ本体 */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          maxWidth: '440px',
          width: '100%',
          overflow: 'hidden',
          border: `1px solid ${isDanger ? '#fca5a5' : '#e2e8f0'}`,
        }}
      >
        {/* ヘッダー */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '20px 24px 16px',
          borderBottom: '1px solid #f1f5f9',
        }}>
          <div style={{
            flexShrink: 0,
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: isDanger ? '#fef2f2' : '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accentColor,
          }}>
            {isDanger
              ? <AlertTriangle size={18} />
              : <HelpCircle size={18} />
            }
          </div>
          <h3 id="confirm-modal-title" style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: '700',
            color: '#0f172a',
          }}>
            {title}
          </h3>
        </div>

        {/* 本文 */}
        <div style={{ padding: '16px 24px 20px' }}>
          <p style={{
            margin: 0,
            fontSize: '0.9rem',
            color: '#334155',
            lineHeight: '1.7',
            whiteSpace: 'pre-wrap',
          }}>
            {message}
          </p>
        </div>

        {/* ボタン */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          padding: '0 24px 20px',
        }}>
          <button
            className="confirm-modal-cancel-btn"
            onClick={onCancel}
            style={{
              padding: '9px 18px',
              backgroundColor: 'transparent',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              borderRadius: '7px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
          >
            {cancelLabel}
          </button>
          <button
            className="confirm-modal-ok-btn"
            onClick={onConfirm}
            autoFocus
            style={{
              padding: '9px 20px',
              backgroundColor: confirmBg,
              color: '#ffffff',
              border: 'none',
              borderRadius: '7px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
