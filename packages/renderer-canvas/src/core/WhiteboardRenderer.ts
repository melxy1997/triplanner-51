import {
  EditorState,
  BlockId,
  ConnectorId,
  Viewport,
  Selection,
} from '@triplanner/core';
import { buildRenderScene } from './RenderScene.js';
import { RenderScene } from '../types.js';
import { worldToScreen, screenToWorld, CanvasSize } from '../geometry/transform.js';
import { GridIndex, SpatialIndex } from '../spatial/GridIndex.js';
import { hitTestBlock } from '../geometry/hitTest.js';
import { RenderBlock } from '../types.js';

/**
 * 渲染器初始化选项。
 */
export interface WhiteboardRendererOptions {
  /** 主画布（绘制节点和连线） */
  mainCanvas: HTMLCanvasElement;
  /** 背景画布（绘制网格，可选） */
  backgroundCanvas?: HTMLCanvasElement;
  /** 覆盖层画布（绘制选中框等，可选） */
  overlayCanvas?: HTMLCanvasElement;
}

/**
 * Canvas 渲染引擎核心类。
 * 
 * 职责：
 * - 从 EditorState 读取数据并建立渲染场景
 * - 在 Canvas 上绘制所有节点和连线
 * - 实现视口变换（pan + zoom）
 * - 实现命中检测（点击/框选）
 * 
 * 特点：
 * - 不关心协同、不关心业务，只关心"如何高效画出来"
 * - 不反向修改 EditorState，只读数据
 */
export class WhiteboardRenderer {
  private mainCtx: CanvasRenderingContext2D;
  private backgroundCtx?: CanvasRenderingContext2D;
  private overlayCtx?: CanvasRenderingContext2D;

  private scene: RenderScene = { blocks: [], connectors: [] };
  private blockMap: Map<BlockId, RenderBlock> = new Map();
  private viewport: Viewport = { center: { x: 0, y: 0 }, zoom: 1 };
  private selection: Selection = { selectedBlockIds: [], selectedConnectorIds: [] };
  private canvasSize: CanvasSize = { width: 0, height: 0 };

  /** 是否需要重绘 */
  private dirty = true;
  /** 空间索引（用于命中检测） */
  private spatialIndex: SpatialIndex;

  constructor(private readonly options: WhiteboardRendererOptions) {
    const mainCtx = options.mainCanvas.getContext('2d');
    if (!mainCtx) {
      throw new Error('Failed to get 2d context from main canvas');
    }
    this.mainCtx = mainCtx;

    if (options.backgroundCanvas) {
      const ctx = options.backgroundCanvas.getContext('2d');
      if (ctx) {
        this.backgroundCtx = ctx;
      }
    }

    if (options.overlayCanvas) {
      const ctx = options.overlayCanvas.getContext('2d');
      if (ctx) {
        this.overlayCtx = ctx;
      }
    }

    this.spatialIndex = new GridIndex(100);

    // 初始化画布尺寸
    this.resize(
      options.mainCanvas.width,
      options.mainCanvas.height,
      window.devicePixelRatio || 1,
    );
  }

  /**
   * 更新来自 core 的状态（doc + viewport + selection）。
   * @param state 编辑器状态
   */
  updateState(state: EditorState): void {
    const { scene, blockMap } = buildRenderScene(state);
    this.scene = scene;
    this.blockMap = blockMap;
    this.viewport = state.viewport;
    this.selection = state.selection;

    // 重建空间索引
    this.spatialIndex.clear();
    for (const block of scene.blocks) {
      this.spatialIndex.insert({
        id: block.id,
        bounds: {
          x: block.x,
          y: block.y,
          width: block.width,
          height: block.height,
        },
      });
    }

    this.dirty = true;
  }

