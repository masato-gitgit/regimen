import React, { useState, useEffect, useMemo } from 'react';
import { Search, UserPlus, FileText, CheckCircle, AlertTriangle, Plus, Trash2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { calculateEGFR, calcAge } from '../utils/renalUtils';
import { formatDose, formatDoseStr } from '../utils/doseUtils';
import { getLocalDateString, parseLocalDate, addDays } from '../utils/dateUtils';
import { PROTOCOL_TYPES } from '../utils/regimenProtocols';
import { getJapaneseHoliday } from '../utils/holidayUtils';
import { generateSchedule } from '../utils/scheduleUtils';
import { useToast } from '../hooks/useToast';
import PatientSidebar from './patient/PatientSidebar';
import PatientForm from './patient/PatientForm';
import PatientSummary from './patient/PatientSummary';
import LabInputPanel from './patient/LabInputPanel';
import WeightRecalcPanel from './patient/WeightRecalcPanel';
export default function PatientList({

  patients,
  regimens,
  onAddPatient,
  onUpdatePatient,
  onDeletePatient,
  onSelectPatient,
  selectedPatientId,
  onNavigate,
  confirm
}) {
  // 選択中患者のデータ
  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  
  const activeReg = selectedPatient && selectedPatient.activeRegimen
    ? regimens.find(r => r.id === selectedPatient.activeRegimen.regimenId)
    : null;

  const isTecveyri = activeReg?.protocolType === PROTOCOL_TYPES.TECVAYLI;
  const isCombination = activeReg?.protocolType === PROTOCOL_TYPES.COMBINATION;

  // 検査値アップデート用の状態
  const [labInput, setLabInput] = useState({
    creatinine: '',
    wbc: '',
    plt: '',
  });

  // 体重変動・用量再計算用の状態
  const [weightInput, setWeightInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [showDosePreview, setShowDosePreview] = useState(false);
  const [eventNotes, setEventNotes] = useState('');

  // レジメン割り当て用の状態
  const [assignRegimenId, setAssignRegimenId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [isChangingRegimen, setIsChangingRegimen] = useState(false);
  const [startCycleInput, setStartCycleInput] = useState(1);
  const [startDayInput, setStartDayInput] = useState(1);

  // レジメン選択が切り替わったら開始サイクル・Dayの入力をリセットする
  useEffect(() => {
    setStartCycleInput(1);
    setStartDayInput(1);
  }, [assignRegimenId]);

  // 患者切り替え時に体重入力・プレビューをリセットする
  useEffect(() => {
    setWeightInput('');
    setHeightInput('');
    setShowDosePreview(false);
  }, [selectedPatientId]);

  // カルテコメント用の状態
  const [commentsInput, setCommentsInput] = useState('');

  // 選択患者が変わったらコメント入力を同期する
  useEffect(() => {
    if (selectedPatient) {
      setCommentsInput(selectedPatient.comments || '');
    } else {
      setCommentsInput('');
    }
  }, [selectedPatientId, selectedPatient]);

  // 治療スケジュールカレンダー用の状態
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [preOmittedDrugIndices, setPreOmittedDrugIndices] = useState([]);
  const [delayDays, setDelayDays] = useState(7);
  const [manualDate, setManualDate] = useState('');
  const [slideRest, setSlideRest] = useState(true);
  const [crsGrade, setCrsGrade] = useState('none');
  const [hematologicGrade, setHematologicGrade] = useState('none');
  const [otherGrade, setOtherGrade] = useState('none');
  const { toast } = useToast();
  const [completionNotes, setCompletionNotes] = useState('');

  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [newPatient, setNewPatient] = useState({
    id: '',
    name: '',
    gender: 'male',
    birthDate: '',
    height: '',
    weight: '',
    creatinine: '',
    wbc: '',
    plt: '',
    comments: ''
  });

  // 直近の投与完了時の副作用情報を取得する
  const getLastCompletedSideEffects = () => {
    if (!selectedPatient || !selectedPatient.schedule) return null;
    const completedEvents = selectedPatient.schedule
      .filter(s => s.status === 'completed' && s.isDrugDay)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
    setSelectedEvent(null);
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
    setSelectedEvent(null);
  };

  // タービー再開プロトコル適用
  const handleApplyTalquetamabProtocol = (targetDoseValue, regId, targetDateStr) => {
    if (!selectedPatient) return;
    // R014 / R015 がそれぞれ毎週・隔週を表す。あるいはレジメンの情報を直接見るべきだが、既存ロジックを踏襲
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
    setSelectedEvent(null);
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
    setSelectedEvent(null);
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
    setSelectedEvent(null);
  };

  // 薬物用量フォーマット（doseUtils に移行済み）
  // ローカルタイムゾーンを考慮した日付文字列の取得（dateUtils に移行済み）

  // 体表面積 (BSA) 計算
  const calculateBSA = (height, weight) => {
    if (!height || !weight) return 0;
    const h = parseFloat(height);
    const w = parseFloat(weight);
    // DuBois formula: BSA = 0.007184 * H^0.725 * W^0.425
    const bsa = 0.007184 * (h ** 0.725) * (w ** 0.425);
    return Math.round(bsa * 100) / 100;
  };

  // 継続投与期の初回投与（1C Day 11）からの経過週数を計算
  const getWeeksSinceCombinationStart = () => {
    if (!selectedPatient || !selectedEvent) return 0;
    const startEvent = (selectedPatient.schedule || []).find(
      s => s.cycleNumber === 1 && s.dayNumber === 11
    );
    if (!startEvent) return 0;
    const startDate = new Date(startEvent.date);
    const eventDate = new Date(selectedEvent.date);
    const diffTime = eventDate.getTime() - startDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7);
  };

  // 年齢計算（renalUtils に移行済み）

  // 年齢計算（renalUtils に移行済み）
  // 祝日判定（holidayUtils に移行済み）
  // カレンダーセル生成
  const getCalendarCells = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();
    
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const cells = [];
    
    const prevYear = month === 0 ? year - 1 : year;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevDaysInMonth = getDaysInMonth(prevYear, prevMonth);
    
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevDaysInMonth - i;
      cells.push({
        date: new Date(prevYear, prevMonth, day),
        isCurrentMonth: false
      });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    const nextYear = month === 11 ? year + 1 : year;
    const nextMonth = month === 11 ? 0 : month + 1;
    const remainingCells = 42 - cells.length;
    
    for (let i = 1; i <= remainingCells; i++) {
      cells.push({
        date: new Date(nextYear, nextMonth, i),
        isCurrentMonth: false
      });
    }
    
    return cells;
  };

  const calendarCells = useMemo(() => getCalendarCells(), [currentMonth]);

  // 前月・翌月移動
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // 患者新規登録
  const handleSavePatient = (e) => {
    e.preventDefault();
    
    if (!newPatient.id || !newPatient.name || !newPatient.birthDate || !newPatient.height || !newPatient.weight) {
      toast('必須項目を入力してください。');
      return;
    }
    
    if (patients.some(p => p.id === newPatient.id)) {
      toast(`この患者ID（${newPatient.id}）はすでに登録されています。別のIDを入力してください。`);
      return;
    }
    
    const bsa = calculateBSA(newPatient.height, newPatient.weight);
    
    onAddPatient({
      ...newPatient,
      age: calcAge(newPatient.birthDate),
      height: parseFloat(newPatient.height),
      weight: parseFloat(newPatient.weight),
      creatinine: newPatient.creatinine ? parseFloat(newPatient.creatinine) : null,
      wbc: newPatient.wbc ? parseFloat(newPatient.wbc) : null,
      plt: newPatient.plt ? parseFloat(newPatient.plt) : null,
      bsa: bsa,
      activeRegimen: null,
      schedule: [],
    });
    
    setIsAdding(false);
    setNewPatient({
      id: '',
      name: '',
      gender: 'male',
      birthDate: '',
      height: '',
      weight: '',
      creatinine: '',
      wbc: '',
      plt: '',
      comments: ''
    });
  };

  // 患者情報修正
  const handleEditSubmit = (e) => {
    e.preventDefault();
    
    if (!editingPatient.name || !editingPatient.birthDate || !editingPatient.height || !editingPatient.weight) {
      toast('必須項目を入力してください。');
      return;
    }
    
    const bsa = calculateBSA(editingPatient.height, editingPatient.weight);
    
    onUpdatePatient({
      ...selectedPatient,
      name: editingPatient.name,
      gender: editingPatient.gender,
      birthDate: editingPatient.birthDate,
      age: calcAge(editingPatient.birthDate),
      height: parseFloat(editingPatient.height),
      weight: parseFloat(editingPatient.weight),
      creatinine: editingPatient.creatinine ? parseFloat(editingPatient.creatinine) : null,
      wbc: editingPatient.wbc ? parseFloat(editingPatient.wbc) : null,
      plt: editingPatient.plt ? parseFloat(editingPatient.plt) : null,
      comments: editingPatient.comments || '',
      bsa: bsa
    });
    
    setIsEditing(false);
    setEditingPatient(null);
    toast('患者情報を更新しました。');
  };

  // レジメンの割り当て処理
  const handleAssignRegimen = async () => {
    if (!assignRegimenId || !startDate) {
      toast('レジメンと開始日を選択してください。');
      return;
    }

    if (selectedPatient.activeRegimen) {
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
      ...selectedPatient,
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

  // レジメンの割り当て解除処理
  const handleRemoveRegimen = async () => {
    if (!selectedPatient) return;
    const ok = await confirm(
      'この患者のレジメン割り当てを解除してもよろしいですか？\n（作成済みの投与スケジュールや実施履歴はすべて削除されます）',
      'レジメン割り当ての解除',
      { confirmLabel: '解除する', variant: 'danger' }
    );
    if (ok) {
      const updatedPatient = {
        ...selectedPatient,
        activeRegimen: null,
        schedule: [],
      };
      onUpdatePatient(updatedPatient);
      setIsChangingRegimen(false);
      toast('レジメンの割り当てを解除しました。');
    }
  };

  // ルンスミオ8サイクル完了時の効果評価の適用処理
  const handleSetResponseEvaluation = (evaluation) => {
    if (!selectedPatient || !selectedPatient.activeRegimen) return;

    let schedule = [...(selectedPatient.schedule || [])];
    let totalCycles = selectedPatient.activeRegimen.totalCycles || 17;
    
    if (evaluation === 'CR') {
      // 8サイクルで治療終了
      schedule = schedule.filter(s => s.cycleNumber <= 8);
      totalCycles = 8;
    } else if (evaluation === 'PR_SD') {
      // 9サイクル以降の見込み予定を確定予定（pending）に変更
      schedule = schedule.map(s => (s.cycleNumber >= 9 && s.status === 'provisional') ? {
        ...s,
        status: 'pending'
      } : s);
      totalCycles = 17;
    } else if (evaluation === null) {
      // 評価未定に戻す場合、8サイクル完了分を残し、9サイクル以降を provisional（見込み）として再構築
      const reg = regimens.find(r => r.id === selectedPatient.activeRegimen.regimenId);
      if (reg) {
        schedule = rebuildProvisionalCycles(schedule, reg);
      }
      totalCycles = 17;
    }
    
    onUpdatePatient({
      ...selectedPatient,
      activeRegimen: {
        ...selectedPatient.activeRegimen,
        totalCycles,
        responseEvaluation: evaluation
      },
      schedule
    });
  };


  // 検査値の保存
  const handleSaveLabs = () => {
    const updatedPatient = {
      ...selectedPatient,
      creatinine: labInput.creatinine ? parseFloat(labInput.creatinine) : selectedPatient.creatinine,
      wbc: labInput.wbc ? parseFloat(labInput.wbc) : selectedPatient.wbc,
      plt: labInput.plt ? parseFloat(labInput.plt) : selectedPatient.plt,
    };
    
    // アラートの再計算やステータス更新を走らせるために親に投げる
    onUpdatePatient(updatedPatient);
    toast('血液検査データを更新しました。');
    setLabInput({ creatinine: '', wbc: '', plt: '' });
  };

  // 体重・BSA更新と用量再計算
  const handleUpdateWeightAndRecalculate = () => {
    if (!selectedPatient) return;
    if (!weightInput) {
      toast('新しい体重を入力してください。');
      return;
    }
    const newWeight = parseFloat(weightInput);
    const newHeight = heightInput ? parseFloat(heightInput) : selectedPatient.height;
    if (isNaN(newWeight) || newWeight <= 0) {
      toast('有効な体重値を入力してください。');
      return;
    }
    const newBsa = calculateBSA(newHeight, newWeight);
    
    onUpdatePatient({
      ...selectedPatient,
      weight: newWeight,
      height: newHeight,
      bsa: newBsa
    });
    
    toast(`体重を ${selectedPatient.weight} kg → ${newWeight} kg、BSAを ${selectedPatient.bsa} → ${newBsa} m² に更新しました。投与量は次回投与時に自動再計算されます。`);
    setWeightInput('');
    setHeightInput('');
    setShowDosePreview(false);
  };

  // カルテコメントの保存
  const handleSaveComments = () => {
    if (!selectedPatient) return;
    onUpdatePatient({
      ...selectedPatient,
      comments: commentsInput
    });
    toast('カルテコメントを保存しました。');
  };


  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', height: '100%' }}>
      {/* 左側サイドバー（患者リスト） */}
      <PatientSidebar
        patients={patients}
        regimens={regimens}
        selectedPatientId={selectedPatientId}
        onSelectPatient={(id) => {
          onSelectPatient(id);
          setIsAdding(false);
          setIsEditing(false);
          setEditingPatient(null);
          setIsChangingRegimen(false);
        }}
        onAddClick={() => {
          setIsAdding(true);
          setIsEditing(false);
          setEditingPatient(null);
          setIsChangingRegimen(false);
          onSelectPatient(null);
        }}
      />

      {/* 右側メインパネル */}
      <div style={{ height: 'calc(100vh - 150px)', overflowY: 'auto' }}>
        {isAdding ? (
          <PatientForm
            mode="add"
            existingPatients={patients}
            onSave={(newPt) => {
              onAddPatient({ ...newPt, activeRegimen: null, schedule: [] });
              setIsAdding(false);
            }}
            onCancel={() => setIsAdding(false)}
          />
        ) : isEditing ? (
          <PatientForm
            mode="edit"
            initialData={editingPatient || selectedPatient}
            existingPatients={patients}
            onSave={(updatedPt) => {
              onUpdatePatient({ ...selectedPatient, ...updatedPt });
              setIsEditing(false);
              setEditingPatient(null);
            }}
            onCancel={() => {
              setIsEditing(false);
              setEditingPatient(null);
            }}
          />
        ) : selectedPatient ? (
          /* 患者カルテ詳細 */
          <div>
            {/* 基本情報カード */}
            <PatientSummary
              patient={selectedPatient}
              onEditClick={() => {
                setIsEditing(true);
                setIsAdding(false);
              }}
              onDeleteClick={async () => {
                const ok = await confirm(
                  '本当にこの患者データを削除しますか？',
                  '患者データの削除',
                  { confirmLabel: '削除する', variant: 'danger' }
                );
                if (ok) {
                  onDeletePatient(selectedPatient.id);
                }
              }}
            />
            
            {/* 検査データ入力パネル */}
            <div className="card" style={{ marginTop: '20px' }}>
              <div className="card-body">
                <LabInputPanel 
                  key={selectedPatient.id} 
                  patient={selectedPatient} 
                  onUpdatePatient={onUpdatePatient} 
                />
              </div>
            </div>

            {/* 体重変動・用量再計算カード */}
            <WeightRecalcPanel 
              key={selectedPatient.id} 
              patient={selectedPatient} 
              onUpdatePatient={onUpdatePatient} 
            />

            {/* カルテコメント・特記事項カード */}
            <div className="card" style={{ marginTop: '20px' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={20} />
                  カルテコメント・特記事項
                </h3>
              </div>
              <div className="card-body">
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="患者の経過、特記事項、アレルギー情報、併用薬、注意点などを自由に記入してください。"
                  value={commentsInput}
                  onChange={e => setCommentsInput(e.target.value)}
                  style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', marginBottom: '12px', padding: '10px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={handleSaveComments} style={{ padding: '8px 16px' }}>
                    コメントを保存
                  </button>
                </div>
              </div>
            </div>

            {/* 化学療法レジメン設定 */}
            <div className="card" style={{ marginTop: '20px' }}>
              <div className="card-header">
                <h3 className="card-title">
                  <Calendar size={20} />
                  化学療法レジメン設定
                </h3>
              </div>
              <div className="card-body">
                {selectedPatient.activeRegimen && !isChangingRegimen ? (
                  <div>
                    {/* 設定済みレジメンの表示 */}
                    {(() => {
                      const reg = regimens.find(r => r.id === selectedPatient.activeRegimen.regimenId);
                      return (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <div>
                              <h4 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--color-primary)', margin: 0 }}>{reg?.name}</h4>
                              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                                開始日: {selectedPatient.activeRegimen.startDate} / サイクル: {selectedPatient.activeRegimen.currentCycle} of {selectedPatient.activeRegimen.totalCycles}
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                type="button" 
                                className="btn btn-outline" 
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                onClick={() => {
                                  setAssignRegimenId(selectedPatient.activeRegimen.regimenId);
                                  setStartDate(selectedPatient.activeRegimen.startDate);
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
                            
                            const currentCycleNum = selectedPatient.activeRegimen.currentCycle || 1;
                            const isEightCycleCompleted = currentCycleNum >= 8; 
                            
                            if (!isEightCycleCompleted) return null;

                            return (
                              <div style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '16px',
                                marginBottom: '20px',
                                backgroundColor: '#f0f9ff',
                                border: '1px solid #bae6fd',
                                marginTop: '10px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                  <span style={{ fontSize: '1.1rem' }}>🏥</span>
                                  <h5 style={{ fontSize: '0.9rem', fontWeight: '700', margin: 0, color: 'var(--color-text-dark)' }}>
                                    ルンスミオ効果評価（8サイクル完了時）
                                  </h5>
                                </div>
                                {selectedPatient.activeRegimen.responseEvaluation ? (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>評価結果:</span>
                                      <span style={{
                                        fontSize: '0.85rem',
                                        fontWeight: '700',
                                        color: selectedPatient.activeRegimen.responseEvaluation === 'CR' ? '#16a34a' : '#d97706'
                                      }}>
                                        {selectedPatient.activeRegimen.responseEvaluation === 'CR' ? 'CR（完全奏効）- 8C終了' : 'PR/SD（継続投与）- 17C延長確定'}
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
                              {(selectedPatient.activeRegimen?.drugs || reg?.drugs || []).map((drug, idx) => {
                                let calculatedDose = 0;
                                let formulaText = '';
                                if (drug.doseType === 'bsa') {
                                  calculatedDose = drug.doseValue * selectedPatient.bsa;
                                  formulaText = drug.doseValue + ' mg/m² × ' + selectedPatient.bsa + ' m²';
                                } else if (drug.doseType === 'weight') {
                                  calculatedDose = drug.doseValue * selectedPatient.weight;
                                  formulaText = drug.doseValue + ' mg/kg × ' + selectedPatient.weight + ' kg';
                                } else {
                                  calculatedDose = drug.doseValue;
                                  formulaText = '固定量';
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

                          {/* 治療スケジュールおよび投与薬剤一覧（月間カレンダー方式） */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderTop: '1px solid var(--color-border)', paddingTop: '15px' }}>
                            <h5 style={{ fontSize: '0.9rem', fontWeight: '600', margin: 0 }}>投与スケジュールカレンダー：</h5>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              <button type="button" className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={handlePrevMonth}>
                                <ChevronLeft size={16} />
                              </button>
                              <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--color-primary)' }}>
                                {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
                              </span>
                              <button type="button" className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={handleNextMonth}>
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          </div>

                          <div className="calendar-grid" style={{ marginBottom: '20px' }}>
                            {/* 曜日ヘッダー */}
                            {['日', '月', '火', '水', '木', '金', '土'].map(day => (
                              <div key={day} className="calendar-header-cell" style={{ padding: '6px 0', fontSize: '0.8rem' }}>{day}</div>
                            ))}

                            {/* 日付セル */}
                            {calendarCells.map((cell, idx) => {
                              const dateStr = getLocalDateString(cell.date);
                              const dayEvents = (selectedPatient.schedule || []).filter(s => s.date === dateStr);
                              const scheduleItem = dayEvents.find(s => s.isDrugDay) || dayEvents[0];
                              const isToday = getLocalDateString(new Date()) === dateStr;
                              const patientDrugs = selectedPatient.activeRegimen?.drugs || [];
                              const targetDrugs = scheduleItem && scheduleItem.isDrugDay && patientDrugs.filter(d => d.applicableCycles && scheduleItem.cycleNumber && !d.applicableCycles.includes(scheduleItem.cycleNumber) ? false : d.applicableDays ? d.applicableDays.includes(scheduleItem.dayNumber) : true) || [];
                              const holidayName = getJapaneseHoliday(cell.date);
                              const isHoliday = holidayName !== null;
                              const dayOfWeek = cell.date.getDay();
                              const isSunday = dayOfWeek === 0;
                              const isSaturday = dayOfWeek === 6;
                              
                              return (
                                <div 
                                  key={idx}
                                  className={`calendar-cell ${cell.isCurrentMonth ? '' : 'other-month'}`}
                                  style={{
                                    minHeight: '110px',
                                    padding: '6px',
                                    backgroundColor: isToday ? 'var(--color-primary-light)' : isHoliday || isSunday ? '#fff5f5' : isSaturday ? '#eff6ff' : cell.isCurrentMonth ? '#ffffff' : '#f8fafc',
                                    borderTop: isToday ? '3px solid var(--color-primary)' : 'none',
                                    borderBottom: '1px solid var(--color-border)',
                                    borderRight: '1px solid var(--color-border)'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span 
                                        className="calendar-date-number num-tabular"
                                        style={{
                                          color: isHoliday || isSunday ? '#ef4444' : isSaturday ? '#3b82f6' : cell.isCurrentMonth ? 'var(--color-text-dark)' : 'var(--color-text-muted)',
                                          fontWeight: isToday ? '700' : '500',
                                          fontSize: '0.8rem'
                                        }}
                                      >
                                        {cell.date.getDate()}
                                      </span>
                                      {isHoliday && (
                                        <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: '600' }} title={holidayName}>
                                          {holidayName}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="calendar-events" style={{ marginTop: '4px' }}>
                                    {scheduleItem && scheduleItem.isDrugDay && (
                                      <div 
                                        className="calendar-event"
                                        style={{
                                          backgroundColor: 
                                            scheduleItem.status === 'completed' ? 'var(--color-success-light)' :
                                            scheduleItem.status === 'skipped' ? 'var(--color-danger-light)' :
                                            scheduleItem.status === 'running' ? 'var(--color-warning-light)' :
                                            scheduleItem.status === 'provisional' ? '#f1f5f9' :
                                            'var(--color-primary-light)',
                                          color: 
                                            scheduleItem.status === 'completed' ? 'var(--color-success)' :
                                            scheduleItem.status === 'skipped' ? 'var(--color-danger)' :
                                            scheduleItem.status === 'running' ? 'var(--color-warning)' :
                                            scheduleItem.status === 'provisional' ? '#64748b' :
                                            'var(--color-primary)',
                                          border: scheduleItem.status === 'provisional' ? '1px dashed #94a3b8' : '1px solid currentColor',
                                          cursor: 'pointer',
                                          textDecoration: scheduleItem.status === 'skipped' ? 'line-through' : 'none',
                                          padding: '2px 4px',
                                          borderRadius: '4px',
                                          fontSize: '0.7rem'
                                        }}
                                        onClick={() => {
                                          const patientDrugsAll = selectedPatient.activeRegimen?.drugs || [];
                                          const drugOrigIndices = targetDrugs.map(d => patientDrugsAll.indexOf(d));
                                          setSelectedEvent({ ...scheduleItem, drugs: targetDrugs, drugOrigIndices });
                                          setManualDate(scheduleItem.date);
                                          setCrsGrade(scheduleItem.crsGrade || 'none');
                                          setHematologicGrade(scheduleItem.hematologicGrade || 'none');
                                          setOtherGrade(scheduleItem.otherGrade || 'none');
                                          setCompletionNotes(scheduleItem.completionNotes || '');
                                          setPreOmittedDrugIndices(scheduleItem.omittedDrugIndices || []);
                                        }}
                                      >
                                        <div style={{ fontWeight: '700' }}>
                                          {scheduleItem.cycleNumber ? scheduleItem.cycleNumber + 'C ' : ''}
                                          Day {scheduleItem.dayNumber}
                                          {scheduleItem.status === 'provisional' && ' (見込み)'}
                                          {scheduleItem.doseReduced && <span style={{ color: '#ef4444', marginLeft: '4px', fontSize: '0.6rem', border: '1px solid #ef4444', borderRadius: '2px', padding: '0 2px', backgroundColor: '#fff5f5' }}>減量</span>}
                                        </div>
                                        {targetDrugs.map((drug, dIdx) => {
                                          let calculatedDose = 0;
                                          if (drug.doseType === 'bsa') {
                                            calculatedDose = drug.doseValue * selectedPatient.bsa;
                                          } else if (drug.doseType === 'weight') {
                                            calculatedDose = drug.doseValue * selectedPatient.weight;
                                          } else {
                                            calculatedDose = drug.doseValue;
                                          }
                                          if (scheduleItem.doseReduced) {
                                            calculatedDose = calculatedDose * (scheduleItem.doseReductionRate || 0.8);
                                          }
                                          return (
                                            <div key={dIdx} style={{ fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              {drug.name.slice(0, 7)}:{formatDose(calculatedDose, drug.name)}mg
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* 日程調整パネル */}
                          {selectedEvent ? (
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
                                                    const d = new Date(s.date);
                                                    d.setDate(d.getDate() + 7);
                                                    return { ...s, date: getLocalDateString(d) };
                                                  }
                                                  return s;
                                                });
                                                updatedSchedule.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
                                            const d = new Date(s.date);
                                            d.setDate(d.getDate() + days);
                                            return { ...s, date: getLocalDateString(d) };
                                          }
                                          return s;
                                        });
                                        updatedSchedule.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                                        
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
                                        const oldDate = new Date(selectedEvent.date);
                                        const newDate = new Date(manualDate);
                                        const diffTime = newDate.getTime() - oldDate.getTime();
                                        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                                        const targetDateStr = selectedEvent.date;
                                        let updatedSchedule = selectedPatient.schedule.map(s => {
                                          if (slideRest) {
                                            // 後続も連動シフトする場合
                                            if (s.date >= targetDateStr) {
                                              const d = new Date(s.date);
                                              d.setDate(d.getDate() + diffDays);
                                              return { ...s, date: getLocalDateString(d) };
                                            }
                                          } else {
                                            // 選択した単一の日だけ変更する場合
                                            if (s.date === targetDateStr) {
                                              return { ...s, date: manualDate };
                                            }
                                          }
                                          return s;
                                        });
                                        updatedSchedule.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
                                        const isToday = getLocalDateString(new Date()) === targetDateStr;
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
                                            const ok = await confirm({ 
                                              title: '投与間隔の延長', 
                                              message: 'これ以降の投与間隔を2週間に延長しますか？（部分奏効以上の効果持続が確認されている必要があります）',
                                              confirmLabel: '延長する'
                                            });
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
                                            const ok = await confirm({
                                              title: '投与間隔の延長',
                                              message: confirmText,
                                              confirmLabel: '延長する'
                                            });
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
                                        const isToday = getLocalDateString(new Date()) === targetDateStr;
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
                          ) : null}

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
          </div>) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
            <FileText size={64} style={{ marginBottom: '16px', strokeWidth: '1' }} />
            <p>左側のリストから患者を選択するか、新規患者を登録してください。</p>
          </div>
        )}
      </div>
    </div>
  );
}
