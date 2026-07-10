import React, { useState, useMemo } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { calcAge } from '../../utils/renalUtils';

export default function PatientSidebar({
  patients,
  regimens,
  selectedPatientId,
  onSelectPatient,
  onAddClick
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPatients = useMemo(() => {
    return patients.filter(
      (p) => (p.name || '').includes(searchTerm) || (p.id || '').includes(searchTerm)
    );
  }, [patients, searchTerm]);

  return (
    <div className="card" style={{ height: 'calc(100vh - 150px)', overflowY: 'auto' }}>
      <div className="card-header" style={{ padding: '15px' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            className="form-control"
            placeholder="患者名・IDで検索"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-muted)' }} />
        </div>
      </div>
      <div style={{ padding: '10px 15px' }}>
        <button
          className="btn btn-secondary"
          style={{ width: '100%', padding: '10px' }}
          onClick={onAddClick}
        >
          <UserPlus size={16} />
          患者の新規登録
        </button>
      </div>
      <div style={{ borderTop: '1px solid var(--color-border)' }}>
        {filteredPatients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
            該当する患者はいません。
          </div>
        ) : (
          filteredPatients.map((p) => {
            const patientRegimen = p.activeRegimen ? regimens.find((r) => r.id === p.activeRegimen.regimenId) : null;
            return (
              <div
                key={p.id}
                className={`patient-list-item ${selectedPatientId === p.id ? 'active' : ''}`}
                onClick={() => onSelectPatient(p.id)}
                style={{
                  padding: '14px 20px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--color-border)',
                  backgroundColor: selectedPatientId === p.id ? 'var(--color-primary-light)' : 'transparent',
                  borderLeft: selectedPatientId === p.id ? '4px solid var(--color-primary)' : '4px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="num-tabular" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                    {p.id}
                  </span>
                  {p.activeRegimen ? (
                    <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                      治療中
                    </span>
                  ) : (
                    <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                      レジメン未設定
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: '700', fontSize: '1rem', marginTop: '4px', color: 'var(--color-text-dark)' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {p.gender === 'male' ? '男性' : '女性'} / {calcAge(p.birthDate)}歳 (BSA: {p.bsa} m²)
                </div>
                {patientRegimen && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '4px', fontWeight: '600' }}>
                    {patientRegimen.name}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