  /**
   * 手动触发一次渲染。
   */
  render(): void {
    if (!this.dirty) return;

    // 清空画布
    this.mainCtx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height);
    if (this.backgroundCtx) {
      this.backgroundCtx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height);
    }
    if (this.overlayCtx) {
      this.overlayCtx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height);
    }

    // 绘制背景
    if (this.backgroundCtx) {
      this.renderBackground(this.backgroundCtx);
    }

    // 绘制连线
    this.renderConnectors(this.mainCtx);

    // 绘制节点
    this.renderBlocks(this.mainCtx);

    // 绘制选中状态
    if (this.overlayCtx) {
      this.renderSelection(this.overlayCtx);
    }

    this.dirty = false;
  }

  /**
   * 画布尺寸改变时调用。
   * @param width 新宽度
   * @param height 新高度
   * @param devicePixelRatio 设备像素比
   */
  resize(width: number, height: number, devicePixelRatio: number): void {
    this.canvasSize = { width, height };

    const setCanvasSize = (canvas: HTMLCanvasElement) => {
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(devicePixelRatio, devicePixelRatio);
      }
    };

    setCanvasSize(this.options.mainCanvas);
    if (this.options.backgroundCanvas) {
      setCanvasSize(this.options.backgroundCanvas);
    }
    if (this.options.overlayCanvas) {
      setCanvasSize(this.options.overlayCanvas);
    }

    this.dirty = true;
  }

  /**
   * 命中检测：查找屏幕坐标下的节点。
   * @param screenX 屏幕 X 坐标
   * @param screenY 屏幕 Y 坐标
   * @returns 命中的节点 ID，若无则返回 null
   */
  hitTestBlockAt(screenX: number, screenY: number): BlockId | null {
    const worldPoint = screenToWorld(
      { x: screenX, y: screenY },
      this.viewport,
      this.canvasSize,
    );

    const candidateIds = this.spatialIndex.queryPoint(worldPoint);
    const candidates = candidateIds
      .map((id) => this.blockMap.get(id as BlockId))
      .filter((block): block is RenderBlock => block !== undefined)
      .sort((a, b) => a.zIndex - b.zIndex);

    // 从顶层到底层检测
    for (let i = candidates.length - 1; i >= 0; i--) {
      const block = candidates[i]!;
      if (hitTestBlock(block, worldPoint)) {
        return block.id;
      }
    }

    return null;
  }

  /**
   * 命中检测：查找屏幕坐标下的连线（MVP 暂不实现）。
   */
  hitTestConnectorAt(_screenX: number, _screenY: number): ConnectorId | null {
    // MVP 暂不实现连线命中检测
    return null;
  }

  /**
   * 清理资源。
   */
  destroy(): void {
    this.spatialIndex.clear();
    this.blockMap.clear();
  }

  // ========== 私有渲染方法 ==========

  private renderBackground(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.canvasSize;
    const gridSize = 20 * this.viewport.zoom;
    const offsetX = (this.viewport.center.x * this.viewport.zoom) % gridSize;
    const offsetY = (this.viewport.center.y * this.viewport.zoom) % gridSize;

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    // 绘制网格线
    for (let x = -offsetX; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = -offsetY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  private renderConnectors(ctx: CanvasRenderingContext2D): void {
    for (const connector of this.scene.connectors) {
      if (connector.points.length < 2) continue;

      ctx.strokeStyle = connector.style.strokeColor;
      ctx.lineWidth = connector.style.strokeWidth;
      ctx.setLineDash(connector.style.dashed ? [5, 5] : []);

      ctx.beginPath();
      const start = worldToScreen(connector.points[0]!, this.viewport, this.canvasSize);
      ctx.moveTo(start.x, start.y);

      for (let i = 1; i < connector.points.length; i++) {
        const point = worldToScreen(connector.points[i]!, this.viewport, this.canvasSize);
        ctx.lineTo(point.x, point.y);
      }

      ctx.stroke();
    }
  }

  private renderBlocks(ctx: CanvasRenderingContext2D): void {
    for (const block of this.scene.blocks) {
      const screenPos = worldToScreen({ x: block.x, y: block.y }, this.viewport, this.canvasSize);
      const screenWidth = block.width * this.viewport.zoom;
      const screenHeight = block.height * this.viewport.zoom;

      // 绘制背景
      ctx.fillStyle = block.style.backgroundColor;
      ctx.strokeStyle = block.style.borderColor;
      ctx.lineWidth = block.style.borderWidth;
      ctx.beginPath();
      ctx.roundRect(
        screenPos.x,
        screenPos.y,
        screenWidth,
        screenHeight,
        block.style.borderRadius,
      );
      ctx.fill();
      ctx.stroke();

      // 绘制文字
      if (block.label) {
        ctx.fillStyle = block.style.textColor;
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          block.label,
          screenPos.x + screenWidth / 2,
          screenPos.y + screenHeight / 2,
        );
      }
    }
  }

  private renderSelection(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = '#2196f3';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);

    for (const blockId of this.selection.selectedBlockIds) {
      const block = this.blockMap.get(blockId);
      if (!block) continue;

      const screenPos = worldToScreen({ x: block.x, y: block.y }, this.viewport, this.canvasSize);
      const screenWidth = block.width * this.viewport.zoom;
      const screenHeight = block.height * this.viewport.zoom;

      ctx.strokeRect(
        screenPos.x - 2,
        screenPos.y - 2,
        screenWidth + 4,
        screenHeight + 4,
      );
    }

    ctx.setLineDash([]);
  }
}

