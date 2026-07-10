import React, { useState } from 'react';
import { Calendar, Users, AlertTriangle, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { calcAndFormatDoseStr } from '../utils/doseUtils';
import { getLocalDateString } from '../utils/dateUtils';
import { getTodayStatus } from '../utils/scheduleUtils';
import { getApplicableDrugs } from '../utils/drugMatching';

export default function Dashboard({ patients, regimens, alerts, onNavigate, onSelectPatient }) {
  const today = getLocalDateString(new Date());



  // 今日投与予定、または今日がレジメンスケジュール内の投与日に該当する患者
  const todayPatients = patients.filter(patient => {
    if (!patient.activeRegimen) return false;
    
    // スケジュールから今日の投与があるかチェック
    const todaySchedule = patient.schedule.find(s => s.date === today && s.isDrugDay);
    return !!todaySchedule;
  });

  const completedCount = todayPatients.filter(p => getTodayStatus(p) === 'completed').length;
  const totalCount = todayPatients.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div>
      {/* 状況サマリーカード */}
      <div className="grid-3">
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ backgroundColor: 'var(--color-primary-light)', padding: '15px', borderRadius: '50%', color: 'var(--color-primary)' }}>
              <Users size={28} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>管理中患者数</div>
              <div className="num-tabular" style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-primary)', lineHeight: '1.2' }}>{patients.length} <span style={{ fontSize: '1rem', fontWeight: '500' }}>名</span></div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ backgroundColor: 'var(--color-secondary-light)', padding: '15px', borderRadius: '50%', color: 'var(--color-secondary)' }}>
              <Calendar size={28} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>本日の投与予定</div>
              <div className="num-tabular" style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-secondary)', lineHeight: '1.2' }}>
                {completedCount}/{totalCount} <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>完了 ({progressPercent}%)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ backgroundColor: 'var(--color-danger-light)', padding: '15px', borderRadius: '50%', color: 'var(--color-danger)' }}>
              <AlertTriangle size={28} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>要確認アラート</div>
              <div className="num-tabular" style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-danger)', lineHeight: '1.2' }}>{alerts.length} <span style={{ fontSize: '1rem', fontWeight: '500' }}>件</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* 警告表示 */}
      {alerts.length > 0 && (
        <div className="card">
          <div className="card-header" style={{ borderBottomColor: 'var(--color-danger-light)' }}>
            <h3 className="card-title" style={{ color: 'var(--color-danger)' }}>
              <AlertTriangle size={20} />
              臨床アラート（休薬・減量判定基準）
            </h3>
          </div>
          <div className="card-body" style={{ padding: '15px 24px' }}>
            {alerts.map((alert, index) => (
              <div key={index} className="alert-banner alert-banner-danger" style={{ margin: '8px 0' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: '600' }}>{alert.patientName} ({alert.patientId})</span>: {alert.message}
                </div>
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: 'white' }}
                  onClick={() => {
                    onSelectPatient(alert.patientId);
                    onNavigate('patients');
                  }}
                >
                  詳細確認
                </button>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* 本日の投与管理 */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Clock size={20} />
            本日の投与予定・実施管理 ({today})
          </h3>
        </div>
        <div className="card-body">
          {todayPatients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
              本日投与が予定されている患者はいません。
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>患者ID</th>
                    <th>氏名</th>
                    <th>適用レジメン</th>
                    <th>本日スケジュール</th>
                    <th>投与薬剤</th>
                    <th>ステータス</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {todayPatients.map(patient => {
                    const activeReg = regimens.find(r => r.id === patient.activeRegimen.regimenId);
                    const todayItem = patient.schedule.find(s => s.date === today);
                    
                    return (
                      <tr key={patient.id}>
                        <td className="num-tabular" style={{ fontWeight: '600' }}>{patient.id}</td>
                        <td style={{ fontWeight: '600' }}>{patient.name}</td>
                        <td>
                          <div>{activeReg?.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            サイクル {patient.activeRegimen.currentCycle}/{patient.activeRegimen.totalCycles}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-info">Day {todayItem?.dayNumber}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {getApplicableDrugs(
                              patient.activeRegimen?.drugs || [],
                              todayItem?.cycleNumber || patient.activeRegimen.currentCycle || 1,
                              todayItem?.dayNumber || 1,
                              activeReg?.drugDays || []
                            )
                              .map((drug, i) => {
                                // 投与量計算（共通ユーティリティで統一）
                                const dose = calcAndFormatDoseStr(drug, patient);
                                return (
                                  <span key={i} style={{ fontSize: '0.8rem', color: 'var(--color-text-dark)' }}>
                                    ・{drug.name} ({dose})
                                  </span>
                                );
                              })}
                          </div>
                        </td>
                        <td>
                          {getTodayStatus(patient) === 'completed' ? (
                            <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle size={12} /> 投与完了
                            </span>
                          ) : getTodayStatus(patient) === 'running' ? (
                            <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> 投与中
                            </span>
                          ) : (
                            <span className="badge badge-danger">未実施</span>
                          )}
                        </td>
                        <td>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => {
                              onSelectPatient(patient.id);
                              onNavigate('checklist');
                            }}
                          >
                            チェックリストを開く
                            <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
