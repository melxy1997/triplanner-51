import { TimelineItem, TimelineId } from '../schema/timeline.js';
import { EditorState } from '../state/editorState.js';
import { Step, StepApplyResult } from './types.js';
import { cloneMap } from '../utils/map.js';

/**
 * 更新文档 timeline 的工具函数。
 */
const withUpdatedTimeline = (
  state: EditorState,
  updater: (timeline: EditorState['doc']['timeline']) => EditorState['doc']['timeline'],
): StepApplyResult => ({
  state: {
    ...state,
    doc: {
      ...state.doc,
      timeline: updater(state.doc.timeline),
    },
  },
});

/**
 * 新增 timeline 条目的 Step。
 */
export interface AddTimelineItemStep extends Step {
  kind: 'addTimelineItem';
  item: TimelineItem;
}

export const createAddTimelineItemStep = (item: TimelineItem): AddTimelineItemStep => ({
  kind: 'addTimelineItem',
  item,
  apply(state: EditorState): StepApplyResult {
    if (state.doc.timeline.has(item.id)) {
      return { state, failed: 'Timeline item already exists' };
    }
    return withUpdatedTimeline(state, (timeline) => {
      const next = cloneMap(timeline);
      next.set(item.id, item);
      return next;
    });
  },
  invert(before: EditorState): Step {
    return createRemoveTimelineItemStep(item.id);
  },
});

/**
 * 更新 timeline 条目的 Step。
 */
export interface UpdateTimelineItemStep extends Step {
  kind: 'updateTimelineItem';
  timelineId: TimelineId;
  patch: Partial<TimelineItem>;
}

export const createUpdateTimelineItemStep = (
  timelineId: TimelineId,
  patch: Partial<TimelineItem>,
): UpdateTimelineItemStep => ({
  kind: 'updateTimelineItem',
  timelineId,
  patch,
  apply(state: EditorState): StepApplyResult {
    const existing = state.doc.timeline.get(timelineId);
    if (!existing) {
      return { state, failed: 'Timeline item not found' };
    }
    const updated: TimelineItem = {
      ...existing,
      ...patch,
    };
    return withUpdatedTimeline(state, (timeline) => {
      const next = cloneMap(timeline);
      next.set(timelineId, updated);
      return next;
    });
  },
  invert(before: EditorState): Step {
    const existing = before.doc.timeline.get(timelineId);
    if (!existing) {
      throw new Error('Cannot invert timeline update without original value');
    }
    return createUpdateTimelineItemStep(timelineId, existing);
  },
});

/**
 * 删除 timeline 条目的 Step。
 */
export interface RemoveTimelineItemStep extends Step {
  kind: 'removeTimelineItem';
  timelineId: TimelineId;
}

export const createRemoveTimelineItemStep = (timelineId: TimelineId): RemoveTimelineItemStep => ({
  kind: 'removeTimelineItem',
  timelineId,
  apply(state: EditorState): StepApplyResult {
    if (!state.doc.timeline.has(timelineId)) {
      return { state, failed: 'Timeline item not found' };
    }
    return withUpdatedTimeline(state, (timeline) => {
      const next = cloneMap(timeline);
      next.delete(timelineId);
      return next;
    });
  },
  invert(before: EditorState): Step {
    const item = before.doc.timeline.get(timelineId);
    if (!item) {
      throw new Error('Cannot invert timeline removal without original value');
    }
    return createAddTimelineItemStep(item);
  },
});


