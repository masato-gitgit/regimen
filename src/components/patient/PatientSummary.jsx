import React from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { calcAge, calculateEGFR } from '../../utils/renalUtils';

export default function PatientSummary({
  patient,
  onEditClick,
  onDeleteClick
}) {
  if (!patient) return null;

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            <FileText size={20} />
            患者カルテ詳細 ({patient.name})
          </h3>
          <span className="badge badge-info">ID: {patient.id}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={onEditClick}
          >
            編集
          </button>
          <button
            type="button"
            className="btn btn-danger"
            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#ef4444', color: '#fff', border: 'none' }}
            onClick={onDeleteClick}
          >
            <Trash2 size={14} />
            削除
          </button>
        </div>
      </div>
      <div className="card-body" style={{ paddingBottom: '10px' }}>
        <div className="grid-3">
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>基本情報</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', marginTop: '4px' }}>
              {patient.gender === 'male' ? '男性' : '女性'} / {calcAge(patient.birthDate)}歳
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>({patient.birthDate} 生まれ)</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>体格・BSA</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', marginTop: '4px' }}>
              {patient.height} cm / {patient.weight} kg
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-secondary)', fontWeight: '600' }}>
              体表面積 (BSA): {patient.bsa} m²
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>腎機能 (eGFR)</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', marginTop: '4px' }}>
              {patient.creatinine ? (
                <span>
                  {calculateEGFR(patient.creatinine, patient.gender, patient.birthDate)} mL/min/1.73m²
                </span>
              ) : (
                <span style={{ color: 'var(--color-text-muted)' }}>未測定</span>
              )}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              クレアチニン: {patient.creatinine || '---'} mg/dL
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
