import { Viewport } from '@triplanner/core';
import { Rect } from './bounds.js';

/**
 * Canvas 尺寸信息。
 */
export interface CanvasSize {
  /** 画布宽度（像素） */
  width: number;
  /** 画布高度（像素） */
  height: number;
}

/**
 * 将世界坐标转换为屏幕坐标。
 * @param world 世界坐标点
 * @param viewport 视口信息
 * @param canvas 画布尺寸
 * @returns 屏幕坐标点
 */
export function worldToScreen(
  world: { x: number; y: number },
  viewport: Viewport,
  canvas: CanvasSize,
): { x: number; y: number } {
  const { center, zoom } = viewport;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  return {
    x: cx + (world.x - center.x) * zoom,
    y: cy + (world.y - center.y) * zoom,
  };
}

/**
 * 将屏幕坐标转换为世界坐标。
 * @param screen 屏幕坐标点
 * @param viewport 视口信息
 * @param canvas 画布尺寸
 * @returns 世界坐标点
 */
export function screenToWorld(
  screen: { x: number; y: number },
  viewport: Viewport,
  canvas: CanvasSize,
): { x: number; y: number } {
  const { center, zoom } = viewport;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  return {
    x: (screen.x - cx) / zoom + center.x,
    y: (screen.y - cy) / zoom + center.y,
  };
}

/**
 * 将世界坐标下的尺寸转换为屏幕坐标下的尺寸。
 */
export function worldSizeToScreen(size: number, zoom: number): number {
  return size * zoom;
}

/**
 * 将世界坐标下的矩形转换到屏幕坐标。
 * @param rect 世界坐标矩形
 * @param viewport 当前视口
 * @param canvas 画布尺寸
 */
export function worldRectToScreenRect(rect: Rect, viewport: Viewport, canvas: CanvasSize): Rect {
  const topLeft = worldToScreen({ x: rect.x, y: rect.y }, viewport, canvas);
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: rect.width * viewport.zoom,
    height: rect.height * viewport.zoom,
  };
}

