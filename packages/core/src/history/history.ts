import { Transaction } from '../transaction/transaction.js';

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
): HistoryState => ({
  undoStack: [...history.undoStack, entry],
  redoStack: [],
});

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

