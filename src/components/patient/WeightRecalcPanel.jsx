import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import { formatDose } from '../../utils/doseUtils';

export default function WeightRecalcPanel({ patient, onUpdatePatient }) {
  const { toast } = useToast();
  
  const [weightInput, setWeightInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [showDosePreview, setShowDosePreview] = useState(false);

  // If the weight/height input is changed, we can automatically show the preview
  useEffect(() => {
    if (weightInput) {
      setShowDosePreview(true);
    } else {
      setShowDosePreview(false);
    }
  }, [weightInput]);

  const calculateBSA = (height, weight) => {
    if (!height || !weight) return 0;
    const h = parseFloat(height);
    const w = parseFloat(weight);
    // DuBois formula: BSA = 0.007184 * H^0.725 * W^0.425
    const bsa = 0.007184 * (h ** 0.725) * (w ** 0.425);
    return Math.round(bsa * 100) / 100;
  };

  const handleUpdateWeightAndRecalculate = () => {
    if (!patient) return;
    if (!weightInput) {
      toast('新しい体重を入力してください。');
      return;
    }
    const newWeight = parseFloat(weightInput);
    const newHeight = heightInput ? parseFloat(heightInput) : patient.height;
    if (isNaN(newWeight) || newWeight <= 0) {
      toast('有効な体重値を入力してください。');
      return;
    }
    const newBsa = calculateBSA(newHeight, newWeight);
    
    onUpdatePatient({
      ...patient,
      weight: newWeight,
      height: newHeight,
      bsa: newBsa
    });
    
    toast(`体重を ${patient.weight} kg → ${newWeight} kg、BSAを ${patient.bsa} → ${newBsa} m² に更新しました。投与量は次回投与時に自動再計算されます。`);
    setWeightInput('');
    setHeightInput('');
    setShowDosePreview(false);
  };

  if (!patient) return null;

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <div className="card-header">
        <h3 className="card-title">体重変動・用量再計算</h3>
      </div>
      <div className="card-body">
        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">新しい体重 (kg) *</label>
            <input
              type="number"
              step="0.1"
              className="form-control"
              placeholder={`現在: ${patient.weight} kg`}
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">身長 (cm) ※変更ない場合は空白</label>
            <input
              type="number"
              step="0.1"
              className="form-control"
              placeholder={`現在: ${patient.height} cm`}
              value={heightInput}
              onChange={e => setHeightInput(e.target.value)}
            />
          </div>
          <div>
            <button className="btn btn-primary" onClick={handleUpdateWeightAndRecalculate} style={{ width: '100%' }}>
              体重を更新する
            </button>
          </div>
        </div>

        {/* 用量変更プレビュー */}
        {showDosePreview && weightInput && parseFloat(weightInput) > 0 && patient.activeRegimen && (() => {
          const previewWeight = parseFloat(weightInput);
          const previewHeight = heightInput ? parseFloat(heightInput) : patient.height;
          const previewBSA = calculateBSA(previewHeight, previewWeight);
          const drugs = patient.activeRegimen.drugs || [];
          const calcDrugs = drugs.map(drug => {
            let oldDose, newDose;
            if (drug.doseType === 'bsa') {
              oldDose = formatDose(drug.doseValue * patient.bsa, drug.name);
              newDose = formatDose(drug.doseValue * previewBSA, drug.name);
            } else if (drug.doseType === 'weight') {
              oldDose = formatDose(drug.doseValue * patient.weight, drug.name);
              newDose = formatDose(drug.doseValue * previewWeight, drug.name);
            } else {
              oldDose = formatDose(drug.doseValue, drug.name);
              newDose = formatDose(drug.doseValue, drug.name);
            }
            return { ...drug, oldDose, newDose, diff: newDose - oldDose };
          });
          return (
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-text-muted)' }}>用量変更プレビュー</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-secondary)', fontWeight: '600' }}>
                  BSA: {patient.bsa} m² → {previewBSA} m²
                </span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>薬剤名</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>現在の用量</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>新しい用量</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>差分</th>
                  </tr>
                </thead>
                <tbody>
                  {calcDrugs.map((drug, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '6px 8px', fontWeight: '600' }}>{drug.name}</td>
                      <td className="num-tabular" style={{ padding: '6px 8px', textAlign: 'center' }}>{drug.oldDose} mg</td>
                      <td className="num-tabular" style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '700', color: 'var(--color-primary)' }}>{drug.newDose} mg</td>
                      <td className="num-tabular" style={{ padding: '6px 8px', textAlign: 'center', color: drug.diff > 0 ? 'var(--color-danger)' : drug.diff < 0 ? 'var(--color-secondary)' : 'var(--color-text-muted)', fontWeight: '600' }}>
                        {drug.diff > 0 ? `+${drug.diff}` : drug.diff} mg
                        {drug.doseType === 'fixed' && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}> (固定)</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
