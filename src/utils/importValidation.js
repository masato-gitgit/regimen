/**
 * importValidation.js
 * バックアップファイルのインポート時に行う構造・型・値域チェックのユーティリティ。
 *
 * 設計方針:
 *   - バリデーション失敗時は { ok: false, errors: string[] } を返す
 *   - 成功時は { ok: true, errors: [] } を返す
 *   - エラーメッセージには「何番目のどのフィールドが問題か」を含める
 *   - 医療データとして致命的なフィールド（id, name, birthDate, schedule）を必須とし、
 *     任意フィールドは欠落を許容しながら型チェックのみ行う
 */

// ---- 共通ヘルパー -----------------------------------------------------------

/** 文字列であり、かつ空文字でないことを確認する */
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

/** 有限な数値であることを確認する */
const isFiniteNumber = (v) => typeof v === 'number' && isFinite(v);

/** YYYY-MM-DD 形式の日付文字列であることを確認する */
const isDateString = (v) => {
  if (!isNonEmptyString(v)) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
};

/** 将来すぎない生年月日かを確認する（未来日や 1900 年以前を除外）*/
const isValidBirthDate = (v) => {
  if (!isDateString(v)) return false;
  const d = new Date(v);
  const now = new Date();
  const minYear = new Date('1900-01-01');
  return d <= now && d >= minYear;
};

// ---- 患者データバリデーション ------------------------------------------------

/**
 * 患者1件のバリデーション
 * @param {*} p   - 検査対象オブジェクト
 * @param {number} index - 配列インデックス（エラーメッセージ用）
 * @returns {string[]} エラーメッセージリスト（空配列 = 正常）
 */
const validatePatient = (p, index) => {
  const prefix = `患者[${index + 1}]`;
  const errs = [];

  if (!p || typeof p !== 'object') {
    return [`${prefix}: オブジェクトではありません`];
  }

  // 必須フィールド
  if (!isNonEmptyString(p.id))       errs.push(`${prefix}.id が不正です`);
  if (!isNonEmptyString(p.name))     errs.push(`${prefix}.name が空です`);
  if (!isValidBirthDate(p.birthDate))
    errs.push(`${prefix}.birthDate「${p.birthDate}」が無効です（YYYY-MM-DD かつ 1900 年以降・未来日不可）`);
  if (!Array.isArray(p.schedule))    errs.push(`${prefix}.schedule が配列ではありません`);

  // 任意フィールドの型チェック
  if (p.gender !== undefined && p.gender !== 'male' && p.gender !== 'female') {
    errs.push(`${prefix}.gender は 'male' または 'female' である必要があります（値:「${p.gender}」）`);
  }
  if (p.weight !== undefined && p.weight !== null && !isFiniteNumber(p.weight)) {
    errs.push(`${prefix}.weight が数値ではありません`);
  }
  if (p.height !== undefined && p.height !== null && !isFiniteNumber(p.height)) {
    errs.push(`${prefix}.height が数値ではありません`);
  }
  if (p.creatinine !== undefined && p.creatinine !== null && !isFiniteNumber(p.creatinine)) {
    errs.push(`${prefix}.creatinine が数値ではありません`);
  }

  // schedule の各エントリチェック（最初の10件のみ。全件は重すぎる）
  if (Array.isArray(p.schedule)) {
    const sampleSize = Math.min(p.schedule.length, 10);
    for (let si = 0; si < sampleSize; si++) {
      const s = p.schedule[si];
      if (!s || typeof s !== 'object') {
        errs.push(`${prefix}.schedule[${si}] がオブジェクトではありません`);
        continue;
      }
      if (!isNonEmptyString(s.date)) {
        errs.push(`${prefix}.schedule[${si}].date が不正です`);
      }
    }
  }

  return errs;
};

/**
 * 患者配列全体のバリデーション
 * @param {*[]} arr
 * @returns {{ ok: boolean, errors: string[] }}
 */
export const validatePatients = (arr) => {
  const errors = [];

  if (!Array.isArray(arr)) {
    return { ok: false, errors: ['患者データが配列ではありません'] };
  }
  if (arr.length === 0) {
    // 空配列は許容（既存データを全削除する操作を可能にする）
    return { ok: true, errors: [] };
  }

  for (let i = 0; i < arr.length; i++) {
    const e = validatePatient(arr[i], i);
    errors.push(...e);
    if (errors.length >= 5) {
      errors.push('…（以降のエラーは省略しました）');
      break;
    }
  }

  return { ok: errors.length === 0, errors };
};

// ---- レジメンデータバリデーション -------------------------------------------

/**
 * レジメン1件のバリデーション
 */
