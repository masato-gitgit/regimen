import { describe, it, expect } from 'vitest';
import { runMigrations } from '../migrations';
import { PROTOCOL_TYPES } from '../regimenProtocols';

describe('migrations', () => {
  it('should apply protocolType correctly in V4 migration', () => {
    const mockRegimens = [
      { id: '1', name: '標準的なレジメン' }, // protocolType: null になるはず
      { id: 'R012', name: 'ルンスミオ 皮下注' }, // PROTOCOL_TYPES.LUNSUMIO_SC
      { id: 'R013', name: 'ルンスミオ 点滴静注' }, // PROTOCOL_TYPES.LUNSUMIO_IV
      { id: 'R014', name: 'タービー (毎週投与)' }, // PROTOCOL_TYPES.TALQUETAMAB
      { id: 'R015', name: 'タービー (隔週投与 0.8mg/kg)' }, // PROTOCOL_TYPES.TALQUETAMAB
      { id: '2', name: 'タービー/テクベイリ 併用療法' }, // COMBINATION
      { id: '3', name: '未登録の テクベイリ 併用' }, // TECVAYLI
    ];

    const result = runMigrations(mockRegimens, [], 3); // V3 から V5 へのマイグレーションを実行

    expect(result.version).toBe(5);
    expect(result.updated).toBe(true);

    const regimens = result.regimens;

    expect(regimens.find(r => r.id === '1').protocolType).toBeNull();
    expect(regimens.find(r => r.id === 'R012').protocolType).toBe(PROTOCOL_TYPES.LUNSUMIO_SC);
    expect(regimens.find(r => r.id === 'R013').protocolType).toBe(PROTOCOL_TYPES.LUNSUMIO_IV);
    expect(regimens.find(r => r.id === 'R014').protocolType).toBe(PROTOCOL_TYPES.TALQUETAMAB);
    expect(regimens.find(r => r.id === 'R015').protocolType).toBe(PROTOCOL_TYPES.TALQUETAMAB);
    expect(regimens.find(r => r.id === '2').protocolType).toBe(PROTOCOL_TYPES.COMBINATION);
    expect(regimens.find(r => r.id === '3').protocolType).toBe(PROTOCOL_TYPES.TECVAYLI);
  });


  it('should remove legacy todayStatus field in V5 migration', () => {
    const mockPatients = [
      { id: 'p1', name: 'Patient A', todayStatus: 'completed' },
      { id: 'p2', name: 'Patient B', todayStatus: 'pending', age: 60 },
      { id: 'p3', name: 'Patient C', age: 70 } // No todayStatus
    ];

    const result = runMigrations([], mockPatients, 4);

    expect(result.version).toBe(5);
    expect(result.updated).toBe(true);
    
    expect('todayStatus' in result.patients[0]).toBe(false);
    expect('todayStatus' in result.patients[1]).toBe(false);
    expect(result.patients[1].age).toBe(60);
    expect(result.patients[2].age).toBe(70);
  });

  it('should not update if already at latest version', () => {
    const result = runMigrations([], [], 5);
    expect(result.updated).toBe(false);
    expect(result.version).toBe(5);
  });
});
