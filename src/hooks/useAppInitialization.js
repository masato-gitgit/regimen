import { useState, useEffect } from 'react';
import { safeGetLocalStorage, safeSetLocalStorage } from '../utils/storageUtils';
import { runMigrations } from '../utils/migrations';

const DUMMY_PATIENT_IDS = [
  'P001', 'P002', 'P003', 'P004', 'P005', 'P006', 'P007', 'P008', 'P009', 'P010',
  'P011', 'P012', 'P013', 'P101', 'P102', 'P103', 'P104', 'P105', 'P106',
  'P107', 'P108', 'P109', 'P110'
];

/**
 * データをロードして検証する（破損時はリセットしてエラーを返す）
 */
const loadAndValidateData = (key, storedData, dataName, errors) => {
  let currentData = [];
  if (storedData) {
    try {
      currentData = storedData;
      if (!Array.isArray(currentData)) throw new Error('not array');
    } catch (e) {
      console.error(`${key} のデータが破損しています:`, e);
      errors.push(`${dataName}（${key}）が破損しています。データを初期化・リセットしました。`);
      currentData = [];
      safeSetLocalStorage(key, []);
    }
  }
  return currentData;
};

/**
 * ダミー患者を削除する
 */
const cleanupDummyPatients = (patients) => {
  const initialPatientCount = patients.length;
  const cleanedPatients = patients.filter(p => !DUMMY_PATIENT_IDS.includes(p.id));
  return {
    patients: cleanedPatients,
    isCleaned: cleanedPatients.length !== initialPatientCount
  };
};

/**
 * 既存のレジメン・患者データからユニークな薬剤を抽出し、薬剤マスタを生成する
 */
const generateDrugsMaster = (regimens, patients) => {
  const drugMap = new Map();
  let drugCounter = 1;

  const extractDrugs = (drugsArray) => {
    if (!drugsArray) return;
    drugsArray.forEach(d => {
      if (!d.name) return;
      const key = `${d.name}_${d.route || ''}`;
      if (!drugMap.has(key)) {
        drugMap.set(key, {
          id: `D${String(drugCounter++).padStart(3, '0')}`,
          name: d.name,
          route: d.route || '点滴静注',
          doseType: d.doseType || 'fixed',
          defaultDoseValue: d.doseValue || 0,
          defaultDuration: d.duration || 60,
          notes: ''
        });
      }
    });
  };

  regimens.forEach(r => extractDrugs(r.drugs));
  patients.forEach(p => {
    if (p.activeRegimen) extractDrugs(p.activeRegimen.drugs);
  });

  return {
    drugMap,
    drugsMaster: Array.from(drugMap.values())
  };
};

/**
 * 薬剤配列の各薬剤に drugId を紐付ける
 */
const linkDrugs = (drugsArray, drugMap) => {
  if (!drugsArray) return drugsArray;
  return drugsArray.map(d => {
    const key = `${d.name}_${d.route || ''}`;
    const found = drugMap.get(key);
    return { ...d, drugId: found ? found.id : null };
  });
};

/**
 * 全てのレジメン・患者データに drugId を紐付ける
 */
const linkDrugIds = (regimens, patients, drugMap) => {
  let regimensUpdated = false;
  const updatedRegimens = regimens.map(r => {
    if (r.drugs) {
      regimensUpdated = true;
      return { ...r, drugs: linkDrugs(r.drugs, drugMap) };
    }
    return r;
  });

  let patientsUpdated = false;
  const updatedPatients = patients.map(p => {
    let activeRegimenUpdated = false;
    let scheduleUpdated = false;
    let updatedActiveRegimen = p.activeRegimen;
    let updatedSchedule = p.schedule;

    if (p.activeRegimen && p.activeRegimen.drugs) {
      updatedActiveRegimen = {
        ...p.activeRegimen,
        drugs: linkDrugs(p.activeRegimen.drugs, drugMap)
      };
      activeRegimenUpdated = true;
    }

    if (p.schedule) {
      updatedSchedule = p.schedule.map(s => {
        if (s.drugs) {
          scheduleUpdated = true;
          return { ...s, drugs: linkDrugs(s.drugs, drugMap) };
        }
        return s;
      });
    }

    if (activeRegimenUpdated || scheduleUpdated) {
      patientsUpdated = true;
      return { ...p, activeRegimen: updatedActiveRegimen, schedule: updatedSchedule };
    }
    return p;
  });

  return {
    regimens: updatedRegimens, regimensUpdated,
    patients: updatedPatients, patientsUpdated
  };
};

/**
 * アプリの初期ロード、マイグレーション、データ整合性維持を行うカスタムフック
 */
export const useAppInitialization = () => {
  const [regimens, setRegimens] = useState([]);
  const [patients, setPatients] = useState([]);
  const [drugsMaster, setDrugsMaster] = useState([]);
  const [storageErrors, setStorageErrors] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const errors = [];
    const storedMigVer = parseInt(localStorage.getItem('onco_migration_version') || '0', 10);

    const storedRegimens = safeGetLocalStorage('onco_regimens');
    const storedPatients = safeGetLocalStorage('onco_patients');
    const storedDrugs = safeGetLocalStorage('onco_drugs');

    // 1. データのロードと破損チェック
    let currentRegimens = loadAndValidateData('onco_regimens', storedRegimens, 'レジメンデータ', errors);
    let currentPatients = loadAndValidateData('onco_patients', storedPatients, '患者データ', errors);
    let currentDrugs = loadAndValidateData('onco_drugs', storedDrugs, '薬剤マスタデータ', errors);

    // 2. ダミー患者のクリーンアップ
    const cleanupResult = cleanupDummyPatients(currentPatients);
    currentPatients = cleanupResult.patients;
    const patientsCleaned = cleanupResult.isCleaned;

    // 3. マイグレーションの実行
    const migrationResult = runMigrations(currentRegimens, currentPatients, storedMigVer);
    currentRegimens = migrationResult.regimens;
    currentPatients = migrationResult.patients;

    if (migrationResult.updated || patientsCleaned) {
      safeSetLocalStorage('onco_regimens', currentRegimens);
      safeSetLocalStorage('onco_patients', currentPatients);
      if (migrationResult.updated) {
        safeSetLocalStorage('onco_migration_version', migrationResult.version.toString());
        console.info(`[Migration] v${storedMigVer} → v${migrationResult.version} 完了`);
      }
    }

    // 4. 薬剤マスタが存在しない場合の自動生成と紐付け
    if (!storedDrugs) {
      const { drugMap, drugsMaster: generatedDrugs } = generateDrugsMaster(currentRegimens, currentPatients);
      currentDrugs = generatedDrugs;
      safeSetLocalStorage('onco_drugs', currentDrugs);

      const linkResult = linkDrugIds(currentRegimens, currentPatients, drugMap);
      currentRegimens = linkResult.regimens;
      currentPatients = linkResult.patients;

      if (linkResult.regimensUpdated) safeSetLocalStorage('onco_regimens', currentRegimens);
      if (linkResult.patientsUpdated) safeSetLocalStorage('onco_patients', currentPatients);
    }

    // 5. 状態の更新
    setRegimens(currentRegimens);
    setPatients(currentPatients);
    setDrugsMaster(currentDrugs);
    
    // 旧仕様のフラグのクリーンアップ
    localStorage.removeItem('onco_dummies_added_v2');
    
    if (errors.length > 0) setStorageErrors(errors);
    setIsInitialized(true);
  }, []);

  return {
    regimens, setRegimens,
    patients, setPatients,
    drugsMaster, setDrugsMaster,
    storageErrors, setStorageErrors,
    isInitialized
  };
};
