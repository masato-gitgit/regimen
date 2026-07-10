import React from 'react';
import { formatDose } from '../../utils/doseUtils';

export default function ScheduleEventProtocolActions({
  selectedEvent,
  selectedPatient,
  isTecveyri,
  isCombination,
  isTalquetamab,
  isLunsumio,
  getWeeksSinceCombinationStart,
  handleUpdateTecveyriInterval,
  handleUpdateCombinationInterval,
  handleApplyProtocol,
  handleApplyLunsumioProtocol,
  handleApplyTalquetamabProtocol,
  preOmittedDrugIndices,
  setPreOmittedDrugIndices,
  confirm
}) {
  
  return (
    <>
      {/* 薬剤単位の中止予定設定 */}
      <div className="action-panel-box action-panel-warning">
        <h5 className="action-panel-title action-panel-warning-title">
          薬剤単位の中止予定設定
        </h5>
        <div className="flex-col-gap-8" style={{ marginBottom: '12px' }}>
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
                  onChange={(e) => {
                    if (e.target.checked) {
                      setPreOmittedDrugIndices([...preOmittedDrugIndices, origIdx]);
                    } else {
                      setPreOmittedDrugIndices(preOmittedDrugIndices.filter(idx => idx !== origIdx));
                    }
                  }}
                />
                <span style={{ fontSize: '0.85rem', color: isOmitted ? '#b45309' : 'inherit' }}>
                  {drug.name} を今回の投与から外す
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* プロトコル特有アクション */}
      {isTecveyri && selectedEvent.cycleNumber >= 7 && (
        <div className="action-panel-box action-panel-info">
          <h5 className="action-panel-title action-panel-info-title">
            投与間隔の延長（2週間隔）
          </h5>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 10px 0' }}>
            継続投与期において部分奏効以上の効果が24週間以上持続している場合、投与間隔を2週間に延長できます。
          </p>
          {selectedPatient.activeRegimen.intervalWeeks === 2 ? (
            <button 
              type="button" 
              className="btn btn-primary btn-full-width" 
              onClick={() => handleUpdateTecveyriInterval(1, selectedEvent.date)}
            >
              通常の毎週投与（1週間隔）に戻す
            </button>
          ) : (
            <button 
              type="button" 
              className="btn btn-primary btn-full-width" 
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

      {isCombination && getWeeksSinceCombinationStart() >= 15 && (
        <div className="action-panel-box action-panel-info">
          <h5 className="action-panel-title action-panel-info-title">
            投与間隔の延長（4週間隔）
          </h5>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 10px 0' }}>
            継続投与期の初回投与（1C Day 11）から {getWeeksSinceCombinationStart()} 週経過しています。<br />
            ・15週目以降：最良部分奏効（VGPR）以上の奏効で4週間隔に延長可能<br />
            ・23週目以降：4週間隔に延長可能
          </p>
          {selectedPatient.activeRegimen.intervalWeeks === 4 ? (
            <button 
              type="button" 
              className="btn btn-primary btn-full-width" 
              onClick={() => handleUpdateCombinationInterval(2, selectedEvent.date)}
            >
              通常の2週間隔投与に戻す
            </button>
          ) : (
            <button 
              type="button" 
              className="btn btn-primary btn-full-width" 
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
      
      {isTecveyri && selectedEvent.status !== 'completed' && selectedEvent.status !== 'provisional' && (
        <div className="action-panel-box action-panel-warning">
          <h5 className="action-panel-title action-panel-warning-title">
            休薬に伴う再開プロトコルの適用
          </h5>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 10px 0' }}>
            テクベイリの投与が延期され、一定期間空いた場合は再漸増が必要です。<br />
            ・14日〜28日以内の休薬：0.3mg/kg から再開<br />
            ・28日を超える休薬：0.06mg/kg から再開
          </p>
          <div className="flex-col-gap-8">
            <button type="button" className="btn btn-warning btn-full-width" onClick={() => handleApplyProtocol(0.3, true, selectedEvent.date)}>
              0.3mg/kg から再開する（14〜28日休薬）
            </button>
            <button type="button" className="btn btn-warning btn-full-width" onClick={() => handleApplyProtocol(0.06, true, selectedEvent.date)}>
              0.06mg/kg から再開する（28日超休薬）
            </button>
          </div>
        </div>
      )}

      {isLunsumio && selectedEvent.status !== 'completed' && selectedEvent.status !== 'provisional' && (
        <div className="action-panel-box action-panel-warning">
          <h5 className="action-panel-title action-panel-warning-title">
            休薬に伴う再開プロトコルの適用
          </h5>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 10px 0' }}>
            ルンスミオ皮下注の投与が延期され、最終投与から6週間を超える休薬が生じた場合は、初回用量（5mg）からの再漸増が必要です。
          </p>
          <button type="button" className="btn btn-warning btn-full-width" onClick={() => handleApplyLunsumioProtocol(selectedEvent.date)}>
            5mg から再開する（6週間超休薬）
          </button>
        </div>
      )}
      
      {isTalquetamab && selectedEvent.status !== 'completed' && selectedEvent.status !== 'provisional' && (
        <div className="action-panel-box action-panel-warning">
          <h5 className="action-panel-title action-panel-warning-title">
            休薬に伴う再開プロトコルの適用
          </h5>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 10px 0' }}>
            タービーの投与が延期され、一定期間空いた場合は再漸増が必要です。<br />
            ・28日以内の休薬：前回の投与量で再開<br />
            ・28日を超える休薬：0.01mg/kg から再開
          </p>
          <button type="button" className="btn btn-warning btn-full-width" onClick={() => handleApplyTalquetamabProtocol(0.01, selectedPatient.activeRegimen.id, selectedEvent.date)}>
            0.01mg/kg から再開する（28日超休薬）
          </button>
        </div>
      )}
    </>
  );
}
