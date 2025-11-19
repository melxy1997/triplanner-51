import { EditorState } from '../state/editorState.js';
import { Transaction, applyTransaction } from '../transaction/transaction.js';
import { createSetViewportStep, createSetSelectionStep } from '../steps/viewSteps.js';
import { Viewport } from '../schema/viewport.js';
import { Selection } from '../schema/selection.js';

/**
 * 更新视口（平移、缩放等），通常不进历史记录。
 * @param state 当前编辑器状态
 * @param viewportPatch 要更新的视口字段
 * @returns 更新后的状态
 */
export function setViewport(state: EditorState, viewportPatch: Partial<Viewport>): EditorState {
  const step = createSetViewportStep(viewportPatch);
  const tr: Transaction = {
    steps: [step],
    meta: {
      addToHistory: false, // 通常不进历史
      source: 'local',
      label: 'set-viewport',
      timestamp: Date.now(),
    },
  };
  return applyTransaction(state, tr).state;
}

/**
 * 设置选中状态，通常不进历史记录。
 * @param state 当前编辑器状态
 * @param selection 新的选中状态（null 表示清空）
 * @returns 更新后的状态
 */
export function setSelection(state: EditorState, selection: Selection | null): EditorState {
  const step = createSetSelectionStep(selection);
  const tr: Transaction = {
    steps: [step],
    meta: {
      addToHistory: false, // 通常不进历史
      source: 'local',
      label: 'set-selection',
      timestamp: Date.now(),
    },
  };
  return applyTransaction(state, tr).state;
}



