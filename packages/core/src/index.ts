/**
 * Core 包：Triplanner 的核心状态管理与操作引擎。
 * 
 * 职责：
 * - 定义 Schema / 数据结构 / 不变量（TripDocument / TripBlock / Connector 等）
 * - 封装所有命令 / 操作（Step / Transaction）
 * - 实现 History（撤销/重做）栈
 * - 提供工厂函数和校验器
 * 
 * 特点：
 * - 不依赖 DOM 和 React，纯 TypeScript
 * - Framework-agnostic，未来可迁移为 WASM
 */

// Schema 导出
export * from './schema/types.js';
export * from './schema/block.js';
export * from './schema/connector.js';
export * from './schema/timeline.js';
export * from './schema/document.js';
export * from './schema/viewport.js';
export * from './schema/selection.js';
export * from './schema/validators.js';

// State 导出
export * from './state/editorState.js';
export * from './state/factories.js';

// Steps 导出
export * from './steps/types.js';
export * from './steps/blockSteps.js';
export * from './steps/viewSteps.js';

// Transaction 导出
export * from './transaction/transaction.js';

// History 导出
export * from './history/history.js';

// Commands 导出（UI/app 的主要入口）
export * from './commands/index.js';

// Utils 导出
export * from './utils/id.js';
export * from './utils/map.js';

