import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { formatDoseStr } from '../../utils/doseUtils';
import { PROTOCOL_TYPES } from '../../utils/regimenProtocols';
import { generateSchedule } from '../../utils/scheduleUtils';

export default function RegimenAssignPanel({
  patient,
  regimens,
  onUpdatePatient,
  confirm,
  children
}) {
  const { toast } = useToast();
  
  const [isChangingRegimen, setIsChangingRegimen] = useState(false);
  const [assignRegimenId, setAssignRegimenId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startCycleInput, setStartCycleInput] = useState(1);
  const [startDayInput, setStartDayInput] = useState(1);

  const handleAssignRegimen = async () => {
    if (!assignRegimenId || !startDate) {
      toast('レジメンと開始日を選択してください。');
      return;
    }

    if (patient.activeRegimen) {
      const ok = await confirm(
        'すでにレジメンが割り当てられています。異なるレジメンに変更すると、現在の投与スケジュールおよび実施履歴はすべて削除されます。変更してもよろしいですか？',
        'レジメンの変更',
        { confirmLabel: '変更する', variant: 'danger' }
      );
      if (!ok) {
        return;
      }
    }
    
    const reg = regimens.find(r => r.id === assignRegimenId);
    if (!reg) return;

    const { schedule, targetCycles } = generateSchedule(reg, startDate, startCycleInput, startDayInput);

    const updatedPatient = {
      ...patient,
      activeRegimen: {
        regimenId: reg.id,
        startDate,
        currentCycle: parseInt(startCycleInput) || 1,
        totalCycles: targetCycles,
        drugs: JSON.parse(JSON.stringify(reg.drugs))
      },
      schedule,
    };

    onUpdatePatient(updatedPatient);
    setIsChangingRegimen(false);
    toast('レジメンを割り当てました。');
  };

  const handleRemoveRegimen = async () => {
    if (!patient) return;
    const ok = await confirm(
      'この患者のレジメン割り当てを解除してもよろしいですか？\n（作成済みの投与スケジュールや実施履歴はすべて削除されます）',
      'レジメン割り当ての解除',
      { confirmLabel: '解除する', variant: 'danger' }
    );
    if (ok) {
      const updatedPatient = {
        ...patient,
        activeRegimen: null,
        schedule: [],
      };
      onUpdatePatient(updatedPatient);
      setIsChangingRegimen(false);
      toast('レジメンの割り当てを解除しました。');
    }
  };

  const handleSetResponseEvaluation = (evaluation) => {
    if (!patient || !patient.activeRegimen) return;
    
    const updatedRegimen = { ...patient.activeRegimen, responseEvaluation: evaluation };
    
    let updatedSchedule = [...(patient.schedule || [])];
    
    if (evaluation === 'CR') {
      updatedSchedule = updatedSchedule.filter(s => !(s.cycleNumber >= 9 && s.status === 'provisional'));
      toast('CR確定：9〜17サイクルの見込み予定を削除しました。');
    } else if (evaluation === 'PR_SD') {
      updatedSchedule = updatedSchedule.map(s => {
        if (s.cycleNumber >= 9 && s.status === 'provisional') {
          return { ...s, status: 'pending' };
        }
        return s;
      });
      toast('PR/SD確定：9〜17サイクルの見込み予定を正式予定として確定しました。');
    } else if (evaluation === null) {
      const isLunsumioMonotherapy = (() => {
        const reg = regimens.find(r => r.id === patient.activeRegimen.regimenId);
        if (!reg) return false;
        return (
          reg.protocolType === PROTOCOL_TYPES.LUNSUMIO_SC ||
          reg.protocolType === PROTOCOL_TYPES.LUNSUMIO_IV ||
          ['R012', 'R013', 'R9045', 'R6365'].includes(reg.id) ||
          (
            (reg.name?.includes('ルンスミオ') || reg.name?.includes('モスネツズマブ')) &&
            (reg.name?.includes('単剤') || reg.drugs?.length === 1)
          )
        );
      })();
      
      if (isLunsumioMonotherapy && patient.activeRegimen.responseEvaluation === 'CR') {
        const reg = regimens.find(r => r.id === patient.activeRegimen.regimenId);
        if (reg) {
          const { schedule: newSchedule } = generateSchedule(reg, patient.activeRegimen.startDate, 1, 1);
          const futureProvisional = newSchedule.filter(s => s.cycleNumber >= 9);
          const maxExistingDateStr = updatedSchedule.length > 0 
            ? updatedSchedule.reduce((max, s) => s.date > max ? s.date : max, updatedSchedule[0].date)
            : patient.activeRegimen.startDate;
            
          const maxExistingDate = new Date(maxExistingDateStr);
          const filteredFuture = futureProvisional.filter(s => {
            const sDate = new Date(s.date);
            return sDate > maxExistingDate;
          });
          
          updatedSchedule = [...updatedSchedule, ...filteredFuture];
          updatedSchedule.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
      } else if (isLunsumioMonotherapy && patient.activeRegimen.responseEvaluation === 'PR_SD') {
        updatedSchedule = updatedSchedule.map(s => {
          if (s.cycleNumber >= 9 && s.status === 'pending') {
            return { ...s, status: 'provisional' };
          }
          return s;
        });
      }
      toast('評価をクリアしました。スケジュールを見込み状態に戻しました。');
    }
    
    onUpdatePatient({
      ...patient,
      activeRegimen: updatedRegimen,
      schedule: updatedSchedule
    });
  };

  const activeReg = patient?.activeRegimen ? regimens.find(r => r.id === patient.activeRegimen.regimenId) : null;

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <div className="card-header">
        <h3 className="card-title">
          <Calendar size={20} />
          化学療法レジメン設定
        </h3>
      </div>
      <div className="card-body">
        {patient.activeRegimen && !isChangingRegimen ? (
          <div>
            {/* 設定済みレジメンの表示 */}
            {(() => {
              const reg = regimens.find(r => r.id === patient.activeRegimen.regimenId);
              return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <div>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--color-primary)', margin: 0 }}>{reg?.name}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                        開始日: {patient.activeRegimen.startDate} / サイクル: {patient.activeRegimen.currentCycle} of {patient.activeRegimen.totalCycles}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => {
                          setAssignRegimenId(patient.activeRegimen.regimenId);
                          setStartDate(patient.activeRegimen.startDate);
                          setIsChangingRegimen(true);
                        }}
                      >
                        レジメンを変更
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-danger" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#ef4444', color: '#fff', border: 'none' }}
                        onClick={handleRemoveRegimen}
                      >
                        割り当て解除
                      </button>
                    </div>
                  </div>

                  {/* ルンスミオ効果評価入力セクション */}
                  {(() => {
                    const isLunsumioMonotherapy = reg && (
                      reg.protocolType === PROTOCOL_TYPES.LUNSUMIO_SC ||
                      reg.protocolType === PROTOCOL_TYPES.LUNSUMIO_IV ||
                      // V4移行完了後に削除予定のレガシー判定
                      ['R012', 'R013', 'R9045', 'R6365'].includes(reg.id) ||
                      (
                        (reg.name?.includes('ルンスミオ') || reg.name?.includes('モスネツズマブ')) &&
                        (reg.name?.includes('単剤') || reg.drugs?.length === 1)
                      )
                    );
                    
                    if (!isLunsumioMonotherapy) return null;
                    
                    const currentCycleNum = patient.activeRegimen.currentCycle || 1;
                    const isEightCycleCompleted = currentCycleNum >= 8; 
                    
                    if (!isEightCycleCompleted) return null;

                    return (
                      <div style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '20px',
                        backgroundColor: '#f0f9ff',
                        borderColor: '#bae6fd',
                        marginTop: '10px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                          <span style={{ fontSize: '1.1rem' }}>🏥</span>
                          <h5 style={{ fontSize: '0.9rem', fontWeight: '700', margin: 0, color: 'var(--color-text-dark)' }}>
                            ルンスミオ効果評価（8サイクル完了時）
                          </h5>
                        </div>
                        {patient.activeRegimen.responseEvaluation ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>評価結果:</span>
                              <span style={{
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                color: patient.activeRegimen.responseEvaluation === 'CR' ? '#16a34a' : '#d97706'
                              }}>
                                {patient.activeRegimen.responseEvaluation === 'CR' ? 'CR（完全奏効）- 8C終了' : 'PR/SD（継続投与）- 17C延長確定'}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              onClick={() => handleSetResponseEvaluation(null)}
                            >
                              再評価（クリア）
                            </button>
                          </div>
                        ) : (
                          <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                              8サイクル投与完了後の効果判定を入力してください。CRの場合は見込みの9〜17Cを削除し、PR/SDの場合は確定させます。
                            </p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button
                                type="button"
                                className="btn btn-success"
                                style={{
                                  flex: 1, padding: '8px 12px', fontSize: '0.8rem',
                                  backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer'
                                }}
                                onClick={async () => {
                                  const ok = await confirm(
                                    '効果評価を「CR（完全奏効）」として確定します。見込みの9〜17C予定はすべて削除されます。\nよろしいですか？',
                                    'CR確定',
                                    { confirmLabel: '確定する' }
                                  );
                                  if (ok) {
                                    handleSetResponseEvaluation('CR');
                                  }
                                }}
                              >
                                CR（完全奏効）
                              </button>
                              <button
                                type="button"
                                className="btn btn-warning"
                                style={{
                                  flex: 1, padding: '8px 12px', fontSize: '0.8rem',
                                  backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer'
                                }}
                                onClick={async () => {
                                  const ok = await confirm(
                                    '効果評価を「PR/SD（継続）」として確定します。9〜17Cの見込み予定が正式予定として確定されます。\nよろしいですか？',
                                    'PR/SD確定',
                                    { confirmLabel: '確定する' }
                                  );
                                  if (ok) {
                                    handleSetResponseEvaluation('PR_SD');
                                  }
                                }}
                              >
                                PR / SD (継続)
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <h5 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>計算された薬物体表面積換算投与量：</h5>
                  <table className="table" style={{ marginBottom: '20px' }}>
                    <thead>
                      <tr>
                        <th>薬剤名</th>
                        <th>基準投与量</th>
                        <th>投与対象日</th>
                        <th>投与経路</th>
                        <th>計算後投与量</th>
                        <th>投与順・時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(patient.activeRegimen?.drugs || reg?.drugs || []).map((drug, idx) => {
                        let calculatedDose = 0;
                        if (drug.doseType === 'bsa') {
                          calculatedDose = drug.doseValue * patient.bsa;
                        } else if (drug.doseType === 'weight') {
                          calculatedDose = drug.doseValue * patient.weight;
                        } else {
                          calculatedDose = drug.doseValue;
                        }
                        return (
                          <tr key={idx}>
                            <td style={{ fontWeight: '600' }}>{drug.name}</td>
                            <td>{drug.doseValue} {drug.doseType === 'bsa' ? 'mg/m²' : drug.doseType === 'weight' ? 'mg/kg' : 'mg'}</td>
                            <td>
                              {'Day ' + (drug.applicableDays || reg?.drugDays || []).join(', ')}
                              {drug.applicableCycles && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                  (Cycle {drug.applicableCycles.join(', ')})
                                </div>
                              )}
                            </td>
                            <td>{drug.route}</td>
                            <td className="num-tabular" style={{ color: 'var(--color-secondary)', fontWeight: '700', fontSize: '1rem' }}>
                              {formatDoseStr(calculatedDose, drug.name)}
                            </td>
                            <td>
                              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dark)' }}>
                                {drug.order}番目 / {drug.duration}分
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {children}
                </div>
              );
            })()}
          </div>
        ) : (
          /* レジメンの新規割り当て・変更フォーム */
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '15px' }}>
              {isChangingRegimen ? 'レジメンの変更' : 'レジメンの新規割り当て'}
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form-group">
                <label className="form-label">適用レジメンテンプレート *</label>
                <select 
                  className="form-control"
                  value={assignRegimenId}
                  onChange={e => setAssignRegimenId(e.target.value)}
                >
                  <option value="">-- レジメンを選択してください --</option>
                  {regimens.map(r => (
                    <option key={r.id} value={r.id}>{r.name} (がん種: {r.cancerType})</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">治療開始日 *</label>
                  <input 
                    type="date" 
                    className="form-control"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>

                {assignRegimenId && (
                  <>
                    <div className="form-group">
                      <label className="form-label">開始サイクル数 (通常は 1) *</label>
                      <select 
                        className="form-control"
                        value={startCycleInput}
                        onChange={e => setStartCycleInput(parseInt(e.target.value))}
                      >
                        {(() => {
                          const reg = regimens.find(r => r.id === assignRegimenId);
                          const maxCycles = reg ? reg.totalCycles : 17;
                          return Array.from({ length: maxCycles }, (_, i) => i + 1).map(c => (
                            <option key={c} value={c}>{c} サイクル目</option>
                          ));
                        })()}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">開始予定Day *</label>
                      <select 
                        className="form-control"
                        value={startDayInput}
                        onChange={e => setStartDayInput(parseInt(e.target.value))}
                      >
                        {(() => {
                          const reg = regimens.find(r => r.id === assignRegimenId);
                          const maxDays = reg ? reg.cycleDays : 28;
                          return Array.from({ length: maxDays }, (_, i) => i + 1).map(d => (
                            <option key={d} value={d}>Day {d}</option>
                          ));
                        })()}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={handleAssignRegimen}>
                {isChangingRegimen ? '変更を適用する' : 'レジメンの割り当てを実行する'}
              </button>
              {isChangingRegimen && (
                <button className="btn btn-outline" onClick={() => setIsChangingRegimen(false)}>
                  キャンセル
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
