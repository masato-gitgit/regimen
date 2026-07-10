/**
 * storageUtils.js
 * localStorage 操作に関する共通ユーティリティ
 */

/**
 * localStorage への安全な書き込みラッパー。
 * QuotaExceededError などを捕捉してユーザーへの通知を行う。
 *
 * @param {string} key   - localStorage のキー
 * @param {*}      value - 保存する値（文字列以外は JSON.stringify される）
 */
export const safeSetLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch (e) {
    console.error('localStorage write failed:', e);
    if (e.name === 'QuotaExceededError') {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'ブラウザのストレージ容量上限を超過したため、データを保存できませんでした。不要なバックアップや患者データを削除して容量を空けてください。', type: 'error' } }));
    } else {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'データの保存中にエラーが発生しました。ブラウザのプライベートモード等の制限がないかご確認ください。', type: 'error' } }));
    }
  }
};
