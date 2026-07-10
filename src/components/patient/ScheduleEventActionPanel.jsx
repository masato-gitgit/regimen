import React from 'react';
import { getLocalDateString, parseLocalDate, addDays } from '../../utils/dateUtils';

export default function ScheduleEventActionPanel({
  selectedEvent,
  selectedPatient,
  onUpdatePatient,
  toast,
  setSelectedEvent,
  sideEffects,
  delayDays, setDelayDays,
  manualDate, setManualDate,
  slideRest, setSlideRest,
  crsGrade, setCrsGrade,
  hematologicGrade, setHematologicGrade,
  otherGrade, setOtherGrade,
  completionNotes, setCompletionNotes,
  preOmittedDrugIndices, setPreOmittedDrugIndices
}) {
  if (selectedEvent.status === 'provisional') {
    return (
      <div className="action-panel-box action-panel-info">
        ℹ️ この予定は8サイクル目の効果評価（PR/SD）決定前のため、見込み（仮）の予定日として表示されています。投与実施や日程延期などの記録操作はできません。
      </div>
    );
  }

  const renderSideEffectsWarning = () => {
    if (!sideEffects) return null;
    
    const crsVal = parseInt(sideEffects.crsGrade) || 0;
    const hemVal = parseInt(sideEffects.hematologicGrade) || 0;
    const otherVal = parseInt(sideEffects.otherGrade) || 0;
    
    if (crsVal < 2 && hemVal < 2 && otherVal < 2) return null;
    
    let alertTitle = '⚠️ 副作用警告：前回の投与でグレード2以上の副作用が記録されています';
    let isDanger = false;
    let recommendations = [];
    let showDelayAction = false;
    let showDoseCutAction = false;
    
    if (crsVal >= 3 || hemVal >= 4) {
      alertTitle = '🚨 治療中断または投与中止の検討推奨';
      isDanger = true;
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
      <div className={`action-panel-box ${isDanger ? '' : 'action-panel-warning'}`} style={isDanger ? { backgroundColor: '#fef2f2', borderColor: '#ef4444', color: '#991b1b' } : {}}>
        <h5 className="action-panel-title" style={isDanger ? { color: '#991b1b' } : { color: '#b45309' }}>
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
  };

  const renderPendingActions = () => {
    if (selectedEvent.status !== 'pending') return null;

    return (
      <div className="flex-col-gap-12">
        {renderSideEffectsWarning()}

        {/* 1. 簡易的な延期シフト */}
        <div className="action-panel-box">
          <div className="flex-col-gap-12">
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">簡易延期</label>
                <select 
                  className="form-control"
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
            </div>
            <button 
              type="button" 
              className="btn btn-warning btn-full-width" 
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
        </div>

        {/* 2. 手動日付設定 */}
        <div className="action-panel-box">
          <div className="flex-col-gap-12">
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">手動日付変更</label>
                <input 
                  type="date" 
                  className="form-control"
                  value={manualDate}
                  onChange={e => setManualDate(e.target.value)}
                />
              </div>
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
              className="btn btn-secondary btn-full-width" 
              onClick={() => {
                if (!manualDate) return;
                const oldDate = parseLocalDate(selectedEvent.date);
                const newDate = parseLocalDate(manualDate);
                const diffTime = newDate.getTime() - oldDate.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                const targetDateStr = selectedEvent.date;
                let updatedSchedule = selectedPatient.schedule.map(s => {
                  if (slideRest) {
                    if (s.date >= targetDateStr) {
                      const d = parseLocalDate(s.date);
                      const newD = addDays(d, diffDays);
                      return { ...s, date: getLocalDateString(newD) };
                    }
                  } else {
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
        <div className="action-panel-box" style={{ backgroundColor: '#f0fdf4', borderColor: '#16a34a' }}>
          <h5 className="action-panel-title" style={{ color: '#15803d' }}>
            この投与を実施済みにする
          </h5>
          
          <div className="form-row" style={{ marginBottom: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ color: '#15803d' }}>CRS（サイトカイン）</label>
              <select 
                className="form-control" 
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
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ color: '#15803d' }}>血液毒性</label>
              <select 
                className="form-control" 
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

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ color: '#15803d' }}>その他有害事象</label>
              <select 
                className="form-control" 
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
          
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label" style={{ color: '#15803d' }}>実施メモ（任意）</label>
            <input 
              type="text" 
              className="form-control"
              placeholder="特記事項があれば入力してください"
              value={completionNotes}
              onChange={e => setCompletionNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button 
              type="button" 
              className="btn btn-primary"
              style={{ backgroundColor: '#15803d', borderColor: '#15803d' }}
              onClick={() => {
                const targetDateStr = selectedEvent.date;
                let updatedSchedule = selectedPatient.schedule.map(s => s.date === targetDateStr ? {
                  ...s, 
                  status: 'completed',
                  omittedDrugIndices: preOmittedDrugIndices,
                  completionNotes: completionNotes,
                  crsGrade: crsGrade,
                  hematologicGrade: hematologicGrade,
                  otherGrade: otherGrade
                } : s);
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
        </div>
      </div>
    );
  };

  return (
    <>
      {renderPendingActions()}
    </>
  );
}
