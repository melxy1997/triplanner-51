import { EditorState } from '../state/editorState.js';
import { applyTransaction } from '../transaction/transaction.js';
import { popUndo, popRedo, pushRedo, pushToHistory } from '../history/history.js';

/**
 * 撤销上一次操作。
 * @param state 当前编辑器状态
 * @returns 更新后的状态，若无法撤销则返回原状态
 */
export function undo(state: EditorState): EditorState {
  const [entry, newHistory] = popUndo(state.history);
  if (!entry) {
    return state;
  }

  const res = applyTransaction(
    { ...state, history: newHistory },
    entry.inverse,
  );

  if (res.failed) {
    return state;
  }

  return {
    ...res.state,
    history: pushRedo(res.state.history, entry),
  };
}

/**
 * 重做上一次撤销的操作。
 * @param state 当前编辑器状态
 * @returns 更新后的状态，若无法重做则返回原状态
 */
export function redo(state: EditorState): EditorState {
  const [entry, newHistory] = popRedo(state.history);
  if (!entry) {
    return state;
  }

  const res = applyTransaction(
    { ...state, history: newHistory },
    entry.transaction,
  );

  if (res.failed) {
    return state;
  }

  return {
    ...res.state,
    history: pushToHistory(res.state.history, entry),
  };
}

/**
 * 检查是否可以撤销。
 */
export function canUndo(state: EditorState): boolean {
  return state.history.undoStack.length > 0;
}

/**
 * 检查是否可以重做。
 */
export function canRedo(state: EditorState): boolean {
  return state.history.redoStack.length > 0;
}




