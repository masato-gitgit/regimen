import React, { useRef, useState } from 'react';
import { Database, Download, Upload, Shield, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { safeSetLocalStorage } from '../utils/storageUtils';
import { useConfirm } from '../hooks/useConfirm';
import ConfirmModal from './ConfirmModal';
import {
  validateFullBackup,
  validatePatients,
  validateRegimens,
  validateDrugs,
} from '../utils/importValidation';

export default function BackupRestore({ patients, regimens, drugsMaster = [], onUpdatePatients, onUpdateRegimens, onUpdateDrugs, onBackupExecuted }) {
  const fileInputRefAll = useRef(null);
  const fileInputRefPatients = useRef(null);
  const fileInputRefRegimens = useRef(null);
  const fileInputRefDrugs = useRef(null);

  const [dragActiveAll, setDragActiveAll] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { confirm, modalProps: confirmModalProps } = useConfirm();

  const getLocalDateString = (dateObj = new Date()) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };


  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setErrorMessage('');
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const showError = (msg) => {
    setErrorMessage(msg);
    setSuccessMessage('');
    setTimeout(() => setErrorMessage(''), 5000);
  };

  // 1. 総合一括エクスポート
  const handleExportAll = () => {
    try {
      const exportObj = {
        patients,
        regimens,
        drugs: drugsMaster,
        exportedAt: new Date().toISOString(),
        version: '1.0',
        type: 'oncoscheduler_full_backup'
      };
      const dataStr = JSON.stringify(exportObj, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', `oncoscheduler_all_backup_${getLocalDateString()}.json`);
      linkElement.click();
      if (onBackupExecuted) {
        onBackupExecuted();
      }
      safeSetLocalStorage('onco_last_backup_time', new Date().toISOString());
      showSuccess('総合バックアップファイルをエクスポートしました。');
    } catch (e) {
      console.error('総合バックアップのエクスポート中にエラーが発生しました:', e);
      showError('エクスポートに失敗しました。');
    }
  };

  // 2. 患者データ個別エクスポート
  const handleExportPatients = () => {
    try {
      const dataStr = JSON.stringify(patients, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', `onco_patients_backup_${getLocalDateString()}.json`);
      linkElement.click();
      showSuccess('患者データをエクスポートしました。');
    } catch (e) {
      console.error('患者データのエクスポート中にエラーが発生しました:', e);
      showError('エクスポートに失敗しました。');
    }
  };

  // 3. レジメンマスタ個別エクスポート
  const handleExportRegimens = () => {
    try {
      const dataStr = JSON.stringify(regimens, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', `onco_regimens_backup_${getLocalDateString()}.json`);
      linkElement.click();
      showSuccess('レジメンマスタデータをエクスポートしました。');
    } catch (e) {
      console.error('レジメンマスタデータのエクスポート中にエラーが発生しました:', e);
      showError('エクスポートに失敗しました。');
    }
  };

  // 3.5. 薬剤マスタ個別エクスポート
  const handleExportDrugs = () => {
    try {
      const dataStr = JSON.stringify(drugsMaster, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', `onco_drugs_backup_${getLocalDateString()}.json`);
      linkElement.click();
      showSuccess('薬剤マスタデータをエクスポートしました。');
    } catch (e) {
      console.error('薬剤マスタデータのエクスポート中にエラーが発生しました:', e);
      showError('エクスポートに失敗しました。');
    }
  };

  // 4. 一括データインポート（復元）
  const processImportAll = async (jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (
        parsed.type !== 'oncoscheduler_full_backup' ||
        !Array.isArray(parsed.patients) ||
        !Array.isArray(parsed.regimens)
      ) {
        showError('無効なファイルフォーマットです。総合バックアップファイルを選択してください。');
        return;
      }

      // 詳細バリデーション
      const vResult = validateFullBackup(parsed);
      if (!vResult.ok) {
        showError(
          `ファイルの内容に不正なデータが含まれています。復元を中止しました。\n\n` +
          vResult.errors.join('\n')
        );
        return;
      }

      const ok = await confirm(
        `患者データ ${parsed.patients.length}件、レジメンデータ ${parsed.regimens.length}件を復元し、現在のデータを上書きします。\nよろしいですか？`,
        'データの復元（一括）',
        { confirmLabel: '復元する', variant: 'danger' }
      );
      if (ok) {
        onUpdatePatients(parsed.patients);
        onUpdateRegimens(parsed.regimens);
        if (parsed.drugs && Array.isArray(parsed.drugs)) {
          onUpdateDrugs(parsed.drugs);
        } else {
          onUpdateDrugs([]);
          localStorage.removeItem('onco_drugs');
        }
        showSuccess('総合バックアップファイルからすべてのデータを復元しました。');
      }
    } catch (e) {
      console.error('総合バックアップファイルの解析中にエラーが発生しました:', e);
      showError('ファイルの解析に失敗しました。正しいJSONファイルを選択してください。');
    }
  };

  // 5. 患者データインポート
  const processImportPatients = async (jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr);
      const targetArray = Array.isArray(parsed) ? parsed : (parsed.patients || null);
      if (!targetArray) {
        showError('無効なファイルフォーマットです。患者リストデータである必要があります。');
        return;
      }

      // 詳細バリデーション
      const vResult = validatePatients(targetArray);
      if (!vResult.ok) {
        showError(
          `患者データに不正なデータが含まれています。復元を中止しました。\n\n` +
          vResult.errors.join('\n')
        );
        return;
      }

      const ok = await confirm(
        `患者データ ${targetArray.length}件を復元し、現在のデータを上書きします。\nよろしいですか？`,
        '患者データの復元',
        { confirmLabel: '復元する', variant: 'danger' }
      );
      if (ok) {
        onUpdatePatients(targetArray);
        showSuccess('患者データを復元しました。');
      }
    } catch (e) {
      console.error('患者データファイルの解析中にエラーが発生しました:', e);
      showError('ファイルの解析に失敗しました。');
    }
  };

  // 6. レジメンマスタインポート
  const processImportRegimens = async (jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr);
      const targetArray = Array.isArray(parsed) ? parsed : (parsed.regimens || null);
      if (!targetArray) {
        showError('無効なファイルフォーマットです。レジメンリストデータである必要があります。');
        return;
      }

      // 詳細バリデーション
      const vResult = validateRegimens(targetArray);
      if (!vResult.ok) {
        showError(
          `レジメンデータに不正なデータが含まれています。復元を中止しました。\n\n` +
          vResult.errors.join('\n')
        );
        return;
      }

      const ok = await confirm(
        `標準レジメン ${targetArray.length}件を復元し、現在のマスタデータを上書きします。\nよろしいですか？`,
        'レジメンマスタの復元',
        { confirmLabel: '復元する', variant: 'danger' }
      );
      if (ok) {
        onUpdateRegimens(targetArray);
        showSuccess('レジメンマスタデータを復元しました。');
      }
    } catch (e) {
      console.error('レジメンマスタデータの解析中にエラーが発生しました:', e);
      showError('ファイルの解析に失敗しました。');
    }
  };

  // 6.5. 薬剤マスタインポート
  const processImportDrugs = async (jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr);
      const targetArray = Array.isArray(parsed) ? parsed : (parsed.drugs || parsed);
      if (!targetArray || !Array.isArray(targetArray)) {
        showError('無効なファイルフォーマットです。薬剤リストデータである必要があります。');
        return;
      }

      // 詳細バリデーション
      const vResult = validateDrugs(targetArray);
      if (!vResult.ok) {
        showError(
          `薬剤データに不正なデータが含まれています。復元を中止しました。\n\n` +
          vResult.errors.join('\n')
        );
        return;
      }

      const ok = await confirm(
        `標準薬剤マスタ ${targetArray.length}件を復元し、現在のマスタデータを上書きします。\nよろしいですか？`,
        '薬剤マスタの復元',
        { confirmLabel: '復元する', variant: 'danger' }
      );
      if (ok) {
        onUpdateDrugs(targetArray);
        showSuccess('薬剤マスタデータを復元しました。');
      }
    } catch (e) {
      console.error('薬剤マスタデータの解析中にエラーが発生しました:', e);
      showError('ファイルの解析に失敗しました。');
    }
  };

  // ドラッグ＆ドロップハンドラ (総合一括)
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActiveAll(true);
    } else if (e.type === "dragleave") {
      setDragActiveAll(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveAll(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        processImportAll(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e, processor) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        processor(event.target.result);
      };
      reader.readAsText(file);
      e.target.value = ''; // リセット
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0 }}>
        システムの登録患者データ、およびレジメンマスタデータのバックアップと復元を行います。
      </p>

      {/* メッセージ表示 */}
      {successMessage && (
        <div className="alert-banner alert-banner-success">
          <CheckCircle size={18} />
          <div>{successMessage}</div>
        </div>
      )}
      {errorMessage && (
        <div className="alert-banner alert-banner-danger">
          <AlertCircle size={18} />
          <div>{errorMessage}</div>
        </div>
      )}

      <div className="grid-2" style={{ gap: '20px' }}>
        {/* エクスポートセクション */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Download size={18} />
              データのエクスポート (バックアップ)
            </h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ padding: '20px', border: '1px solid var(--color-primary-light)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary-light)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--color-primary)' }}>総合データ一括バックアップ (推奨)</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                全患者データ、および登録レジメンマスタデータをすべて含んだ単一のバックアップファイルを書き出します。移行時や定期的な保護に最適です。
              </div>
              <button className="btn btn-secondary" style={{ alignSelf: 'flex-start', marginTop: '5px' }} onClick={handleExportAll}>
                <Download size={14} />
                一括バックアップ出力
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '15px' }}>
              <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>個別データ出力</div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px 15px', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>患者カルテデータのみ ({patients.length}件)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>患者プロファイルおよびスケジュール履歴</div>
                </div>
                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={handleExportPatients}>
                  <Download size={12} />
                  エクスポート
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px 15px', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>レジメンマスタのみ ({regimens.length}件)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>投与量・スケジュール規則の定義マスタ</div>
                </div>
                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={handleExportRegimens}>
                  <Download size={12} />
                  エクスポート
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px 15px', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>薬剤マスタのみ ({drugsMaster.length}件)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>抗がん剤・支持療法薬の定義マスタ</div>
                </div>
                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={handleExportDrugs}>
                  <Download size={12} />
                  エクスポート
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* インポートセクション */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Upload size={18} />
              データのインポート (復元)
            </h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* ドラッグ＆ドロップ一括エリア */}
            <div 
              style={{
                border: dragActiveAll ? '2px dashed var(--color-secondary)' : '2px dashed var(--color-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: dragActiveAll ? 'var(--color-secondary-light)' : '#f8fafc',
                padding: '30px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRefAll.current?.click()}
            >
              <Database size={32} style={{ color: dragActiveAll ? 'var(--color-secondary)' : 'var(--color-text-muted)', marginBottom: '10px' }} />
              <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--color-text-dark)' }}>
                総合バックアップのインポート
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                ファイルをここにドラッグ＆ドロップ、またはクリックして選択
              </div>
              <input 
                ref={fileInputRefAll}
                type="file" 
                accept=".json" 
                style={{ display: 'none' }}
                onChange={(e) => handleFileChange(e, processImportAll)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '15px' }}>
              <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>個別データ読込</div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px 15px', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>患者カルテの復元</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>患者リストファイルを読み込み上書きします</div>
                </div>
                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => fileInputRefPatients.current?.click()}>
                  <Upload size={12} />
                  ファイル選択
                </button>
                <input 
                  ref={fileInputRefPatients}
                  type="file" 
                  accept=".json" 
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileChange(e, processImportPatients)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px 15px', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>レジメンマスタの復元</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>マスタ構成ファイルを読み込み上書きします</div>
                </div>
                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => fileInputRefRegimens.current?.click()}>
                  <Upload size={12} />
                  ファイル選択
                </button>
                <input 
                  ref={fileInputRefRegimens}
                  type="file" 
                  accept=".json" 
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileChange(e, processImportRegimens)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px 15px', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>薬剤マスタの復元</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>マスタ構成ファイルを読み込み上書きします</div>
                </div>
                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => fileInputRefDrugs.current?.click()}>
                  <Upload size={12} />
                  ファイル選択
                </button>
                <input 
                  ref={fileInputRefDrugs}
                  type="file" 
                  accept=".json" 
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileChange(e, processImportDrugs)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px 15px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: '#b45309' }}>
        <Shield size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>セキュリティ・管理上の注意:</strong>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '15px' }}>
            <li>データを復元（インポート）すると、ブラウザ(localStorage)に保存されている現在稼働中のデータは完全に上書きされます。必ず事前に現在のバックアップを取得してください。</li>
            <li>インポートするJSONファイルはOncoSchedulerからエクスポートされた正しい形式のものを使用してください。外部で改変されたファイルを読み込むと、動作不具合の原因になります。</li>
          </ul>
        </div>
      </div>
      <ConfirmModal {...confirmModalProps} />
    </div>
  );
}
