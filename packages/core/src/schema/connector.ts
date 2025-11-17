/** 连接线唯一标识 */
export type ConnectorId = string;

/**
 * 连接线在视觉上的样式设定。
 */
export interface ConnectorStyle {
  /** 线条颜色 */
  color: string;
  /** 线宽 */
  width: number;
  /** 是否使用虚线 */
  dashed: boolean;
  /** 箭头类型 */
  arrowHead: 'none' | 'end' | 'both';
}

/**
 * 描述两个节点之间的关系或顺序。
 */
export interface Connector {
  /** 连接线唯一 ID */
  id: ConnectorId;
  /** 起始节点 ID */
  from: string;
  /** 目标节点 ID */
  to: string;
  /** 线条文本标签 */
  label?: string;
  /** 预计耗时（分钟） */
  durationMinutes?: number;
  /** 样式配置 */
  style: ConnectorStyle;
}

