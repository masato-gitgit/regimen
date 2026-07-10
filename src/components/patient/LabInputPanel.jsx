import React, { useState } from 'react';
import { useToast } from '../../hooks/useToast';

export default function LabInputPanel({ patient, onUpdatePatient }) {
  const { toast } = useToast();
  
  const [labInput, setLabInput] = useState({
    creatinine: '',
    wbc: '',
    plt: '',
  });

  const handleSaveLabs = () => {
    const updatedPatient = {
      ...patient,
      creatinine: labInput.creatinine ? parseFloat(labInput.creatinine) : patient.creatinine,
      wbc: labInput.wbc ? parseFloat(labInput.wbc) : patient.wbc,
      plt: labInput.plt ? parseFloat(labInput.plt) : patient.plt
    };

    onUpdatePatient(updatedPatient);
    
    toast('検査値を更新しました。');
    setLabInput({ creatinine: '', wbc: '', plt: '' });
  };

  if (!patient) return null;

  return (
    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
      <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '10px', color: 'var(--color-primary)' }}>直近の血液検査データ入力</h4>
      <div className="form-row" style={{ alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">血清クレアチニン (mg/dL)</label>
          <input 
            type="number" 
            step="0.01" 
            className="form-control" 
            placeholder={patient.creatinine || '例: 0.8'}
            value={labInput.creatinine}
            onChange={e => setLabInput({...labInput, creatinine: e.target.value})}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">WBC (/μL)</label>
          <input 
            type="number" 
            className="form-control" 
            placeholder={patient.wbc || '例: 4000'}
            value={labInput.wbc}
            onChange={e => setLabInput({...labInput, wbc: e.target.value})}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">PLT (万/μL)</label>
          <input 
            type="number" 
            className="form-control" 
            placeholder={patient.plt || '例: 20'}
            value={labInput.plt}
            onChange={e => setLabInput({...labInput, plt: e.target.value})}
          />
        </div>
        <div>
          <button className="btn btn-secondary" onClick={handleSaveLabs} style={{ width: '100%' }}>
            検査値を保存
          </button>
        </div>
      </div>
    </div>
  );
}
