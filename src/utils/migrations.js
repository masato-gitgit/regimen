import { PROTOCOL_TYPES, guessProtocolType } from './regimenProtocols';

/**
 * 起動時に実行されるマイグレーション処理
 * @param {Array} regimens 現在のレジメン配列
 * @param {Array} patients 現在の患者配列
 * @param {number} currentVersion 現在のマイグレーションバージョン
 * @returns {object} { regimens, patients, version, updated }
 */
export const runMigrations = (regimens, patients, currentVersion) => {
  let currentRegimens = [...regimens];
  let currentPatients = [...patients];
  let migrationVersion = currentVersion || 0;
  let updatedAny = false;

  // V1: 古い重複したデフォルトレジメン（R001〜R016）を自動クリーンアップ
  if (migrationVersion < 1) {
    const beforeLen = currentRegimens.length;
    const oldDefaultIds = [
      'R001', 'R002', 'R003', 'R004', 'R005', 'R006', 'R007', 'R008', 'R009', 'R010',
      'R011', 'R012', 'R013', 'R014', 'R015', 'R016'
    ];
    currentRegimens = currentRegimens.filter(r => !oldDefaultIds.includes(r.id));
    if (currentRegimens.length !== beforeLen) {
      updatedAny = true;
    }
    migrationVersion = 1;
  }

  // V2: テクベイリ（R011/R6953）のレジメン設定を自動マイグレーション
  if (migrationVersion < 2) {
    currentRegimens = currentRegimens.map(r => {
      if (r.id === 'R011' || r.id === 'R6953') {
        const isCorrect = r.drugs?.length === 4 && r.drugs[3].applicableCycles?.includes(2);
        if (!isCorrect) {
          updatedAny = true;
          // V5: Remove legacy 'todayStatus' field from patients
  if (migrationVersion < 5) {
    currentPatients = currentPatients.map(p => {
      if ('todayStatus' in p) {
        updatedAny = true;
        const { todayStatus: _removed, ...rest } = p;
        return rest;
      }
      return p;
    });
    migrationVersion = 5;
  }

  return {
            ...r,
            cycleDays: 28,
            totalCycles: 8,
            drugs: [
              { name: "テクベイリ皮下注", doseValue: 0.06, doseType: "weight", route: "皮下注射", order: 1, duration: 5, applicableCycles: [1], applicableDays: [1] },
              { name: "テクベイリ皮下注", doseValue: 0.3,  doseType: "weight", route: "皮下注射", order: 1, duration: 5, applicableCycles: [1], applicableDays: [4] },
              { name: "テクベイリ皮下注", doseValue: 1.5,  doseType: "weight", route: "皮下注射", order: 1, duration: 5, applicableCycles: [1], applicableDays: [8, 15, 22] },
              { name: "テクベイリ皮下注", doseValue: 1.5,  doseType: "weight", route: "皮下注射", order: 1, duration: 5, applicableCycles: [2, 3, 4, 5, 6, 7, 8], applicableDays: [1, 8, 15, 22] }
            ]
          };
        }
      }
      return r;
    });
    migrationVersion = 2;
  }

  // V3: ルンスミオ（R012, R013 系）のレジメン設定を自動マイグレーション
  if (migrationVersion < 3) {
    currentRegimens = currentRegimens.map(r => {
      if (r.id === 'R012') {
        const isCorrect = r.drugs?.length === 5 && r.drugs[4].applicableCycles?.includes(17);
        if (!isCorrect) {
          updatedAny = true;
          return {
            ...r,
            cycleDays: 21,
            totalCycles: 8,
            drugs: [
              { name: "ルンスミオ点滴静注", doseValue: 1,  doseType: "fixed", route: "点滴静注", order: 1, duration: 240, applicableDays: [1],      applicableCycles: [1] },
              { name: "ルンスミオ点滴静注", doseValue: 2,  doseType: "fixed", route: "点滴静注", order: 1, duration: 240, applicableDays: [8],      applicableCycles: [1] },
              { name: "ルンスミオ点滴静注", doseValue: 60, doseType: "fixed", route: "点滴静注", order: 1, duration: 240, applicableDays: [15],     applicableCycles: [1] },
              { name: "ルンスミオ点滴静注", doseValue: 60, doseType: "fixed", route: "点滴静注", order: 1, duration: 120, applicableDays: [1],      applicableCycles: [2] },
              { name: "ルンスミオ点滴静注", doseValue: 30, doseType: "fixed", route: "点滴静注", order: 1, duration: 120, applicableDays: [1],      applicableCycles: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] }
            ]
          };
        }
      }
      if (r.id === 'R013' || r.id === 'R6365' || r.id === 'R9045') {
        const isCorrect = r.drugs?.length === 3 && r.drugs[2].applicableCycles?.includes(17);
        if (!isCorrect) {
          updatedAny = true;
          return {
            ...r,
            cycleDays: 21,
            totalCycles: 8,
            drugs: [
              { name: "ルンスミオ皮下注", doseValue: 5,  doseType: "fixed", route: "皮下注射", order: 1, duration: 2, applicableDays: [1],      applicableCycles: [1] },
              { name: "ルンスミオ皮下注", doseValue: 45, doseType: "fixed", route: "皮下注射", order: 1, duration: 2, applicableDays: [8, 15],  applicableCycles: [1] },
              { name: "ルンスミオ皮下注", doseValue: 45, doseType: "fixed", route: "皮下注射", order: 1, duration: 2, applicableDays: [1],      applicableCycles: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] }
            ]
          };
        }
      }
      return r;
    });
    migrationVersion = 3;
  }

  // V4: protocolTypeの付与
  if (migrationVersion < 4) {
    currentRegimens = currentRegimens.map(r => {
      if (r.protocolType === undefined) {
        updatedAny = true;
        // IDや名前から判定
        let pType = guessProtocolType(r.name);
        if (!pType) {
          if (r.id === 'R011' || r.id === 'R6953') pType = PROTOCOL_TYPES.TECVAYLI;
          else if (r.id === 'R013' || r.id === 'R6365' || r.id === 'R9045') pType = PROTOCOL_TYPES.LUNSUMIO_SC;
          else if (r.id === 'R012') pType = PROTOCOL_TYPES.LUNSUMIO_IV;
          else if (['R014', 'R015', 'R016', 'R8321'].includes(r.id)) pType = PROTOCOL_TYPES.TALQUETAMAB;
        }
        
        // 併用療法かチェック
        if (pType === PROTOCOL_TYPES.TECVAYLI || pType === PROTOCOL_TYPES.TALQUETAMAB) {
          if ((r.name?.includes('タービー') || r.name?.includes('トアルクエタマブ')) && 
              (r.name?.includes('テクベイリ') || r.name?.includes('テクラスタマブ'))) {
            pType = PROTOCOL_TYPES.COMBINATION;
          }
        }
        
        return {
          ...r,
          protocolType: pType || null
        };
      }
      return r;
    });
    migrationVersion = 4;
  }

  // V5: Remove legacy 'todayStatus' field from patients
  if (migrationVersion < 5) {
    currentPatients = currentPatients.map(p => {
      if ('todayStatus' in p) {
        updatedAny = true;
        const { todayStatus: _removed, ...rest } = p;
        return rest;
      }
      return p;
    });
    migrationVersion = 5;
  }

  return { regimens: currentRegimens, patients: currentPatients, version: migrationVersion, updated: updatedAny };
};
