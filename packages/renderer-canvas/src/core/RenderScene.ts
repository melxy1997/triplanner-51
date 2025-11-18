import {
  EditorState,
  TripBlock,
  Connector,
  BlockId,
  ConnectorId,
} from '@triplanner/core';
import { RenderBlock, RenderConnector, BlockRenderStyle, ConnectorRenderStyle, RenderScene } from '../types.js';

/**
 * 从 EditorState 投影生成渲染场景。
 * @param state 编辑器状态
 * @returns 渲染场景和节点映射
 */
export function buildRenderScene(state: EditorState): {
  scene: RenderScene;
  blockMap: Map<BlockId, RenderBlock>;
} {
  const blocks: RenderBlock[] = [];
  const connectors: RenderConnector[] = [];
  const blockMap = new Map<BlockId, RenderBlock>();

  // 投影所有节点
  for (const block of state.doc.blocks.values()) {
    const renderBlock = blockToRenderBlock(block);
    blocks.push(renderBlock);
    blockMap.set(block.id, renderBlock);
  }

  // 投影所有连线
  for (const connector of state.doc.connectors.values()) {
    const renderConnector = connectorToRenderConnector(connector, blockMap);
    if (renderConnector) {
      connectors.push(renderConnector);
    }
  }

  // 按 zIndex 排序
  blocks.sort((a, b) => a.zIndex - b.zIndex);
  connectors.sort((a, b) => a.zIndex - b.zIndex);

  return {
    scene: { blocks, connectors },
    blockMap,
  };
}

/**
 * 将 TripBlock 转换为 RenderBlock。
 */
function blockToRenderBlock(block: TripBlock): RenderBlock {
  const style = getBlockStyle(block.kind);
  return {
    id: block.id,
    kind: block.kind,
    x: block.layout.position.x,
    y: block.layout.position.y,
    width: block.layout.size.width,
    height: block.layout.size.height,
    rotation: 0, // MVP 暂不支持旋转
    zIndex: block.layout.zIndex ?? 0,
    style,
    label: getBlockLabel(block),
  };
}

/**
 * 将 Connector 转换为 RenderConnector。
 */
function connectorToRenderConnector(
  connector: Connector,
  blockMap: Map<BlockId, RenderBlock>,
): RenderConnector | null {
  const fromBlock = blockMap.get(connector.from as BlockId);
  const toBlock = blockMap.get(connector.to as BlockId);

  if (!fromBlock || !toBlock) {
    return null;
  }

  // 计算连线路径（MVP：简单直线）
  const points = [
    {
      x: fromBlock.x + fromBlock.width / 2,
      y: fromBlock.y + fromBlock.height / 2,
    },
    {
      x: toBlock.x + toBlock.width / 2,
      y: toBlock.y + toBlock.height / 2,
    },
  ];

  return {
    id: connector.id,
    fromBlockId: connector.from as BlockId,
    toBlockId: connector.to as BlockId,
    points,
    style: {
      strokeColor: connector.style.color,
      strokeWidth: connector.style.width,
      dashed: connector.style.dashed,
    },
    zIndex: -1, // 连线在节点下方
  };
}

/**
 * 根据节点类型获取渲染样式。
 */
function getBlockStyle(kind: string): BlockRenderStyle {
  const styles: Record<string, BlockRenderStyle> = {
    flight: {
      backgroundColor: '#e3f2fd',
      borderColor: '#1976d2',
      borderWidth: 2,
      borderRadius: 8,
      textColor: '#1976d2',
    },
    hotel: {
      backgroundColor: '#f3e5f5',
      borderColor: '#7b1fa2',
      borderWidth: 2,
      borderRadius: 8,
      textColor: '#7b1fa2',
    },
    note: {
      backgroundColor: '#fff9c4',
      borderColor: '#f57f17',
      borderWidth: 2,
      borderRadius: 8,
      textColor: '#f57f17',
    },
  };

  return (
    styles[kind] ?? {
      backgroundColor: '#f5f5f5',
      borderColor: '#999',
      borderWidth: 1,
      borderRadius: 4,
      textColor: '#333',
    }
  );
}

/**
 * 获取节点的显示标签。
 */
function getBlockLabel(block: TripBlock): string | undefined {
  if (block.kind === 'flight') {
    return block.flightNumber || block.title;
  }
  if (block.kind === 'hotel') {
    return block.title;
  }
  if (block.kind === 'note') {
    return block.text.substring(0, 20);
  }
  if ('title' in block) {
    return block.title;
  }
  return block.kind;
}

