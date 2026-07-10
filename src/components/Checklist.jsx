import React, { useState, useEffect } from 'react';
import { ShieldCheck, User, Check, AlertCircle, Clock, Save } from 'lucide-react';
import { formatDose } from '../utils/doseUtils';
import { getLocalDateString } from '../utils/dateUtils';
import { getTodayStatus } from '../utils/scheduleUtils';
import { PROTOCOL_TYPES } from '../utils/regimenProtocols';
import { useToast } from '../hooks/useToast';

export default function Checklist({ patients, regimens, selectedPatientId, onUpdatePatient, onSelectPatient, onNavigate }) {
  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const todayStatus = todayStatus;
  const today = getLocalDateString(new Date());
  const { toast } = useToast();

  const activeReg = selectedPatient && selectedPatient.activeRegimen
    ? regimens.find(r => r.id === selectedPatient.activeRegimen.regimenId)
    : null;

  // 今日が投与スケジュールにあるかチェック
  const todayScheduleItem = selectedPatient && selectedPatient.schedule
    ? selectedPatient.schedule.find(s => s.date === today && s.isDrugDay)
    : null;

  // 投与完了記録（副作用観察所見・実際の投与量）
  const [completionNotes, setCompletionNotes] = useState('');
  const [actualDoses, setActualDoses] = useState({});

  // 患者切り替え時に完了記録フォームを同期する
  useEffect(() => {
    if (selectedPatient && todayScheduleItem) {
      // すでに記録がある場合はそれを読み込む
      setCompletionNotes(todayScheduleItem.completionNotes || '');
      setActualDoses(todayScheduleItem.actualDoses || {});
    } else {
      setCompletionNotes('');
      setActualDoses({});
    }
  }, [selectedPatientId, todayScheduleItem]);

  // チェックリストの各項目
  const [checks, setChecks] = useState({
    patientIdentity: false,      // 患者照合 (リストバンド等)
    labClear: false,             // 検査値クリア条件の確認
    doseDoubleCheck: false,      // 投与量のダブルチェック (処方箋と実物)
    exposurePrecaution: false,   // 抗がん剤曝露対策 (CSTD・手袋・ガウン)
    routeVerification: false,    // 投与ルート確認 (CVポート/末梢、逆血確認)
    premedicationGiven: false,   // 前投薬 (制吐剤等) の投与完了
    tecveyriAdmission: false,    // テクベイリ入院・バイタル監視体制の確認
    lunsumioAdmission: false,    // ルンスミオ入院・前投薬指示の確認
    talquetamabAdmission: false, // タービー入院・前投薬指示の確認
  });

  // 既に完了しているか初期化
  useEffect(() => {
    if (selectedPatient && todayStatus === 'completed') {
      setChecks({
        patientIdentity: true,
        labClear: true,
        doseDoubleCheck: true,
        exposurePrecaution: true,
        routeVerification: true,
        premedicationGiven: true,
        tecveyriAdmission: true,
        lunsumioAdmission: true,
        talquetamabAdmission: true,
      });
    } else {
      setChecks({
        patientIdentity: false,
        labClear: false,
        doseDoubleCheck: false,
        exposurePrecaution: false,
        routeVerification: false,
        premedicationGiven: false,
        tecveyriAdmission: false,
        lunsumioAdmission: false,
        talquetamabAdmission: false,
      });
    }
  }, [selectedPatientId, todayStatus]);

  // 投与基準アラートの判定
  const isWbcAlert = selectedPatient && selectedPatient.wbc !== null && selectedPatient.wbc < 1500;
  const isPltAlert = selectedPatient && selectedPatient.plt !== null && selectedPatient.plt < 7.5;
  const hasAlert = isWbcAlert || isPltAlert;

  const toggleCheck = (key) => {
    if (!selectedPatient || todayStatus === 'completed') return; // すでに完了している場合は変更不可
    setChecks(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // 各薬剤種別の判定
  const isTecveyri = activeReg?.protocolType === PROTOCOL_TYPES.TECVAYLI;
  const isTalquetamab = activeReg?.protocolType === PROTOCOL_TYPES.TALQUETAMAB;
  const isLunsumioSubcutaneous = activeReg?.protocolType === PROTOCOL_TYPES.LUNSUMIO_SC;
  const isLunsumioIntravenous = activeReg?.protocolType === PROTOCOL_TYPES.LUNSUMIO_IV;
  const isLunsumioMonotherapy = isLunsumioSubcutaneous || isLunsumioIntravenous;

  const isTecveyriGradual = isTecveyri && todayScheduleItem && [1, 4, 8].includes(todayScheduleItem.dayNumber);

  const isLunsumioGradual = todayScheduleItem && (
    (isLunsumioIntravenous && (
      (todayScheduleItem.cycleNumber === 1 && [1, 8, 15].includes(todayScheduleItem.dayNumber)) ||
      (todayScheduleItem.cycleNumber === 2 && todayScheduleItem.dayNumber === 1)
    )) ||
    (isLunsumioSubcutaneous && todayScheduleItem.cycleNumber === 1 && [1, 8, 15].includes(todayScheduleItem.dayNumber))
  );

  const isTalquetamabGradual = isTalquetamab && todayScheduleItem && (
    (activeReg?.id === 'R014' && todayScheduleItem.cycleNumber === 1 && [1, 4, 8].includes(todayScheduleItem.dayNumber)) ||
    ((activeReg?.id === 'R015' || activeReg?.id === 'R016') && todayScheduleItem.cycleNumber === 1 && [1, 4, 8, 11].includes(todayScheduleItem.dayNumber))
  );

  const allChecked = Object.keys(checks).every(key => {
    if (key === 'tecveyriAdmission' && !isTecveyriGradual) {
      return true;
    }
    if (key === 'lunsumioAdmission' && !isLunsumioGradual) {
      return true;
    }
    if (key === 'talquetamabAdmission' && !isTalquetamabGradual) {
      return true;
    }
    return checks[key];
  });

  const handleSaveStatus = (status) => {
    if (!todayScheduleItem) return;
    _applySaveStatus(status);
  };

  // 実際の保存処理
  const _applySaveStatus = (status) => {
    const updatedSchedule = selectedPatient.schedule.map(s => {
      if (s.date === today && s.isDrugDay) {
        return {
          ...s,
          status: status,
          ...(status === 'completed' ? { completionNotes, actualDoses } : {})
        };
      }
      return s;
    });

    let updatedPatient = {
      ...selectedPatient,
      schedule: updatedSchedule
    };

    onUpdatePatient(updatedPatient);
    toast(status === 'completed' ? '投与完了を記録しました。' : 'ステータスを更新しました。');
    if (status === 'completed') onNavigate('dashboard');
  };

  return (
    <div style={{ height: 'calc(100vh - 150px)', overflowY: 'auto' }}>
      {/* 共通ヘッダー：患者選択プルダウン */}
      <div className="card">
        <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-primary)' }}>
              化学療法投与前安全チェックリスト
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              {selectedPatient 
                ? `対象患者: ${selectedPatient.name} 殿 (ID: ${selectedPatient.id} / BSA: ${selectedPatient.bsa} m²)`
                : 'チェック対象の患者を選択してください。'
              }
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label className="form-label" style={{ marginBottom: 0, fontWeight: '600', fontSize: '0.85rem' }}>対象患者選択</label>
              <select 
                className="form-control" 
                style={{ width: '280px', padding: '6px 10px' }}
                value={selectedPatientId || ''}
                onChange={e => onSelectPatient(e.target.value)}
              >
                <option value="">-- 本日投与予定の患者 --</option>
                {patients
                  .filter(p => {
                    if (!p.schedule) return false;
                    return p.schedule.some(s => s.date === today && s.isDrugDay);
                  })
                  .map(p => {
                    const pReg = regimens.find(r => r.id === p.activeRegimen?.regimenId);
                    return (
                      <option key={p.id} value={p.id}>
                        [{p.id}] {p.name} ({pReg ? pReg.name : 'レジメン未設定'})
                      </option>
                    );
                  })}
              </select>
            </div>
            {selectedPatient && (
              <span className="badge badge-info">本日 ({today}): Day {todayScheduleItem ? todayScheduleItem.dayNumber : '---'}</span>
            )}
          </div>
        </div>
      </div>

      {!selectedPatient ? (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-body" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
            <ShieldCheck size={64} style={{ marginBottom: '16px', strokeWidth: '1', color: 'var(--color-text-muted)' }} />
            <p>患者が選択されていません。上のプルダウンから患者を選択してください。</p>
          </div>
        </div>
      ) : !todayScheduleItem ? (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-body" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
            本日、この患者の投与予定（Dayスケジュール）はありません。
          </div>
        </div>
      ) : todayScheduleItem.status === 'provisional' ? (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-body" style={{ textAlign: 'center', padding: '60px 40px', color: '#64748b' }}>
            <AlertCircle size={64} style={{ marginBottom: '16px', strokeWidth: '1', color: '#cbd5e1' }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-text-dark)', marginBottom: '8px' }}>
              本日の投与は実施できません（効果評価前）
            </h4>
            <p style={{ fontSize: '0.85rem', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
              本日登録されている投与予定は、ルンスミオ8サイクル完了時の効果評価前のため、見込み（仮）の予定として表示されています。
              投与を実施するには、患者リスト画面から8サイクルの治療効果評価（PR/SD）を入力し、スケジュールを確定させてください。
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px', marginTop: '20px' }}>
          {/* 左：チェックリスト */}
          <div>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <ShieldCheck size={20} />
                  実施確認項目
                </h3>
              </div>
              <div className="card-body">
                {hasAlert && (
                  <div className="alert-banner alert-banner-danger" style={{ marginBottom: '20px' }}>
                    <AlertCircle size={20} style={{ flexShrink: 0 }} />
                    <div>
                      <strong>投与延期検討警告:</strong> 検査値が休薬基準に達しています。医師へ休薬または減量の指示を確認してください。
                      <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                        {isWbcAlert && `・白血球数低下 (WBC: ${selectedPatient.wbc} /μL < 1500)`}
                        {isPltAlert && `・血小板数低下 (PLT: ${selectedPatient.plt} 万/μL < 7.5)`}
                      </div>
                    </div>
                  </div>
                )}

                <div 
                  className={`checklist-item ${checks.patientIdentity ? 'checked' : ''}`}
                  onClick={() => toggleCheck('patientIdentity')}
                >
                  <div className="checklist-checkbox">
                    {checks.patientIdentity && <Check size={14} />}
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--color-primary)' }}>患者照合と本人確認</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      リストバンドと処方箋による3点確認（ID・氏名・生年月日）を行い、フルネームで名乗ってもらい照合しました。
                    </span>
                  </div>
                </div>

                <div 
                  className={`checklist-item ${checks.labClear ? 'checked' : ''}`}
                  onClick={() => toggleCheck('labClear')}
                >
                  <div className="checklist-checkbox">
                    {checks.labClear && <Check size={14} />}
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--color-primary)' }}>検査データ確認・休薬基準のクリア</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      直近の血液データ（WBC 1500以上、PLT 7.5万以上、腎機能・肝機能等）を確認し、投与基準をクリアしていることを検証しました。
                    </span>
                  </div>
                </div>

                <div 
                  className={`checklist-item ${checks.doseDoubleCheck ? 'checked' : ''}`}
                  onClick={() => toggleCheck('doseDoubleCheck')}
                >
                  <div className="checklist-checkbox">
                    {checks.doseDoubleCheck && <Check size={14} />}
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--color-primary)' }}>薬剤名・投与量のダブルチェック</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      指示箋と調製された抗がん剤の実物ラベルを比較し、薬剤名、BSAから算出された投与量（mg）、液量、投与速度が正しいことを2名の医療従事者でダブルチェックしました。
                    </span>
                  </div>
                </div>

                <div 
                  className={`checklist-item ${checks.exposurePrecaution ? 'checked' : ''}`}
                  onClick={() => toggleCheck('exposurePrecaution')}
                >
                  <div className="checklist-checkbox">
                    {checks.exposurePrecaution && <Check size={14} />}
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--color-primary)' }}>抗がん剤曝露対策の実施</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      投与作業にあたり、個人防護具（手袋、ガウン、マスク）を着用し、閉鎖式接続システム（CSTD）等による曝露防止策を行っています。
                    </span>
                  </div>
                </div>

                <div 
                  className={`checklist-item ${checks.routeVerification ? 'checked' : ''}`}
                  onClick={() => toggleCheck('routeVerification')}
                >
                  <div className="checklist-checkbox">
                    {checks.routeVerification && <Check size={14} />}
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--color-primary)' }}>投与ルートの確保と血管外漏出防止確認</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      CVポートまたは末梢ラインを確保し、逆血確認と生理食塩液のフラッシュによりラインが正常に開通していること、漏れがないことを確認しました。
                    </span>
                  </div>
                </div>

                <div 
                  className={`checklist-item ${checks.premedicationGiven ? 'checked' : ''}`}
                  onClick={() => toggleCheck('premedicationGiven')}
                >
                  <div className="checklist-checkbox">
                    {checks.premedicationGiven && <Check size={14} />}
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--color-primary)' }}>前投薬（制吐剤等）の先行投与</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      レジメンで指定された催吐防止薬（デキサメタゾン、アプレピタント等）が、抗がん剤投与の適切な時間前に先行して投与完了していることを確認しました。
                    </span>
                  </div>
                </div>

                {isTecveyriGradual && (
                  <div 
                    className={`checklist-item ${checks.tecveyriAdmission ? 'checked' : ''}`}
                    onClick={() => toggleCheck('tecveyriAdmission')}
                    style={{ border: '2px solid var(--color-danger)', backgroundColor: '#fff5f5' }}
                  >
                    <div className="checklist-checkbox" style={{ borderColor: 'var(--color-danger)' }}>
                      {checks.tecveyriAdmission && <Check size={14} style={{ color: 'var(--color-danger)' }} />}
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--color-danger)' }}>【テクベイリ特定指示】入院管理および前投薬の最終確認</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        漸増用量1回目（Day 1）又は2回目（Day 4）の投与後48時間の入院管理体制、および投与1〜3時間前のデキサメタゾン、抗ヒスタミン剤、解熱鎮痛剤の予防的投与が完了していることを確認しました。また、SpO2や血圧を含むバイタルサイン測定計画を確認しました。
                      </span>
                    </div>
                  </div>
                )}

                {isLunsumioGradual && (
                  <div 
                    className={`checklist-item ${checks.lunsumioAdmission ? 'checked' : ''}`}
                    onClick={() => toggleCheck('lunsumioAdmission')}
                    style={{ border: '2px solid var(--color-danger)', backgroundColor: '#fff5f5' }}
                  >
                    <div className="checklist-checkbox" style={{ borderColor: 'var(--color-danger)' }}>
                      {checks.lunsumioAdmission && <Check size={14} style={{ color: 'var(--color-danger)' }} />}
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--color-danger)' }}>
                        {isLunsumioIntravenous ? '【ルンスミオ点滴特定指示】前投薬および入院管理の確認' : '【ルンスミオ皮下注特定指示】前投薬および入院管理の確認'}
                      </strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                        {isLunsumioIntravenous ? (
                          '1サイクル目Day 15（初回60mg）投与開始後48時間の入院管理体制、およびデキサメタゾン等のステロイドを含む必須前投薬の投与完了、水分補給が完了していることを確認しました。'
                        ) : (
                          '1サイクル目Day 1（初回5mg）投与開始後48時間の入院管理体制、およびステロイド・解熱剤・抗ヒスタミン剤を含む前投薬の投与完了を確認しました。'
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {isTalquetamabGradual && (
                  <div 
                    className={`checklist-item ${checks.talquetamabAdmission ? 'checked' : ''}`}
                    onClick={() => toggleCheck('talquetamabAdmission')}
                    style={{ border: '2px solid var(--color-danger)', backgroundColor: '#fff5f5' }}
                  >
                    <div className="checklist-checkbox" style={{ borderColor: 'var(--color-danger)' }}>
                      {checks.talquetamabAdmission && <Check size={14} style={{ color: 'var(--color-danger)' }} />}
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--color-danger)' }}>
                        【タービー特定指示】前投薬および入院管理の確認
                      </strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                        漸増期の各投与（および初回の治療用量投与）後48時間の入院管理体制、および投与開始1〜3時間前の副腎皮質ホルモン剤（ステロイド）、抗ヒスタミン剤、解熱鎮痛剤の先行予防投与が完了していることを確認しました。
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右：本日の投与薬剤とステータス登録 */}
          <div>
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-header">
                <h3 className="card-title">投与薬剤・計算詳細</h3>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {(selectedPatient.activeRegimen?.drugs || [])
                    .map((drug, origIdx) => ({ drug, origIdx }))
                    .filter(({ drug, origIdx }) => {
                      if (!todayScheduleItem) return false;
                      if (drug.applicableCycles && todayScheduleItem.cycleNumber) {
                        if (!drug.applicableCycles.includes(todayScheduleItem.cycleNumber)) {
                          return false;
                        }
                      }
                      if (drug.applicableDays) {
                        return drug.applicableDays.includes(todayScheduleItem.dayNumber);
                      }
                      return true;
                    })
                    .map(({ drug, origIdx }, i) => {
                    const isOmitted = (todayScheduleItem?.omittedDrugIndices || []).includes(origIdx);
                    let dose = 0;
                    if (drug.doseType === 'bsa') {
                      dose = drug.doseValue * selectedPatient.bsa;
                    } else if (drug.doseType === 'weight') {
                      dose = drug.doseValue * selectedPatient.weight;
                    } else {
                      dose = drug.doseValue;
                    }

                    return (
                      <div key={i} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', opacity: isOmitted ? 0.5 : 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ textDecoration: isOmitted ? 'line-through' : 'none' }}>{drug.name}</span>
                          {isOmitted && <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#b45309', backgroundColor: '#fde68a', padding: '2px 6px', borderRadius: '4px' }}>中止予定</span>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                          <span>投与量: <strong className="num-tabular" style={{ color: 'var(--color-secondary)' }}>{formatDose(dose, drug.name)} mg</strong></span>
                          <span>ルート: {drug.route}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          <span>順序: {drug.order} 番目</span>
                          <span>速度: {drug.duration} 分で点滴</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 投与完了記録フォーム */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-header">
                <h3 className="card-title">投与完了記録</h3>
              </div>
              <div className="card-body">
                {todayStatus === 'completed' ? (
                  // 完了済みの場合は記録を閲覧モードで表示
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '6px' }}>実際の投与量（記録済み）</div>
                      {Object.keys(todayScheduleItem?.actualDoses || {}).length > 0 ? (
                        Object.entries(todayScheduleItem.actualDoses).map(([drugKey, dose]) => {
                          const drug = (selectedPatient.activeRegimen?.drugs || []).find(d => 
                            d.drugId === drugKey || d.name === drugKey
                          );
                          return drug ? (
                            <div key={drugKey} style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                              ・{drug.name}: <strong>{dose} mg</strong>
                            </div>
                          ) : (
                            <div key={drugKey} style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                              ・{drugKey}: <strong>{dose} mg</strong>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>計算値通り（変更なし）</div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '6px' }}>副作用観察所見・備考</div>
                      <div style={{ fontSize: '0.85rem', backgroundColor: '#f8fafc', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '10px', whiteSpace: 'pre-wrap', minHeight: '60px', lineHeight: '1.6' }}>
                        {todayScheduleItem?.completionNotes || '（記録なし）'}
                      </div>
                    </div>
                  </div>
                ) : (
                  // 未完了の場合は入力フォームを表示
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '8px' }}>実際の投与量（計算値から変更がある場合のみ入力）</div>
                      {(selectedPatient.activeRegimen?.drugs || [])
                        .filter(drug => {
                          if (!todayScheduleItem) return false;
                          if (drug.applicableCycles && todayScheduleItem.cycleNumber) {
                            if (!drug.applicableCycles.includes(todayScheduleItem.cycleNumber)) return false;
                          }
                          if (drug.applicableDays) return drug.applicableDays.includes(todayScheduleItem.dayNumber);
                          return true;
                        })
                        .map((drug, i) => {
                          let calcDose = 0;
                          if (drug.doseType === 'bsa') calcDose = formatDose(drug.doseValue * selectedPatient.bsa, drug.name);
                          else if (drug.doseType === 'weight') calcDose = formatDose(drug.doseValue * selectedPatient.weight, drug.name);
                          else calcDose = formatDose(drug.doseValue, drug.name);
                          return (
                            <div key={drug.drugId || drug.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                              <label style={{ fontSize: '0.8rem', minWidth: '150px', flex: '1', color: 'var(--color-text-dark)' }}>{drug.name}</label>
                              <input
                                type="number"
                                className="form-control"
                                style={{ width: '100px', padding: '4px 8px', fontSize: '0.85rem' }}
                                placeholder={`${calcDose} mg`}
                                value={actualDoses[drug.drugId || drug.name] || ''}
                                onChange={e => setActualDoses(prev => ({
                                  ...prev,
                                  [drug.drugId || drug.name]: e.target.value
                                }))}
                              />
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>mg（計算値: {calcDose} mg）</span>
                            </div>
                          );
                        })}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '6px' }}>副作用観察所見・備考（任意）</div>
                      <textarea
                        className="form-control"
                        rows="4"
                        style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', padding: '8px 10px', fontSize: '0.85rem', lineHeight: '1.6' }}
                        placeholder="例：CRS Grade 1（発熱38.2℃、投与後2時間で自然解熱）。次回以降の前投薬を強化する方向で主治医と調整中。"
                        value={completionNotes}
                        onChange={e => setCompletionNotes(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">ステータス更新</h3>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button 
                    className="btn btn-warning" 
                    style={{ width: '100%', padding: '10px' }}
                    disabled={todayStatus === 'completed'}
                    onClick={() => handleSaveStatus('running')}
                  >
                    <Clock size={16} />
                    投与開始（投与中に移行）
                  </button>

                  <button 
                    className="btn btn-secondary" 
                    style={{ width: '100%', padding: '10px', backgroundColor: allChecked ? 'var(--color-secondary)' : '#a5f3fc' }}
                    disabled={!allChecked || todayStatus === 'completed'}
                    onClick={() => handleSaveStatus('completed')}
                  >
                    <ShieldCheck size={16} />
                    すべての安全チェック完了・投与終了
                  </button>
                  
                  {!allChecked && todayStatus !== 'completed' && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', textAlign: 'center', fontWeight: '500' }}>
                      ※すべての安全チェック項目をチェックすると、投与終了ボタンが有効化されます。
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
