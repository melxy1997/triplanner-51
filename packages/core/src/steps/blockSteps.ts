import { TripBlock, BlockId, BlockLayout } from '../schema/block';
import { validateBlock } from '../schema/validators';
import { cloneBlockWithLayout } from '../state/factories';
import { cloneMap } from '../utils/map';
import { EditorState } from '../state/editorState';
import { Step, StepApplyResult } from './types';

/**
 * 工具函数：在不修改原对象的情况下返回更新后的文档。
 */
const withUpdatedDoc = (
  state: EditorState,
  updater: (doc: EditorState['doc']) => EditorState['doc'],
): StepApplyResult => ({
  state: {
    ...state,
    doc: updater(state.doc),
  },
});

/** 新增节点 Step */
export interface AddBlockStep extends Step {
  kind: 'addBlock';
  block: TripBlock;
}

/**
 * 构造添加节点的 Step。
 */
export const createAddBlockStep = (block: TripBlock): AddBlockStep => ({
  kind: 'addBlock',
  block,
  apply(state) {
    if (state.doc.blocks.has(block.id)) {
      return { state, failed: 'Block already exists' };
    }
    const error = validateBlock(block);
    if (error) {
      return { state, failed: error };
    }
    return withUpdatedDoc(state, (doc) => {
      const blocks = cloneMap(doc.blocks);
      blocks.set(block.id, block);
      return { ...doc, blocks };
    });
  },
  invert(before) {
    return createRemoveBlockStep(block.id);
  },
});

/** 删除节点 Step */
export interface RemoveBlockStep extends Step {
  kind: 'removeBlock';
  blockId: BlockId;
}

/**
 * 构造删除节点的 Step。
 */
export const createRemoveBlockStep = (blockId: BlockId): RemoveBlockStep => ({
  kind: 'removeBlock',
  blockId,
  apply(state) {
    if (!state.doc.blocks.has(blockId)) {
      return { state, failed: 'Block not found' };
    }
    return withUpdatedDoc(state, (doc) => {
      const blocks = cloneMap(doc.blocks);
      blocks.delete(blockId);
      return { ...doc, blocks };
    });
  },
  invert(before) {
    const block = before.doc.blocks.get(blockId);
    if (!block) {
      throw new Error('Cannot invert remove block without original block');
    }
    return createAddBlockStep(block);
  },
});

/** 更新节点布局 Step */
export interface UpdateBlockLayoutStep extends Step {
  kind: 'updateBlockLayout';
  blockId: BlockId;
  patch: Partial<BlockLayout>;
}

/**
 * 构造更新布局的 Step。
 */
export const createUpdateBlockLayoutStep = (
  blockId: BlockId,
  patch: Partial<BlockLayout>,
): UpdateBlockLayoutStep => ({
  kind: 'updateBlockLayout',
  blockId,
  patch,
  apply(state) {
    const block = state.doc.blocks.get(blockId);
    if (!block) {
      return { state, failed: 'Block not found' };
    }
    const updated = cloneBlockWithLayout(block, patch);
    const error = validateBlock(updated);
    if (error) {
      return { state, failed: error };
    }
    return withUpdatedDoc(state, (doc) => {
      const blocks = cloneMap(doc.blocks);
      blocks.set(blockId, updated);
      return { ...doc, blocks };
    });
  },
  invert(before) {
    const block = before.doc.blocks.get(blockId);
    if (!block) {
      throw new Error('Cannot invert layout update without original block');
    }
    return createUpdateBlockLayoutStep(blockId, block.layout);
  },
});

