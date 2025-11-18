import { RenderBlock } from '../types.js';

/**
 * 轴对齐矩形（Axis-Aligned Bounding Box）。
 */
export interface Rect {
  /** 左上角 X 坐标 */
  x: number;
  /** 左上角 Y 坐标 */
  y: number;
  /** 宽度 */
  width: number;
  /** 高度 */
  height: number;
}

/**
 * 获取节点的包围盒（MVP：不考虑旋转）。
 * @param block 渲染节点
 * @returns 包围盒矩形
 */
export function getBlockBounds(block: RenderBlock): Rect {
  return {
    x: block.x,
    y: block.y,
    width: block.width,
    height: block.height,
  };
}

/**
 * 判断点是否在矩形内。
 * @param rect 矩形
 * @param point 点坐标
 * @returns 是否包含
 */
export function rectContainsPoint(rect: Rect, point: { x: number; y: number }): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/**
 * 判断两个矩形是否相交。
 * @param a 矩形 A
 * @param b 矩形 B
 * @returns 是否相交
 */
export function rectIntersects(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

