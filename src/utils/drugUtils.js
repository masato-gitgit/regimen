/**
 * 薬剤マスタの更新内容を、関連するレジメンと患者データ（現在のアクティブレジメンとスケジュール）に伝播させる
 * 
 * @param {Object} updatedDrug 更新された薬剤情報
 * @param {Array} regimens レジメン配列
 * @param {Array} patients 患者配列
 * @returns {Object} { updatedRegimens, updatedPatients }
 */
export const propagateDrugUpdate = (updatedDrug, regimens, patients) => {
  // 1. レジメンテンプレートマスタの該当薬剤の name, route を同期
  const updatedRegimens = regimens.map(r => {
    if (r.drugs) {
      const updatedRegimenDrugs = r.drugs.map(d => {
        if (d.drugId === updatedDrug.id) {
          return {
            ...d,
            name: updatedDrug.name,
            route: updatedDrug.route
          };
        }
        return d;
      });
      return { ...r, drugs: updatedRegimenDrugs };
    }
    return r;
  });

  // 2. 患者個別レジメンの該当薬剤の name, route も同期（activeRegimen.drugs + schedule[].drugs 両方）
  const updatedPatients = patients.map(p => {
    let changed = false;

    // activeRegimen.drugs の同期
    let updatedActiveRegimen = p.activeRegimen;
    if (p.activeRegimen && p.activeRegimen.drugs) {
      const updatedPatientDrugs = p.activeRegimen.drugs.map(d => {
        if (d.drugId === updatedDrug.id) {
          return {
            ...d,
            name: updatedDrug.name,
            route: updatedDrug.route
          };
        }
        return d;
      });
      updatedActiveRegimen = {
        ...p.activeRegimen,
        drugs: updatedPatientDrugs
      };
      changed = true;
    }

    // schedule[].drugs の同期（過去スケジュール履歴も更新）
    let updatedSchedule = p.schedule;
    if (p.schedule && p.schedule.length > 0) {
      const newSchedule = p.schedule.map(s => {
        if (!s.drugs) return s;
        const updatedSDrugs = s.drugs.map(d => {
          if (d.drugId === updatedDrug.id) {
            return {
              ...d,
              name: updatedDrug.name,
              route: updatedDrug.route
            };
          }
          return d;
        });
        return { ...s, drugs: updatedSDrugs };
      });
      updatedSchedule = newSchedule;
      changed = true;
    }

    if (!changed) return p;
    return {
      ...p,
      activeRegimen: updatedActiveRegimen,
      schedule: updatedSchedule
    };
  });

  return { updatedRegimens, updatedPatients };
};
