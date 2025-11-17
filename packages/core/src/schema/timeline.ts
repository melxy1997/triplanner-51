import { TimeRange } from './types';

/** Timeline 条目的唯一标识 */
export type TimelineId = string;

/**
 * 时间轴上的结构化行程条目。
 */
export interface TimelineItem {
  /** 条目唯一 ID */
  id: TimelineId;
  /** 对应的白板节点 ID */
  blockId: string;
  /** 发生的日期（YYYY-MM-DD） */
  day: string;
  /** 精确时间段，可选 */
  timeRange?: TimeRange;
  /** 同一日期内的排序权重 */
  order: number;
}

