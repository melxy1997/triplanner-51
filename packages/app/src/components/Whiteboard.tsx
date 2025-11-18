import React, { useEffect, useRef, useState } from 'react';
import {
  EditorState,
  createEmptyEditorState,
  setViewport,
  setSelection,
  addFlightWithTimeline,
  moveBlocks,
  undo,
  redo,
  canUndo,
  canRedo,
  BlockId,
  BlockLayout,
} from '@triplanner/core';
import { WhiteboardRenderer } from '@triplanner/renderer-canvas';
import { TimelinePanel } from './TimelinePanel.js';

/**
 * 拖拽会话信息，记录起点与初始布局，用于 mouseup 时提交一次 Transaction。
 */
interface DragSession {
  /** 会话唯一 ID，用于 History groupId */
  id: string;
  /** 当前拖拽涉及的全部节点 */
  blockIds: BlockId[];
  /** 拖拽起点（世界坐标） */
  startWorld: { x: number; y: number };
  /** 每个节点的初始布局克隆 */
  initialLayouts: Map<BlockId, BlockLayout>;
  /** 最近一次 delta（世界坐标） */
  latestDelta: { dx: number; dy: number };
}

/** 生成拖拽会话 ID。 */
const createDragSessionId = (): string =>
  `drag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** 深拷贝布局，避免引用旧状态。 */
const cloneLayout = (layout: BlockLayout): BlockLayout => ({
  ...layout,
  position: { ...layout.position },
  size: { ...layout.size },
});

/**
 * 白板组件 Props。
 */
export interface WhiteboardProps {
  /** 初始编辑器状态（可选） */
  initialState?: EditorState;
  /** 画布宽度 */
  width?: number;
  /** 画布高度 */
  height?: number;
  /** 状态变化回调 */
  onStateChange?: (state: EditorState) => void;
}

/**
 * 白板组件：集成 core 和 renderer-canvas 的 React 组件。
 * 
 * 职责：
 * - 管理 EditorState
 * - 初始化 WhiteboardRenderer
 * - 处理用户交互（点击、拖拽等）
 * - 将用户操作转换为 core 命令
 */
export function Whiteboard({
  initialState,
  width = 800,
  height = 600,
  onStateChange,
}: WhiteboardProps) {
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WhiteboardRenderer | null>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [state, setState] = useState<EditorState>(
    initialState ?? createEmptyEditorState(),
  );

  // 初始化渲染器
  useEffect(() => {
    if (!mainCanvasRef.current) return;

    const renderer = new WhiteboardRenderer({
      mainCanvas: mainCanvasRef.current,
      backgroundCanvas: backgroundCanvasRef.current ?? undefined,
      overlayCanvas: overlayCanvasRef.current ?? undefined,
    });

    renderer.resize(width, height, window.devicePixelRatio || 1);
    rendererRef.current = renderer;
    renderer.updateState(state);
    renderer.render();

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 状态变化时更新渲染器
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateState(state);
      rendererRef.current.render();
      onStateChange?.(state);
    }
  }, [state, onStateChange]);

  const handleSelectionChange = (blockIds: BlockId[]) => {
    setState((prev) => {
      const current = prev.selection.selectedBlockIds;
      const sameLength = current.length === blockIds.length;
      const same =
        sameLength && current.every((id, index) => id === blockIds[index]);
      if (same) {
        return prev;
      }
      return setSelection(
        prev,
        blockIds.length > 0
          ? { selectedBlockIds: blockIds, selectedConnectorIds: [] }
          : null,
      );
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current || !mainCanvasRef.current) return;
    const rect = mainCanvasRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const renderer = rendererRef.current;
    const blockId = renderer.hitTestBlockAt(screenX, screenY);

    if (!blockId) {
      handleSelectionChange([]);
      dragSessionRef.current = null;
      setIsDragging(false);
      return;
    }

    const currentSelection = state.selection.selectedBlockIds;
    const isSelected = currentSelection.includes(blockId);
    let nextSelection: BlockId[];
    if (e.shiftKey) {
      nextSelection = isSelected
        ? currentSelection.filter((id) => id !== blockId)
        : [...currentSelection, blockId];
    } else {
      nextSelection = isSelected ? [...currentSelection] : [blockId];
    }
    if (nextSelection.length === 0) {
      nextSelection = [blockId];
    }
    handleSelectionChange(nextSelection);

    const initialLayouts = new Map<BlockId, BlockLayout>();
    nextSelection.forEach((id) => {
      const block = state.doc.blocks.get(id);
      if (block) {
        initialLayouts.set(id, cloneLayout(block.layout));
      }
    });
    if (initialLayouts.size === 0) {
      return;
    }

    const worldPoint = renderer.screenToWorld({ x: screenX, y: screenY });
    dragSessionRef.current = {
      id: createDragSessionId(),
      blockIds: nextSelection,
      startWorld: worldPoint,
      initialLayouts,
      latestDelta: { dx: 0, dy: 0 },
    };
    renderer.beginDragPreview(nextSelection);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragSessionRef.current || !rendererRef.current || !mainCanvasRef.current) {
      return;
    }
    const rect = mainCanvasRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const renderer = rendererRef.current;
    const worldPoint = renderer.screenToWorld({ x: screenX, y: screenY });
    const session = dragSessionRef.current;
    const dx = worldPoint.x - session.startWorld.x;
    const dy = worldPoint.y - session.startWorld.y;
    session.latestDelta = { dx, dy };
    renderer.updateDragPreview({ dx, dy });
    renderer.render();
  };

  const finalizeDrag = () => {
    if (!dragSessionRef.current || !rendererRef.current) {
      return;
    }
    const session = dragSessionRef.current;
    dragSessionRef.current = null;
    rendererRef.current.endDragPreview();
    setIsDragging(false);

    const { dx, dy } = session.latestDelta;
    const epsilon = 1e-2;
    if (Math.abs(dx) < epsilon && Math.abs(dy) < epsilon) {
      return;
    }

    const patches = Array.from(session.initialLayouts.entries()).map(([blockId, layout]) => ({
      blockId,
      patch: {
        position: {
          x: layout.position.x + dx,
          y: layout.position.y + dy,
        },
      },
    }));

    if (patches.length === 0) {
      return;
    }

    setState((prev) => moveBlocks(prev, patches, { label: 'drag-move-blocks', groupId: session.id }));
  };

  const handleAddFlight = () => {
    const now = new Date();
    const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    setState((prev) =>
      addFlightWithTimeline(prev, {
        title: '示例航班',
        fromAirport: 'PEK',
        toAirport: 'SHA',
        flightNumber: `CA${Math.floor(Math.random() * 9000 + 1000)}`,
        time: {
          start: now.toISOString(),
          end: endTime.toISOString(),
        },
        position: { x: Math.random() * 400 + 50, y: Math.random() * 300 + 50 },
      }),
    );
  };

  const handleUndo = () => {
    if (canUndo(state)) {
      setState((prev) => undo(prev));
    }
  };

  const handleRedo = () => {
    if (canRedo(state)) {
      setState((prev) => redo(prev));
    }
  };

  const handleTimelineSelect = (item: { blockId: BlockId }) => {
    handleSelectionChange([item.blockId]);
    const block = state.doc.blocks.get(item.blockId);
    if (block) {
      setState((prev) =>
        setViewport(prev, {
          center: {
            x: block.layout.position.x + block.layout.size.width / 2,
            y: block.layout.position.y + block.layout.size.height / 2,
          },
        }),
      );
    }
  };

  return (
    <div style={{ display: 'flex', gap: '16px', width: width + 320, height }}>
      <div style={{ position: 'relative', width, height }}>
        <canvas
          ref={backgroundCanvasRef}
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}
          width={width}
          height={height}
        />
        <canvas
          ref={mainCanvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={finalizeDrag}
          onMouseLeave={finalizeDrag}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1,
            cursor: isDragging ? 'grabbing' : 'pointer',
          }}
          width={width}
          height={height}
        />
        <canvas
          ref={overlayCanvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 2,
            pointerEvents: 'none',
          }}
          width={width}
          height={height}
        />

        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 10,
            background: 'white',
            padding: '10px',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            gap: '8px',
          }}
        >
          <button onClick={handleAddFlight}>添加航班+时间线</button>
          <button onClick={handleUndo} disabled={!canUndo(state)}>
            撤销
          </button>
          <button onClick={handleRedo} disabled={!canRedo(state)}>
            重做
          </button>
        </div>
      </div>

      <div
        style={{
          flex: '0 0 280px',
          borderLeft: '1px solid #eee',
          height,
          background: '#fafafa',
        }}
      >
        <TimelinePanel
          timeline={state.doc.timeline}
          blocks={state.doc.blocks}
          selectedBlockIds={state.selection.selectedBlockIds}
          onSelectTimelineItem={handleTimelineSelect}
        />
      </div>
    </div>
  );
}

