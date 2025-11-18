/**
 * Renderer-Canvas 包：Canvas 渲染引擎。
 * 
 * 职责：
 * - 接收 core 的 EditorState 和 Viewport
 * - 在 <canvas> 上绘制所有 TripBlock / Connector
 * - 实现视口变换（pan + zoom）
 * - 实现基于空间索引的命中检测（点击/框选）
 * 
 * 特点：
 * - 不关心协同、不关心业务，只关心"给我一棵状态树，我负责高效画出来"
 * - 将来切换到 WebGL，只需要新增 renderer-webgl，core 完全不用改
 */

export * from './types.js';
export * from './core/WhiteboardRenderer.js';
export * from './core/RenderStats.js';
export * from './geometry/transform.js';
export * from './geometry/bounds.js';
export * from './geometry/hitTest.js';
export * from './spatial/GridIndex.js';

