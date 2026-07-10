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
import RegimenAssignPanel from './patient/RegimenAssignPanel';
import TreatmentCalendar from './patient/TreatmentCalendar';
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
  const { toast } = useToast();

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

            <RegimenAssignPanel 
              key={selectedPatient.id}
              patient={selectedPatient}
              regimens={regimens}
              onUpdatePatient={onUpdatePatient}
              confirm={confirm}
            >
              <TreatmentCalendar 
                patient={selectedPatient}
                regimens={regimens}
                onUpdatePatient={onUpdatePatient}
                confirm={confirm}
              />
            </RegimenAssignPanel>
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
