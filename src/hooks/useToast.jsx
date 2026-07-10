import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // グローバルイベント(app:toast)をリッスンし、外部（例：storageUtils）からでもトーストを呼べるようにする
  React.useEffect(() => {
    const handleToastEvent = (e) => toast(e.detail.message, e.detail.type || 'info');
    window.addEventListener('app:toast', handleToastEvent);
    return () => window.removeEventListener('app:toast', handleToastEvent);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div 
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none'
        }}
      >
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              backgroundColor: t.type === 'error' ? 'var(--color-danger)' : 
                               t.type === 'warning' ? 'var(--color-warning)' : 
                               'var(--color-success)',
              color: '#fff',
              padding: '12px 16px',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: '250px',
              maxWidth: '400px',
              animation: 'slideIn 0.3s ease-out forwards',
              pointerEvents: 'auto'
            }}
          >
            {t.type === 'error' && <AlertCircle size={20} />}
            {t.type === 'warning' && <AlertCircle size={20} />}
            {t.type === 'success' && <CheckCircle size={20} />}
            {t.type === 'info' && <Info size={20} />}
            
            <span style={{ flex: 1, fontSize: '14px', lineHeight: '1.4' }}>{t.message}</span>
            
            <button
              onClick={() => removeToast(t.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.8)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      <style>
        {`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}
      </style>
    </ToastContext.Provider>
  );
};
