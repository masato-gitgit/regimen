const fs = require('fs');
const path = require('path');

const extractDir = path.join(__dirname, 'src/components/patient');
const calendarJSX = fs.readFileSync(path.join(__dirname, 'calendarJSX.txt'), 'utf-8');

// I'll grab the code starting from `{selectedEvent ? (`
const startIdx = calendarJSX.indexOf(`{selectedEvent ? (`);
if (startIdx === -1) {
  console.log("Could not find selectedEvent block");
  process.exit(1);
}

// Find the end of it. Since calendarJSX ends at `})()` (or rather, the end of the text file),
// I'll just slice it up to the last `) : null}`
const sliceFromStart = calendarJSX.substring(startIdx + `{selectedEvent ? (`.length);
const endIdx = sliceFromStart.lastIndexOf(`) : null}`);

let modalJSX = sliceFromStart.substring(0, endIdx);
// Add a leading div just to match structure if needed, but wait: modalJSX IS `<div style={{...}}> ... </div>`

const scheduleEventModalContent = `import React, { useState, useEffect } from 'react';
import { formatDose } from '../../utils/doseUtils';
import { applyTecvayliRestart, applyLunsumioRestart, applyTalquetamabRestart, changeTecvayliInterval, changeCombinationInterval } from '../../utils/protocolActions';
import { useToast } from '../../hooks/useToast';

export default function ScheduleEventModal({
  event: selectedEvent,
  patient: selectedPatient,
  regimens,
  onUpdatePatient,
  onClose,
  confirm
}) {
  const [manualDate, setManualDate] = useState(selectedEvent.date);
  const [delayDays, setDelayDays] = useState(7);
  const [slideRest, setSlideRest] = useState(true);
  const [crsGrade, setCrsGrade] = useState(selectedEvent.crsGrade || 'none');
  const [hematologicGrade, setHematologicGrade] = useState(selectedEvent.hematologicGrade || 'none');
  const [otherGrade, setOtherGrade] = useState(selectedEvent.otherGrade || 'none');
  const [completionNotes, setCompletionNotes] = useState(selectedEvent.completionNotes || '');
  const [preOmittedDrugIndices, setPreOmittedDrugIndices] = useState(selectedEvent.omittedDrugIndices || []);

  const { toast } = useToast();

  useEffect(() => {
    setManualDate(selectedEvent.date);
    setCrsGrade(selectedEvent.crsGrade || 'none');
    setHematologicGrade(selectedEvent.hematologicGrade || 'none');
    setOtherGrade(selectedEvent.otherGrade || 'none');
    setCompletionNotes(selectedEvent.completionNotes || '');
    setPreOmittedDrugIndices(selectedEvent.omittedDrugIndices || []);
  }, [selectedEvent]);

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
    toast(\`テクベイリ再開プロトコル（再開用量: \${targetDoseValue} mg/kg）を適用し、スケジュールを再構成しました。\`);
    onClose();
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
    onClose();
  };

  // タービー再開プロトコル適用
  const handleApplyTalquetamabProtocol = (targetDoseValue, regId, targetDateStr) => {
    if (!selectedPatient) return;
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
    toast(\`タービー再開プロトコル（再開用量: \${targetDoseValue} mg/kg）を適用し、スケジュールを再構成しました。\`);
    onClose();
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
    onClose();
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
    onClose();
  };

  // 継続投与期の初回投与からの経過週数を計算
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

  const setSelectedEvent = onClose;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="card-body">
          ${modalJSX}
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(extractDir, 'ScheduleEventModal.jsx'), scheduleEventModalContent, 'utf-8');
console.log('Created ScheduleEventModal.jsx');
