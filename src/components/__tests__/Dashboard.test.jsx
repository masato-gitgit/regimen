import React from 'react';
import { render, screen } from '@testing-library/react';
import Dashboard from '../Dashboard';
import { vi, describe, it, expect } from 'vitest';

describe('Dashboard Component', () => {
  it('renders summary cards with correct counts', () => {
    const mockPatients = [
      {
        id: 'P001',
        name: 'テスト 太郎',
        activeRegimen: { regimenId: 'R001', currentCycle: 1, totalCycles: 4 },
        schedule: [
          { date: new Date().toISOString().split('T')[0], isDrugDay: true, status: 'completed' }
        ]
      },
      {
        id: 'P002',
        name: 'テスト 花子',
        activeRegimen: { regimenId: 'R002', currentCycle: 2, totalCycles: 6 },
        schedule: [
          { date: '2099-01-01', isDrugDay: true, status: 'pending' }
        ]
      }
    ];

    const mockRegimens = [
      { id: 'R001', name: 'Regimen A', drugDays: [1, 8, 15] },
      { id: 'R002', name: 'Regimen B', drugDays: [1] }
    ];

    const mockAlerts = [
      { patientId: 'P002', patientName: 'テスト 花子', message: '体重が減少しています' }
    ];

    render(
      <Dashboard 
        patients={mockPatients} 
        regimens={mockRegimens} 
        alerts={mockAlerts}
        onNavigate={vi.fn()}
        onSelectPatient={vi.fn()}
      />
    );

    // Patients count: 2
    expect(screen.getByText('2')).toBeInTheDocument();
    
    // Alerts count: 1
    expect(screen.getByText('1')).toBeInTheDocument();

    // Today's scheduled patients: only P001 has schedule today (completed)
    // 1/1 completed => 100%
    expect(screen.getByText('1/1')).toBeInTheDocument();
    expect(screen.getAllByText(/完了/).length).toBeGreaterThan(0);

    // Alert details
    expect(screen.getByText(/テスト 花子/)).toBeInTheDocument();
    expect(screen.getByText(/体重が減少しています/)).toBeInTheDocument();
  });

  it('renders empty state when no patients scheduled for today', () => {
    render(
      <Dashboard 
        patients={[]} 
        regimens={[]} 
        alerts={[]}
        onNavigate={vi.fn()}
        onSelectPatient={vi.fn()}
      />
    );

    expect(screen.getByText('本日投与が予定されている患者はいません。')).toBeInTheDocument();
  });
});
