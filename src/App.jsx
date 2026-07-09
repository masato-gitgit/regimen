import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import PatientList from './components/PatientList';
import RegimenList from './components/RegimenList';
import Checklist from './components/Checklist';
import DrugAggregation from './components/DrugAggregation';
import BackupRestore from './components/BackupRestore';
import GlobalCalendar from './components/GlobalCalendar';
import DrugList from './components/DrugList';
import ConfirmModal from './components/ConfirmModal';
import { LayoutDashboard, Users, BookOpen, ShieldAlert, Activity, ClipboardList, Database, Calendar, Pill } from 'lucide-react';
import { calculateEGFR } from './utils/renalUtils';
import { safeSetLocalStorage } from './utils/storageUtils';
import { useConfirm } from './hooks/useConfirm';




export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [patients, setPatients] = useState([]);
  const [regimens, setRegimens] = useState([]);
  const [drugsMaster, setDrugsMaster] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [alerts, setAlerts] = useState([]);
  // localStorage破損検知用警告リスト
  const [storageErrors, setStorageErrors] = useState([]);
  // 最終バックアップ日時
  const [lastBackupTime, setLastBackupTime] = useState(() => {
    return localStorage.getItem('onco_last_backup_time') || null;
  });
  // バックアップ警告バナー表示状態
  const [showBackupAlert, setShowBackupAlert] = useState(true);
  // カスタム確認ダイアログ
  const { confirm, modalProps: confirmModalProps } = useConfirm();

  // 初期ロード
  useEffect(() => {
    const storedPatients = localStorage.getItem('onco_patients');
    const storedRegimens = localStorage.getItem('onco_regimens');
    const errors = [];

    // ---- マイグレーションバージョン管理 ----
    // 現在の最新バージョン。新しいマイグレーションを追加したら MIGRATION_VERSION を増やす。
    const MIGRATION_VERSION = 3;
    const storedMigVer = parseInt(localStorage.getItem('onco_migration_version') || '0', 10);
    let migrationVersion = storedMigVer;

    let currentRegimens = [];
    if (storedRegimens) {
      try {
        currentRegimens = JSON.parse(storedRegimens);
        if (!Array.isArray(currentRegimens)) throw new Error('not array');
      } catch (e) {
        console.error('onco_regimens のデータが破損しています:', e);
        errors.push('レジメンデータ（onco_regimens）が破損しています。データをリセットしました。バックアップファイルから復元してください。');
        currentRegimens = [];
        safeSetLocalStorage('onco_regimens', JSON.stringify([]));
      }
      let updatedAny = false;

      // V1: 古い重複したデフォルトレジメン（R001〜R016）を自動クリーンアップ
      if (migrationVersion < 1) {
        const beforeLen = currentRegimens.length;
        const oldDefaultIds = [
          'R001', 'R002', 'R003', 'R004', 'R005', 'R006', 'R007', 'R008', 'R009', 'R010',
          'R011', 'R012', 'R013', 'R014', 'R015', 'R016'
        ];
        currentRegimens = currentRegimens.filter(r => !oldDefaultIds.includes(r.id));
        if (currentRegimens.length !== beforeLen) {
          updatedAny = true;
        }
        migrationVersion = 1;
      }

      // V2: テクベイリ（R011/R6953）のレジメン設定を自動マイグレーション
      if (migrationVersion < 2) {
        currentRegimens = currentRegimens.map(r => {
          if (r.id === 'R011' || r.id === 'R6953') {
            const isCorrect = r.drugs?.length === 4 && r.drugs[3].applicableCycles?.includes(2);
            if (!isCorrect) {
              updatedAny = true;
              return {
                ...r,
                cycleDays: 28,
                totalCycles: 8,
                drugs: [
                  { name: "テクベイリ皮下注", doseValue: 0.06, doseType: "weight", route: "皮下注射", order: 1, duration: 5, applicableCycles: [1], applicableDays: [1] },
                  { name: "テクベイリ皮下注", doseValue: 0.3,  doseType: "weight", route: "皮下注射", order: 1, duration: 5, applicableCycles: [1], applicableDays: [4] },
                  { name: "テクベイリ皮下注", doseValue: 1.5,  doseType: "weight", route: "皮下注射", order: 1, duration: 5, applicableCycles: [1], applicableDays: [8, 15, 22] },
                  { name: "テクベイリ皮下注", doseValue: 1.5,  doseType: "weight", route: "皮下注射", order: 1, duration: 5, applicableCycles: [2, 3, 4, 5, 6, 7, 8], applicableDays: [1, 8, 15, 22] }
                ]
              };
            }
          }
          return r;
        });
        migrationVersion = 2;
      }

      // V3: ルンスミオ（R012, R013 系）のレジメン設定を自動マイグレーション
      if (migrationVersion < 3) {
        currentRegimens = currentRegimens.map(r => {
          if (r.id === 'R012') {
            const isCorrect = r.drugs?.length === 5 && r.drugs[4].applicableCycles?.includes(17);
            if (!isCorrect) {
              updatedAny = true;
              return {
                ...r,
                cycleDays: 21,
                totalCycles: 8,
                drugs: [
                  { name: "ルンスミオ点滴静注", doseValue: 1,  doseType: "fixed", route: "点滴静注", order: 1, duration: 240, applicableDays: [1],      applicableCycles: [1] },
                  { name: "ルンスミオ点滴静注", doseValue: 2,  doseType: "fixed", route: "点滴静注", order: 1, duration: 240, applicableDays: [8],      applicableCycles: [1] },
                  { name: "ルンスミオ点滴静注", doseValue: 60, doseType: "fixed", route: "点滴静注", order: 1, duration: 240, applicableDays: [15],     applicableCycles: [1] },
                  { name: "ルンスミオ点滴静注", doseValue: 60, doseType: "fixed", route: "点滴静注", order: 1, duration: 120, applicableDays: [1],      applicableCycles: [2] },
                  { name: "ルンスミオ点滴静注", doseValue: 30, doseType: "fixed", route: "点滴静注", order: 1, duration: 120, applicableDays: [1],      applicableCycles: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] }
                ]
              };
            }
          }
          if (r.id === 'R013' || r.id === 'R6365' || r.id === 'R9045') {
            const isCorrect = r.drugs?.length === 3 && r.drugs[2].applicableCycles?.includes(17);
            if (!isCorrect) {
              updatedAny = true;
              return {
                ...r,
                cycleDays: 21,
                totalCycles: 8,
                drugs: [
                  { name: "ルンスミオ皮下注", doseValue: 5,  doseType: "fixed", route: "皮下注射", order: 1, duration: 2, applicableDays: [1],      applicableCycles: [1] },
                  { name: "ルンスミオ皮下注", doseValue: 45, doseType: "fixed", route: "皮下注射", order: 1, duration: 2, applicableDays: [8, 15],  applicableCycles: [1] },
                  { name: "ルンスミオ皮下注", doseValue: 45, doseType: "fixed", route: "皮下注射", order: 1, duration: 2, applicableDays: [1],      applicableCycles: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] }
                ]
              };
            }
          }
          return r;
        });
        migrationVersion = 3;
      }

      if (updatedAny) {
        safeSetLocalStorage('onco_regimens', JSON.stringify(currentRegimens));
      }

      // マイグレーションバージョンを保存（変化があった場合のみ）
      if (migrationVersion > storedMigVer) {
        safeSetLocalStorage('onco_migration_version', String(MIGRATION_VERSION));
        console.info(`[Migration] v${storedMigVer} → v${MIGRATION_VERSION} 完了`);
      }
    } else {
      currentRegimens = [];
      safeSetLocalStorage('onco_regimens', JSON.stringify([]));
    }
    let currentPatients = [];
    if (storedPatients) {
      try {
        currentPatients = JSON.parse(storedPatients);
        if (!Array.isArray(currentPatients)) throw new Error('not array');
      } catch (e) {
        console.error('onco_patients のデータが破損しています:', e);
        errors.push('患者データ（onco_patients）が破損しています。データをリセットしました。バックアップファイルから復元してください。');
        currentPatients = [];
        safeSetLocalStorage('onco_patients', JSON.stringify([]));
      }
      // 古いダミー患者（P001〜P013, P101〜P110）のみを自動クリーンアップ
      const beforeLen = currentPatients.length;
      const dummyPatientIds = [
        'P001', 'P002', 'P003', 'P004', 'P005', 'P006', 'P007', 'P008', 'P009', 'P010',
        'P011', 'P012', 'P013', 'P101', 'P102', 'P103', 'P104', 'P105', 'P106',
        'P107', 'P108', 'P109', 'P110'
      ];
      currentPatients = currentPatients.filter(p => !dummyPatientIds.includes(p.id));
      if (currentPatients.length !== beforeLen) {
        safeSetLocalStorage('onco_patients', JSON.stringify(currentPatients));
      }
    } else {
      currentPatients = [];
      safeSetLocalStorage('onco_patients', JSON.stringify([]));
    }

    // 薬剤マスタのロードとマイグレーション
    const storedDrugs = localStorage.getItem('onco_drugs');
    let currentDrugs = [];
    if (storedDrugs) {
      try {
        currentDrugs = JSON.parse(storedDrugs);
        if (!Array.isArray(currentDrugs)) throw new Error('not array');
      } catch (e) {
        console.error('onco_drugs のデータが破損しています:', e);
        errors.push('薬剤マスタデータ（onco_drugs）が破損しています。データを初期化しました。');
        currentDrugs = [];
        safeSetLocalStorage('onco_drugs', JSON.stringify([]));
      }
    } else {
      // 薬剤マスタが存在しない場合は、既存のレジメン・患者データからマイグレーションを実行
      const drugMap = new Map();
      let drugCounter = 1;

      // レジメンテンプレートからユニークな薬剤を抽出
      currentRegimens.forEach(r => {
        if (r.drugs) {
          r.drugs.forEach(d => {
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
        }
      });

      // 患者個別レジメンからもユニークな薬剤を抽出
      currentPatients.forEach(p => {
        if (p.activeRegimen && p.activeRegimen.drugs) {
          p.activeRegimen.drugs.forEach(d => {
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
        }
      });

      currentDrugs = Array.from(drugMap.values());
      safeSetLocalStorage('onco_drugs', JSON.stringify(currentDrugs));

      // レジメンテンプレートの各薬剤に drugId を紐付ける
      let regimensUpdated = false;
      currentRegimens = currentRegimens.map(r => {
        if (r.drugs) {
          const updatedDrugs = r.drugs.map(d => {
            const key = `${d.name}_${d.route || ''}`;
            const found = drugMap.get(key);
            return {
              ...d,
              drugId: found ? found.id : null
            };
          });
          regimensUpdated = true;
          return { ...r, drugs: updatedDrugs };
        }
        return r;
      });
      if (regimensUpdated) {
        safeSetLocalStorage('onco_regimens', JSON.stringify(currentRegimens));
      }

      // 患者データの各薬剤に drugId を紐付ける
      let patientsUpdated = false;
      currentPatients = currentPatients.map(p => {
        let activeRegimenUpdated = false;
        let scheduleUpdated = false;
        let updatedActiveRegimen = p.activeRegimen;
        let updatedSchedule = p.schedule;

        if (p.activeRegimen && p.activeRegimen.drugs) {
          const updatedDrugs = p.activeRegimen.drugs.map(d => {
            const key = `${d.name}_${d.route || ''}`;
            const found = drugMap.get(key);
            return {
              ...d,
              drugId: found ? found.id : null
            };
          });
          updatedActiveRegimen = {
            ...p.activeRegimen,
            drugs: updatedDrugs
          };
          activeRegimenUpdated = true;
        }

        if (p.schedule) {
          updatedSchedule = p.schedule.map(s => {
            if (s.drugs) {
              const updatedDrugs = s.drugs.map(d => {
                const key = `${d.name}_${d.route || ''}`;
                const found = drugMap.get(key);
                return {
                  ...d,
                  drugId: found ? found.id : null
                };
              });
              scheduleUpdated = true;
              return { ...s, drugs: updatedDrugs };
            }
            return s;
          });
        }

        if (activeRegimenUpdated || scheduleUpdated) {
          patientsUpdated = true;
          return {
            ...p,
            activeRegimen: updatedActiveRegimen,
            schedule: updatedSchedule
          };
        }
        return p;
      });
      if (patientsUpdated) {
        safeSetLocalStorage('onco_patients', JSON.stringify(currentPatients));
      }
    }

    // 状態更新
    setRegimens(currentRegimens);
    setPatients(currentPatients);
    setDrugsMaster(currentDrugs);
    localStorage.removeItem('onco_dummies_added_v2');
    if (errors.length > 0) setStorageErrors(errors);
  }, []);

  // アラートのリアルタイム計算
  useEffect(() => {
    if (patients.length === 0) {
      setAlerts([]);
      return;
    }

    const newAlerts = [];
    patients.forEach(patient => {
      // 治療中の患者のみ警告を計算
      if (patient.activeRegimen) {
        // 白血球低下
        if (patient.wbc !== null && patient.wbc < 1500) {
          newAlerts.push({
            patientId: patient.id,
            patientName: patient.name,
            type: 'wbc',
            message: `白血球数が低下しています (WBC: ${patient.wbc} /μL)。休薬基準（1500未満）に達しています。`
          });
        }
        // 血小板低下
        if (patient.plt !== null && patient.plt < 7.5) {
          newAlerts.push({
            patientId: patient.id,
            patientName: patient.name,
            type: 'plt',
            message: `血小板数が低下しています (PLT: ${patient.plt} 万/μL)。休薬基準（7.5万未満）に達しています。`
          });
        }
        // 腎機能低下 (クレアチニン値が登録されている場合)
        if (patient.creatinine !== null) {
          // 共通ユーティリティで eGFR を計算
          const egfr = calculateEGFR(patient.creatinine, patient.gender, patient.birthDate);
          if (egfr !== null && egfr < 45) {
            newAlerts.push({
              patientId: patient.id,
              patientName: patient.name,
              type: 'renal',
              message: `腎機能が低下しています (eGFR: ${egfr} mL/min)。シスプラチン等の腎排泄型薬剤の減量を推奨。`
            });
          }
        }
      }
    });
    setAlerts(newAlerts);
  }, [patients]);

  // 患者追加
  const handleAddPatient = (newPatient) => {
    const updated = [...patients, newPatient];
    setPatients(updated);
    safeSetLocalStorage('onco_patients', JSON.stringify(updated));
  };

  // 患者データ更新 (血液データ、レジメン割り当て、カレンダー変更)
  const handleUpdatePatient = (updatedPatient) => {
    const updated = patients.map(p => p.id === updatedPatient.id ? updatedPatient : p);
    setPatients(updated);
    safeSetLocalStorage('onco_patients', JSON.stringify(updated));
  };

  // 患者データ削除
  const handleDeletePatient = async (patientId) => {
    const targetPatient = patients.find(p => p.id === patientId);
    if (targetPatient && targetPatient.activeRegimen) {
      alert(`この患者（${targetPatient.name}）は現在レジメンが割り当てられ、治療スケジュールが進行中であるため削除できません。先にレジメンの割り当てを解除してください。`);
      return;
    }

    const ok = await confirm(
      'この患者データを完全に削除してもよろしいですか？\n（治療スケジュールもすべて削除されます）',
      '患者データの削除',
      { confirmLabel: '削除する', variant: 'danger' }
    );
    if (ok) {
      const updated = patients.filter(p => p.id !== patientId);
      setPatients(updated);
      safeSetLocalStorage('onco_patients', JSON.stringify(updated));
      if (selectedPatientId === patientId) {
        setSelectedPatientId(null);
      }
      alert('患者データを削除しました。');
    }
  };

  // レジメン追加
  const handleAddRegimen = (newRegimen) => {
    const updated = [...regimens, newRegimen];
    setRegimens(updated);
    safeSetLocalStorage('onco_regimens', JSON.stringify(updated));
  };

  // レジメン更新
  const handleUpdateRegimen = (updatedRegimen) => {
    const updated = regimens.map(r => r.id === updatedRegimen.id ? updatedRegimen : r);
    setRegimens(updated);
    safeSetLocalStorage('onco_regimens', JSON.stringify(updated));
  };

  // レジメン削除
  const handleDeleteRegimen = async (regimenId) => {
    const inUse = patients.some(p => p.activeRegimen && p.activeRegimen.regimenId === regimenId);
    if (inUse) {
      alert('このレジメンは現在治療中の患者に割り当てられているため、削除できません。患者のレジメン設定を解除するか、別のレジメンに変更してから削除してください。');
      return false;
    }

    const ok = await confirm(
      'このレジメンを削除してもよろしいですか？',
      'レジメンの削除',
      { confirmLabel: '削除する', variant: 'danger' }
    );
    if (ok) {
      const updated = regimens.filter(r => r.id !== regimenId);
      setRegimens(updated);
      safeSetLocalStorage('onco_regimens', JSON.stringify(updated));
      alert('レジメンを削除しました。');
      return true;
    }
    return false;
  };

  // 薬剤追加
  const handleAddDrug = (newDrug) => {
    const updated = [...drugsMaster, newDrug];
    setDrugsMaster(updated);
    safeSetLocalStorage('onco_drugs', JSON.stringify(updated));
  };

  // 薬剤更新 (かつ、レジメンと患者個別レジメンに伝播)
  const handleUpdateDrug = (updatedDrug) => {
    const updatedDrugs = drugsMaster.map(d => d.id === updatedDrug.id ? updatedDrug : d);
    setDrugsMaster(updatedDrugs);
    safeSetLocalStorage('onco_drugs', JSON.stringify(updatedDrugs));

    // レジメンテンプレートマスタの該当薬剤の name, route を同期
    const updatedRegimens = regimens.map(r => {
      if (r.drugs) {
        const updatedRegimenDrugs = r.drugs.map(d => {
          if (d.drugId === updatedDrug.id) {
            return {
              ...d,
              name: updatedDrug.name,
              route: updatedDrug.route
            };
          }
          return d;
        });
        return { ...r, drugs: updatedRegimenDrugs };
      }
      return r;
    });
    setRegimens(updatedRegimens);
    safeSetLocalStorage('onco_regimens', JSON.stringify(updatedRegimens));

    // 患者個別レジメンの該当薬剤の name, route も同期（activeRegimen.drugs + schedule[].drugs 両方）
    const updatedPatients = patients.map(p => {
      let changed = false;

      // activeRegimen.drugs の同期
      let updatedActiveRegimen = p.activeRegimen;
      if (p.activeRegimen && p.activeRegimen.drugs) {
        const updatedPatientDrugs = p.activeRegimen.drugs.map(d => {
          if (d.drugId === updatedDrug.id) {
            return {
              ...d,
              name: updatedDrug.name,
              route: updatedDrug.route
            };
          }
          return d;
        });
        updatedActiveRegimen = {
          ...p.activeRegimen,
          drugs: updatedPatientDrugs
        };
        changed = true;
      }

      // schedule[].drugs の同期（過去スケジュール履歴も更新）
      let updatedSchedule = p.schedule;
      if (p.schedule && p.schedule.length > 0) {
        const newSchedule = p.schedule.map(s => {
          if (!s.drugs) return s;
          const updatedSDrugs = s.drugs.map(d => {
            if (d.drugId === updatedDrug.id) {
              return {
                ...d,
                name: updatedDrug.name,
                route: updatedDrug.route
              };
            }
            return d;
          });
          return { ...s, drugs: updatedSDrugs };
        });
        updatedSchedule = newSchedule;
        changed = true;
      }

      if (!changed) return p;
      return {
        ...p,
        activeRegimen: updatedActiveRegimen,
        schedule: updatedSchedule
      };
    });
    setPatients(updatedPatients);
    safeSetLocalStorage('onco_patients', JSON.stringify(updatedPatients));
  };

  // 薬剤削除
  const handleDeleteDrug = (drugId) => {
    const usedInRegimen = regimens.some(r => r.drugs && r.drugs.some(d => d.drugId === drugId));
    const usedInPatientActive = patients.some(p => p.activeRegimen && p.activeRegimen.drugs && p.activeRegimen.drugs.some(d => d.drugId === drugId));
    const usedInPatientSchedule = patients.some(p => p.schedule && p.schedule.some(s => s.drugs && s.drugs.some(d => d.drugId === drugId)));

    if (usedInRegimen || usedInPatientActive || usedInPatientSchedule) {
      alert('この薬剤はレジメンまたは患者スケジュールで使用中のため削除できません。');
      return;
    }

    const updated = drugsMaster.filter(d => d.id !== drugId);
    setDrugsMaster(updated);
    safeSetLocalStorage('onco_drugs', JSON.stringify(updated));
  };

  // 最終バックアップからの経過日数計算
  const getDaysSinceLastBackup = () => {
    if (!lastBackupTime) return null;
    const last = new Date(lastBackupTime).getTime();
    const now = new Date().getTime();
    const diffTime = now - last;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysSinceLastBackup = getDaysSinceLastBackup();
  const isBackupOverdue = showBackupAlert && (patients.length > 0 || regimens.length > 0) && (
    lastBackupTime === null || (daysSinceLastBackup !== null && daysSinceLastBackup >= 7)
  );

  const bannerHeight = (storageErrors.length > 0 ? 56 : 0) + (isBackupOverdue ? 56 : 0);

  return (
    <div className="app-container" style={{ paddingTop: `${bannerHeight}px`, transition: 'padding-top 0.2s ease' }}>
      {/* バックアップ未実施警告バナー */}
      {isBackupOverdue && (
        <div style={{
          position: 'fixed',
          top: storageErrors.length > 0 ? '56px' : '0',
          left: 0, right: 0, zIndex: 9998,
          backgroundColor: '#9a3412', color: '#fff', padding: '10px 20px',
          display: 'flex', alignItems: 'center', gap: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          height: '56px',
          boxSizing: 'border-box',
          transition: 'top 0.2s ease'
        }}>
          <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>💾</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', fontSize: '0.9rem', lineHeight: '1.2' }}>
              {lastBackupTime 
                ? `バックアップが7日以上実施されていません（最後のバックアップ：${new Date(lastBackupTime).toLocaleDateString()}）`
                : 'バックアップが一度も実施されていません。'}
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '2px' }}>
              データ消失を防ぐため、定期的にバックアップファイルを出力してください。
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setActiveTab('backup-restore')}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
                borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem',
                fontWeight: '700'
              }}
            >
              今すぐ実施
            </button>
            <button
              onClick={() => setShowBackupAlert(false)}
              style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer', fontSize: '0.75rem', padding: '4px'
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
      {/* ストレージ破損警告バナー */}
      {storageErrors.length > 0 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          backgroundColor: '#7f1d1d', color: '#fff', padding: '10px 20px',
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          height: '56px',
          boxSizing: 'border-box'
        }}>
          <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '2px', lineHeight: '1.2' }}>
              データ破損を検知しました
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {storageErrors.map((msg, i) => (
                <div key={i} style={{ fontSize: '0.75rem', opacity: 0.9 }}>{msg}</div>
              ))}
            </div>
          </div>
          <button
            onClick={() => setStorageErrors([])}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.5)', color: '#fff', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.75rem', flexShrink: 0 }}
          >
            閉じる
          </button>
        </div>
      )}
      {/* サイドバーナビゲーション */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Activity size={24} style={{ color: 'var(--color-secondary)' }} />
            <span>OncoScheduler</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
            がん化学療法レジメン管理システム
          </div>
        </div>

        <ul className="sidebar-menu">
          <li 
            className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>ダッシュボード</span>
          </li>
          <li 
            className={`sidebar-item ${activeTab === 'global-calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('global-calendar')}
          >
            <Calendar size={18} />
            <span>全体カレンダー</span>
          </li>
          <li 
            className={`sidebar-item ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => setActiveTab('patients')}
          >
            <Users size={18} />
            <span>患者管理</span>
          </li>
          <li 
            className={`sidebar-item ${activeTab === 'regimens' ? 'active' : ''}`}
            onClick={() => setActiveTab('regimens')}
          >
            <BookOpen size={18} />
            <span>レジメンマスタ</span>
          </li>
          <li 
            className={`sidebar-item ${activeTab === 'drugs' ? 'active' : ''}`}
            onClick={() => setActiveTab('drugs')}
          >
            <Pill size={18} />
            <span>薬剤マスタ</span>
          </li>
          <li 
            className={`sidebar-item ${activeTab === 'checklist' ? 'active' : ''}`}
            onClick={() => setActiveTab('checklist')}
          >
            <ShieldAlert size={18} />
            <span>安全チェックリスト</span>
          </li>
          <li 
            className={`sidebar-item ${activeTab === 'drug-aggregation' ? 'active' : ''}`}
            onClick={() => setActiveTab('drug-aggregation')}
          >
            <ClipboardList size={18} />
            <span>薬剤必要量集計</span>
          </li>
          <li 
            className={`sidebar-item ${activeTab === 'backup-restore' ? 'active' : ''}`}
            onClick={() => setActiveTab('backup-restore')}
          >
            <Database size={18} />
            <span>バックアップ・復元</span>
          </li>
        </ul>

        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
          医療従事者専用モードオン
        </div>
      </div>

      {/* メインビューポート */}
      <div className="main-content">
        <div className="header">
          <h2 className="header-title">
            {activeTab === 'dashboard' && '臨床総合ダッシュボード'}
            {activeTab === 'global-calendar' && '全体スケジュールカレンダー'}
            {activeTab === 'patients' && '患者カルテ一覧・登録'}
            {activeTab === 'regimens' && '抗がん剤標準レジメン一覧'}
            {activeTab === 'drugs' && '抗がん剤・支持療法薬マスタ'}
            {activeTab === 'checklist' && '投与ダブルチェック・実施確認'}
            {activeTab === 'drug-aggregation' && '薬剤調製必要量集計（1週間先まで）'}
            {activeTab === 'backup-restore' && 'データバックアップ・復元管理'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span className="badge badge-success" style={{ padding: '6px 12px', backgroundColor: 'var(--color-success)' }}>
              保存ステータス: ローカル保存モード（同期なし）
            </span>
          </div>
        </div>

        <div className="content-viewport">
          {activeTab === 'dashboard' && (
            <Dashboard 
              patients={patients} 
              regimens={regimens} 
              alerts={alerts}
              onNavigate={setActiveTab}
              onSelectPatient={setSelectedPatientId}
            />
          )}
          {activeTab === 'global-calendar' && (
            <GlobalCalendar 
              patients={patients} 
              regimens={regimens}
              onSelectPatient={setSelectedPatientId}
              onNavigate={setActiveTab}
            />
          )}
          {activeTab === 'patients' && (
            <PatientList 
              patients={patients} 
              regimens={regimens}
              drugsMaster={drugsMaster}
              onAddPatient={handleAddPatient}
              onUpdatePatient={handleUpdatePatient}
              onDeletePatient={handleDeletePatient}
              onSelectPatient={setSelectedPatientId}
              selectedPatientId={selectedPatientId}
              onNavigate={setActiveTab}
              confirm={confirm}
            />
          )}
          {activeTab === 'regimens' && (
            <RegimenList 
              regimens={regimens} 
              drugsMaster={drugsMaster}
              onAddRegimen={handleAddRegimen}
              onUpdateRegimen={handleUpdateRegimen}
              onDeleteRegimen={handleDeleteRegimen}
              onUpdateRegimens={(data) => {
                setRegimens(data);
                safeSetLocalStorage('onco_regimens', JSON.stringify(data));
              }}
            />
          )}

          {activeTab === 'drugs' && (
            <DrugList 
              drugsMaster={drugsMaster}
              regimens={regimens}
              patients={patients}
              onAddDrug={handleAddDrug}
              onUpdateDrug={handleUpdateDrug}
              onDeleteDrug={handleDeleteDrug}
              confirm={confirm}
            />
          )}

          {activeTab === 'checklist' && (
            <Checklist 
              patients={patients} 
              regimens={regimens}
              selectedPatientId={selectedPatientId}
              onUpdatePatient={handleUpdatePatient}
              onSelectPatient={setSelectedPatientId}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'drug-aggregation' && (
            <DrugAggregation 
              patients={patients} 
              regimens={regimens}
            />
          )}

          {activeTab === 'backup-restore' && (
            <BackupRestore 
              patients={patients} 
              regimens={regimens}
              drugsMaster={drugsMaster}
              onUpdatePatients={(data) => {
                setPatients(data);
                safeSetLocalStorage('onco_patients', JSON.stringify(data));
              }}
              onUpdateRegimens={(data) => {
                setRegimens(data);
                safeSetLocalStorage('onco_regimens', JSON.stringify(data));
              }}
              onUpdateDrugs={(data) => {
                setDrugsMaster(data);
                safeSetLocalStorage('onco_drugs', JSON.stringify(data));
              }}
              onBackupExecuted={() => {
                const now = new Date().toISOString();
                setLastBackupTime(now);
                safeSetLocalStorage('onco_last_backup_time', now);
              }}
            />
          )}
        </div>
      </div>
      {/* カスタム確認ダイアログ */}
      <ConfirmModal {...confirmModalProps} />
    </div>
  );
}
