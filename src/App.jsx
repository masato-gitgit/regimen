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
import { safeSetLocalStorage, safeGetLocalStorage } from './utils/storageUtils';
import { useConfirm } from './hooks/useConfirm';
import { useToast } from './hooks/useToast';
import { useAppInitialization } from './hooks/useAppInitialization';




export default function App() {
  const {
    regimens, setRegimens,
    patients, setPatients,
    drugsMaster, setDrugsMaster,
    storageErrors, setStorageErrors,
    isInitialized
  } = useAppInitialization();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [alerts, setAlerts] = useState([]);
  // 最終バックアップ日時
  const [lastBackupTime, setLastBackupTime] = useState(() => {
    return localStorage.getItem('onco_last_backup_time') || null;
  });
  // バックアップ警告バナー表示状態
  const [showBackupAlert, setShowBackupAlert] = useState(true);
  // カスタム確認ダイアログ
  const { confirm, modalProps: confirmModalProps } = useConfirm();
  // トースト
  const { toast } = useToast();

  // トーストイベントリスナー
  useEffect(() => {
    const handleToastEvent = (e) => toast(e.detail.message, e.detail.type || 'info');
    window.addEventListener('app:toast', handleToastEvent);
    return () => window.removeEventListener('app:toast', handleToastEvent);
  }, [toast]);

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
      toast(`この患者（${targetPatient.name}）は現在レジメンが割り当てられ、治療スケジュールが進行中であるため削除できません。先にレジメンの割り当てを解除してください。`, 'error');
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
      toast('患者データを削除しました。');
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
      toast('このレジメンは現在治療中の患者に割り当てられているため、削除できません。患者のレジメン設定を解除するか、別のレジメンに変更してから削除してください。', 'error');
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
      toast('レジメンを削除しました。');
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
      toast('この薬剤はレジメンまたは患者スケジュールで使用中のため削除できません。', 'error');
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
              onUpdateDrugs={(data) => {
                setDrugsMaster(data);
                safeSetLocalStorage('onco_drugs', JSON.stringify(data));
              }}
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
