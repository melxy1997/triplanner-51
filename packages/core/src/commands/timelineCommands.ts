import { EditorState } from '../state/editorState';
import { TimelineItem } from '../schema/timeline';
import {
  createAddTimelineItemStep,
  createRemoveTimelineItemStep,
  createUpdateTimelineItemStep,
} from '../steps/timelineSteps';
import { applyTransaction, Transaction, TransactionSource } from '../transaction/transaction';
import { pushToHistory } from '../history/history';
import { generateId } from '../utils/id';
import { TimeRange } from '../schema/types';
import { BlockId } from '../schema/block';

/**
 * 创建 timeline 条目所需输入。
 */
export interface CreateTimelineItemInput {
  blockId: BlockId;
  day: string;
  timeRange?: TimeRange;
  order?: number;
}

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
 * 向文档添加一个 timeline 条目。
 */
export function addTimelineItem(state: EditorState, input: CreateTimelineItemInput): EditorState {
  const item: TimelineItem = {
    id: generateId('timeline'),
    blockId: input.blockId,
    day: input.day,
    timeRange: input.timeRange,
    order: input.order ?? Date.parse(input.timeRange?.start ?? input.day),
  };

  const step = createAddTimelineItemStep(item);
  const tr: Transaction = {
    steps: [step],
    meta: {
      addToHistory: true,
      source: 'local',
      label: 'add-timeline-item',
      timestamp: Date.now(),
    },
  };

  const res = applyTransaction(state, tr);
  return pushHistoryIfNeeded(state, tr, res);
}

/**
 * 更新一个 timeline 条目。
 */
export function updateTimelineItem(
  state: EditorState,
  timelineId: string,
  patch: Partial<TimelineItem>,
  options: { addToHistory?: boolean; source?: TransactionSource; label?: string } = {},
): EditorState {
  const step = createUpdateTimelineItemStep(timelineId, patch);
  const tr: Transaction = {
    steps: [step],
    meta: {
      addToHistory: options.addToHistory ?? true,
      source: options.source ?? 'local',
      label: options.label ?? 'update-timeline-item',
      timestamp: Date.now(),
    },
  };
  const res = applyTransaction(state, tr);
  return pushHistoryIfNeeded(state, tr, res);
}

/**
 * 删除 timeline 条目。
 */
export function removeTimelineItem(state: EditorState, timelineId: string): EditorState {
  const step = createRemoveTimelineItemStep(timelineId);
  const tr: Transaction = {
    steps: [step],
    meta: {
      addToHistory: true,
      source: 'local',
      label: 'remove-timeline-item',
      timestamp: Date.now(),
    },
  };
  const res = applyTransaction(state, tr);
  return pushHistoryIfNeeded(state, tr, res);
}





