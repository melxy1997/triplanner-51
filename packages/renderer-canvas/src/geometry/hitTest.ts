import { RenderBlock } from '../types.js';
import { getBlockBounds, rectContainsPoint } from './bounds.js';

/**
 * 精确检测节点是否被世界坐标点命中（MVP：轴对齐矩形检测）。
 * @param block 渲染节点
 * @param worldPoint 世界坐标点
 * @returns 是否命中
 */
export function hitTestBlock(
  block: RenderBlock,
  worldPoint: { x: number; y: number },
): boolean {
  const bounds = getBlockBounds(block);
  return rectContainsPoint(bounds, worldPoint);
}




