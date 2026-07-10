/**
 * storageUtils.js
 * localStorage 操作に関する共通ユーティリティ
 */

import LZString from 'lz-string';

const WARNING_THRESHOLD = 4 * 1024 * 1024; // 4MB

const checkStorageCapacity = () => {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const val = localStorage.getItem(key);
      if (val) total += key.length + val.length;
    }
    if (total > WARNING_THRESHOLD) {
      window.dispatchEvent(new CustomEvent('app:toast', { 
        detail: { 
          message: '【警告】ブラウザのストレージ容量が上限に近づいています（約80%使用）。バックアップを取得後、不要な患者データ等を削除してください。', 
          type: 'warning' 
        } 
      }));
    }
  } catch (e) {
    console.error('Failed to check storage capacity', e);
  }
};

/**
 * localStorage から安全にデータを取得し、必要に応じて解凍およびパースを行う。
 */
export const safeGetLocalStorage = (key) => {
  try {
    const val = localStorage.getItem(key);
    if (!val) return null;
    
    if (val.startsWith('LZ16:')) {
      const decompressed = LZString.decompressFromUTF16(val.substring(5));
      if (decompressed) {
        return JSON.parse(decompressed);
      } else {
        throw new Error('Decompression failed');
      }
    }
    
    if (val.startsWith('[') || val.startsWith('{')) {
      return JSON.parse(val);
    }
    
    return val;
  } catch (e) {
    console.error(`Failed to get/parse localStorage key: ${key}`, e);
    return null; // パース失敗時などは null を返す
  }
};

/**
 * localStorage への安全な書き込みラッパー。
 * JSONデータはLZStringで圧縮し、QuotaExceededError などを捕捉してユーザーへの通知を行う。
 */
export const safeSetLocalStorage = (key, value) => {
  try {
    let toStore;
    const isString = typeof value === 'string';
    const jsonStr = isString ? value : JSON.stringify(value);

    // JSONオブジェクトや配列の文字列表現であれば圧縮する
    if (jsonStr.startsWith('[') || jsonStr.startsWith('{')) {
      const compressed = LZString.compressToUTF16(jsonStr);
      toStore = 'LZ16:' + compressed;
    } else {
      toStore = isString ? value : jsonStr;
    }

    localStorage.setItem(key, toStore);
    checkStorageCapacity();
  } catch (e) {
    console.error('localStorage write failed:', e);
    if (e.name === 'QuotaExceededError') {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'ブラウザのストレージ容量上限を超過したため、データを保存できませんでした。不要なバックアップや患者データを削除して容量を空けてください。', type: 'error' } }));
    } else {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'データの保存中にエラーが発生しました。ブラウザのプライベートモード等の制限がないかご確認ください。', type: 'error' } }));
    }
  }
};

/**
 * localStorage から安全にデータを削除する。
 */
export const safeRemoveLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`Failed to remove localStorage key: ${key}`, e);
  }
};

