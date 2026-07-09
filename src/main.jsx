import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

/* ---------------------------------------------------------------
 * グローバルエラーハンドラ
 * React ツリー外（非同期処理・スクリプトロードエラー等）で発生した
 * 致命的エラーを捕捉し、ErrorBoundary のフォールバック画面を起動する。
 * --------------------------------------------------------------- */
const dispatchFatal = (message, stack = '') => {
  window.dispatchEvent(
    new CustomEvent('app:fatalError', { detail: { message, stack } })
  );
};

// 同期スクリプトエラー（型エラー・参照エラー等）
window.onerror = (message, source, lineno, colno, error) => {
  console.error('[onerror]', { message, source, lineno, colno, error });
  // React 自身の開発用オーバーレイや HMR は無視
  if (source?.includes('localhost') && import.meta.env.DEV) return false;
  dispatchFatal(
    `${message} (${source}:${lineno}:${colno})`,
    error?.stack || ''
  );
  return true; // ブラウザのデフォルトエラーダイアログを抑制
};

// 未処理の Promise rejection
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  console.error('[unhandledrejection]', reason);
  const message = reason?.message || String(reason) || '未処理の非同期エラーが発生しました。';
  const stack   = reason?.stack || '';
  // 無害な中断（AbortError 等）はスキップ
  if (reason?.name === 'AbortError') return;
  dispatchFatal(message, stack);
  event.preventDefault();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
