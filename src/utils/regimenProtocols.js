/**
 * regimenProtocols.js
 * レジメンの特別なプロトコル種別を管理する
 */

export const PROTOCOL_TYPES = {
  TECVAYLI: 'tecvayli',
  LUNSUMIO_SC: 'lunsumio_sc',
  LUNSUMIO_IV: 'lunsumio_iv',
  TALQUETAMAB: 'talquetamab',
  COMBINATION: 'combination',
};

/**
 * 薬剤名やレジメン名からプロトコル種別を推測する（マイグレーション用）
 * @param {string} name 
 * @returns {string|null}
 */
export const guessProtocolType = (name) => {
  if (!name) return null;
  if (name.includes('テクベイリ') || name.includes('テクラスタマブ')) {
    return PROTOCOL_TYPES.TECVAYLI;
  }
  if (name.includes('タービー') || name.includes('トアルクエタマブ')) {
    return PROTOCOL_TYPES.TALQUETAMAB;
  }
  if (name.includes('ルンスミオ') || name.includes('モスネツズマブ')) {
    // 投与経路(SC/IV)までは名前だけでは完全には判定できないが、便宜的に文字列判定
    if (name.includes('皮下注') || name.includes('SC')) {
      return PROTOCOL_TYPES.LUNSUMIO_SC;
    }
    return PROTOCOL_TYPES.LUNSUMIO_IV;
  }
  return null;
};

/**
 * マイクロドーズ（小数点丸め）対象の薬剤か判定する
 * @param {object} drug 
 * @returns {boolean}
 */
export const isMicroDoseProtocol = (protocolType, drugName) => {
  if (protocolType === PROTOCOL_TYPES.TECVAYLI || protocolType === PROTOCOL_TYPES.TALQUETAMAB) {
    return true;
  }
  // 後方互換のため薬剤名でも判定
  if (drugName && (
    drugName.includes('テクベイリ') || 
    drugName.includes('テクラスタマブ') || 
    drugName.includes('タービー') || 
    drugName.includes('トアルクエタマブ')
  )) {
    return true;
  }
  return false;
};
