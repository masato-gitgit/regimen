import React, { useState, useEffect } from 'react';
import { formatDose } from '../../utils/doseUtils';
import { getLocalDateString, parseLocalDate, addDays } from '../../utils/dateUtils';
import { applyTecvayliRestart, applyLunsumioRestart, applyTalquetamabRestart, changeTecvayliInterval, changeCombinationInterval } from '../../utils/protocolActions';
import { useToast } from '../../hooks/useToast';

export default function ScheduleEventModal({
  event: selectedEvent,
  patient: selectedPatient,
  regimens,
  onUpdatePatient,
  onClose,
  confirm
}) {
  const [manualDate, setManualDate] = useState(selectedEvent.date);
  const [delayDays, setDelayDays] = useState(7);
  const [slideRest, setSlideRest] = useState(true);
  const [crsGrade, setCrsGrade] = useState(selectedEvent.crsGrade || 'none');
  const [hematologicGrade, setHematologicGrade] = useState(selectedEvent.hematologicGrade || 'none');
  const [otherGrade, setOtherGrade] = useState(selectedEvent.otherGrade || 'none');
  const [completionNotes, setCompletionNotes] = useState(selectedEvent.completionNotes || '');
  const [preOmittedDrugIndices, setPreOmittedDrugIndices] = useState(selectedEvent.omittedDrugIndices || []);

  const { toast } = useToast();

  useEffect(() => {
    setManualDate(selectedEvent.date);
    setCrsGrade(selectedEvent.crsGrade || 'none');
    setHematologicGrade(selectedEvent.hematologicGrade || 'none');
    setOtherGrade(selectedEvent.otherGrade || 'none');
    setCompletionNotes(selectedEvent.completionNotes || '');
    setPreOmittedDrugIndices(selectedEvent.omittedDrugIndices || []);
  }, [selectedEvent]);

  // 直近の投与完了時の副作用情報を取得する
  const getLastCompletedSideEffects = () => {
    if (!selectedPatient || !selectedPatient.schedule) return null;
    const completedEvents = selectedPatient.schedule
      .filter(s => s.status === 'completed' && s.isDrugDay)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (completedEvents.length === 0) return null;
    const lastCompleted = completedEvents[0];
    const hasCrs = lastCompleted.crsGrade && lastCompleted.crsGrade !== 'none';
    const hasHem = lastCompleted.hematologicGrade && lastCompleted.hematologicGrade !== 'none';
    const hasOther = lastCompleted.otherGrade && lastCompleted.otherGrade !== 'none';
    if (hasCrs || hasHem || hasOther) {
      return {
        date: lastCompleted.date,
        cycleNumber: lastCompleted.cycleNumber,
        dayNumber: lastCompleted.dayNumber,
        crsGrade: lastCompleted.crsGrade || 'none',
        hematologicGrade: lastCompleted.hematologicGrade || 'none',
        otherGrade: lastCompleted.otherGrade || 'none'
      };
    }
    return null;
  };

  // テクベイリ休薬プロトコル適用
  const handleApplyProtocol = (targetDoseValue, isReStepUpNeeded, targetDateStr) => {
    if (!selectedPatient) return;
    const newSchedule = applyTecvayliRestart(selectedPatient.schedule || [], targetDateStr, targetDoseValue);
    onUpdatePatient({ ...selectedPatient, schedule: newSchedule });
    toast(`テクベイリ再開プロトコル（再開用量: ${targetDoseValue} mg/kg）を適用し、スケジュールを再構成しました。`);
    onClose();
  };

  // ルンスミオ皮下注再開プロトコル適用
  const handleApplyLunsumioProtocol = (targetDateStr) => {
    if (!selectedPatient) return;
    const newSchedule = applyLunsumioRestart(selectedPatient.schedule || [], targetDateStr);
    onUpdatePatient({
      ...selectedPatient,
      schedule: newSchedule,
      activeRegimen: {
        ...selectedPatient.activeRegimen,
        totalCycles: 8
      }
    });
    toast('ルンスミオ再開プロトコル（初回5mgから再漸増）を適用し、スケジュールを再構成しました。');
    onClose();
  };

  // タービー再開プロトコル適用
  const handleApplyTalquetamabProtocol = (targetDoseValue, regId, targetDateStr) => {
    if (!selectedPatient) return;
    const isWeekly = (regId === 'R014' || regId === 'R8321');
    const newSchedule = applyTalquetamabRestart(selectedPatient.schedule || [], targetDateStr, targetDoseValue, isWeekly);
    onUpdatePatient({
      ...selectedPatient,
      schedule: newSchedule,
      activeRegimen: {
        ...selectedPatient.activeRegimen,
        totalCycles: isWeekly ? 10 : 8
      }
    });
    toast(`タービー再開プロトコル（再開用量: ${targetDoseValue} mg/kg）を適用し、スケジュールを再構成しました。`);
    onClose();
  };

  // テクベイリの投与間隔変更（1週間隔 ⇔ 2週間隔）
  const handleUpdateTecveyriInterval = (intervalWeeks, targetDateStr) => {
    if (!selectedPatient) return;
    const newSchedule = changeTecvayliInterval(selectedPatient.schedule || [], targetDateStr, intervalWeeks);
    onUpdatePatient({
      ...selectedPatient,
      schedule: newSchedule,
      activeRegimen: {
        ...selectedPatient.activeRegimen,
        intervalWeeks
      }
    });
    toast(intervalWeeks === 2 
      ? 'これ以降の投与間隔を2週間に延長しました（各サイクルのDay 1、Day 15に予定を再配置しました）。' 
      : 'これ以降の投与間隔を通常の毎週（1週間隔）に戻しました。');
    onClose();
  };

  // タービー・テクベイリ併用の投与間隔変更（2週間隔 ⇔ 4週間隔）
  const handleUpdateCombinationInterval = (intervalWeeks, targetDateStr) => {
    if (!selectedPatient) return;
    const newSchedule = changeCombinationInterval(selectedPatient.schedule || [], targetDateStr, intervalWeeks);
    onUpdatePatient({
      ...selectedPatient,
      schedule: newSchedule,
      activeRegimen: {
        ...selectedPatient.activeRegimen,
        intervalWeeks
      }
    });
    toast(intervalWeeks === 4 
      ? 'これ以降の投与間隔を4週間に延長しました（各サイクルのDay 11のみに予定を再配置しました）。' 
      : 'これ以降の投与間隔を通常の2週間隔（Day 11, 25）に戻しました。');
    onClose();
  };

  // 継続投与期の初回投与からの経過週数を計算
  const getWeeksSinceCombinationStart = () => {
    if (!selectedPatient || !selectedEvent) return 0;
    const startEvent = (selectedPatient.schedule || []).find(
      s => s.cycleNumber === 1 && s.dayNumber === 11
    );
    if (!startEvent) return 0;
    const startDate = parseLocalDate(startEvent.date);
    const eventDate = parseLocalDate(selectedEvent.date);
    const diffTime = eventDate.getTime() - startDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7);
  };

  const setSelectedEvent = onClose;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="card-body">
          
                            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: 'var(--radius-md)', marginTop: '15px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                <div>
                                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                                    予定日調整: {selectedEvent.date} (Day {selectedEvent.dayNumber})
                                  </h4>
                                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                                    {selectedEvent.status === 'completed' && <span className="badge badge-success">投与完了</span>}
                                    {selectedEvent.status === 'skipped' && <span className="badge badge-danger">休薬</span>}
                                    {selectedEvent.status === 'running' && <span className="badge badge-warning">投与中</span>}
                                    {selectedEvent.status === 'pending' && <span className="badge badge-info">未実施</span>}
                                    {selectedEvent.doseReduced && <span className="badge badge-danger" style={{ backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #ef4444', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px' }}>20% 減量適用中</span>}
                                  </div>
                                </div>
                                <button type="button" className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => setSelectedEvent(null)}>
                                  閉じる
                                </button>
                              </div>

                              <div style={{ marginBottom: '15px' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                                  この日の投与予定薬剤：
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                  {(selectedEvent.drugs || []).map((drug, dIdx) => {
                                    let calculatedDose = 0;
                                    calculatedDose = drug.doseType === 'bsa' 
                                      ? drug.doseValue * selectedPatient.bsa 
                                      : drug.doseType === 'weight' 
                                        ? drug.doseValue * selectedPatient.weight 
                                        : drug.doseValue;
                                    if (selectedEvent.doseReduced) {
                                      calculatedDose = calculatedDose * (selectedEvent.doseReductionRate || 0.8);
                                    }
                                    return (
                                      <span key={dIdx} style={{ fontSize: '0.85rem' }}>
                                        ・{drug.name}: <strong>{formatDose(calculatedDose, drug.name)} mg</strong> ({drug.route} / {drug.duration}分)
                                        {selectedEvent.doseReduced && <span style={{ color: '#ef4444', marginLeft: '6px', fontSize: '0.75rem' }}>(20% 減量済)</span>}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>

                              {selectedEvent.status === 'provisional' && (
                                <div style={{
                                  backgroundColor: '#f1f5f9',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '8px',
                                  padding: '12px 16px',
                                  marginTop: '10px',
                                  color: '#475569',
                                  fontSize: '0.8rem',
                                  lineHeight: '1.5'
                                }}>
                                  ℹ️ この予定は8サイクル目の効果評価（PR/SD）決定前のため、見込み（仮）の予定日として表示されています。投与実施や日程延期などの記録操作はできません。
                                </div>
                              )}

                              {selectedEvent.status === 'pending' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
                                  
                                  {/* 副作用連動警告・推奨アクション */}
                                  {(() => {
                                    const sideEffects = getLastCompletedSideEffects();
                                    if (!sideEffects) return null;
                                    
                                    const crsVal = parseInt(sideEffects.crsGrade) || 0;
                                    const hemVal = parseInt(sideEffects.hematologicGrade) || 0;
                                    const otherVal = parseInt(sideEffects.otherGrade) || 0;
                                    
                                    if (crsVal < 2 && hemVal < 2 && otherVal < 2) return null;
                                    
                                    let alertTitle = '⚠️ 副作用警告：前回の投与でグレード2以上の副作用が記録されています';
                                    let alertStyle = {
                                      backgroundColor: '#fffbeb',
                                      border: '1px solid #f59e0b',
                                      borderRadius: '8px',
                                      padding: '12px 16px',
                                      marginBottom: '15px',
                                      fontSize: '0.85rem',
                                      color: '#78350f'
                                    };
                                    let recommendations = [];
                                    let showDelayAction = false;
                                    let showDoseCutAction = false;
                                    
                                    if (crsVal >= 3 || hemVal >= 4) {
                                      alertTitle = '🚨 治療中断または投与中止の検討推奨';
                                      alertStyle = {
                                        ...alertStyle,
                                        backgroundColor: '#fef2f2',
                                        border: '1px solid #ef4444',
                                        color: '#991b1b'
                                      };
                                      if (crsVal >= 3) recommendations.push('CRS グレード ' + crsVal + ' が発生しています。プロトコル上、投与の中止または主治医による慎重な評価が必要です。');
                                      if (hemVal >= 4) recommendations.push('血液毒性 グレード ' + hemVal + '（好中球または血小板の重篤な減少）が発生しています。基準回復までの休薬または投与中止が推奨されます。');
                                    } else {
                                      if (crsVal >= 1) recommendations.push('CRS（サイトカイン放出症候群）グレード ' + crsVal + '：症状回復まで投与延期を推奨します。');
                                      if (hemVal >= 2) {
                                        recommendations.push('血液毒性 グレード ' + hemVal + '：好中球・血小板数の回復（グレード1以下）まで投与延期を推奨します。再開時は減量投与を検討してください。');
                                        showDoseCutAction = true;
                                      }
                                      if (otherVal >= 2) recommendations.push('その他副作用 グレード ' + otherVal + '：主治医の判断により、回復までの延期または次回減量を検討してください。');
                                      showDelayAction = true;
                                    }
                                    
                                    return (
                                      <div style={alertStyle}>
                                        <h5 style={{ fontWeight: '700', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          {alertTitle}
                                        </h5>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.9, lineHeight: '1.5', marginBottom: '10px' }}>
                                          前回の投与（{sideEffects.date} - {sideEffects.cycleNumber}C Day {sideEffects.dayNumber}）の記録：<br />
                                          {crsVal > 0 && <span>・CRS: Grade {crsVal} </span>}
                                          {hemVal > 0 && <span>・血液毒性: Grade {hemVal} </span>}
                                          {otherVal > 0 && <span>・その他: Grade {otherVal}</span>}
                                        </div>
                                        <ul style={{ margin: '0 0 12px 0', paddingLeft: '18px', fontSize: '0.8rem', lineHeight: '1.5' }}>
                                          {recommendations.map((rec, rIdx) => (
                                            <li key={rIdx}>{rec}</li>
                                          ))}
                                        </ul>
                                        
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                          {showDelayAction && (
                                            <button
                                              type="button"
                                              className="btn btn-warning"
                                              style={{ fontSize: '0.75rem', padding: '6px 12px', fontWeight: '600' }}
                                              onClick={() => {
                                                const targetDateStr = selectedEvent.date;
                                                let updatedSchedule = selectedPatient.schedule.map(s => {
                                                  if (s.date >= targetDateStr) {
                                                    const d = parseLocalDate(s.date);
                                                    const newD = addDays(d, 7);
                                                    return { ...s, date: getLocalDateString(newD) };
                                                  }
                                                  return s;
                                                });
                                                updatedSchedule.sort((a, b) => a.date.localeCompare(b.date));
                                                onUpdatePatient({
                                                  ...selectedPatient,
                                                  schedule: updatedSchedule
                                                });
                                                toast('副作用推奨に基づき、スケジュールを7日間延期（押し出し）しました。');
                                                setSelectedEvent(null);
                                              }}
                                            >
                                              📅 推薦：次回投与を7日間延期する
                                            </button>
                                          )}
                                          
                                          {showDoseCutAction && (
                                            <button
                                              type="button"
                                              className="btn btn-danger"
                                              style={{ fontSize: '0.75rem', padding: '6px 12px', backgroundColor: '#dc2626', color: '#ffffff', border: 'none', fontWeight: '600' }}
                                              onClick={() => {
                                                const targetDateStr = selectedEvent.date;
                                                let updatedSchedule = selectedPatient.schedule.map(s => s.date === targetDateStr ? {
                                                  ...s, 
                                                  doseReduced: true,
                                                  doseReductionRate: 0.8
                                                } : s);
                                                onUpdatePatient({
                                                  ...selectedPatient,
                                                  schedule: updatedSchedule
                                                });
                                                toast('副作用推奨に基づき、次回（本日の予定）の投与量を 20% 減量（1段階減量）に設定しました。');
                                                setSelectedEvent(null);
                                              }}
                                            >
                                              🧪 推薦：次回の投与量を 20% 減量する
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* 1. 簡易的な延期シフト */}
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', backgroundColor: '#ffffff', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                                    <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <label className="form-label" style={{ marginBottom: 0, fontSize: '0.8rem' }}>簡易延期</label>
                                      <select 
                                        className="form-control"
                                        style={{ width: '120px', padding: '6px 10px' }}
                                        value={delayDays}
                                        onChange={e => setDelayDays(parseInt(e.target.value))}
                                      >
                                        <option value="1">1日延期</option>
                                        <option value="2">2日延期</option>
                                        <option value="3">3日延期</option>
                                        <option value="7">1週間延期 (7日)</option>
                                        <option value="14">2週間延期 (14日)</option>
                                      </select>
                                    </div>
                                    <button 
                                      type="button" 
                                      className="btn btn-warning" 
                                      onClick={() => {
                                        const targetDateStr = selectedEvent.date;
                                        const days = parseInt(delayDays);
                                        let updatedSchedule = selectedPatient.schedule.map(s => {
                                          if (s.date >= targetDateStr) {
                                            const d = parseLocalDate(s.date);
                                                    const newD = addDays(d, days);
                                                    return { ...s, date: getLocalDateString(newD) };
                                          }
                                          return s;
                                        });
                                        updatedSchedule.sort((a, b) => a.date.localeCompare(b.date));
                                        
                                        onUpdatePatient({
                                          ...selectedPatient,
                                          schedule: updatedSchedule
                                        });
                                        toast('この日程以降のスケジュールを ' + days + ' 日間延期しました。');
                                        setSelectedEvent(null);
                                      }}
                                    >
                                      日程を延期する（押し出し）
                                    </button>
                                  </div>

                                  {/* 2. 直接予定日の手動修正フォーム */}
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', backgroundColor: '#ffffff', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                                    <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <label className="form-label" style={{ marginBottom: 0, fontSize: '0.8rem' }}>予定日変更</label>
                                      <input 
                                        type="date" 
                                        className="form-control"
                                        style={{ width: '150px', padding: '6px 10px' }}
                                        value={manualDate}
                                        onChange={e => setManualDate(e.target.value)}
                                      />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                                      <input 
                                        type="checkbox" 
                                        id="slideRest" 
                                        checked={slideRest} 
                                        onChange={e => setSlideRest(e.target.checked)}
                                      />
                                      <label htmlFor="slideRest" style={{ marginBottom: 0, cursor: 'pointer' }}>後続の予定日も連動してシフトする</label>
                                    </div>
                                    <button 
                                      type="button"
                                      className="btn btn-secondary" 
                                      onClick={() => {
                                        if (!manualDate) return;
                                        const oldDate = parseLocalDate(selectedEvent.date);
                                        const newDate = parseLocalDate(manualDate);
                                        const diffTime = newDate.getTime() - oldDate.getTime();
                                        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                                        const targetDateStr = selectedEvent.date;
                                        let updatedSchedule = selectedPatient.schedule.map(s => {
                                          if (slideRest) {
                                            // 後続も連動シフトする場合
                                            if (s.date >= targetDateStr) {
                                              const d = parseLocalDate(s.date);
                                                    const newD = addDays(d, diffDays);
                                                    return { ...s, date: getLocalDateString(newD) };
                                            }
                                          } else {
                                            // 選択した単一の日だけ変更する場合
                                            if (s.date === targetDateStr) {
                                              return { ...s, date: manualDate };
                                            }
                                          }
                                          return s;
                                        });
                                        updatedSchedule.sort((a, b) => a.date.localeCompare(b.date));
                                        onUpdatePatient({ ...selectedPatient, schedule: updatedSchedule });
                                        toast(slideRest ? ('予定日を修正し、後続の日程も ' + diffDays + ' 日分シフトしました。') : '選択した日の予定日を修正しました。');
                                        setSelectedEvent(null);
                                      }}
                                    >
                                      予定日を修正する
                                    </button>
                                  </div>

                                  {/* 3. 休薬アクション */}
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '5px' }}>
                                    <button 
                                      type="button"
                                      className="btn btn-danger"
                                      onClick={() => {
                                        const targetDateStr = selectedEvent.date;
                                        let updatedSchedule = selectedPatient.schedule.map(s => s.date === targetDateStr ? {
                                          ...s, status: 'skipped'
                                        } : s);
                                        onUpdatePatient({ ...selectedPatient, schedule: updatedSchedule });
                                        toast('今回の予定を休薬（スキップ）に設定しました。');
                                        setSelectedEvent(null);
                                      }}
                                    >
                                      今回の投与を休薬する
                                    </button>
                                  </div>

                                  {/* 4. 投与実施済みにする */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f0fdf4', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid #16a34a', marginTop: '10px', marginBottom: '10px' }}>
                                    <h5 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#15803d', margin: 0 }}>
                                      この投与を実施済みにする
                                    </h5>
                                    
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                      <div className="form-group" style={{ flex: 1, minWidth: '100px', marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: '0.7rem', marginBottom: '2px', color: '#15803d', fontWeight: '600' }}>CRS（サイトカイン）</label>
                                        <select 
                                          className="form-control" 
                                          style={{ fontSize: '0.8rem', padding: '4px 6px', height: 'auto' }}
                                          value={crsGrade}
                                          onChange={e => setCrsGrade(e.target.value)}
                                        >
                                          <option value="none">なし</option>
                                          <option value="1">Grade 1</option>
                                          <option value="2">Grade 2</option>
                                          <option value="3">Grade 3</option>
                                          <option value="4">Grade 4</option>
                                        </select>
                                      </div>
                                      
                                      <div className="form-group" style={{ flex: 1, minWidth: '100px', marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: '0.7rem', marginBottom: '2px', color: '#15803d', fontWeight: '600' }}>血液毒性</label>
                                        <select 
                                          className="form-control" 
                                          style={{ fontSize: '0.8rem', padding: '4px 6px', height: 'auto' }}
                                          value={hematologicGrade}
                                          onChange={e => setHematologicGrade(e.target.value)}
                                        >
                                          <option value="none">なし</option>
                                          <option value="1">Grade 1</option>
                                          <option value="2">Grade 2</option>
                                          <option value="3">Grade 3</option>
                                          <option value="4">Grade 4</option>
                                        </select>
                                      </div>

                                      <div className="form-group" style={{ flex: 1, minWidth: '100px', marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: '0.7rem', marginBottom: '2px', color: '#15803d', fontWeight: '600' }}>その他副作用</label>
                                        <select 
                                          className="form-control" 
                                          style={{ fontSize: '0.8rem', padding: '4px 6px', height: 'auto' }}
                                          value={otherGrade}
                                          onChange={e => setOtherGrade(e.target.value)}
                                        >
                                          <option value="none">なし</option>
                                          <option value="1">Grade 1</option>
                                          <option value="2">Grade 2</option>
                                          <option value="3">Grade 3</option>
                                          <option value="4">Grade 4</option>
                                        </select>
                                      </div>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                      <label className="form-label" style={{ fontSize: '0.75rem' }}>副作用観察所見・備考（任意）</label>
                                      <textarea 
                                        className="form-control" 
                                        rows="2" 
                                        style={{ fontSize: '0.8rem', padding: '6px 10px', width: '100%', resize: 'vertical' }}
                                        placeholder="例：問題なく投与完了。副作用なし。"
                                        value={completionNotes}
                                        onChange={e => setCompletionNotes(e.target.value)}
                                      />
                                    </div>
                                    <button 
                                      type="button"
                                      className="btn btn-success"
                                      style={{ width: '100%', padding: '8px', fontSize: '0.85rem', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: '600' }}
                                      onClick={() => {
                                        const targetDateStr = selectedEvent.date;
                                        let updatedSchedule = selectedPatient.schedule.map(s => s.date === targetDateStr ? {
                                          ...s, 
                                          status: 'completed', 
                                          completionNotes: completionNotes,
                                          crsGrade: crsGrade,
                                          hematologicGrade: hematologicGrade,
                                          otherGrade: otherGrade
                                        } : s);
                                        const isToday = getLocalDateString() === targetDateStr;
                                        onUpdatePatient({ 
                                          ...selectedPatient, 
                                          schedule: updatedSchedule,
                                        });
                                        toast('投与を実施済み（完了）に設定しました。');
                                        setSelectedEvent(null);
                                      }}
                                    >
                                      実施済み（完了）にする
                                    </button>
                                  </div>

                                  {/* テクベイリの投与間隔延長（2週間隔） */}
                                  {isTecveyri && selectedEvent.cycleNumber >= 7 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#eff6ff', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid #3b82f6', marginTop: '10px', marginBottom: '10px' }}>
                                      <h5 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1d4ed8', margin: 0 }}>
                                        投与間隔の延長（2週間隔）
                                      </h5>
                                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                                        継続投与期において部分奏効以上の効果が24週間以上持続している場合、投与間隔を2週間に延長できます。
                                      </p>
                                      {selectedPatient.activeRegimen.intervalWeeks === 2 ? (
                                        <button 
                                          type="button" 
                                          className="btn btn-primary" 
                                          style={{ width: '100%', padding: '8px', fontSize: '0.85rem', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                                          onClick={() => handleUpdateTecveyriInterval(1, selectedEvent.date)}
                                        >
                                          通常の毎週投与（1週間隔）に戻す
                                        </button>
                                      ) : (
                                        <button 
                                          type="button" 
                                          className="btn btn-primary" 
                                          style={{ width: '100%', padding: '8px', fontSize: '0.85rem', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                                          onClick={async () => {
                                            const ok = await confirm(
                                              'これ以降の投与間隔を2週間に延長しますか？（部分奏効以上の効果持続が確認されている必要があります）',
                                              '投与間隔の延長',
                                              { confirmLabel: '延長する' }
                                            );
                                            if (ok) {
                                              handleUpdateTecveyriInterval(2, selectedEvent.date);
                                            }
                                          }}
                                        >
                                          投与間隔を2週間に延長する
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {/* タービー・テクベイリ併用の投与間隔延長（4週間隔） */}
                                  {isCombination && getWeeksSinceCombinationStart() >= 15 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#eff6ff', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid #3b82f6', marginTop: '10px', marginBottom: '10px' }}>
                                      <h5 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1d4ed8', margin: 0 }}>
                                        投与間隔の延長（4週間隔）
                                      </h5>
                                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                                        継続投与期の初回投与（1C Day 11）から {getWeeksSinceCombinationStart()} 週経過しています。<br />
                                        ・15週目以降：最良部分奏効（VGPR）以上の奏効で4週間隔に延長可能<br />
                                        ・23週目以降：4週間隔に延長可能
                                      </p>
                                      {selectedPatient.activeRegimen.intervalWeeks === 4 ? (
                                        <button 
                                          type="button" 
                                          className="btn btn-primary" 
                                          style={{ width: '100%', padding: '8px', fontSize: '0.85rem', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                                          onClick={() => handleUpdateCombinationInterval(2, selectedEvent.date)}
                                        >
                                          通常の2週間隔投与に戻す
                                        </button>
                                      ) : (
                                        <button 
                                          type="button" 
                                          className="btn btn-primary" 
                                          style={{ width: '100%', padding: '8px', fontSize: '0.85rem', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                                          onClick={async () => {
                                            const weeks = getWeeksSinceCombinationStart();
                                            const confirmText = weeks >= 23 
                                              ? 'これ以降の投与間隔を4週間に延長しますか？（23週目以降の標準スケジュール延長）' 
                                              : 'これ以降の投与間隔を4週間に延長しますか？（15週目以降で最良部分奏効以上の効果持続が確認されている必要があります）';
                                            const ok = await confirm(
                                              confirmText,
                                              '投与間隔の延長',
                                              { confirmLabel: '延長する' }
                                            );
                                            if (ok) {
                                              handleUpdateCombinationInterval(4, selectedEvent.date);
                                            }
                                          }}
                                        >
                                          投与間隔を4週間に延長する
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {/* 薬剤単位の中止予定設定 */}
                                  <div style={{ backgroundColor: '#fff7ed', border: '1px solid #f59e0b', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                                    <h5 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#b45309', margin: '0 0 10px 0' }}>
                                      薬剤単位の中止予定設定
                                    </h5>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                                      {(selectedEvent.drugs || []).map((drug, dIdx) => {
                                        const origIdx = (selectedEvent.drugOrigIndices || [])[dIdx] ?? dIdx;
                                        const isOmitted = preOmittedDrugIndices.includes(origIdx);
                                        let calculatedDose = 0;
                                        calculatedDose = drug.doseType === 'bsa' 
                                          ? drug.doseValue * selectedPatient.bsa 
                                          : drug.doseType === 'weight' 
                                            ? drug.doseValue * selectedPatient.weight 
                                            : drug.doseValue;
                                        if (selectedEvent.doseReduced) {
                                          calculatedDose = calculatedDose * (selectedEvent.doseReductionRate || 0.8);
                                        }
                                        return (
                                          <label key={dIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '6px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: isOmitted ? '#fef3c7' : '#ffffff', border: isOmitted ? '1px solid #f59e0b' : '1px solid var(--color-border)' }}>
                                            <input 
                                              type="checkbox" 
                                              checked={isOmitted} 
                                              onChange={() => {
                                                setPreOmittedDrugIndices(prev => prev.includes(origIdx) ? prev.filter(x => x !== origIdx) : [...prev, origIdx]);
                                              }}
                                              style={{ width: '16px', height: '16px', accentColor: '#f59e0b' }}
                                            />
                                            <span style={{ flex: 1, fontSize: '0.85rem', textDecoration: isOmitted ? 'line-through' : 'none', opacity: isOmitted ? 0.6 : 1 }}>
                                              {drug.name} <strong>{formatDose(calculatedDose, drug.name)} mg</strong>
                                            </span>
                                            {isOmitted && (
                                              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#b45309', backgroundColor: '#fde68a', padding: '2px 6px', borderRadius: '4px' }}>
                                                中止予定
                                              </span>
                                            )}
                                          </label>
                                        );
                                      })}
                                    </div>
                                    <button 
                                      type="button" 
                                      className="btn btn-warning" 
                                      style={{ width: '100%', fontSize: '0.85rem' }}
                                      onClick={() => {
                                        const targetDateStr = selectedEvent.date;
                                        let updatedSchedule = selectedPatient.schedule.map(s => s.date === targetDateStr ? {
                                          ...s, omittedDrugIndices: preOmittedDrugIndices
                                        } : s);
                                        onUpdatePatient({ ...selectedPatient, schedule: updatedSchedule });
                                        const omittedNames = (selectedEvent.drugOrigIndices || []).map((origIdx, dIdx) => preOmittedDrugIndices.includes(origIdx) ? selectedEvent.drugs[dIdx]?.name : null).filter(Boolean);
                                        toast('中止予定を登録しました：' + omittedNames.join('、'));
                                        setSelectedEvent(null);
                                      }}
                                    >
                                      中止予定を保存する
                                    </button>
                                  </div>
                                </div>
                              )}

                              {selectedEvent.status === 'skipped' && (
                                <button 
                                  type="button" 
                                  className="btn btn-primary" 
                                  onClick={() => {
                                    const targetDateStr = selectedEvent.date;
                                    let updatedSchedule = selectedPatient.schedule.map(s => s.date === targetDateStr ? {
                                      ...s, status: 'pending'
                                    } : s);
                                    onUpdatePatient({ ...selectedPatient, schedule: updatedSchedule });
                                    toast('投与予定に戻しました。');
                                    setSelectedEvent(null);
                                  }}
                                >
                                  投与予定に戻す
                                </button>
                              )}

                              {selectedEvent.status === 'completed' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                                    投与完了済みのスケジュールです。
                                  </span>
                                  
                                  {/* 副作用記録の表示 */}
                                  {(selectedEvent.crsGrade !== 'none' || selectedEvent.hematologicGrade !== 'none' || selectedEvent.otherGrade !== 'none') && (
                                    <div style={{ fontSize: '0.8rem', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', padding: '10px', borderRadius: 'var(--radius-sm)', color: '#991b1b' }}>
                                      <strong>記録された副作用：</strong><br />
                                      {selectedEvent.crsGrade !== 'none' && <span>・CRS: Grade {selectedEvent.crsGrade} </span>}
                                      {selectedEvent.hematologicGrade !== 'none' && <span>・血液毒性: Grade {selectedEvent.hematologicGrade} </span>}
                                      {selectedEvent.otherGrade !== 'none' && <span>・その他副作用: Grade {selectedEvent.otherGrade}</span>}
                                    </div>
                                  )}
                                  
                                  {selectedEvent.completionNotes && (
                                    <div style={{ fontSize: '0.8rem', backgroundColor: '#f1f5f9', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', whiteSpace: 'pre-wrap' }}>
                                      <strong>副作用観察所見・備考：</strong><br />
                                      {selectedEvent.completionNotes}
                                    </div>
                                  )}
                                  <button 
                                    type="button" 
                                    className="btn btn-outline" 
                                    style={{ fontSize: '0.8rem', width: '100%', borderColor: 'var(--color-danger)', color: 'var(--color-danger)', marginTop: '5px', padding: '6px' }}
                                    onClick={async () => {
                                      const ok = await confirm(
                                        '投与完了ステータスを未実施に戻しますか？\n（副作用記録や実際の投与量記録もリセットされます）',
                                        '投与完了の取り消し',
                                        { confirmLabel: '戻す', variant: 'danger' }
                                      );
                                      if (ok) {
                                        const targetDateStr = selectedEvent.date;
                                        let updatedSchedule = selectedPatient.schedule.map(s => {
                                          if (s.date === targetDateStr) {
                                            const { completionNotes, actualDoses, crsGrade, hematologicGrade, otherGrade, doseReduced, doseReductionRate, ...rest } = s;
                                            return { ...rest, status: 'pending' };
                                          }
                                          return s;
                                        });
                                        const isToday = getLocalDateString() === targetDateStr;
                                        onUpdatePatient({ 
                                          ...selectedPatient, 
                                          schedule: updatedSchedule,
                                        });
                                        toast('投与予定（未実施）に戻しました。');
                                        setSelectedEvent(null);
                                      }
                                    }}
                                  >
                                    未実施（予定）に戻す
                                  </button>
                                </div>
                              )}
                            </div>
                          
        </div>
      </div>
    </div>
  );
}
