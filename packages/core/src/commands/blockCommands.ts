import { EditorState } from '../state/editorState';
import { Transaction, applyTransaction, TransactionSource } from '../transaction/transaction';
import { createAddBlockStep, createUpdateBlockLayoutStep, createRemoveBlockStep } from '../steps/blockSteps';
import { TripBlock, BlockLayout, BlockId } from '../schema/block';
import { pushToHistory } from '../history/history';
import { CreateFlightBlockInput, createFlightBlock } from '../state/factories';
import { TimelineItem } from '../schema/timeline';
import { createAddTimelineItemStep } from '../steps/timelineSteps';
import { generateId } from '../utils/id';
import { TimeRange } from '../schema/types';
import { Step } from '../steps/types';

const pushHistoryIfNeeded = (
  state: EditorState,
  tr: Transaction,
  res: ReturnType<typeof applyTransaction>,
): EditorState => {
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
};

/**
 * 添加历史记录的元信息参数。
 */
export interface CommandMetaOptions {
  addToHistory?: boolean;
  source?: TransactionSource;
  label?: string;
  groupId?: string;
}

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
  return pushHistoryIfNeeded(state, tr, res);
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
  blockId: BlockId,
  patch: Partial<BlockLayout>,
  options: CommandMetaOptions = {},
): EditorState {
  const step = createUpdateBlockLayoutStep(blockId, patch);
  const addToHistory = options.addToHistory ?? true;
  const tr: Transaction = {
    steps: [step],
    meta: {
      addToHistory,
      source: options.source ?? 'local',
      label: options.label ?? 'update-block-layout',
      timestamp: Date.now(),
      groupId: options.groupId,
    },
  };
  const res = applyTransaction(state, tr);
  return pushHistoryIfNeeded(state, tr, res);
}

/**
 * 多节点移动命令：将多个 block 的布局补丁合并为一次 Transaction。
 */
export function moveBlocks(
  state: EditorState,
  patches: { blockId: BlockId; patch: Partial<BlockLayout> }[],
  options: CommandMetaOptions = {},
): EditorState {
  if (patches.length === 0) {
    return state;
  }
  const steps: Step[] = patches.map(({ blockId, patch }) => createUpdateBlockLayoutStep(blockId, patch));
  const addToHistory = options.addToHistory ?? true;
  const tr: Transaction = {
    steps,
    meta: {
      addToHistory,
      source: options.source ?? 'local',
      label: options.label ?? 'move-blocks',
      timestamp: Date.now(),
      groupId: options.groupId,
    },
  };
  const res = applyTransaction(state, tr);
  return pushHistoryIfNeeded(state, tr, res);
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
  return pushHistoryIfNeeded(state, tr, res);
}

/**
 * 创建航班节点并同步映射到 timeline。
 */
export interface AddFlightWithTimelineInput extends CreateFlightBlockInput {
  /** 指定时间轴的日期（默认取时间范围的 start 日期） */
  timelineDay?: string;
}

const getDayFromTimeRange = (time: TimeRange): string => {
  return new Date(time.start).toISOString().slice(0, 10);
};

export function addFlightWithTimeline(
  state: EditorState,
  input: AddFlightWithTimelineInput,
): EditorState {
  const flight = createFlightBlock(input);
  const day = input.timelineDay ?? getDayFromTimeRange(flight.time);
  const timelineItem: TimelineItem = {
    id: generateId('timeline'),
    blockId: flight.id,
    day,
    timeRange: flight.time,
    order: Date.parse(flight.time.start),
  };

  const steps = [createAddBlockStep(flight), createAddTimelineItemStep(timelineItem)];
  const tr: Transaction = {
    steps,
    meta: {
      addToHistory: true,
      source: 'local',
      label: 'add-flight-with-timeline',
      timestamp: Date.now(),
    },
  };

  const res = applyTransaction(state, tr);
  return pushHistoryIfNeeded(state, tr, res);
}

