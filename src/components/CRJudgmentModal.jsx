import React from 'react';

/**
 * CRJudgmentModal
 * ルンスミオ8サイクル完了時の効果判定専用モーダル。
 *
 * Props:
 *   isOpen    {boolean}  - 表示/非表示
 *   onCR      {Function} - 「CR（完全奏効）」が選択された時のコールバック
 *   onExtend  {Function} - 「PR/SD（継続）」が選択された時のコールバック
 *   onCancel  {Function} - モーダルを閉じる（キャンセル）コールバック
 */
export default function CRJudgmentModal({ isOpen, onCR, onExtend, onCancel }) {
  if (!isOpen) return null;

  return (
    /* オーバーレイ */
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        backgroundColor: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.15s ease'
      }}
    >
      {/* モーダル本体 */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
          overflow: 'hidden',
          animation: 'slideUp 0.2s ease'
        }}
      >
        {/* ヘッダー */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
          padding: '20px 24px',
          color: '#fff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>🏥</span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '1rem' }}>
                8サイクル完了 — 効果判定
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '2px' }}>
                ルンスミオ療法 / 治療継続の要否を選択してください
              </div>
            </div>
          </div>
        </div>

        {/* 本文 */}
        <div style={{ padding: '24px' }}>
          <p style={{
            fontSize: '0.9rem', color: '#374151', lineHeight: '1.7',
            margin: '0 0 20px',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '12px 16px'
          }}>
            8サイクル目（最終サイクル）の投与が完了しました。<br />
            この時点での<strong>効果判定（奏効評価）</strong>を入力してください。
          </p>

          {/* 選択肢カード */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>

            {/* CR ボタン */}
            <button
              onClick={onCR}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '14px',
                padding: '16px 18px',
                border: '2px solid #16a34a',
                borderRadius: '10px',
                backgroundColor: '#f0fdf4',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                width: '100%'
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#dcfce7'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = '#f0fdf4'}
            >
              <div style={{
                flexShrink: 0,
                width: '36px', height: '36px',
                borderRadius: '50%',
                backgroundColor: '#16a34a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', color: '#fff', fontWeight: '700'
              }}>✓</div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#15803d', marginBottom: '3px' }}>
                  CR（完全奏効）が得られた
                </div>
                <div style={{ fontSize: '0.8rem', color: '#166534', lineHeight: '1.5' }}>
                  治療を終了し、スケジュールをクローズします。
                </div>
              </div>
            </button>

            {/* PR/SD ボタン */}
            <button
              onClick={onExtend}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '14px',
                padding: '16px 18px',
                border: '2px solid #d97706',
                borderRadius: '10px',
                backgroundColor: '#fffbeb',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                width: '100%'
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#fef3c7'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = '#fffbeb'}
            >
              <div style={{
                flexShrink: 0,
                width: '36px', height: '36px',
                borderRadius: '50%',
                backgroundColor: '#d97706',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', color: '#fff', fontWeight: '700'
              }}>↻</div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#92400e', marginBottom: '3px' }}>
                  PR / SD — 継続投与
                </div>
                <div style={{ fontSize: '0.8rem', color: '#78350f', lineHeight: '1.5' }}>
                  9〜17サイクル目の投与予定を自動延長します。
                </div>
              </div>
            </button>
          </div>

          {/* キャンセル */}
          <div style={{ textAlign: 'right' }}>
            <button
              onClick={onCancel}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: '#fff',
                color: '#6b7280',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              後で判定する（閉じる）
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(20px);opacity:0 } to { transform:translateY(0);opacity:1 } }
      `}</style>
    </div>
  );
}
