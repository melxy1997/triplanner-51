import { Vec2 } from './types';

/**
 * 画布视口信息，用于决定渲染范围。
 */
export interface Viewport {
  /** 当前视口中心在世界坐标中的位置 */
  center: Vec2;
  /** 缩放比例（>0） */
  zoom: number;
}

