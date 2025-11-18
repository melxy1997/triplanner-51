# Perf Lab：白板渲染性能实验室

Perf Lab 是项目内置的一套 **白板渲染性能实验环境**，用于在可重复的场景下，对比不同渲染策略（Canvas / 未来 WebGL）在 FPS、帧耗时和绘制负载上的表现，帮助你把“感觉流畅”变成**有数据支撑的实验报告**。

---

## 1. 怎么跑起来？

### 1.1 在任意宿主应用中挂载 Perf Lab

`@triplanner/app` 暴露了一个便捷入口 `mountPerfLab`，可以在任意已有页面里快速挂载性能实验室：

```ts
import { mountPerfLab } from '@triplanner/app';

// 在 id 为 root 的容器中挂载 Perf Lab
mountPerfLab('#root');

// 或者传入一个已有的 HTMLElement
const container = document.getElementById('perf-root')!;
mountPerfLab(container);
```

> 说明：
> - 在浏览器环境下调用即可；非浏览器 / SSR 环境会直接返回 `null` 不做渲染。
> - 如果传入的选择器找不到 DOM 节点，会自动在 `document.body` 下创建一个 `#perf-lab-root` 容器。

### 1.2 直接使用页面组件

如果你已经有自己的路由系统，也可以直接使用页面组件：

```tsx
import { PerfLabPage } from '@triplanner/app';

export default function PerfLabRoute() {
  return <PerfLabPage />;
}
```

---

## 2. Perf Lab 界面结构

Perf Lab 页面主要由三部分组成：

- **左侧控制面板**
  - 选择压测场景（节点数量 / 分布形态）
  - 选择操作脚本（视口平移、缩放、批量拖拽）
  - 开始 / 停止压测按钮
  - 重新生成数据（重置为同分布的新数据，刷新随机性）
- **中间白板画布**
  - 使用真实的 `WhiteboardRenderer` 渲染
  - 每帧的渲染调用都会采集性能指标
- **右侧 Perf Panel 指标面板**
  - 实时显示最新一帧的各项指标
  - 显示最近 60 帧的 FPS 变化轨迹
  - 显示当前场景配置（节点 / 连线数量等），方便截图 / 写报告

---

## 3. 预置压测场景（Scenarios）

场景定义在 `packages/app/src/perf/scenarios.ts` 中，当前内置了三种典型场景：

- **Grid · 1k Blocks (`grid-1k`)**
  - 约 1024 个节点 + 512 条连线
  - 规则网格分布，适合作为基础 FPS 基准测试
- **Grid · 3k Blocks (`grid-3k`)**
  - 约 3072 个节点 + 1.5k 条连线
  - 中高压场景，用于测试缩放 / 平移下的帧率与重绘策略
- **Clusters · 5k Blocks (`cluster-5k`)**
  - 5000 个节点分布在 9 个聚簇区域内
  - 更接近真实业务画布（多热点区域），适合观察空间索引 / 视口裁剪的收益

每个场景都会自动设置合理的初始 `viewport`（center + zoom），确保一打开就能看到主要内容区域。

---

## 4. 预置操作脚本（Actions）

操作脚本同样定义在 `scenarios.ts` 中，以 `PerfActionDefinition` 的形式描述。当前包含：

- **静态渲染（Idle Baseline）**
  - 不对视口 / 节点做任何修改
  - 主要用于测量纯渲染开销 & 脏矩形策略的基础成本
- **视口平移（Viewport Pan Loop）**
  - 让 `viewport.center` 按椭圆轨迹在画布上平滑移动
  - 评估空间索引 + 视口裁剪在大图场景下的表现
- **视口缩放（Viewport Zoom Loop）**
  - 在一定区间内、以正弦波形式在缩小与放大之间来回切换
  - 观察不同缩放层级下的 FPS / 抗锯齿表现
- **批量拖拽 200 节点（Batch Drag 200 Blocks）**
  - 从当前数据中取出最多 200 个节点，模拟多选拖拽
  - 每一帧对这 200 个节点应用轻微的波动位移，重点观察：
    - 多节点布局更新（`moveBlocks`）的开销
    - 对脏矩形与局部重绘策略的压力

