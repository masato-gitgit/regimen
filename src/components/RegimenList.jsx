import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Shield, Calendar, Clock, List, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { getLocalDateString } from '../utils/dateUtils';
import { getApplicableDrugs } from '../utils/drugMatching';
import MonthCalendar from './common/MonthCalendar';
import { useToast } from '../hooks/useToast';

import { PROTOCOL_TYPES, guessProtocolType } from '../utils/regimenProtocols';

const formatCyclesArray = (arr) => {
  if (!arr || arr.length === 0) return '';
  const ranges = [];
  let start = arr[0];
  let prev = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === prev + 1) {
      prev = arr[i];
    } else {
      if (start === prev) {
        ranges.push(String(start));
      } else {
        ranges.push(`${start}-${prev}`);
      }
      start = arr[i];
      prev = arr[i];
    }
  }
  if (start === prev) {
    ranges.push(String(start));
  } else {
    ranges.push(`${start}-${prev}`);
  }
  return ranges.join(',');
};

const parseCyclesString = (str) => {
  if (!str || str.trim() === '') return undefined;
  const result = [];
  const parts = str.split(',');
  for (let part of parts) {
    part = part.trim();
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          result.push(i);
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num)) {
        result.push(num);
      }
    }
  }
  return result.length > 0 ? [...new Set(result)].sort((a, b) => a - b) : undefined;
};

