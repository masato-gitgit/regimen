import React from 'react';

/**
 * ErrorBoundary
 * React ツリー内で発生した例外を捕捉し、致命的エラー用フォールバック画面を表示する。
 * window.onerror / unhandledrejection は main.jsx 側で登録し、
 * 致命的と判断した場合は `window.__fatalError` にセットして
 * このコンポーネントを再レンダーさせる。
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '', stack: '' };
    this._handleFatal = this._handleFatal.bind(this);
  }

  /* ------ React のエラー捕捉 ------ */
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || String(error),
      stack: error?.stack || ''
    };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] React エラー:', error, info);
  }

  /* ------ window イベント経由の致命的エラー受信 ------ */
  _handleFatal(e) {
    const err = e.detail || {};
    this.setState({
      hasError: true,
      message: err.message || '予期しないエラーが発生しました。',
      stack: err.stack || ''
    });
  }

  componentDidMount() {
    window.addEventListener('app:fatalError', this._handleFatal);
  }

  componentWillUnmount() {
    window.removeEventListener('app:fatalError', this._handleFatal);
  }

  handleReload() {
    window.location.reload();
  }

  handleDismiss() {
    this.setState({ hasError: false, message: '', stack: '' });
  }

  /* ------ フォールバック UI ------ */
  render() {
    if (!this.state.hasError) return this.props.children;

    const { message, stack } = this.state;

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        fontFamily: "'Inter', 'Hiragino Sans', sans-serif",
        padding: '24px'
      }}>
        <div style={{
          maxWidth: '560px',
          width: '100%',
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          border: '1px solid #7f1d1d',
          boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
          overflow: 'hidden'
        }}>
          {/* ヘッダー */}
          <div style={{
            backgroundColor: '#7f1d1d',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '1.8rem' }}>⚠️</span>
            <div>
              <div style={{ color: '#fff', fontWeight: '700', fontSize: '1.1rem' }}>
                致命的なエラーが発生しました
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', marginTop: '2px' }}>
                OncoScheduler — アプリケーションエラー
              </div>
            </div>
          </div>

          {/* 本文 */}
          <div style={{ padding: '24px' }}>
            <p style={{ color: '#e2e8f0', fontSize: '0.9rem', lineHeight: '1.7', margin: '0 0 16px' }}>
              アプリケーションで予期しないエラーが発生し、画面を正常に表示できない状態になりました。
              以下の操作をお試しください。
            </p>

            <div style={{
              backgroundColor: '#0f172a',
              borderRadius: '8px',
              padding: '14px 16px',
              marginBottom: '20px',
              border: '1px solid #334155'
            }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', marginBottom: '6px' }}>
                エラー詳細
              </div>
              <div style={{ color: '#f87171', fontSize: '0.85rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {message}
              </div>
              {stack && (
                <details style={{ marginTop: '8px' }}>
                  <summary style={{ color: '#64748b', fontSize: '0.75rem', cursor: 'pointer' }}>
                    スタックトレース（技術情報）
                  </summary>
                  <pre style={{
                    color: '#64748b', fontSize: '0.7rem', marginTop: '8px',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '150px', overflowY: 'auto'
                  }}>
                    {stack}
                  </pre>
                </details>
              )}
            </div>

            {/* 推奨アクション */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <div style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: '600' }}>
                推奨する対処手順
              </div>
              {[
                'ページを再読み込みする（最も効果的）',
                'ブラウザのキャッシュをクリアしてから再読み込みする',
                '直近のバックアップファイルがある場合はインポートして復元する',
                '問題が繰り返す場合はブラウザのコンソールのエラー内容を記録してください',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{
                    flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%',
                    backgroundColor: '#1e3a5f', color: '#60a5fa',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: '700'
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.82rem', lineHeight: '1.5', paddingTop: '2px' }}>
                    {step}
                  </div>
                </div>
              ))}
            </div>

            {/* ボタン */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={this.handleReload}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={e => e.target.style.backgroundColor = '#1d4ed8'}
                onMouseOut={e => e.target.style.backgroundColor = '#2563eb'}
              >
                🔄 ページを再読み込み
              </button>
              <button
                onClick={this.handleDismiss.bind(this)}
                style={{
                  padding: '12px 18px',
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
                title="このまま続ける（不安定な可能性があります）"
              >
                続ける
              </button>
            </div>
            <div style={{ textAlign: 'center', color: '#475569', fontSize: '0.75rem', marginTop: '12px' }}>
              「続ける」を選択した場合、動作が不安定になる可能性があります
            </div>
          </div>
        </div>
      </div>
    );
  }
}