> 所有操作脚本都通过 core 的命令层（例如 `setViewport`、`moveBlocks`）驱动，保证与真实业务交互路径一致。

---

## 5. 指标体系（UnifiedRenderStats）

Perf Lab 使用统一的渲染指标模型 `UnifiedRenderStats` 来描述每一帧的性能数据，定义见：

- `packages/renderer-canvas/src/core/RenderStats.ts`

关键字段说明：

- **frameTimeMs**
  - 含义：本帧渲染耗时（毫秒）
  - 采集方式：`WhiteboardRenderer.render()` 内使用 `performance.now()` 记录 begin/end 时间
- **fps**
  - 含义：当前帧对应的 FPS，内部通过指数平滑（EMA）方式计算，减少抖动
  - 直观意义：50~60 FPS 为流畅区间，低于 30 FPS 基本可以感受到卡顿
- **blocksRendered / connectorsRendered**
  - 含义：本帧参与绘制的节点 / 连线数量
  - 用途：结合场景配置，可以大致估算“每千节点的单位渲染成本”
- **dirtyAreaRatio**
  - 含义：本帧脏矩形在画布上的面积占比，范围 \[0, 1\]
  - 采集方式：
    - 全量重绘：固定记为 1
    - 局部重绘：将脏矩形投影到屏幕坐标后，计算面积 / 画布总面积
  - 用途：观测脏矩形策略是否有效收敛重绘区域
- **drawCalls**
  - 含义：本帧估算的 draw call 数量
  - Canvas 版实现：
    - 目前粗略估算为 `blocksRendered + connectorsRendered`
    - 未来 WebGL 版可记录真实的 `gl.draw*` 调用次数
- **vertices**
  - 含义：估算的顶点数量
  - Canvas 版实现：
    - 简化计算为 `blocksRendered * 4 + connectorsRendered * 2`
    - WebGL 版可以改为缓冲区实际顶点数
- **texturesBound**
  - 含义：本帧绑定或切换的纹理数量（WebGL 场景更有意义）
  - Canvas 阶段记为 0，即占位字段

所有这些字段通过 `StatsTracker` 汇总成时间序列，并在 `PerfPanel` 中以数字 + 小型柱状图的形式展示。

---

## 6. 如何在文档 / 面试中使用 Perf Lab 结果？

使用 Perf Lab 做完一轮实验后，你可以输出类似这样的描述：

- 场景：`grid-3000`，连续运行 10 秒视口平移脚本
- 渲染策略：
  - Canvas naive：不做视口裁剪、不做脏矩形，只做整帧重绘
  - Canvas + culling + 脏矩形：开启空间索引 & 局部重绘
- 指标对比（示意）：
  - Canvas naive：FPS ≈ 25，平均 frameTime ≈ 40ms，dirtyAreaRatio ≈ 1.0
  - Canvas 优化版：FPS ≈ 45，frameTime ≈ 22ms，dirtyAreaRatio ≈ 0.3

这样在向团队或面试官介绍时，你可以说：

> “我们在白板项目里自搭了一套 Perf Lab，用统一的数据生成器和交互脚本来压测不同渲染策略。  
>  例如在 3k 节点的场景下，对比了 Canvas naive 与开启视口裁剪 + 脏矩形后的差异：FPS 从 25 提升到 45，平均帧耗从 40ms 降到 22ms，脏区域面积比例从 100% 降到了 30%。  
>  这让我们在讨论渲染优化时不是凭感觉，而是拿着完整实验数据做决策，也为后续引入 WebGL 提供了基线。”

---

## 7. 后续扩展方向

- **接入 WebGL 渲染器**
  - 通过同一个 `StatsTracker` 接口上报 WebGL 指标（真实 draw calls / vertices / texture switches）
  - 与现有 Canvas 实现做一对一对比
- **导出实验结果**
  - 在 `PerfPanel` 中增加“导出最近 N 帧数据为 JSON/CSV”能力，方便直接贴进报告
- **更多场景与脚本**
  - 例如：超长连线密集场景、节点频繁创建/删除场景、协同游标 / 选区装饰压力场景等

通过这套 Perf Lab，你可以让白板项目从“能跑”升级为“有系统性能实验支撑的工程作品”，也更容易在团队内传播和在面试中讲出深度。


