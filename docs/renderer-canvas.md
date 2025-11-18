# Renderer-Canvas：白板渲染引擎设计（Canvas 实现版）

> 对应包：`packages/renderer-canvas`  
> 角色：**“只会画画和算命中，完全不懂业务”的白板渲染引擎**

## 一、职责与边界

**输入：**
- `EditorState`（来自 `@triplanner/core`）
  - `doc`: `TripDocument`
  - `viewport`: 视口（center + zoom）
  - `selection`: 选中状态

**输出：**
- 在传入的 `<canvas>` 上绘制：
  - 所有 `TripBlock`（节点）
  - 所有 `Connector`（连线）
  - 背景网格 / 选中高亮
- 提供命中检测能力：
  - `hitTestBlockAt(screenX, screenY): BlockId | null`
  - `hitTestConnectorAt(screenX, screenY): ConnectorId | null`（MVP 预留）

**不做的事：**
- 不修改 `EditorState`（只读）
- 不处理协同、历史记录、业务逻辑
- 不依赖 React，只接收 DOM Canvas 元素

> 这与文档中的目标一致：**Renderer 只关心 “给我一棵状态树，我负责高效画出来”。**

---

## 二、整体结构与模块划分

目录核心结构：

```txt
packages/renderer-canvas/
  src/
    index.ts                  // 对外入口

    types.ts                  // 渲染层 ViewModel 类型

    core/
      RenderScene.ts          // 从 EditorState 投影到 RenderScene
      WhiteboardRenderer.ts   // 渲染引擎核心类

    geometry/
      transform.ts            // 世界坐标 ↔ 屏幕坐标
      bounds.ts               // 包围盒计算
      hitTest.ts              // 精确命中检测（节点）

    spatial/
      GridIndex.ts            // 空间索引（MVP：网格实现）
```

### 1. `types.ts`：渲染 ViewModel

- `RenderBlock`：从 `TripBlock` 投影而来的渲染节点
  - `id / kind / x / y / width / height / zIndex`
  - `style: BlockRenderStyle`（背景色、边框、文字颜色等）
  - `label`：用于节点中心展示的文本
- `RenderConnector`：从 `Connector` 投影而来的渲染连线
  - `id / fromBlockId / toBlockId`
  - `points: {x,y}[]` 世界坐标下的折线路径（MVP 为两点直线）
  - `style: ConnectorRenderStyle`
  - `zIndex`
- `RenderScene`：`{ blocks: RenderBlock[]; connectors: RenderConnector[] }`

> 这一层完全解耦 core 的业务模型，专注于“渲染所需的数据形态”。

### 2. `core/RenderScene.ts`：从 EditorState → RenderScene

导出函数：

```ts
export function buildRenderScene(
  state: EditorState,
): { scene: RenderScene; blockMap: Map<BlockId, RenderBlock> }
```

职责：
- 遍历 `state.doc.blocks`，调用 `blockToRenderBlock` 投影每个 `TripBlock`
  - 提取 `layout.position / size / zIndex`
  - 根据 `kind` 映射到不同的样式（飞行/酒店/备注等）
  - 生成适合 UI 的 label（例如航班号、酒店名等）
- 遍历 `state.doc.connectors`，基于 block 的中心点生成 `RenderConnector.points`
  - MVP 使用“起点块中心 → 终点块中心”的直线
  - 样式使用 `Connector.style` 映射
- 对 `blocks` / `connectors` 按 `zIndex` 排序，保证渲染顺序稳定
- 返回：
  - `scene`：给 renderer 绘制
  - `blockMap`：给命中检测与后续几何计算使用

> 将来要引入更复杂的连线路由（直角折线、避障等），也集中在这一层完成。

### 3. `geometry/transform.ts`：坐标系转换

定义：
- 世界坐标系（world）：`TripBlock.layout.position` 所在坐标系，画布理论上无限大
- 屏幕坐标系（screen）：Canvas 像素坐标

提供函数：
- `worldToScreen(world, viewport, canvas): {x,y}`
- `screenToWorld(screen, viewport, canvas): {x,y}`
- `worldSizeToScreen(size, zoom): number`

> 这是后续 WebGL 版也可以沿用的界面，只需在内部换成矩阵运算即可。

### 4. `geometry/bounds.ts` / `geometry/hitTest.ts`：包围盒与命中

`bounds.ts`：
- `Rect`：轴对齐矩形
- `getBlockBounds(block: RenderBlock): Rect`
- `rectContainsPoint(rect, point)`
- `rectIntersects(a, b)`

`hitTest.ts`：
- `hitTestBlock(block, worldPoint)`：
  - MVP：直接用 Axis-Aligned Rect 检测，不考虑旋转

> 线段/折线的命中检测预留在几何层，后续可扩展为“点到线段距离 < 阈值”的宽线段模型。

### 5. `spatial/GridIndex.ts`：空间索引

接口：
- `SpatialIndex`：
  - `insert / remove / update / queryPoint / queryRect / clear`

实现：
- `GridIndex`：
  - 把世界平面划分为固定大小的网格（cellSize）
  - 每个格子（cell）记录该格子覆盖的对象 ID 集合
  - `queryPoint` / `queryRect` 用格子定位候选对象，做为“粗筛选”

> 命中检测走“两阶段”：  
> GridIndex 粗筛选可能命中的对象，再由 `hitTestBlock` 做精确检测。  
> 将来可以替换为 Quadtree/R-Tree，而不动 Renderer 公共接口。

---

## 三、`WhiteboardRenderer`：渲染引擎核心类

文件：`core/WhiteboardRenderer.ts`  
对外接口：

