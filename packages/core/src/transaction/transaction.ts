import { EditorState } from '../state/editorState';
import { Step } from '../steps/types';

/** 事务来源标识，方便区分本地/远端操作。 */
export type TransactionSource = 'local' | 'remote' | 'system';

/** Transaction 的元信息，用于历史记录与协同。 */
export interface TransactionMeta {
  /** 是否写入撤销栈 */
  addToHistory: boolean;
  /** 操作来源 */
  source: TransactionSource;
  /** 友好的标签（用于调试/监控） */
  label?: string;
  /** 协同 clientId，可用于冲突解决 */
  clientId?: string;
  /** 发生时间戳（毫秒） */
  timestamp?: number;
  /** 操作分组 ID，用于合并拖拽等高频事件 */
  groupId?: string;
}

/** Transaction = 多个 Step + Meta。 */
export interface Transaction {
  steps: Step[];
  meta: TransactionMeta;
}

/** Transaction 应用之后的结果。 */
export interface TransactionApplyResult {
  /** 更新后的状态 */
  state: EditorState;
  /** 若失败则返回错误原因 */
  failed?: string;
  /** 逆操作 Transaction（成功时才有） */
  inverse?: Transaction;
}

/**
 * 在状态上依次执行所有 Step，若任何一步失败则回退并返回错误。
 * 成功时会返回逆 Transaction，供 History 使用。
 */
export const applyTransaction = (
  state: EditorState,
  transaction: Transaction,
): TransactionApplyResult => {
  let current = state;
  const inverses: Step[] = [];

  for (const step of transaction.steps) {
    const before = current;
    const result = step.apply(before);
    if (result.failed) {
      return { state, failed: result.failed };
    }
    current = result.state;
    inverses.unshift(step.invert(before));
  }

  const inverse: Transaction = {
    steps: inverses,
    meta: {
      ...transaction.meta,
      source: transaction.meta.source,
      addToHistory: transaction.meta.addToHistory,
    },
  };

  return {
    state: current,
    inverse,
  };
};

