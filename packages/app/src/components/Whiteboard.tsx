import React, { useEffect, useRef, useState } from 'react';
import {
  EditorState,
  createEmptyEditorState,
  setViewport,
  setSelection,
  addFlightWithTimeline,
  updateBlockLayout,
  undo,
  redo,
  canUndo,
  canRedo,
} from '@triplanner/core';
import { WhiteboardRenderer, screenToWorld } from '@triplanner/renderer-canvas';
import { TimelinePanel } from './TimelinePanel.js';
import { BlockId } from '@triplanner/core';

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
  const dragStateRef = useRef<{
    blockId: BlockId;
    startWorld: { x: number; y: number };
    initialPosition: { x: number; y: number };
  } | null>(null);
  const dragLastPositionRef = useRef<{ x: number; y: number } | null>(null);
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

  const canvasSize = { width, height };

  const handleSelectionChange = (blockIds: BlockId[]) => {
    setState((prev) =>
      setSelection(prev, {
        selectedBlockIds: blockIds,
        selectedConnectorIds: [],
      }),
    );
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current || !mainCanvasRef.current) return;
    const rect = mainCanvasRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const blockId = rendererRef.current.hitTestBlockAt(screenX, screenY);

    if (blockId) {
      handleSelectionChange([blockId]);
      const block = state.doc.blocks.get(blockId);
      if (!block) return;
      const worldPoint = screenToWorld(
        { x: screenX, y: screenY },
        state.viewport,
        canvasSize,
      );
      dragStateRef.current = {
        blockId,
        startWorld: worldPoint,
        initialPosition: { ...block.layout.position },
      };
      dragLastPositionRef.current = block.layout.position;
    } else {
      handleSelectionChange([]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragStateRef.current || !mainCanvasRef.current) return;
    const rect = mainCanvasRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPoint = screenToWorld(
      { x: screenX, y: screenY },
      state.viewport,
      canvasSize,
    );

    const { blockId, startWorld, initialPosition } = dragStateRef.current;
    const deltaX = worldPoint.x - startWorld.x;
    const deltaY = worldPoint.y - startWorld.y;
    const newPos = {
      x: initialPosition.x + deltaX,
      y: initialPosition.y + deltaY,
    };
    dragLastPositionRef.current = newPos;
    setState((prev) =>
      updateBlockLayout(
        prev,
        blockId,
        { position: newPos },
        { addToHistory: false, label: 'drag-preview' },
      ),
    );
  };

  const endDrag = () => {
    if (dragStateRef.current && dragLastPositionRef.current) {
      const { blockId } = dragStateRef.current;
      const finalPos = dragLastPositionRef.current;
      setState((prev) =>
        updateBlockLayout(prev, blockId, { position: finalPos }, { groupId: 'drag' }),
      );
    }
    dragStateRef.current = null;
    dragLastPositionRef.current = null;
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
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1,
            cursor: dragStateRef.current ? 'grabbing' : 'pointer',
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

