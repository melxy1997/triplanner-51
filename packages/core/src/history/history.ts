import { Transaction } from '../transaction/transaction';

/**
 * 一条历史记录，包含正向 Transaction 与逆操作。
 */
export interface HistoryEntry {
  /** 原始事务 */
  transaction: Transaction;
  /** 撤销该事务所需的逆事务 */
  inverse: Transaction;
}

/**
 * 撤销/重做栈结构。
 */
export interface HistoryState {
  /** 撤销栈（后进先出） */
  undoStack: HistoryEntry[];
  /** 重做栈 */
  redoStack: HistoryEntry[];
}

/**
 * 创建空历史记录。
 */
export const createEmptyHistoryState = (): HistoryState => ({
  undoStack: [],
  redoStack: [],
});

/**
 * 向撤销栈追加新的历史记录，并清空重做栈。
 */
export const pushToHistory = (
  history: HistoryState,
  entry: HistoryEntry,
): HistoryState => {
  const last = history.undoStack[history.undoStack.length - 1];
  if (last && canMergeHistoryEntries(last, entry)) {
    const merged = mergeHistoryEntries(last, entry);
    const undoStack = [...history.undoStack.slice(0, -1), merged];
    return { undoStack, redoStack: [] };
  }
  return {
    undoStack: [...history.undoStack, entry],
    redoStack: [],
  };
};

/**
 * 判断两条历史记录是否可以基于 groupId 合并。
 */
const canMergeHistoryEntries = (a: HistoryEntry, b: HistoryEntry): boolean => {
  const groupA = a.transaction.meta.groupId;
  const groupB = b.transaction.meta.groupId;
  return Boolean(groupA && groupB && groupA === groupB);
};

/**
 * 合并两条历史记录，以「先执行 a、后执行 b」的顺序计算新的 Transaction。
 */
const mergeHistoryEntries = (a: HistoryEntry, b: HistoryEntry): HistoryEntry => {
  const mergedTransaction: Transaction = {
    steps: [...a.transaction.steps, ...b.transaction.steps],
    meta: {
      ...a.transaction.meta,
      ...b.transaction.meta,
      groupId: b.transaction.meta.groupId ?? a.transaction.meta.groupId,
      label: b.transaction.meta.label ?? a.transaction.meta.label,
      timestamp: b.transaction.meta.timestamp ?? a.transaction.meta.timestamp,
    },
  };

  const mergedInverse: Transaction = {
    steps: [...b.inverse.steps, ...a.inverse.steps],
    meta: {
      ...a.inverse.meta,
      ...b.inverse.meta,
      groupId: mergedTransaction.meta.groupId,
      label: mergedTransaction.meta.label,
      timestamp: mergedTransaction.meta.timestamp,
      source: mergedTransaction.meta.source,
      addToHistory: mergedTransaction.meta.addToHistory,
    },
  };

  return {
    transaction: mergedTransaction,
    inverse: mergedInverse,
  };
};

/**
 * 弹出最新的撤销记录。
 */
export const popUndo = (history: HistoryState): [HistoryEntry | undefined, HistoryState] => {
  if (history.undoStack.length === 0) {
    return [undefined, history];
  }
  const undoStack = history.undoStack.slice();
  const entry = undoStack.pop()!;
  return [entry, { undoStack, redoStack: history.redoStack }];
};

/**
 * 弹出最新的重做记录。
 */
export const popRedo = (history: HistoryState): [HistoryEntry | undefined, HistoryState] => {
  if (history.redoStack.length === 0) {
    return [undefined, history];
  }
  const redoStack = history.redoStack.slice();
  const entry = redoStack.pop()!;
  return [entry, { undoStack: history.undoStack, redoStack }];
};

/**
 * 将一条记录压入重做栈。
 */
export const pushRedo = (history: HistoryState, entry: HistoryEntry): HistoryState => ({
  undoStack: history.undoStack,
  redoStack: [...history.redoStack, entry],
});

