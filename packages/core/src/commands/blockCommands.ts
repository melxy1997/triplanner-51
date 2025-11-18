import { EditorState } from '../state/editorState.js';
import { Transaction, applyTransaction } from '../transaction/transaction.js';
import { createAddBlockStep, createUpdateBlockLayoutStep, createRemoveBlockStep } from '../steps/blockSteps.js';
import { TripBlock, BlockLayout } from '../schema/block.js';
import { pushToHistory } from '../history/history.js';

/**
 * 添加一个节点到文档中。
 * @param state 当前编辑器状态
 * @param block 要添加的节点
 * @returns 更新后的状态
 */
export function addBlock(state: EditorState, block: TripBlock): EditorState {
  const step = createAddBlockStep(block);
  const tr: Transaction = {
    steps: [step],
    meta: {
      addToHistory: true,
      source: 'local',
      label: 'add-block',
      timestamp: Date.now(),
    },
  };
  const res = applyTransaction(state, tr);
  if (res.failed) {
    throw new Error(res.failed);
  }
  if (res.inverse && tr.meta.addToHistory) {
    return {
      ...res.state,
      history: pushToHistory(res.state.history, { transaction: tr, inverse: res.inverse }),
    };
  }
  return res.state;
}

/**
 * 更新节点的布局信息（位置、尺寸等）。
 * @param state 当前编辑器状态
 * @param blockId 节点 ID
 * @param patch 要更新的布局字段
 * @returns 更新后的状态
 */
export function updateBlockLayout(
  state: EditorState,
  blockId: string,
  patch: Partial<BlockLayout>,
): EditorState {
  const step = createUpdateBlockLayoutStep(blockId, patch);
  const tr: Transaction = {
    steps: [step],
    meta: {
      addToHistory: true,
      source: 'local',
      label: 'update-block-layout',
      timestamp: Date.now(),
      groupId: 'drag', // 可用于拖拽合并
    },
  };
  const res = applyTransaction(state, tr);
  if (res.failed) {
    throw new Error(res.failed);
  }
  if (res.inverse && tr.meta.addToHistory) {
    return {
      ...res.state,
      history: pushToHistory(res.state.history, { transaction: tr, inverse: res.inverse }),
    };
  }
  return res.state;
}

/**
 * 删除一个节点。
 * @param state 当前编辑器状态
 * @param blockId 要删除的节点 ID
 * @returns 更新后的状态
 */
export function removeBlock(state: EditorState, blockId: string): EditorState {
  const step = createRemoveBlockStep(blockId);
  const tr: Transaction = {
    steps: [step],
    meta: {
      addToHistory: true,
      source: 'local',
      label: 'remove-block',
      timestamp: Date.now(),
    },
  };
  const res = applyTransaction(state, tr);
  if (res.failed) {
    throw new Error(res.failed);
  }
  if (res.inverse && tr.meta.addToHistory) {
    return {
      ...res.state,
      history: pushToHistory(res.state.history, { transaction: tr, inverse: res.inverse }),
    };
  }
  return res.state;
}

