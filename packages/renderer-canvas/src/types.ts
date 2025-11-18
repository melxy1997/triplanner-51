import { BlockId, ConnectorId } from '@triplanner/core';

/**
 * 渲染节点的样式信息。
 */
export interface BlockRenderStyle {
  /** 背景颜色 */
  backgroundColor: string;
  /** 边框颜色 */
  borderColor: string;
  /** 边框宽度 */
  borderWidth: number;
  /** 圆角半径 */
  borderRadius: number;
  /** 文字颜色 */
  textColor: string;
}

/**
 * 渲染连线的样式信息。
 */
export interface ConnectorRenderStyle {
  /** 线条颜色 */
  strokeColor: string;
  /** 线条宽度 */
  strokeWidth: number;
  /** 是否为虚线 */
  dashed?: boolean;
}

/**
 * 渲染节点（从 core 的 TripBlock 投影而来）。
 */
export interface RenderBlock {
  /** 节点 ID */
  id: BlockId;
  /** 节点类型（flight/hotel/note 等） */
  kind: string;
  /** 世界坐标系下的位置 */
  x: number;
  y: number;
  /** 世界坐标系下的尺寸 */
  width: number;
  height: number;
  /** 旋转角度（弧度，MVP 暂不支持） */
  rotation: number;
  /** 层级顺序（z-index） */
  zIndex: number;
  /** 渲染样式 */
  style: BlockRenderStyle;
  /** 显示文本（可选） */
  label?: string;
}

/**
 * 渲染连线（从 core 的 Connector 投影而来）。
 */
export interface RenderConnector {
  /** 连线 ID */
  id: ConnectorId;
  /** 起始节点 ID */
  fromBlockId: BlockId;
  /** 终止节点 ID */
  toBlockId: BlockId;
  /** 预计算后的世界坐标折线点 */
  points: Array<{ x: number; y: number }>;
  /** 渲染样式 */
  style: ConnectorRenderStyle;
  /** 层级顺序 */
  zIndex: number;
}

/**
 * 渲染场景（从 EditorState.doc 投影而来）。
 */
export interface RenderScene {
  /** 所有渲染节点 */
  blocks: RenderBlock[];
  /** 所有渲染连线 */
  connectors: RenderConnector[];
}


