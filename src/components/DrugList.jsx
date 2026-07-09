import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Search, AlertCircle, FileText, Check, X } from 'lucide-react';

export default function DrugList({ drugsMaster, regimens, patients, onAddDrug, onUpdateDrug, onDeleteDrug, confirm }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingDrugId, setEditingDrugId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    route: '点滴静注',
    doseType: 'fixed',
    defaultDoseValue: '',
    defaultDuration: '60',
    hasRenalLimit: false,
    renalThreshold: '',
    renalReductionRatio: '',
    notes: ''
  });

  // 検索フィルタリング
  const filteredDrugs = drugsMaster.filter(drug => {
    const term = searchTerm.toLowerCase();
    return (
      drug.name.toLowerCase().includes(term) ||
      (drug.notes && drug.notes.toLowerCase().includes(term)) ||
      drug.route.toLowerCase().includes(term)
    );
  });

  // 薬剤がどのレジメンで使用されているか取得
  const getUsageInRegimens = (drugId) => {
    return regimens.filter(r => r.drugs && r.drugs.some(d => d.drugId === drugId));
  };

  // 薬剤がどの患者で使用されているか取得
  const getUsageInPatients = (drugId) => {
    return patients.filter(p => p.activeRegimen && p.activeRegimen.drugs && p.activeRegimen.drugs.some(d => d.drugId === drugId));
  };

  // フォーム変更
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // 編集開始
  const handleStartEdit = (drug) => {
    setEditingDrugId(drug.id);
    setFormData({
      name: drug.name,
      route: drug.route,
      doseType: drug.doseType,
      defaultDoseValue: drug.defaultDoseValue,
      defaultDuration: drug.defaultDuration,
      hasRenalLimit: !!drug.hasRenalLimit,
      renalThreshold: drug.renalThreshold !== undefined && drug.renalThreshold !== null ? drug.renalThreshold : '',
      renalReductionRatio: drug.renalReductionRatio !== undefined && drug.renalReductionRatio !== null ? drug.renalReductionRatio : '',
      notes: drug.notes || ''
    });
    setIsAdding(true);
  };

  // 編集/追加キャンセル
  const handleCancel = () => {
    setIsAdding(false);
    setEditingDrugId(null);
    setFormData({
      name: '',
      route: '点滴静注',
      doseType: 'fixed',
      defaultDoseValue: '',
      defaultDuration: '60',
      hasRenalLimit: false,
      renalThreshold: '',
      renalReductionRatio: '',
      notes: ''
    });
  };

  // 保存処理
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || formData.defaultDoseValue === '' || formData.defaultDuration === '') {
      alert('必須項目をすべて入力してください。');
      return;
    }

    if (formData.hasRenalLimit) {
      if (formData.renalThreshold === '' || formData.renalReductionRatio === '') {
        alert('腎機能制限を設定する場合は、eGFR閾値と減量比率を両方入力してください。');
        return;
      }
    }

    const drugData = {
      id: editingDrugId || `D${String(drugsMaster.length + 1).padStart(3, '0')}-${Date.now().toString().slice(-4)}`,
      name: formData.name.trim(),
      route: formData.route,
      doseType: formData.doseType,
      defaultDoseValue: parseFloat(formData.defaultDoseValue),
      defaultDuration: parseInt(formData.defaultDuration, 10),
      hasRenalLimit: formData.hasRenalLimit,
      renalThreshold: formData.hasRenalLimit ? parseFloat(formData.renalThreshold) : null,
      renalReductionRatio: formData.hasRenalLimit ? parseFloat(formData.renalReductionRatio) : null,
      notes: formData.notes.trim()
    };

    if (editingDrugId) {
      onUpdateDrug(drugData);
      alert('薬剤情報を更新しました。');
    } else {
      // 重複チェック
      const isDuplicate = drugsMaster.some(d => d.name === drugData.name && d.route === drugData.route);
      if (isDuplicate) {
        const ok = await confirm(
          '同じ名前と投与ルートの薬剤がすでに登録されています。登録を続行しますか？',
          '重複登録の確認',
          { confirmLabel: '登録する' }
        );
        if (!ok) {
          return;
        }
      }
      onAddDrug(drugData);
      alert('新しい薬剤を登録しました。');
    }

    handleCancel();
  };

  // 削除処理
  const handleDelete = async (drugId, drugName) => {
    const usageRegimens = getUsageInRegimens(drugId);
    const usagePatients = getUsageInPatients(drugId);

    if (usageRegimens.length > 0 || usagePatients.length > 0) {
      let msg = `${drugName} は現在使用中のため削除できません。\n\n`;
      if (usageRegimens.length > 0) {
        msg += `使用中のレジメンテンプレート: ${usageRegimens.map(r => r.name).join(', ')}\n`;
      }
      if (usagePatients.length > 0) {
        msg += `使用中の患者個別レジメン: ${usagePatients.map(p => p.name).join(', ')}\n`;
      }
      alert(msg);
      return;
    }

    const ok = await confirm(
      `${drugName} をマスタから削除してもよろしいですか？`,
      '薬剤の削除',
      { confirmLabel: '削除する', variant: 'danger' }
    );
    if (ok) {
      onDeleteDrug(drugId);
      alert('薬剤を削除しました。');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0 }}>
          抗がん剤および併用される支持療法薬の基本情報を一元管理します。ここで編集された名前やルートは、参照しているレジメンやスケジュールに自動で連動します。
        </p>
        {!isAdding && (
          <button 
            className="btn btn-primary" 
            onClick={() => setIsAdding(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            <span>新規薬剤追加</span>
          </button>
        )}
      </div>

      {isAdding && (
        <div className="card" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', backgroundColor: '#f8fafc' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>
              {editingDrugId ? '薬剤情報の編集' : '新規薬剤の登録'}
            </h3>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', marginBottom: '15px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px', display: 'block' }}>
                  薬剤名 <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange}
                  placeholder="例: テクベイリ皮下注"
                  required 
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px', display: 'block' }}>
                  投与ルート <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <select 
                  name="route" 
                  value={formData.route} 
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', backgroundColor: '#fff' }}
                >
                  <option value="点滴静注">点滴静注</option>
                  <option value="皮下注射">皮下注射</option>
                  <option value="静脈注射">静脈注射</option>
                  <option value="経口投与">経口投与</option>
                  <option value="その他">その他</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px', display: 'block' }}>
                  用量タイプ <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <select 
                  name="doseType" 
                  value={formData.doseType} 
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', backgroundColor: '#fff' }}
                >
                  <option value="fixed">固定用量 (fixed)</option>
                  <option value="weight">体重換算用量 (weight)</option>
                  <option value="bsa">体表面積換算用量 (bsa)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px', display: 'block' }}>
                  標準用量 <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="number" 
                    step="0.001"
                    name="defaultDoseValue" 
                    value={formData.defaultDoseValue} 
                    onChange={handleChange}
                    placeholder="例: 1.5"
                    required 
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', minWidth: '60px' }}>
                    {formData.doseType === 'bsa' && 'mg/m²'}
                    {formData.doseType === 'weight' && 'mg/kg'}
                    {formData.doseType === 'fixed' && 'mg (固定)'}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px', display: 'block' }}>
                  標準投与時間 (分) <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input 
                  type="number" 
                  name="defaultDuration" 
                  value={formData.defaultDuration} 
                  onChange={handleChange}
                  placeholder="例: 60"
                  required 
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--color-border)', paddingTop: '15px', marginTop: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600' }}>
                  <input 
                    type="checkbox" 
                    name="hasRenalLimit" 
                    checked={formData.hasRenalLimit} 
                    onChange={handleChange}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>腎機能（eGFR値）に応じた減量・休薬基準を設定する</span>
                </label>
              </div>

              {formData.hasRenalLimit && (
                <>
                  <div className="form-group" style={{ animation: 'fadeIn 0.2s ease-out' }}>
                    <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px', display: 'block' }}>
                      減量閾値 (eGFR値 mL/min) <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <input 
                      type="number" 
                      name="renalThreshold" 
                      value={formData.renalThreshold} 
                      onChange={handleChange}
                      placeholder="例: 45"
                      required={formData.hasRenalLimit}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
                    />
                  </div>

                  <div className="form-group" style={{ animation: 'fadeIn 0.2s ease-out' }}>
                    <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px', display: 'block' }}>
                      減量後の用量比率 (%) <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="number" 
                        name="renalReductionRatio" 
                        value={formData.renalReductionRatio} 
                        onChange={handleChange}
                        placeholder="例: 50"
                        min="0"
                        max="100"
                        required={formData.hasRenalLimit}
                        style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', minWidth: '40px' }}>
                        %
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                      0% を指定すると、投与中止（休薬）の提案になります。
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px', display: 'block' }}>
                注意事項・減量休薬基準
              </label>
              <textarea 
                name="notes" 
                value={formData.notes} 
                onChange={handleChange}
                placeholder="例: クレアチニンクリアランスが45未満の場合は減量を考慮。"
                rows="3"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                キャンセル
              </button>
              <button type="submit" className="btn btn-primary">
                {editingDrugId ? '更新する' : '登録する'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 検索・一覧セクション */}
      <div className="card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input 
              type="text" 
              placeholder="薬剤名やルートで検索..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid var(--color-border)', borderRadius: '20px', fontSize: '0.85rem' }}
            />
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            登録数: {drugsMaster.length}件
          </span>
        </div>

        <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
          {filteredDrugs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              登録されている薬剤がありません。
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid var(--color-border)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  <th style={{ padding: '12px 20px' }}>ID</th>
                  <th style={{ padding: '12px 20px' }}>薬剤名</th>
                  <th style={{ padding: '12px 20px' }}>ルート</th>
                  <th style={{ padding: '12px 20px' }}>標準設定</th>
                  <th style={{ padding: '12px 20px' }}>使用状況</th>
                  <th style={{ padding: '12px 20px' }}>注意事項</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrugs.map((drug, index) => {
                  const usageRegs = getUsageInRegimens(drug.id);
                  const usagePat = getUsageInPatients(drug.id);
                  const inUse = usageRegs.length > 0 || usagePat.length > 0;

                  return (
                    <tr key={drug.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '0.9rem', backgroundColor: index % 2 === 0 ? '#fff' : '#fcfdfe' }}>
                      <td style={{ padding: '12px 20px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{drug.id}</td>
                      <td style={{ padding: '12px 20px', fontWeight: '600' }}>{drug.name}</td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem', 
                          fontWeight: '600',
                          backgroundColor: drug.route === '点滴静注' ? 'var(--color-info-light)' : drug.route === '皮下注射' ? 'var(--color-secondary-light)' : '#f1f5f9',
                          color: drug.route === '点滴静注' ? 'var(--color-info)' : drug.route === '皮下注射' ? 'var(--color-secondary)' : 'var(--color-text-muted)'
                        }}>
                          {drug.route}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ fontSize: '0.85rem' }}>
                          <div>用量: {drug.defaultDoseValue} {
                            drug.doseType === 'bsa' ? 'mg/m²' :
                            drug.doseType === 'weight' ? 'mg/kg' : 'mg'
                          }</div>
                          <div style={{ color: 'var(--color-text-muted)' }}>時間: {drug.defaultDuration}分</div>
                          {drug.hasRenalLimit && (
                            <div style={{ marginTop: '6px' }}>
                              <span style={{ 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                fontSize: '0.7rem', 
                                fontWeight: '700',
                                backgroundColor: 'var(--color-warning-light)',
                                color: '#b45309',
                                border: '1px solid var(--color-warning)',
                                display: 'inline-block'
                              }}>
                                腎制限: eGFR &lt; {drug.renalThreshold} で {drug.renalReductionRatio}%
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {usageRegs.length > 0 && (
                            <span className="badge badge-info" style={{ fontSize: '0.7rem', width: 'fit-content' }}>
                              レジメン: {usageRegs.length}件
                            </span>
                          )}
                          {usagePat.length > 0 && (
                            <span className="badge badge-success" style={{ fontSize: '0.7rem', width: 'fit-content' }}>
                              治療中患者: {usagePat.length}名
                            </span>
                          )}
                          {!inUse && (
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>未使用</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--color-text-muted)', fontSize: '0.8rem' }} title={drug.notes}>
                        {drug.notes || '---'}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button 
                            onClick={() => handleStartEdit(drug)}
                            style={{ 
                              background: 'none', border: 'none', color: 'var(--color-info)', cursor: 'pointer', padding: '4px',
                              display: 'flex', alignItems: 'center' 
                            }}
                            title="編集"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(drug.id, drug.name)}
                            style={{ 
                              background: 'none', border: 'none', 
                              color: inUse ? 'var(--color-border)' : 'var(--color-danger)', 
                              cursor: inUse ? 'not-allowed' : 'pointer', 
                              padding: '4px',
                              display: 'flex', alignItems: 'center'
                            }}
                            disabled={inUse}
                            title={inUse ? '使用中のため削除できません' : '削除'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
