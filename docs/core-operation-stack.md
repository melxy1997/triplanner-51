# Core 操作栈设计（Step → Transaction → Command）

> 参考自 Marijn Haverbeke 在 ProseMirror / CodeMirror 中的层次化操作模型。

## 背景

在复杂编辑器 / 白板系统中，**状态 = Typed Tree（文档）**，**变更 = 操作流**。  
MH 的做法是把“操作”拆成清晰的三层，分别负责不同粒度的职责：

```
UI / 业务语义 → Command
Command → Step[] + Meta → Transaction
Step → apply() / invert() → 直接修改状态
```

这样做有几个核心好处：

1. **操作可推导**：每个 Step 都可逆，便于撤销 / 协同 / 回放。
2. **事务可组合**：Transaction 可在多个 Step 间组织语义、附加 metadata、写入历史栈。
3. **UI 可解耦**：Command 把复杂度封装起来，React 层只需要 `setState(prev => command(prev, payload))`。

## 三层职责

### 1. Step（最小可逆原子）

* 对应文件：`core/src/steps/*`
* 例子：`AddBlockStep`、`UpdateBlockLayoutStep`、`SetSelectionStep`、`SetViewportStep`
* API：`apply(state)` / `invert(before)` → `StepApplyResult`
* 特点：
  - 不关心历史、协同、UI
  - 只描述“对文档的最小合法变更”
  - 可序列化，便于网络传输

### 2. Transaction（Step 的有序组合）

* 对应文件：`core/src/transaction/transaction.ts`
* 内容：`steps: Step[]` + `meta: TransactionMeta`
* Meta 字段：`addToHistory`、`source (local/remote/system)`、`label`、`groupId`、`timestamp` 等
* 作用：
  - 在一个原子用户操作里执行多个 Step（例如“拖拽”= 多次 `UpdateLayoutStep`，最终合并为一个 Transaction）
  - `applyTransaction` 负责依次执行 Step，失败则整体回滚，并生成 inverse Transaction
  - History 只需要记录 Transaction 级别的 entry：`{ transaction, inverse }`

### 3. Command（UI / 业务入口）

* 对应文件：`core/src/commands/*`
* 例子：`addBlock`、`updateBlockLayout`、`removeBlock`、`setViewport`、`setSelection`、`undo`、`redo`
* 职责：
  - 把业务语义封装成“调用 Step + 组装 Transaction + 写入 History”这一套流程
  - React / renderer 只需 `setState(prev => command(prev, payload))`
  - 决定哪些操作进入历史、哪些不该记（例如视口/选中不入历史）

## 与 ProseMirror / CodeMirror 的对应关系

| Triplanner Core | ProseMirror / CodeMirror | 说明 |
|-----------------|-------------------------|------|
| Step            | Step / Transaction Step | 单个可逆变换 |
| Transaction     | Transaction             | Step 列表 + Meta |
| Command         | Command / State Command | UI 触发的高级操作 |

ProseMirror 中的 Command（如 `toggleMark`）会构造 Transaction，Transaction contains Steps。  
撤销/协同只需关心 Transaction 日志，而非 UI 事件细节。  
我们的实现沿用同样的理念，只是对象从“文本节点”换成“白板节点”。

## 为什么不直接在 Command 里改状态？

1. **需要可逆操作**：Step 负责 `invert`，如果直接改状态就失去可逆性。
2. **需要共享操作日志**：Transaction 统一了历史栈 / 协同日志的格式，Command 只负责表达语义。
3. **需要复用**：底层 Step 可以被不同 Command 复用（例如 `UpdateBlockLayout` 同时服务于拖拽、对齐、自动布局）。

## 当前实现示意

```tsx
// UI 层（React）
setState(prev => addBlock(prev, createFlightBlock(...)));

// Command: addBlock
const step = createAddBlockStep(block);
const tr = { steps: [step], meta: { addToHistory: true, source: 'local', ... } };
const res = applyTransaction(state, tr);
if (res.inverse) pushToHistory(res.state.history, { transaction: tr, inverse: res.inverse });

// applyTransaction
for each step:
  result = step.apply(currentState)
  inverses.unshift(step.invert(beforeState))
return { state: currentState, inverse: { steps: inverses, meta: ... } }
```

## 后续扩展点

* **协同（Yjs）**：只需把 Transaction 序列化后发送，远端 apply 即可；Step/Command 不用改。
* **宏操作 / 脚本化**：Command 可以再往上封装（例如 “自动排版 + 添加连线”），底层照用 Step。
* **性能分析 / 监控**：依赖 Transaction 的 `label`、`groupId`、`timestamp` 统计。
* **撤销合并策略**：利用 Transaction meta 的 `groupId` 合并拖拽操作，与 ProseMirror 的 “applying transactions with same group” 类似。

---

> 总结：  
> **Step** 专注于“如何修改文档”，  
> **Transaction** 负责“把这些变更作为一个原子操作落地并写入历史”，  
> **Command** 负责“业务语义 → 事务调用 → 状态更新”。  
> 这个分层正是 MH 在 ProseMirror / CodeMirror 里取得成功的核心思想，我们直接复用了，以便后续扩展协同、回放、脚本化等高级能力。 

---

## 三条场景链路如何映射到操作栈

### 1. “添加 FlightBlock + 映射到 Timeline + 撤销”

- **Command**：`addFlightWithTimeline`（`core/src/commands/blockCommands.ts`）  
  - 通过 `createFlightBlock` 工厂拿到合法 `FlightBlock`  
  - 自动生成 `TimelineItem`，把两条 `Step`（`AddBlockStep` + `AddTimelineItemStep`）组装为一个 Transaction  
  - `meta.addToHistory = true`，因此一次操作 = 一条 History entry
- **History**：`undo / redo` 直接复放 Transaction，保证 Block 与 Timeline 同时回滚

### 2. “画布点击选中 TripBlock 并高亮”

- **Command**：`setSelection`（`viewCommands.ts`）默认 `addToHistory = false`
- **Step**：`SetSelectionStep` 仅修改 `state.selection`，不触碰 `doc`
- **Renderer**：监听到新的 selection 后在 overlay 层绘制虚线框

### 3. “连续拖拽 → Step 合并 → 脏矩形”

- **Command**：`moveBlocks`
  - 将多个 `UpdateBlockLayoutStep` 打包成一个 Transaction
  - 通过 `groupId` 标记为同一拖拽会话
- **History**：`pushToHistory` 检测同 `groupId` 的相邻 entry 并自动合并，等效于 ProseMirror 的 transaction grouping，保证一次拖拽只占一个撤销单元
- **React UI**：拖拽结束后 `setState(prev => moveBlocks(prev, patches, { groupId }))`
- **Renderer**：拖拽过程中只更新本地 `dragPreview.delta`，不写入 core；mouse up 时才提交 Transaction

这样一来，文档中描述的三条链路都能直接落在 Step → Transaction → Command 模型上，既能讲“数据正确性”（可逆 / 不变量），也能讲“用户体验”（一次拖拽一次撤销）。 

