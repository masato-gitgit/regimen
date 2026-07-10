import React, { useState } from 'react';
import { Calendar, Shield, Users, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDose, calcAndFormatDose, isMicroDoseDrug } from '../utils/doseUtils';
import { getLocalDateString } from '../utils/dateUtils';

export default function DrugAggregation({ patients, regimens }) {
  const getDayOfWeekStr = (dateStr) => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    // "YYYY-MM-DD" をローカルタイムとして解釈（UTCとして扱うと JST では曜日がずれる）
    const [y, m, d] = dateStr.split('-').map(Number);
    return days[new Date(y, m - 1, d).getDay()];
  };

  // 今日から1週間先（今日を含む7日間）の日付リストを作成
  const today = new Date();
  const dateList = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return getLocalDateString(d);
  });

  // 日付ごとのアコーディオン開閉状態（デフォルトで全て展開）
  const [expandedDates, setExpandedDates] = useState(() => {
    const initial = {};
    dateList.forEach(d => {
      initial[d] = true;
    });
    return initial;
  });

  const toggleDate = (dateStr) => {
    setExpandedDates(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  // 指定された日付の薬剤調製必要量を集計するヘルパー
  const getDrugSummaryForDate = (dateStr) => {
    const drugSummary = {};
    let patientsCount = 0;

    patients.forEach(patient => {
      if (!patient.activeRegimen || !patient.schedule) return;

      // 指定日付のスケジュールアイテムを検索
      const scheduleItems = patient.schedule.filter(s => s.date === dateStr);
      const scheduleItem = scheduleItems.find(s => s.isDrugDay) || scheduleItems[0];
      if (!scheduleItem || !scheduleItem.isDrugDay || scheduleItem.status === 'skipped') return;

      // レジメンの取得（見つからない場合はフォールバック）
      const activeReg = regimens.find(r => r.id === patient.activeRegimen.regimenId) || {
        name: patient.activeRegimen.regimenName || '不明なレジメン',
        drugDays: []
      };
      if (!patient.activeRegimen.drugs) return;

      // その日のサイクル数
      const cycleNumber = scheduleItem.cycleNumber || 1;

      // その日に適合する薬剤を抽出（中止予定の薬剤を除く）
      const omittedIndices = scheduleItem.omittedDrugIndices || [];
      const targetDrugs = patient.activeRegimen.drugs
        .map((drug, origIdx) => ({ drug, origIdx }))
        .filter(({ drug, origIdx }) => {
          // 中止予定の薬剤を除外
          if (omittedIndices.includes(origIdx)) return false;
          // 適用サイクル制限の判定
          if (drug.applicableCycles && drug.applicableCycles.length > 0) {
            if (!drug.applicableCycles.includes(cycleNumber)) {
              return false;
            }
          }
          // 対象Day制限の判定
          if (drug.applicableDays && drug.applicableDays.length > 0) {
            return drug.applicableDays.includes(scheduleItem.dayNumber);
          }
          // どちらも設定がない場合はレジメン全体の投与日に従う
          if (activeReg.drugDays && activeReg.drugDays.length > 0) {
            return activeReg.drugDays.includes(scheduleItem.dayNumber);
          }
          return true;
        })
        .map(({ drug }) => drug);

      if (targetDrugs.length > 0) {
        patientsCount++;
      }

      targetDrugs.forEach(drug => {
        // 共通ユーティリティで計算・丸め（タービー・テクベイリ等の10mg未満は小数第1位まで）
        const finalDose = calcAndFormatDose(drug, patient);

        if (!drugSummary[drug.name]) {
          drugSummary[drug.name] = {
            total: 0,
            route: drug.route,
            details: []
          };
        }
        drugSummary[drug.name].total = Math.round((drugSummary[drug.name].total + finalDose) * 10) / 10;
        drugSummary[drug.name].details.push({
          patientId: patient.id,
          patientName: patient.name,
          dose: finalDose,
          regimenName: activeReg.name,
          cycleNumber: cycleNumber,
          dayNumber: scheduleItem.dayNumber
        });
      });
    });

    return {
      summary: drugSummary,
      patientsCount
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0 }}>
        本日（当月第1週基準等の臨床スケジュールに基づく）から1週間先までに調製が必要な抗がん剤の総量および患者ごとの投与内訳を集計します。
      </p>

      {dateList.map((dateStr, index) => {
        const isToday = index === 0;
        const { summary, patientsCount } = getDrugSummaryForDate(dateStr);
        const drugNames = Object.keys(summary);
        const isExpanded = !!expandedDates[dateStr];

        return (
          <div key={dateStr} className="card" style={{ marginBottom: 0, overflow: 'hidden' }}>
            {/* 日付ヘッダー */}
            <div 
              style={{ 
                padding: '16px 20px', 
                backgroundColor: isToday ? 'var(--color-primary-light)' : '#f8fafc',
                borderBottom: isExpanded ? '1px solid var(--color-border)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none'
              }}
              onClick={() => toggleDate(dateStr)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span className="num-tabular" style={{ fontSize: '1.1rem', fontWeight: '700', color: isToday ? 'var(--color-primary)' : 'var(--color-text-dark)' }}>
                  {dateStr} ({getDayOfWeekStr(dateStr)})
                </span>
                {isToday && (
                  <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>本日</span>
                )}
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  投与予定患者: <strong style={{ color: patientsCount > 0 ? 'var(--color-primary)' : 'inherit' }}>{patientsCount}名</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {drugNames.length > 0 ? `調製予定: ${drugNames.length}種` : '調製予定なし'}
                </span>
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>

            {/* 必要量コンテンツ */}
            {isExpanded && (
              <div className="card-body" style={{ padding: '20px' }}>
                {drugNames.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    この日に調製予定の抗がん剤はありません。
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px' }}>
                    {drugNames.map(drugName => {
                      const drugInfo = summary[drugName];
                      const isMicro = isMicroDoseDrug(drugName);
                      return (
                        <div 
                          key={drugName} 
                          style={{ 
                            border: '1px solid var(--color-border)', 
                            borderRadius: 'var(--radius-md)', 
                            padding: '15px', 
                            backgroundColor: '#ffffff',
                            boxShadow: 'var(--shadow-sm)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', marginBottom: '10px' }}>
                            <div>
                              <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--color-primary)', margin: 0 }}>{drugName}</h4>
                              <span className="badge badge-outline" style={{ fontSize: '0.65rem', marginTop: '4px', padding: '2px 6px' }}>{drugInfo.route}</span>
                            </div>
                            <div className="num-tabular" style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--color-secondary)' }}>
                              {drugInfo.total.toFixed(isMicro && drugInfo.total < 10 ? 1 : 0)} <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>mg</span>
                            </div>
                          </div>
                          
                          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '6px' }}>患者別投与内訳：</div>
                          <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
                            {drugInfo.details.map((detail, idx) => (
                              <li 
                                key={idx} 
                                style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  padding: '5px 0', 
                                  borderBottom: idx < drugInfo.details.length - 1 ? '1px dashed #e2e8f0' : 'none',
                                  fontSize: '0.8rem'
                                }}
                              >
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '10px' }}>
                                  <span style={{ fontWeight: '600', color: 'var(--color-text-dark)' }}>{detail.patientName}</span>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginLeft: '6px' }}>
                                    ({detail.regimenName} C{detail.cycleNumber}-D{detail.dayNumber})
                                  </span>
                                </div>
                                <span className="num-tabular" style={{ fontWeight: '700', color: 'var(--color-text-dark)', flexShrink: 0 }}>
                                  {detail.dose.toFixed(isMicro && detail.dose < 10 ? 1 : 0)} mg
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