export default function RegimenList({
 regimens, drugsMaster, onAddRegimen, onUpdateRegimen, onDeleteRegimen, onUpdateRegimens }) {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedRegimenId, setSelectedRegimenId] = useState('');
  const [editingRegimenId, setEditingRegimenId] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());

  const handleMoveUp = (index, e) => {
    e.stopPropagation();
    if (index === 0) return;
    const newRegimens = [...regimens];
    const temp = newRegimens[index];
    newRegimens[index] = newRegimens[index - 1];
    newRegimens[index - 1] = temp;
    if (onUpdateRegimens) {
      onUpdateRegimens(newRegimens);
    }
  };

  const handleMoveDown = (index, e) => {
    e.stopPropagation();
    if (index === regimens.length - 1) return;
    const newRegimens = [...regimens];
    const temp = newRegimens[index];
    newRegimens[index] = newRegimens[index + 1];
    newRegimens[index + 1] = temp;
    if (onUpdateRegimens) {
      onUpdateRegimens(newRegimens);
    }
  };
  // その月の最初の月曜日を取得
  const getFirstMondayOfMonth = (year, month) => {
    const d = new Date(year, month, 1);
    while (d.getDay() !== 1) { // 1 = Monday
      d.setDate(d.getDate() + 1);
    }
    return d;
  };

  // カレンダーシミュレーションの起点日（表示月の第1月曜日）
  const calendarStartMonday = useMemo(() => {
    return getFirstMondayOfMonth(calendarDate.getFullYear(), calendarDate.getMonth());
  }, [calendarDate]);



  const getDayInfo = (cellDate, regimen) => {
    // 起点は常にcalendarStartMonday（初期表示月の第1月曜に固定）
    const startMonday = calendarStartMonday;
    
    const cellTime = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate()).getTime();
    const startMondayTime = new Date(startMonday.getFullYear(), startMonday.getMonth(), startMonday.getDate()).getTime();
    
    const diffTime = cellTime - startMondayTime;
    const elapsedDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (elapsedDays < 0) return null;
    
    const cycleDays = regimen.cycleDays || 21;
    const totalCycles = regimen.totalCycles || 4;
    
    const cycleIndex = Math.floor(elapsedDays / cycleDays);
    const cycleNumber = cycleIndex + 1;
    const dayNumber = (elapsedDays % cycleDays) + 1;
    
    if (cycleNumber > totalCycles) return null;

    // 各薬剤について、このサイクル・この日に投与されるかを個別に判定
    const targetDrugs = getApplicableDrugs(regimen.drugs, cycleNumber, dayNumber, regimen.drugDays);

    return {
      cycleNumber,
      dayNumber,
      isDrugDay: targetDrugs.length > 0,
      drugs: targetDrugs
    };
  };

  // 新規レジメンフォームの状態
  const [newRegimen, setNewRegimen] = useState({
    name: '',
    cancerType: '',
    protocolType: '',
    cycleDays: 21,
    totalCycles: 4,
    drugDaysRaw: '1',
    emeticRisk: 'moderate',
    notes: '',
  });

  // 各薬剤の対象Dayから自動集計される全体の投与日程プレビュー用
  const getCalculatedDrugDays = () => {
    const allDays = new Set();
    drugs.forEach(d => {
      if (d.applicableDaysRaw) {
        d.applicableDaysRaw.split(',').forEach(item => {
          const dayNum = parseInt(item.trim());
          if (!isNaN(dayNum) && dayNum > 0 && dayNum <= newRegimen.cycleDays) {
            allDays.add(dayNum);
          }
        });
      }
    });
    const sorted = Array.from(allDays).sort((a, b) => a - b);
    return sorted.length > 0 ? sorted : [1];
  };

  // 登録薬剤リスト
  const [drugs, setDrugs] = useState([
    { drugId: '', name: '', doseValue: '', doseType: 'bsa', route: '点滴静注', order: 1, duration: 60, applicableDaysRaw: '', applicableCyclesRaw: '' }
  ]);

  // 薬剤追加
  const addDrugField = () => {
    setDrugs([
      ...drugs,
      { drugId: '', name: '', doseValue: '', doseType: 'bsa', route: '点滴静注', order: drugs.length + 1, duration: 60, applicableDaysRaw: '', applicableCyclesRaw: '' }
    ]);
  };

  // 薬剤削除
  const removeDrugField = (index) => {
    const updated = drugs.filter((_, idx) => idx !== index);
    const reordered = updated.map((d, i) => ({ ...d, order: i + 1 }));
    setDrugs(reordered);
  };

  // 薬剤フィールドの値変更
  const handleDrugChange = (index, fieldOrFields, value) => {
    let updated;
    if (typeof fieldOrFields === 'object' && fieldOrFields !== null) {
      updated = drugs.map((d, idx) => 
        idx === index ? { ...d, ...fieldOrFields } : d
      );
    } else {
      updated = drugs.map((d, idx) => 
        idx === index ? { ...d, [fieldOrFields]: value } : d
      );
    }
    setDrugs(updated);
  };

  // 編集開始
  const startEdit = (regimen) => {
    setEditingRegimenId(regimen.id);
    setNewRegimen({
      name: regimen.name,
      cancerType: regimen.cancerType,
      protocolType: regimen.protocolType || '',
      cycleDays: regimen.cycleDays,
      totalCycles: regimen.totalCycles,
      drugDaysRaw: regimen.drugDays.join(', '),
      emeticRisk: regimen.emeticRisk,
      notes: regimen.notes || '',
    });
    
    const initialDrugs = regimen.drugs.map(d => ({
      ...d,
      applicableDaysRaw: d.applicableDays ? d.applicableDays.join(', ') : '',
      applicableCyclesRaw: d.applicableCycles ? formatCyclesArray(d.applicableCycles) : ''
    }));
    setDrugs(initialDrugs);
    setIsAdding(true);
  };

  const handleCopyRegimen = (regimen) => {
    setEditingRegimenId(null);
    setNewRegimen({
      name: `${regimen.name}_copy`,
      cancerType: regimen.cancerType,
      protocolType: regimen.protocolType || '',
      cycleDays: regimen.cycleDays,
      totalCycles: regimen.totalCycles,
      drugDaysRaw: regimen.drugDays.join(', '),
      emeticRisk: regimen.emeticRisk,
      notes: regimen.notes || '',
    });

    const initialDrugs = regimen.drugs.map(d => ({
      ...d,
      applicableDaysRaw: d.applicableDays ? d.applicableDays.join(', ') : '',
      applicableCyclesRaw: d.applicableCycles ? formatCyclesArray(d.applicableCycles) : ''
    }));
    setDrugs(initialDrugs);
    setIsAdding(true);
  };

  // 編集/登録キャンセル
  const handleCancel = () => {
    setIsAdding(false);
    setEditingRegimenId(null);
    setNewRegimen({
      name: '',
      cancerType: '',
      protocolType: '',
      cycleDays: 21,
      totalCycles: 4,
      drugDaysRaw: '1',
      emeticRisk: 'moderate',
      notes: '',
    });
    setDrugs([{ drugId: '', name: '', doseValue: '', doseType: 'bsa', route: '点滴静注', order: 1, duration: 60, applicableDaysRaw: '', applicableCyclesRaw: '' }]);
  };

  // レジメンの保存
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newRegimen.name || !newRegimen.cancerType || drugs.some(d => !d.drugId || d.doseValue === '')) {
      toast('必須項目をすべて入力し、薬剤情報を正しく登録してください。');
      return;
    }

    const allDays = new Set();
    drugs.forEach(d => {
      if (d.applicableDaysRaw) {
        d.applicableDaysRaw.split(',').forEach(item => {
          const dayNum = parseInt(item.trim());
          if (!isNaN(dayNum) && dayNum > 0 && dayNum <= newRegimen.cycleDays) {
            allDays.add(dayNum);
          }
        });
      }
    });
    let drugDays = Array.from(allDays).sort((a, b) => a - b);
    if (drugDays.length === 0) {
      drugDays = [1];
    }

    const regimenData = {
      id: editingRegimenId || `R-${crypto.randomUUID().split('-')[0]}`,
      name: newRegimen.name,
      cancerType: newRegimen.cancerType,
      protocolType: newRegimen.protocolType || null,
      cycleDays: parseInt(newRegimen.cycleDays),
      totalCycles: parseInt(newRegimen.totalCycles),
      drugDays,
      emeticRisk: newRegimen.emeticRisk,
      notes: newRegimen.notes,
      drugs: drugs.map(d => {
        const parsedDays = d.applicableDaysRaw
          ? d.applicableDaysRaw.split(',').map(item => parseInt(item.trim())).filter(item => !isNaN(item) && item > 0)
          : null;
        
        const parsedCycles = d.applicableCyclesRaw
          ? parseCyclesString(d.applicableCyclesRaw)
          : null;
        
        const drugObj = {
          drugId: d.drugId || null,
          name: d.name,
          doseValue: parseFloat(d.doseValue),
          doseType: d.doseType,
          route: d.route,
          order: parseInt(d.order),
          duration: parseInt(d.duration)
        };
        
        if (parsedDays && parsedDays.length > 0) {
          drugObj.applicableDays = parsedDays;
        }
        
        if (parsedCycles && parsedCycles.length > 0) {
          drugObj.applicableCycles = parsedCycles;
        }
        
        return drugObj;
      })
    };

    if (editingRegimenId) {
      onUpdateRegimen(regimenData);
      toast('レジメンを修正しました。');
    } else {
      onAddRegimen(regimenData);
      toast('新しいレジメンを登録しました。');
    }

    handleCancel();
  };



  const filteredRegimens = useMemo(() => {
    const list = regimens || [];
    return selectedRegimenId 
      ? list.filter(r => r.id === selectedRegimenId)
      : list;
  }, [regimens, selectedRegimenId]);

  return (
    <div style={{ height: 'calc(100vh - 150px)', overflowY: 'auto' }}>
      {isAdding ? (
        /* レジメン新規登録フォーム */
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Plus size={20} />
              {editingRegimenId ? '標準レジメンの編集' : '標準レジメンの新規登録'}
            </h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">レジメン名 *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={newRegimen.name}
                    onChange={e => {
                      const newName = e.target.value;
                      setNewRegimen(prev => {
                        const guessed = guessProtocolType(newName);
                        return {
                          ...prev, 
                          name: newName,
                          protocolType: prev.protocolType ? prev.protocolType : (guessed || '')
                        };
                      });
                    }}
                    placeholder="例: mFOLFOX6, GEM+CDDP"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">対象がん種 *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={newRegimen.cancerType}
                    onChange={e => setNewRegimen({...newRegimen, cancerType: e.target.value})}
                    placeholder="例: 大腸がん, 乳がん, 胆道がん"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">プロトコルタイプ</label>
                  <select 
                    className="form-control"
                    value={newRegimen.protocolType}
                    onChange={e => setNewRegimen({...newRegimen, protocolType: e.target.value})}
                  >
                    <option value="">標準（特殊プロトコルなし）</option>
                    <option value="tecvayli">テクベイリ (ステップアップ・丸め)</option>
                    <option value="talquetamab">タービー (ステップアップ・丸め)</option>
                    <option value="lunsumio_sc">ルンスミオ 皮下注 (漸増・上限)</option>
                    <option value="lunsumio_iv">ルンスミオ 静注 (漸増・上限)</option>
                    <option value="combination">併用療法 (特殊)</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">1サイクルの期間 (日間) *</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    required 
                    value={newRegimen.cycleDays}
                    onChange={e => setNewRegimen({...newRegimen, cycleDays: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">標準サイクル数 *</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    required 
                    value={newRegimen.totalCycles}
                    onChange={e => setNewRegimen({...newRegimen, totalCycles: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">催吐性リスク (Emetic Risk)</label>
                  <select 
                    className="form-control"
                    value={newRegimen.emeticRisk}
                    onChange={e => setNewRegimen({...newRegimen, emeticRisk: e.target.value})}
                  >
                    <option value="high">高度 (High)</option>
                    <option value="moderate">中等度 (Moderate)</option>
                    <option value="low">軽度 (Low)</option>
                    <option value="minimal">最小限 (Minimal)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">レジメン全体の投与スケジュール (自動取得)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  readOnly 
                  disabled
                  value={`Day ${getCalculatedDrugDays().join(', ')}`}
                  style={{ backgroundColor: '#e2e8f0', color: 'var(--color-text-dark)', fontWeight: '600' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  下の各薬剤の「対象Day」に入力された数値から自動的に集計・設定されます。(すべて空欄の場合は Day 1 となります)
                </span>
              </div>

              {/* 薬剤構成リスト */}
              <h4 style={{ margin: '24px 0 12px', fontSize: '1rem', color: 'var(--color-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                レジメン構成薬剤設定
              </h4>

              {drugs.map((drug, index) => (
                <div 
                  key={index} 
                  className="form-row" 
                  style={{ 
                    alignItems: 'flex-end', 
                    backgroundColor: '#f8fafc', 
                    padding: '15px', 
                    borderRadius: 'var(--radius-sm)', 
                    marginBottom: '12px',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">薬剤名 *</label>
                    <select 
                      className="form-control" 
                      required 
                      value={drug.drugId || ''}
                      onChange={e => {
                        const selectedId = e.target.value;
                        const foundDrug = drugsMaster.find(d => d.id === selectedId);
                        if (foundDrug) {
                          handleDrugChange(index, {
                            drugId: selectedId,
                            name: foundDrug.name,
                            route: foundDrug.route,
                            doseType: foundDrug.doseType,
                            duration: foundDrug.defaultDuration,
                            doseValue: foundDrug.defaultDoseValue
                          });
                        } else {
                          handleDrugChange(index, {
                            drugId: '',
                            name: '',
                            doseValue: ''
                          });
                        }
                      }}
                    >
                      <option value="">-- 選択してください --</option>
                      {drugsMaster.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.route})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">標準投与量 *</label>
                    <input 
                      type="number" 
                      step="0.001" 
                      className="form-control" 
                      required 
                      value={drug.doseValue}
                      onChange={e => handleDrugChange(index, 'doseValue', e.target.value)}
                      placeholder="数値"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">投与量単位 *</label>
                    <select 
                      className="form-control"
                      value={drug.doseType}
                      onChange={e => handleDrugChange(index, 'doseType', e.target.value)}
                    >
                      <option value="bsa">mg/m² (BSA換算)</option>
                      <option value="weight">mg/kg (体重換算)</option>
                      <option value="fixed">mg (固定量)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">投与ルート</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={drug.route}
                      onChange={e => handleDrugChange(index, 'route', e.target.value)}
                      placeholder="例: 点滴静注, 経口"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0, width: '80px' }}>
                    <label className="form-label">時間 (分)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={drug.duration}
                      onChange={e => handleDrugChange(index, 'duration', e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0, width: '120px' }}>
                    <label className="form-label">対象Day</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={drug.applicableDaysRaw || ''}
                      onChange={e => handleDrugChange(index, 'applicableDaysRaw', e.target.value)}
                      placeholder="例: 1,8"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0, width: '120px' }}>
                    <label className="form-label">適用サイクル</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={drug.applicableCyclesRaw || ''}
                      onChange={e => handleDrugChange(index, 'applicableCyclesRaw', e.target.value)}
                      placeholder="例: 1 や 2-8"
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', height: '40px' }}>
                    <button 
                      type="button" 
                      className="btn btn-danger" 
                      style={{ padding: '8px 10px' }}
                      disabled={drugs.length === 1}
                      onClick={() => removeDrugField(index)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              <div style={{ marginBottom: '20px' }}>
                <button type="button" className="btn btn-outline" onClick={addDrugField}>
                  <Plus size={14} />
                  薬剤を追加する
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">特記事項・休薬減量基準</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  value={newRegimen.notes}
                  onChange={e => setNewRegimen({...newRegimen, notes: e.target.value})}
                  placeholder="減量基準や前投薬の注意等があれば記載してください。"
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                {editingRegimenId && (
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    style={{ marginRight: 'auto' }}
                    onClick={async () => {
                      const deleted = await onDeleteRegimen(editingRegimenId);
                      if (deleted) {
                        handleCancel();
                      }
                    }}
                  >
                    レジメンを削除
                  </button>
                )}
                <button type="button" className="btn btn-outline" onClick={handleCancel}>キャンセル</button>
                <button type="submit" className="btn btn-secondary">
                  {editingRegimenId ? 'レジメンを保存' : 'レジメン登録'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* レジメン一覧表示 */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--color-primary)' }}>登録標準レジメンマスタ</h3>
            <button className="btn btn-secondary" onClick={() => { setIsAdding(true); setSelectedRegimenId(''); }}>
              <Plus size={16} />
              新しいレジメンを追加
            </button>
          </div>

          {/* プルダウン選択パネル */}
          <div className="card" style={{ marginBottom: '24px', padding: '20px', backgroundColor: 'var(--color-primary-light)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
              <label style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                <List size={20} />
                レジメンを選択してください：
              </label>
              <select 
                className="form-control" 
                style={{ flex: 1, maxWidth: '400px', padding: '8px 14px', fontSize: '0.95rem', fontWeight: '600', border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-md)' }}
                value={selectedRegimenId}
                onChange={e => setSelectedRegimenId(e.target.value)}
              >
                <option value="">-- すべての標準レジメンを表示 --</option>
                {regimens.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.cancerType})</option>
                ))}
              </select>
              {selectedRegimenId && (
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  onClick={() => setSelectedRegimenId('')}
                >
                  選択解除
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredRegimens.map((regimen, index) => (
              <div key={regimen.id} className="card">
                <div className="card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!selectedRegimenId && (
                      <div style={{ display: 'flex', gap: '4px', marginRight: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '2px 6px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          disabled={index === 0}
                          onClick={(e) => handleMoveUp(index, e)}
                          title="上へ移動"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '2px 6px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          disabled={index === regimens.length - 1}
                          onClick={(e) => handleMoveDown(index, e)}
                          title="下へ移動"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </div>
                    )}
                    <span className="badge badge-info" style={{ marginRight: '8px' }}>{regimen.id}</span>
                    <span style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-primary)' }}>{regimen.name}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginLeft: '12px' }}>がん種: {regimen.cancerType}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      style={{ padding: '4px 10px', fontSize: '0.75rem', height: '28px' }}
                      onClick={() => startEdit(regimen)}
                    >
                      編集
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      style={{ padding: '4px 10px', fontSize: '0.75rem', height: '28px', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                      onClick={() => handleCopyRegimen(regimen)}
                    >
                      コピーして新規作成
                    </button>
                    <span className="badge badge-warning" style={{ textTransform: 'uppercase' }}>
                      催吐リスク: {
                        regimen.emeticRisk === 'high' ? '高度' : 
                        regimen.emeticRisk === 'moderate' ? '中等度' : 
                        regimen.emeticRisk === 'low' ? '軽度' : '最小限'
                      }
                    </span>
                  </div>
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', gap: '40px', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                      <Calendar size={16} className="text-muted" style={{ color: 'var(--color-text-muted)' }} />
                      <span>1サイクル: <strong>{regimen.cycleDays} 日間</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                      <List size={16} style={{ color: 'var(--color-text-muted)' }} />
                      <span>総サイクル数: <strong>{regimen.totalCycles} 回</strong></span>
                    </div>
                  </div>

                  {/* サイクル内スケジュール構成（同一日程のサイクルは自動グループ化） */}
                  {(() => {
                    const getDrugDaysForCycle = (c) => {
                      const days = new Set();
                      regimen.drugs.forEach(drug => {
                        const hasCycleLimit = drug.applicableCycles && drug.applicableCycles.length > 0;
                        const isCycleMatch = !hasCycleLimit || drug.applicableCycles.includes(c);
                        if (isCycleMatch) {
                          const hasDayLimit = drug.applicableDays && drug.applicableDays.length > 0;
                          if (hasDayLimit) {
                            drug.applicableDays.forEach(d => days.add(d));
                          } else {
                            (regimen.drugDays || []).forEach(d => days.add(d));
                          }
                        }
                      });
                      return Array.from(days).sort((a, b) => a - b);
                    };

                    const groupsMap = {};
                    for (let c = 1; c <= regimen.totalCycles; c++) {
                      const days = getDrugDaysForCycle(c);
                      const key = days.join(',');
                      if (!groupsMap[key]) {
                        groupsMap[key] = {
                          days: days,
                          cycles: []
                        };
                      }
                      groupsMap[key].cycles.push(c);
                    }
                    const cycleGroups = Object.values(groupsMap).sort((a, b) => a.cycles[0] - b.cycles[0]);

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '15px 0' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '2px' }}>
                          サイクル内スケジュール構成
                        </div>
                        {cycleGroups.map((group, gIdx) => {
                          const cyclesStr = group.cycles.length === 1 
                            ? `第 ${group.cycles[0]} サイクル`
                            : `第 ${formatCyclesArray(group.cycles)} サイクル`;
                          
                          return (
                            <div key={gIdx} style={{ padding: '12px 15px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '6px' }}>
                                <span style={{ fontWeight: '700', color: 'var(--color-primary)', fontSize: '0.85rem' }}>{cyclesStr}</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                  投与日程: <strong>Day {group.days.length > 0 ? group.days.join(', ') : 'なし'}</strong>
                                </span>
                              </div>
                              <div className="timeline-track" style={{ marginTop: '5px' }}>
                                {Array.from({ length: regimen.cycleDays }, (_, i) => {
                                  const day = i + 1;
                                  const isDrug = group.days.includes(day);
                                  return (
                                    <div 
                                      key={day} 
                                      className={`timeline-day ${isDrug ? 'active-drug' : 'rest-day'}`}
                                      title={`Day ${day}: ${isDrug ? '投与日' : '休薬日'}`}
                                    >
                                      {day}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  <table className="table" style={{ marginTop: '15px' }}>
                    <thead>
                      <tr>
                        <th>順序</th>
                        <th>薬剤名</th>
                        <th>標準投与量</th>
                        <th>投与方法</th>
                        <th>投与時間 (分)</th>
                        <th>投与対象日</th>
                        <th>適用サイクル</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regimen.drugs.map((drug, index) => (
                        <tr key={index}>
                          <td className="num-tabular" style={{ width: '60px', fontWeight: '600' }}>{drug.order}</td>
                          <td style={{ fontWeight: '600' }}>{drug.name}</td>
                          <td>
                            {drug.doseValue} {
                              drug.doseType === 'bsa' ? 'mg/m²' : 
                              drug.doseType === 'weight' ? 'mg/kg' : 'mg'
                            }
                          </td>
                          <td>{drug.route}</td>
                          <td>{drug.duration} 分</td>
                          <td>
                            {`Day ${(drug.applicableDays || regimen.drugDays || []).join(', ')}`}
                          </td>
                          <td>
                            {drug.applicableCycles && drug.applicableCycles.length > 0
                              ? `第 ${formatCyclesArray(drug.applicableCycles)} サイクル`
                              : 'すべてのサイクル'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {regimen.notes && (
                    <div style={{ marginTop: '15px', padding: '10px 15px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-border)', fontSize: '0.85rem' }}>
                      <Shield size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom', color: 'var(--color-text-muted)' }} />
                      <strong>特記事項:</strong> {regimen.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {selectedRegimenId && filteredRegimens.length > 0 && (() => {
            const regimen = filteredRegimens[0];
            return (
              <div className="card regimen-simulation-card" style={{ marginTop: '30px', borderTop: '2px solid var(--color-primary)', backgroundColor: '#f8fafc' }}>
                <div className="card-body" style={{ padding: '15px' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '15px' }}>
                    このレジメンを{getLocalDateString(calendarStartMonday)}（第1週月曜日）から開始したと仮定した日程シミュレーションです。
                  </p>
                  <MonthCalendar
                    currentMonth={calendarDate}
                    onMonthChange={setCalendarDate}
                    showHolidays={false}
                    showTodayButton={false}
                    cellMinHeight="90px"
                    title={<h4 style={{ fontSize: '0.95rem', fontWeight: '600', margin: 0, color: 'var(--color-primary)' }}>日程シミュレーション</h4>}
                    renderCellContent={({ date }) => {
                      const dayInfo = getDayInfo(date, regimen);
                      if (!dayInfo?.isDrugDay) return null;
                      return (
                        <div 
                          className="calendar-event"
                          style={{
                            backgroundColor: 'var(--color-primary-light)',
                            color: 'var(--color-primary)',
                            border: '1px solid currentColor',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            fontSize: '0.65rem'
                          }}
                        >
                          <div style={{ fontWeight: '700' }}>C{dayInfo.cycleNumber} - Day {dayInfo.dayNumber}</div>
                          {dayInfo.drugs.map((drug, i) => {
                            const unit = drug.doseType === 'bsa' ? 'mg/m²' : drug.doseType === 'weight' ? 'mg/kg' : 'mg';
                            return (
                              <div key={i} style={{ fontSize: '0.55rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                                {drug.name.slice(0, 7)}: {drug.doseValue}{unit}
                              </div>
                            );
                          })}
                        </div>
                      );
                    }}
                  />
                </div>
              </div>
            );
          })()}

        </div>
      )}
    </div>
  );
}
