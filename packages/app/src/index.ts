/**
 * App 包：React 应用层。
 *
 * 职责：
 * - 负责 Trip 行程协同相关 UI
 * - 把用户输入转换成 core 的命令（Step/Transaction）
 * - 管理协同会话（房间、成员、权限）
 * - 接入监控与性能面板（例如 Perf Lab）
 *
 * 特点：
 * - 小内核 + 可替换渲染器 + UI 适配层的架构风格
 * - 核心行程模型和操作模型仍然是稳定可复用的
 */

export * from './components/Whiteboard.js';
export * from './perf/PerfLabPage.js';
export * from './perf/mountPerfLab.js';