const validateRegimen = (r, index) => {
  const prefix = `レジメン[${index + 1}]`;
  const errs = [];

  if (!r || typeof r !== 'object') {
    return [`${prefix}: オブジェクトではありません`];
  }

  if (!isNonEmptyString(r.id))   errs.push(`${prefix}.id が不正です`);
  if (!isNonEmptyString(r.name)) errs.push(`${prefix}.name が空です`);
  if (!Array.isArray(r.drugs))   errs.push(`${prefix}.drugs が配列ではありません`);

  // cycleDays / totalCycles の型チェック
  if (r.cycleDays !== undefined && !isFiniteNumber(r.cycleDays)) {
    errs.push(`${prefix}.cycleDays が数値ではありません`);
  }
  if (r.totalCycles !== undefined && !isFiniteNumber(r.totalCycles)) {
    errs.push(`${prefix}.totalCycles が数値ではありません`);
  }

  // drugs の各薬剤の必須フィールド確認
  if (Array.isArray(r.drugs)) {
    r.drugs.forEach((d, di) => {
      if (!d || typeof d !== 'object') {
        errs.push(`${prefix}.drugs[${di}] がオブジェクトではありません`);
        return;
      }
      if (!isNonEmptyString(d.name)) {
        errs.push(`${prefix}.drugs[${di}].name が空です`);
      }
      if (d.doseValue !== undefined && !isFiniteNumber(d.doseValue)) {
        errs.push(`${prefix}.drugs[${di}].doseValue が数値ではありません`);
      }
    });
  }

  return errs;
};

/**
 * レジメン配列全体のバリデーション
 * @param {*[]} arr
 * @returns {{ ok: boolean, errors: string[] }}
 */
export const validateRegimens = (arr) => {
  const errors = [];

  if (!Array.isArray(arr)) {
    return { ok: false, errors: ['レジメンデータが配列ではありません'] };
  }
  if (arr.length === 0) {
    return { ok: true, errors: [] };
  }

  for (let i = 0; i < arr.length; i++) {
    const e = validateRegimen(arr[i], i);
    errors.push(...e);
    if (errors.length >= 5) {
      errors.push('…（以降のエラーは省略しました）');
      break;
    }
  }

  return { ok: errors.length === 0, errors };
};

// ---- 薬剤マスタバリデーション ------------------------------------------------

const VALID_ROUTES = ['点滴静注', '静脈注射', '皮下注射', '筋肉注射', '経口', 'その他'];
const VALID_DOSE_TYPES = ['fixed', 'bsa', 'weight'];

/**
 * 薬剤1件のバリデーション
 */
const validateDrug = (d, index) => {
  const prefix = `薬剤[${index + 1}]`;
  const errs = [];

  if (!d || typeof d !== 'object') {
    return [`${prefix}: オブジェクトではありません`];
  }

  if (!isNonEmptyString(d.id))   errs.push(`${prefix}.id が不正です`);
  if (!isNonEmptyString(d.name)) errs.push(`${prefix}.name が空です`);
  if (!isNonEmptyString(d.route)) {
    errs.push(`${prefix}.route が空です`);
  }
  if (d.doseType !== undefined && !VALID_DOSE_TYPES.includes(d.doseType)) {
    errs.push(`${prefix}.doseType「${d.doseType}」は無効な値です（fixed / bsa / weight のいずれか）`);
  }
  if (d.defaultDoseValue !== undefined && !isFiniteNumber(d.defaultDoseValue)) {
    errs.push(`${prefix}.defaultDoseValue が数値ではありません`);
  }
  if (d.defaultDuration !== undefined && !isFiniteNumber(d.defaultDuration)) {
    errs.push(`${prefix}.defaultDuration が数値ではありません`);
  }

  return errs;
};

/**
 * 薬剤配列全体のバリデーション
 * @param {*[]} arr
 * @returns {{ ok: boolean, errors: string[] }}
 */
export const validateDrugs = (arr) => {
  const errors = [];

  if (!Array.isArray(arr)) {
    return { ok: false, errors: ['薬剤データが配列ではありません'] };
  }
  if (arr.length === 0) {
    return { ok: true, errors: [] };
  }

  for (let i = 0; i < arr.length; i++) {
    const e = validateDrug(arr[i], i);
    errors.push(...e);
    if (errors.length >= 5) {
      errors.push('…（以降のエラーは省略しました）');
      break;
    }
  }

  return { ok: errors.length === 0, errors };
};

// ---- 総合バックアップバリデーション -----------------------------------------

/**
 * 総合バックアップファイル全体のバリデーション
 * @param {{ patients: *[], regimens: *[], drugs?: *[] }} parsed
 * @returns {{ ok: boolean, errors: string[] }}
 */
export const validateFullBackup = (parsed) => {
  const errors = [];

  const pr = validatePatients(parsed.patients);
  errors.push(...pr.errors);

  const rr = validateRegimens(parsed.regimens);
  errors.push(...rr.errors);

  if (parsed.drugs && Array.isArray(parsed.drugs)) {
    const dr = validateDrugs(parsed.drugs);
    errors.push(...dr.errors);
  }

  return { ok: errors.length === 0, errors };
};
