import { BlockId } from './block.js';
import { ConnectorId } from './connector.js';

/**
 * 当前编辑器的选中状态。
 */
export interface Selection {
  /** 被选中的节点 ID 集合 */
  selectedBlockIds: BlockId[];
  /** 被选中的连接线 ID 集合 */
  selectedConnectorIds: ConnectorId[];
}

