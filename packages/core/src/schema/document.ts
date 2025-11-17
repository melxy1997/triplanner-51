import { BlockId, TripBlock } from './block';
import { Connector, ConnectorId } from './connector';
import { TimelineId, TimelineItem } from './timeline';

/**
 * Triplanner 的单份协作文档，包含白板、连线以及 Timeline 数据。
 */
export interface TripDocument {
  /** 文档唯一 ID */
  id: string;
  /** 文档名称 */
  title: string;
  /** 白板节点集合 */
  blocks: Map<BlockId, TripBlock>;
  /** 连接线集合 */
  connectors: Map<ConnectorId, Connector>;
  /** Timeline 条目集合 */
  timeline: Map<TimelineId, TimelineItem>;
}

