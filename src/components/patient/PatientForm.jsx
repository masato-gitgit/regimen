import React, { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { calcAge } from '../../utils/renalUtils';

export default function PatientForm({
  mode = 'add', // 'add' or 'edit'
  initialData = null,
  existingPatients = [],
  onSave,
  onCancel
}) {
  const { toast } = useToast();

  const getEmptyForm = () => ({
    id: '',
    name: '',
    gender: 'male',
    birthDate: '',
    height: '',
    weight: '',
    creatinine: '',
    wbc: '',
    plt: '',
    comments: ''
  });

  const [formData, setFormData] = useState(getEmptyForm());

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        ...getEmptyForm(),
        ...initialData,
        // Number fields are sometimes null in initialData, convert to empty string for inputs
        height: initialData.height ?? '',
        weight: initialData.weight ?? '',
        creatinine: initialData.creatinine ?? '',
        wbc: initialData.wbc ?? '',
        plt: initialData.plt ?? '',
        comments: initialData.comments || ''
      });
    } else {
      setFormData(getEmptyForm());
    }
  }, [mode, initialData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateBSA = (height, weight) => {
    if (!height || !weight) return 0;
    const h = parseFloat(height);
    const w = parseFloat(weight);
    // DuBois formula: BSA = 0.007184 * H^0.725 * W^0.425
    const bsa = 0.007184 * (h ** 0.725) * (w ** 0.425);
    return Math.round(bsa * 100) / 100;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === 'add' && !formData.id) {
      toast('患者IDを入力してください。');
      return;
    }

    if (!formData.name || !formData.birthDate || !formData.height || !formData.weight) {
      toast('必須項目を入力してください。');
      return;
    }

    if (mode === 'add' && existingPatients.some(p => p.id === formData.id)) {
      toast(`この患者ID（${formData.id}）はすでに登録されています。別のIDを入力してください。`);
      return;
    }

    const bsa = calculateBSA(formData.height, formData.weight);

    const savedData = {
      ...formData,
      age: calcAge(formData.birthDate),
      height: parseFloat(formData.height),
      weight: parseFloat(formData.weight),
      creatinine: formData.creatinine ? parseFloat(formData.creatinine) : null,
      wbc: formData.wbc ? parseFloat(formData.wbc) : null,
      plt: formData.plt ? parseFloat(formData.plt) : null,
      comments: formData.comments || '',
      bsa
    };

    onSave(savedData);
  };

  const isDuplicateId = mode === 'add' && formData.id && existingPatients.some(pt => pt.id === formData.id);

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <UserPlus size={20} />
          {mode === 'add' ? '新規患者登録' : '患者情報修正'}
        </h3>
        {mode === 'edit' && formData.id && (
          <span className="badge badge-info">ID: {formData.id}</span>
        )}
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">患者ID {mode === 'add' ? '*' : ''}</label>
              <input
                type="text"
                className="form-control"
                required={mode === 'add'}
                readOnly={mode === 'edit'}
                value={formData.id}
                onChange={e => handleChange('id', e.target.value)}
                placeholder="例: P004"
                style={{
                  backgroundColor: mode === 'edit' ? '#e2e8f0' : 'transparent',
                  cursor: mode === 'edit' ? 'not-allowed' : 'text',
                  borderColor: isDuplicateId ? 'var(--color-danger)' : ''
                }}
              />
              {isDuplicateId && (
                <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '4px' }}>
                  この患者IDはすでに登録されています。
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">氏名 *</label>
              <input
                type="text"
                className="form-control"
                required
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="例: 山田 花子"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">性別 *</label>
              <select
                className="form-control"
                value={formData.gender}
                onChange={e => handleChange('gender', e.target.value)}
              >
                <option value="male">男性</option>
                <option value="female">女性</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">生年月日 *</label>
              <input
                type="date"
                className="form-control"
                required
                value={formData.birthDate}
                onChange={e => handleChange('birthDate', e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">身長 (cm) *</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                required
                value={formData.height}
                onChange={e => handleChange('height', e.target.value)}
                placeholder="例: 160.5"
              />
            </div>
            <div className="form-group">
              <label className="form-label">体重 (kg) *</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                required
                value={formData.weight}
                onChange={e => handleChange('weight', e.target.value)}
                placeholder="例: 55"
              />
            </div>
          </div>

          <h4 style={{ margin: '20px 0 10px', fontSize: '0.95rem', color: 'var(--color-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '5px' }}>
            検査データ（任意）
          </h4>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">血清クレアチニン (mg/dL)</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={formData.creatinine}
                onChange={e => handleChange('creatinine', e.target.value)}
                placeholder="例: 0.85"
              />
            </div>
            <div className="form-group">
              <label className="form-label">白血球数 WBC (/μL)</label>
              <input
                type="number"
                className="form-control"
                value={formData.wbc}
                onChange={e => handleChange('wbc', e.target.value)}
                placeholder="例: 4500"
              />
            </div>
            <div className="form-group">
              <label className="form-label">血小板数 PLT (万/μL)</label>
              <input
                type="number"
                className="form-control"
                value={formData.plt}
                onChange={e => handleChange('plt', e.target.value)}
                placeholder="例: 22"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '15px' }}>
            <label className="form-label">カルテコメント・特記事項（任意）</label>
            <textarea
              className="form-control"
              rows="3"
              value={formData.comments}
              onChange={e => handleChange('comments', e.target.value)}
              placeholder="患者の特記事項、経過、アレルギー、併用薬などを記入してください。"
              style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="button" className="btn btn-outline" onClick={onCancel}>
              キャンセル
            </button>
            <button type="submit" className="btn btn-secondary">
              {mode === 'add' ? '登録を完了する' : '保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