```ts
export interface WhiteboardRendererOptions {
  mainCanvas: HTMLCanvasElement;
  backgroundCanvas?: HTMLCanvasElement;
  overlayCanvas?: HTMLCanvasElement;
}

export class WhiteboardRenderer {
  constructor(options: WhiteboardRendererOptions);

  updateState(state: EditorState): void;
  render(): void;
  resize(width: number, height: number, dpr: number): void;

  hitTestBlockAt(screenX: number, screenY: number): BlockId | null;
  hitTestConnectorAt(screenX: number, screenY: number): ConnectorId | null; // 预留

  destroy(): void;
}
```

### 1. 内部状态

- `scene: RenderScene`：当前渲染场景
- `blockMap: Map<BlockId, RenderBlock>`：方便命中 & 布局使用
- `viewport: Viewport`：来自 core
- `selection: Selection`：来自 core
- `canvasSize: CanvasSize`：当前画布像素尺寸
- `dirty: boolean`：是否需要重绘
- `spatialIndex: SpatialIndex`：用于命中检测
- 多个 Canvas 上下文：
  - `mainCtx`：主渲染层（节点 + 连线）
  - `backgroundCtx`：背景层（网格等）
  - `overlayCtx`：覆盖层（选中框等）

### 2. `updateState`：从 EditorState 更新引擎

流程：
1. 调用 `buildRenderScene(state)` 得到 `scene + blockMap`
2. 更新 `viewport` / `selection`
3. 重建 `spatialIndex`：
   - 遍历 `scene.blocks`，将每个 block 的包围盒插入索引
4. 标记 `dirty = true`

### 3. `render`：完整绘制一帧

MVP 版本采用“全量重绘”：

1. 清空所有画布
2. 绘制背景网格（可选）
3. 绘制连线：
   - 遍历 `scene.connectors`
   - `worldToScreen` 将折线路径映射到屏幕坐标
   - 使用 Canvas 的 path API 绘制
4. 绘制节点：
   - 遍历 `scene.blocks`（已按 zIndex 排序）
   - 使用 roundRect 绘制带圆角的卡片背景与边框
   - 居中绘制 label 文本
5. 绘制选中状态：
   - 遍历 `selection.selectedBlockIds`
   - 为每个 block 绘制高亮虚线框

> 后续性能优化（视口剔除、脏矩形、LOD 等）可以在现有结构中渐进增加，而不改变对外接口。

### 4. `resize`：处理画布尺寸变化

- 根据 `width / height / devicePixelRatio` 设置 Canvas 真实尺寸与 CSS 尺寸
- 调整 context 的 scale，使绘制以 CSS 像素为单位
- 标记 `dirty = true`

### 5. 命中检测 API

`hitTestBlockAt(screenX, screenY)`：

1. 使用 `screenToWorld` 将屏幕坐标转换到世界坐标
2. 调 `spatialIndex.queryPoint(worldPoint)` 获取候选节点 ID 列表
3. 将候选 ID 映射为 `RenderBlock`，按 zIndex 排序
4. 从顶层往下使用 `hitTestBlock(block, worldPoint)` 精确检测
5. 返回第一个命中的 blockId（或 null）

`hitTestConnectorAt`：
- MVP 暂未实现，将来可基于折线的“点到线段距离”逻辑实现。

---

## 四、与 core / app 的协作方式

在 `packages/app` 中，React 组件以如下方式使用引擎：

1. React 管理 `EditorState`（通过 core 的 commands 更新）
2. `WhiteboardRenderer` 持有 Canvas 和内部场景，不修改状态
3. 当 `EditorState` 更新时：
   - 调用 `renderer.updateState(editorState)`
   - 调用 `renderer.render()`
4. 交互链路示例（点击选中）：
   - Canvas `onClick` → `hitTestBlockAt(screenX, screenY)` → `blockId`
   - 若命中：调用 core 的 `setSelection` 命令 → 新的 `EditorState`
   - React setState → `renderer.updateState + render`

> 这样形成了一个清晰的闭环：  
> **用户事件 → 渲染引擎命中检测 → core Command 更新状态 → 渲染引擎重绘**。

---

## 五、扩展与演进方向

1. **视口剔除（Culling）**
   - 在 `renderBlocks` / `renderConnectors` 中，只绘制与当前视口矩形相交的对象。
   - 利用 `rectIntersects` 与 Viewport → WorldRect 的转换。

2. **脏矩形 / 局部重绘**
   - 在拖拽场景下，只清除和重绘“旧位置矩形 ∪ 新位置矩形”的区域。
   - 利用 `dirtyRects: Rect[]` 维护需要重绘的区域。

3. **更精细的命中检测**
   - 对连线使用“点到线段距离 < 阈值”的宽线段模型，提高体验。
   - 在高缩放下调整阈值，保持可点击性。

4. **WebGL 渲染器**
   - 共享 `RenderScene` / 几何工具，替换实现为 WebGL（VBO/IBO + batching）。
   - 对比 `Canvas` 与 `WebGL` 在大规模节点（例如 5k+ sticky notes）场景下的性能差异。

---

## 六、小结

- `renderer-canvas` 是一个 **独立的、只依赖 core 类型的渲染引擎**：
  - 明确职责：接收 `EditorState`，渲染白板并提供命中检测。
  - 结构清晰：`RenderScene` 投影 + 几何工具 + 空间索引 + Renderer 核心类。
  - 易于扩展：为视口剔除、脏矩形、WebGL 等优化保留了清晰的扩展点。
- 在面试/文档中，可以把它描述为：

> “实现了一套 Canvas 白板渲染引擎：基于场景投影 + 视口变换 + 空间索引，实现上千节点下的绘制与命中检测，并与核心状态机（core）解耦，后续可以平滑迁移到 WebGL 渲染后端。”  


