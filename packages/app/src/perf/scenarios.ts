import {
  BlockId,
  Connector,
  EditorState,
  Vec2,
  createEmptyEditorState,
  createNoteBlock,
  generateId,
  moveBlocks,
  setViewport,
} from '@triplanner/core';
import { WhiteboardRenderer } from '@triplanner/renderer-canvas';

export interface PerfScenarioDefinition {
  id: string;
  label: string;
  description: string;
  layout: 'grid' | 'clusters';
  create: () => EditorState;
}

export interface PerfActionContext {
  state: EditorState;
  step: number;
  memo?: unknown;
  renderer?: WhiteboardRenderer | null;
}

export interface PerfActionDefinition {
  id: string;
  label: string;
  description: string;
  createMemo?: (state: EditorState) => unknown;
  apply: (context: PerfActionContext) => EditorState;
}

const CONNECTOR_STYLE: Connector['style'] = {
  color: '#90a4ae',
  width: 2,
  dashed: false,
  arrowHead: 'end',
};

const buildConnector = (from: BlockId, to: BlockId): Connector => ({
  id: generateId('connector'),
  from,
  to,
  style: CONNECTOR_STYLE,
});

interface GridScenarioConfig {
  id: string;
  label: string;
  blockCount: number;
  connectorsPerBlock: number;
  gap: number;
  zoom: number;
}

const createGridScenario = (config: GridScenarioConfig): EditorState => {
  const state = createEmptyEditorState();
  state.doc.id = `perf-grid-${config.blockCount}`;
  state.doc.title = config.label;

  const blockIds: BlockId[] = [];
  const blocksPerRow = Math.ceil(Math.sqrt(config.blockCount));
  const rows = Math.ceil(config.blockCount / blocksPerRow);

  for (let i = 0; i < config.blockCount; i++) {
    const row = Math.floor(i / blocksPerRow);
    const col = i % blocksPerRow;
    const position = { x: col * config.gap, y: row * config.gap };
    const block = createNoteBlock(`Block ${i}`, position);
    state.doc.blocks.set(block.id, block);
    blockIds.push(block.id);
  }

  const connectorTarget = Math.min(
    config.blockCount - 1,
    Math.floor(config.blockCount * config.connectorsPerBlock),
  );
  for (let i = 0; i < connectorTarget; i++) {
    const from = blockIds[i % blockIds.length]!;
    const to = blockIds[(i + 1) % blockIds.length]!;
    const connector = buildConnector(from, to);
    state.doc.connectors.set(connector.id, connector);
  }

  const width = Math.max(1, blocksPerRow - 1) * config.gap;
  const height = Math.max(1, rows - 1) * config.gap;
  state.viewport = {
    center: { x: width / 2, y: height / 2 },
    zoom: config.zoom,
  };
  return state;
};

interface ClusterScenarioConfig {
  id: string;
  label: string;
  blockCount: number;
  clusterCount: number;
  clusterSpacing: number;
  connectorsPerBlock: number;
  zoom: number;
}

const deterministicOffset = (seed: number): Vec2 => {
  const sin = Math.sin(seed * 12.9898) * 43758.5453;
  const frac = sin - Math.floor(sin);
  return {
    x: (frac - 0.5) * 320,
    y: (0.5 - frac) * 220,
  };
};

const createClusterScenario = (config: ClusterScenarioConfig): EditorState => {
  const state = createEmptyEditorState();
  state.doc.id = `perf-cluster-${config.blockCount}`;
  state.doc.title = config.label;

  const centers: Vec2[] = [];
  const columns = Math.ceil(Math.sqrt(config.clusterCount));
  const rows = Math.ceil(config.clusterCount / columns);
  for (let i = 0; i < config.clusterCount; i++) {
    const row = Math.floor(i / columns);
    const col = i % columns;
    centers.push({
      x: col * config.clusterSpacing * 1.5,
      y: row * config.clusterSpacing * 1.5,
    });
  }

  const blockIds: BlockId[] = [];
  for (let i = 0; i < config.blockCount; i++) {
    const center = centers[i % centers.length]!;
    const offset = deterministicOffset(i + 1);
    const block = createNoteBlock(`Cluster ${i}`, {
      x: center.x + offset.x,
      y: center.y + offset.y,
    });
    state.doc.blocks.set(block.id, block);
    blockIds.push(block.id);
  }

  const connectorTarget = Math.min(
    config.blockCount - 1,
    Math.floor(config.blockCount * config.connectorsPerBlock),
  );
  for (let i = 0; i < connectorTarget; i++) {
    const from = blockIds[i % blockIds.length]!;
    const to = blockIds[(i + centers.length) % blockIds.length]!;
    const connector = buildConnector(from, to);
    state.doc.connectors.set(connector.id, connector);
  }

  const maxCenter = centers[centers.length - 1] ?? { x: 0, y: 0 };
  state.viewport = {
    center: { x: maxCenter.x / 2, y: maxCenter.y / 2 },
    zoom: config.zoom,
  };

  return state;
};

