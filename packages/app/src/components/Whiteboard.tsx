import React, { useEffect, useRef, useState } from 'react';
import {
  EditorState,
  createEmptyEditorState,
  addBlock,
  setViewport,
  setSelection,
  createFlightBlock,
} from '@triplanner/core';
import { WhiteboardRenderer } from '@triplanner/renderer-canvas';

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

    rendererRef.current = renderer;
    renderer.updateState(state);
    renderer.render();

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  // 状态变化时更新渲染器
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateState(state);
      rendererRef.current.render();
      onStateChange?.(state);
    }
  }, [state, onStateChange]);

  // 处理画布点击
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current || !mainCanvasRef.current) return;

    const rect = mainCanvasRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const blockId = rendererRef.current.hitTestBlockAt(screenX, screenY);
    if (blockId) {
      setState((prev) =>
        setSelection(prev, {
          selectedBlockIds: [blockId],
          selectedConnectorIds: [],
        }),
      );
    } else {
      setState((prev) =>
        setSelection(prev, {
          selectedBlockIds: [],
          selectedConnectorIds: [],
        }),
      );
    }
  };

  // 处理添加节点按钮
  const handleAddFlight = () => {
    const now = new Date();
    const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2小时后
    const flight = createFlightBlock({
      title: '示例航班',
      fromAirport: 'PEK',
      toAirport: 'SHA',
      flightNumber: 'CA1234',
      time: {
        start: now.toISOString(),
        end: endTime.toISOString(),
      },
      position: { x: Math.random() * 500, y: Math.random() * 400 },
    });

    setState((prev) => addBlock(prev, flight));
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      {/* 背景画布 */}
      <canvas
        ref={backgroundCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 0,
        }}
        width={width}
        height={height}
      />

      {/* 主画布 */}
      <canvas
        ref={mainCanvasRef}
        onClick={handleCanvasClick}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
          cursor: 'pointer',
        }}
        width={width}
        height={height}
      />

      {/* 覆盖层画布 */}
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

      {/* 工具栏 */}
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
        }}
      >
        <button onClick={handleAddFlight} style={{ marginRight: '8px' }}>
          添加航班
        </button>
        <button
          onClick={() => {
            setState((prev) =>
              setViewport(prev, {
                center: { x: Math.random() * 500, y: Math.random() * 400 },
                zoom: 1,
              }),
            );
          }}
        >
          随机视口
        </button>
      </div>
    </div>
  );
}

