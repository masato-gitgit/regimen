import React from 'react';
import { formatDose } from '../../utils/doseUtils';

export default function ScheduleEventDrugList({ selectedEvent, selectedPatient }) {
  if (!selectedEvent || !selectedEvent.drugs || selectedEvent.drugs.length === 0) {
    return null;
  }

  return (
    <div className="event-section">
      <div className="event-section-title">
        この日の投与予定薬剤：
      </div>
      <div className="flex-col-gap-8">
        {selectedEvent.drugs.map((drug, dIdx) => {
          let calculatedDose = 0;
          calculatedDose = drug.doseType === 'bsa' 
            ? drug.doseValue * selectedPatient.bsa 
            : drug.doseType === 'weight' 
              ? drug.doseValue * selectedPatient.weight 
              : drug.doseValue;
              
          if (selectedEvent.doseReduced) {
            calculatedDose = calculatedDose * (selectedEvent.doseReductionRate || 0.8);
          }
          
          return (
            <div key={dIdx} className="drug-list-card">
              <div className="drug-list-header">
                <span className="drug-name-text">・{drug.name}</span>
                <span>
                  <strong>{formatDose(calculatedDose, drug.name)} mg</strong> ({drug.route} / {drug.duration}分)
                  {selectedEvent.doseReduced && <span style={{ color: '#ef4444', marginLeft: '6px', fontSize: '0.75rem' }}>(20% 減量済)</span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
