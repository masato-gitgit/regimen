import { useState, useCallback, useRef } from 'react';

/**
 * useConfirm
 * window.confirm の代替となる Promise ベースの確認ダイアログフック。
 *
 * 使い方:
 *   const { confirm, modalProps } = useConfirm();
 *   // <ConfirmModal {...modalProps} /> をレンダリングする
 *
 *   const ok = await confirm('削除しますか？', '削除の確認');
 *   if (ok) { ... }
 *
 * 実装メモ:
 *   resolve 関数を ref で保持することで、setState のアップデーター関数内で
 *   副作用（Promise.resolve 呼び出し）を行う React アンチパターンを回避している。
 */
export const useConfirm = () => {
  const resolveRef = useRef(null);

  const [state, setState] = useState({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'OK',
    cancelLabel: 'キャンセル',
    variant: 'default', // 'default' | 'danger'
  });

  /**
   * 確認ダイアログを表示し、ユーザーの応答を Promise で返す。
   * @param {string}  message      - 確認メッセージ
   * @param {string}  [title]      - ダイアログタイトル（省略可）
   * @param {object}  [options]    - 追加オプション
   * @param {string}  [options.confirmLabel='OK']       - 確定ボタンのラベル
   * @param {string}  [options.cancelLabel='キャンセル'] - キャンセルボタンのラベル
   * @param {string}  [options.variant='default']       - 'default' | 'danger'
   * @returns {Promise<boolean>}
   */
  const confirm = useCallback((message, title = '確認', options = {}) => {
    return new Promise((resolve) => {
      // resolve を ref に保持（setState の外から呼び出すため）
      resolveRef.current = resolve;
      setState({
        open: true,
        title,
        message,
        confirmLabel: options.confirmLabel ?? 'OK',
        cancelLabel: options.cancelLabel ?? 'キャンセル',
        variant: options.variant ?? 'default',
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    // ref から resolve を取り出して呼び出す（setState の外で副作用を実行）
    resolveRef.current?.(true);
    resolveRef.current = null;
    setState(s => ({ ...s, open: false }));
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setState(s => ({ ...s, open: false }));
  }, []);

  return {
    confirm,
    modalProps: {
      open: state.open,
      title: state.title,
      message: state.message,
      confirmLabel: state.confirmLabel,
      cancelLabel: state.cancelLabel,
      variant: state.variant,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  };
};
