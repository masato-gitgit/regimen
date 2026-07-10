import React, { useState, useEffect } from 'react';
import { formatDose } from '../../utils/doseUtils';
import { getLocalDateString, parseLocalDate, addDays } from '../../utils/dateUtils';
import { applyTecvayliRestart, applyLunsumioRestart, applyTalquetamabRestart, changeTecvayliInterval, changeCombinationInterval } from '../../utils/protocolActions';
import { useToast } from '../../hooks/useToast';
import ScheduleEventModalHeader from './ScheduleEventModalHeader';
import ScheduleEventDrugList from './ScheduleEventDrugList';
import ScheduleEventActionPanel from './ScheduleEventActionPanel';
import ScheduleEventProtocolActions from './ScheduleEventProtocolActions';

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
      .sort((a, b) => b.date.localeCompare(a.date));
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
    toast(`タービー再開プロトコル（再開用量: ${targetDoseValue} mg/kg）を適用し、スケジュールを再構成しました。`);
    onClose();
  };

  // テクベイリの投与間隔変更
  const handleUpdateTecveyriInterval = (newIntervalWeeks, targetDateStr) => {
    if (!selectedPatient) return;
    const newSchedule = changeTecvayliInterval(selectedPatient.schedule || [], targetDateStr, newIntervalWeeks);
    onUpdatePatient({
      ...selectedPatient,
      schedule: newSchedule,
      activeRegimen: {
        ...selectedPatient.activeRegimen,
        intervalWeeks: newIntervalWeeks
      }
    });
    toast(`テクベイリの投与間隔を ${newIntervalWeeks} 週間隔に変更し、スケジュールを再構成しました。`);
    onClose();
  };

  // タービー・テクベイリ併用の投与間隔変更
  const handleUpdateCombinationInterval = (newIntervalWeeks, targetDateStr) => {
    if (!selectedPatient) return;
    const newSchedule = changeCombinationInterval(selectedPatient.schedule || [], targetDateStr, newIntervalWeeks);
    onUpdatePatient({
      ...selectedPatient,
      schedule: newSchedule,
      activeRegimen: {
        ...selectedPatient.activeRegimen,
        intervalWeeks: newIntervalWeeks
      }
    });
    toast(`投与間隔を ${newIntervalWeeks} 週間隔に変更し、スケジュールを再構成しました。`);
    onClose();
  };

  // タービー・テクベイリ併用の継続投与開始（1C Day 11）からの経過週数を計算
  const getWeeksSinceCombinationStart = () => {
    if (!selectedPatient || !selectedPatient.schedule) return 0;
    const startEvent = selectedPatient.schedule.find(
      s => s.cycleNumber === 1 && s.dayNumber === 11
    );
    if (!startEvent) return 0;
    const startDate = parseLocalDate(startEvent.date);
    const eventDate = parseLocalDate(selectedEvent.date);
    const diffTime = eventDate.getTime() - startDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7);
  };

  const isTecveyri = selectedPatient?.activeRegimen?.id === 'R012';
  const isCombination = selectedPatient?.activeRegimen?.id === 'R8321';
  const isTalquetamab = selectedPatient?.activeRegimen?.id === 'R014' || selectedPatient?.activeRegimen?.id === 'R014_2w';
  const isLunsumio = selectedPatient?.activeRegimen?.protocolType === 'lunsumio';
  
  const setSelectedEvent = onClose;

  return (
    <div className="modal-overlay">
      <div className="modal-content-container">
        
        <ScheduleEventModalHeader 
          selectedEvent={selectedEvent} 
          onClose={onClose} 
        />

        <div className="modal-body-section">
          <ScheduleEventDrugList 
            selectedEvent={selectedEvent}
            selectedPatient={selectedPatient}
          />
          
          <ScheduleEventActionPanel 
            selectedEvent={selectedEvent}
            selectedPatient={selectedPatient}
            onUpdatePatient={onUpdatePatient}
            toast={toast}
            setSelectedEvent={setSelectedEvent}
            sideEffects={getLastCompletedSideEffects()}
            delayDays={delayDays} setDelayDays={setDelayDays}
            manualDate={manualDate} setManualDate={setManualDate}
            slideRest={slideRest} setSlideRest={setSlideRest}
            crsGrade={crsGrade} setCrsGrade={setCrsGrade}
            hematologicGrade={hematologicGrade} setHematologicGrade={setHematologicGrade}
            otherGrade={otherGrade} setOtherGrade={setOtherGrade}
            completionNotes={completionNotes} setCompletionNotes={setCompletionNotes}
            preOmittedDrugIndices={preOmittedDrugIndices} setPreOmittedDrugIndices={setPreOmittedDrugIndices}
          />

          <ScheduleEventProtocolActions 
            selectedEvent={selectedEvent}
            selectedPatient={selectedPatient}
            isTecveyri={isTecveyri}
            isCombination={isCombination}
            isTalquetamab={isTalquetamab}
            isLunsumio={isLunsumio}
            getWeeksSinceCombinationStart={getWeeksSinceCombinationStart}
            handleUpdateTecveyriInterval={handleUpdateTecveyriInterval}
            handleUpdateCombinationInterval={handleUpdateCombinationInterval}
            handleApplyProtocol={handleApplyProtocol}
            handleApplyLunsumioProtocol={handleApplyLunsumioProtocol}
            handleApplyTalquetamabProtocol={handleApplyTalquetamabProtocol}
            preOmittedDrugIndices={preOmittedDrugIndices}
            setPreOmittedDrugIndices={setPreOmittedDrugIndices}
            confirm={confirm}
          />

        </div>
      </div>
    </div>
  );
}