export const PERF_SCENARIOS: PerfScenarioDefinition[] = [
  {
    id: 'grid-1k',
    label: 'Grid · 1k Blocks',
    description: '1024 个节点 + 512 条连线，规则网格，适合基础 FPS 测试。',
    layout: 'grid',
    create: () =>
      createGridScenario({
        id: '1k',
        label: 'Perf Grid 1k',
        blockCount: 1024,
        connectorsPerBlock: 0.5,
        gap: 240,
        zoom: 0.6,
      }),
  },
  {
    id: 'grid-3k',
    label: 'Grid · 3k Blocks',
    description: '3072 个节点 + 1.5k 连线，中高压缩放/平移测试。',
    layout: 'grid',
    create: () =>
      createGridScenario({
        id: '3k',
        label: 'Perf Grid 3k',
        blockCount: 3072,
        connectorsPerBlock: 0.4,
        gap: 220,
        zoom: 0.45,
      }),
  },
  {
    id: 'cluster-5k',
    label: 'Clusters · 5k Blocks',
    description: '5000 个节点分布在 9 个簇内，模拟真实项目多区域聚集场景。',
    layout: 'clusters',
    create: () =>
      createClusterScenario({
        id: '5k',
        label: 'Perf Cluster 5k',
        blockCount: 5000,
        clusterCount: 9,
        clusterSpacing: 600,
        connectorsPerBlock: 0.6,
        zoom: 0.35,
      }),
  },
];

interface PanMemo {
  origin: Vec2;
}

interface ZoomMemo {
  baseZoom: number;
}

interface DragMemo {
  anchors: Array<{
    id: BlockId;
    base: Vec2;
    phase: number;
  }>;
}

const createDragMemo = (state: EditorState, limit = 200): DragMemo => {
  const anchors: DragMemo['anchors'] = [];
  for (const block of state.doc.blocks.values()) {
    if (anchors.length >= limit) {
      break;
    }
    anchors.push({
      id: block.id,
      base: { ...block.layout.position },
      phase: anchors.length,
    });
  }
  return { anchors };
};

export const PERF_ACTIONS: PerfActionDefinition[] = [
  {
    id: 'idle',
    label: '静态渲染（Idle Baseline）',
    description: '不执行任何变换，测量纯渲染耗时 / 重绘策略。',
    apply: ({ state }) => state,
  },
  {
    id: 'viewport-pan',
    label: '视口平移（Pan Loop）',
    description: '以固定速度沿椭圆轨迹平移，验证 culling 表现。',
    createMemo: (state) => ({ origin: { ...state.viewport.center } }),
    apply: ({ state, step, memo }) => {
      const { origin } = (memo as PanMemo) ?? { origin: state.viewport.center };
      const radiusX = 600;
      const radiusY = 400;
      const center = {
        x: origin.x + Math.cos(step / 80) * radiusX,
        y: origin.y + Math.sin(step / 100) * radiusY,
      };
      return setViewport(state, { center });
    },
  },
  {
    id: 'viewport-zoom',
    label: '视口缩放（Zoom Loop）',
    description: '在 0.3 ~ 1.2 之间振荡缩放，观察像素级抗锯齿与脏矩形。',
    createMemo: (state) => ({ baseZoom: state.viewport.zoom }),
    apply: ({ state, step, memo }) => {
      const { baseZoom } = (memo as ZoomMemo) ?? { baseZoom: state.viewport.zoom };
      const zoom = Math.max(0.2, baseZoom + Math.sin(step / 90) * 0.4);
      return setViewport(state, { zoom });
    },
  },
  {
    id: 'drag-batch',
    label: '批量拖拽 200 节点',
    description: '模拟多选拖拽，持续更新 200 个节点的位置。',
    createMemo: (state) => createDragMemo(state),
    apply: ({ state, step, memo }) => {
      const dragMemo = memo as DragMemo | undefined;
      if (!dragMemo || dragMemo.anchors.length === 0) {
        return state;
      }
      const amplitudeX = 80;
      const amplitudeY = 60;
      const patches = dragMemo.anchors.map(({ id, base, phase }) => {
        const wave = Math.sin((step + phase * 3) / 25);
        const waveY = Math.cos((step + phase * 2) / 30);
        return {
          blockId: id,
          patch: {
            position: {
              x: base.x + wave * amplitudeX,
              y: base.y + waveY * amplitudeY,
            },
          },
        };
      });
      return moveBlocks(state, patches, {
        addToHistory: false,
        source: 'system',
        label: 'perf-drag',
      });
    },
  },
];


