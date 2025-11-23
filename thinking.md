# Marijn Haverbeke 思想

## Codex 给出的简述
### MH 思想脉络综述
- **体系定位**：MH 将编辑器视作“可动画的持久化数据结构”，以不可变节点树 + 事务操作串行化，奠定了现代复杂交互的框架无关内核思路。
- **代表工程**：`CodeMirror`、`ProseMirror`、`Lezer` 解析器、`Eloquent JavaScript` 书籍，构成从语言教学到运行时内核的完整链条。
- **设计哲学**：强调“功能核 + 可拔插外围”，以严格 schema、插件协议、事务日志组成的分层体系，在富文本、协作、图形、低代码等领域被广泛复制。

### 经典理论要点
- **数据即语法树**：全部状态都抽象为 typed node tree；变更是对树的最小 Step，易于验证和 replay。
- **事务化操作流**：单次用户交互被封装为 `Transaction`，包含前置条件、变更、meta 信息，天然支持撤销、协作与 time-travel。
- **插件协议**：核心只暴露 hook（state lifecycle、view lifecycle、DOM 事件映射），任何能力（输入法、keymap、协作游标）皆以插件装配，确保演进不破坏内核。
- **不可变 / 增量渲染**：状态不可变，但视图分片 diff（decorations、viewport slicing），兼顾正确性与性能——为 React Concurrent Mode 提前提供思路。
- **Schema 驱动验证**：内容模型用 DSL 严格定义，可在编辑时阻断非法结构；这一做法后来引导 TipTap、低代码平台的强类型校验。
- **操作先于状态**：强调 OT/CRDT “转换操作”而不是同步状态；协作冲突靠 Step/Transform 组合解决，启发 Automerge、Yjs。

### 扩展影响
- **图形/白板系统**：事件总线 + HistoryManager，模型与 UI 彻底分离，Excalidraw/React-Diagrams 直接复用该思路。
- **DSL/低代码**：事务化 DSL 校验（禁止删除被引用组件）、强 schema 审批，来源于 ProseMirror 的 node constraint。
- **游戏与交互式应用**：命令模式撤销重做、集中输入映射、可组合事件处理器，Phaser 等引擎在编辑器工具链中采用。
- **教育与知识传递**：`Eloquent JavaScript` 把函数式和状态机理念灌输给初学者，折射其“严谨模型 + 可执行范式”哲学。

### 值得借鉴的实践建议
- **先写概念文档**：参考 ProseMirror Principles，先定义对象、约束、操作，再写代码，降低复杂系统维护成本。
- **分层内核**：把功能拆成 `State`（不可变数据）、`Transaction`（操作语义）、`View`（渲染），保证可测试与替换。
- **插件即能力**：用显式 hook 管理扩展点，让团队能并行开发而不互相冲突。
- **精细增量更新**：只重绘受影响的片段（range/decorations），在任何重度交互场景都能保持性能稳定。
- **操作可组合**：设计 Step/Command 应满足可序列化、可撤销、可合并，便于实现协作、离线、审计等增值特性。
- **Schema 与运行时绑定**：让 schema 不只是验证，而是驱动输入法、菜单、快捷键等交互逻辑，实现“强一致 UX”。

## MH 的整体画像：从“写工具的人”到“复杂交互系统的哲学家”

很多人只把 Marijn Haverbeke（MH）当作几款著名编辑器的作者：`CodeMirror`、`ProseMirror`、`Lezer`、`Acorn`、`Tern`、《Eloquent JavaScript》……  
但如果从前端架构与交互系统设计的视角重新看，你会发现他更像是一个**“复杂状态系统设计哲学”**的奠基人。

你引用的资料已经讲了他在**不可变状态树 / 事务化操作 / 插件架构**上的开创意义。下面我从几个额外的、但同样重要的维度，把他更完整的架构理论与设计哲学补全成一篇介绍。

---

## 一、核心世界观：**“编辑器只是一个带视图的状态机”**

MH 对编辑器的看法可以概括为一句话：**编辑器不是一堆 DOM hack，而是一个显式的、可推理的状态机**。

- **数据优先，而不是 UI 优先**
  - 传统 WYSIWYG 编辑器：直接操作 DOM / `contentEditable`，UI 即 State，逻辑高度耦合，难以推理。
  - MH 的做法：  
    - 定义一个**完整的文档状态模型**（树、节点、标记等），作为**唯一真实来源（Single Source of Truth）**。
    - 所有用户操作抽象成“对文档状态的变换（Steps/Transactions）”。
    - 视图仅仅是文档状态的**投影**，而非数据本身。

- **状态机而不是事件堆**
  - 每次用户输入 / 粘贴 / 删除 / 协作同步，本质都是：  
    \[ State_{n+1} = f(State_n, Operation) \]
  - 这套思想在 `ProseMirror` 和 `CodeMirror 6` 里被贯彻到极致：  
    - 编辑器核心不关心 DOM，只关心**状态流转**。
    - DOM 更新是一个“副作用层”，被严格限制在 View 层。

**对前端工程师的启发**：  
复杂前端应用（富文本、画布、低代码、流程引擎）最好**先画清楚状态机和操作模型，再考虑 UI**，不要从组件堆砌开始。

---

## 二、文档模型哲学：**强 Schema + 不可变数据结构**

在 `ProseMirror` 中，他做了一个非常重要但经常被忽视的设计：**用 Schema 强力约束文档结构**。

- **Schema 驱动的文档结构**
  - 每个节点类型可声明：
    - 能包含哪些子节点
    - 哪些 Mark（加粗、链接、下划线等）合法
    - 哪些节点可以互相嵌套
  - 所有编辑操作，都必须**保持文档结构合法**，否则视为非法 Step。

- **不可变、持久化数据结构**
  - 文档树是不可变的，每次操作不会原地修改，而是返回一个新版本（结构共享）。
  - 好处：
    - 天然支撑 **Undo/Redo**（历史版本链就是状态链）。
    - 易于做时间旅行、调试回放。
    - 协作冲突处理更容易，因为每一步都是清晰的“旧状态 → 新状态”的映射。

- **“非法状态不可表示（Illegal States Are Unrepresentable）”**
  - 这是他在设计中非常偏好的理念：  
    **通过类型与 Schema 设计，让错误状态在逻辑层就“构造不出来”**。
  - 对标很多系统是“允许一堆乱七八糟的状态，然后在 UI / 校验里兜底补救”。

**对工程与面试的价值**：  
当你设计表单引擎 / 流程引擎 / 图形编辑器时，如果能说出“我们会定义一个 Schema 约束所有合法状态，让非法状态根本构造不出来”，这是一种**高成熟度架构思维**，很多高级职位面试官会非常买账。

---

## 三、操作中心主义：**Step / Transaction / History 的三层模型**

你在资料中已经提到了 Step / Transaction / Plugin，这部分其实可以更系统地理解为：

- **Step：最小原子操作**
  - 例如：
    - 插入一段文本
    - 删除一段范围
    - 包裹为某种节点或 mark
  - 每一个 Step：
    - 是可序列化的（便于网络传输）
    - 有明确的 `apply` 方法：`newState = step.apply(oldState)`
    - 通常还伴随一个 inverseStep，用于撤销

- **Transaction：有语义的操作组合**
  - 用户一次“看得见的”操作（如输入一段中文、粘贴一段富文本）通常对应多个 Step。
  - Transaction 负责：
    - 打包多个 Step
    - 附带 metadata（例如：是否加入 history、来源是本地还是远端、是否需要滚动到可视区域等）
  - Transaction 带来的最大好处：  
    **可以给操作赋予更高层语义，而不只是机械的 DOM 变动**。

- **History：时光机，而不是快照列表**
  - History 维护的是一串 Transaction 的逆操作，而不是整个文档的完全快照。
  - 这让：
    - Undo/Redo 成本与操作数相关，而不是与文档大小相关。
    - 为协作系统提供了“可变换的操作流”，方便与 OT/CRDT 集成。

**这套思想的延展**：  
- 任何需要撤销重做的系统（画布、流程图、状态机编辑器、低代码布局器）都可以复用：
  - **操作日志 + 可逆操作 + 事务化组合**这个模式。
- 相比很多简单系统用“深拷贝整个 state 放进栈里”，MH 的做法是**从操作层做抽象**，更稳健、更高维。

---

## 四、增量计算与性能哲学：**只为“有意义的变化”付费**

在 `CodeMirror 6` 与 `Lezer`（增量 parser）中，MH 非常强调一个核心理念：**不要为不影响用户体验的计算浪费时间**。

- **增量解析（Incremental Parsing）**
  - `Lezer` 的 parser 会维护一个树结构，并在输入变动后，仅重新解析受影响的局部，而不是整文件。
  - 好处：
    - 大文件依然能在每次击键后保持流畅。
    - 语法高亮、错误提示等可以实时更新，而不会卡顿。

- **视口（Viewport）驱动渲染**
  - 文本编辑器永远只渲染“屏幕上看得到的那几十行”，其余部分只保留数据，不生成 DOM。
  - 这和虚拟列表（virtualized list）的思路类似，但在编辑器场景下更复杂（需要精确定位光标、选区、软折行等）。

- **精细化 DOM 更新**
  - 编辑操作会被映射到**最小化的 DOM 差异**，避免大范围重绘。
  - 在 `CodeMirror 6` 中，视图层使用了一种接近“局部虚拟 DOM”的机制，但比 React 更低层、更针对编辑器场景。

**对前端工程实践的启示**：  
- 真正复杂且性能敏感的系统，往往需要：
  - 显式建模“增量计算”路径
  - 显式建模“视口/可见区域”
- 你可以把这当成“把 React 的 reconciliation 思想推广到你的业务状态和数据结构上”。

---

## 五、插件与扩展哲学：**小核心 + 可组合扩展**

MH 一直坚持的一个架构风格是：**把核心做到极小、稳定，然后把绝大部分特性做成插件**。

- **“编辑器本身什么都不做”**
  - 原生 `ProseMirror` / `CodeMirror 6` 核心几乎不提供“业务功能”：
    - 不内置快捷键
    - 不内置特定语言支持
    - 不内置特定工具栏
  - 一切都是通过 Plugin / Extension 注入：
    - Keymap 插件
    - 历史管理插件
    - 协作插件
    - 自定义 NodeView / Widget 插件
    - 语言服务插件（在 `CodeMirror 6` 中）

- **插件是“一等公民”，而非“附加钩子”**
  - 核心数据结构（State）直接为插件预留了“State Field”、“View Plugin”等扩展点。
  - 插件可以：
    - 持有自己的私有状态
    - 订阅 Transaction
    - 参与文档渲染（通过 Decoration / NodeView）

- **组合优先，而非继承**
  - 没有庞大的继承层次，而是通过一组 Extension/Plugin 列表来组合出某种编辑体验。
  - 这和 React Hook / 中间件体系精神类似：**功能粒度更细，通过组合构造复杂行为**。

**对项目架构的启示**：  
- 任何大前端系统（例如：低代码平台、流程引擎、画布编辑器）都可以借鉴：
  - 把核心做成一个最小状态机
  - 业务与扩展通过插件/中间件机制挂载上去
  - 形成“可裁剪 / 可增量演化”的架构

面试中，若被问到“你会怎么设计一个可插拔的富文本/画布系统”，围绕**小内核 + 插件化扩展点 + 组合式配置**来回答，是非常高级的答案。

---

## 六、语言与工具观：**可靠解析 + 精准抽象**

除了编辑器，MH 还写了大量语言工具：`Acorn`（JS parser）、`Tern`（静态分析 / IDE 补全）、`Lezer`（通用 parser）。

背后的共同哲学是：**工具的基础是一个可靠、可组合的语法与语义模型**。

- **最小但完整的抽象**
  - `Acorn` 是一个非常“小”的 parser，但：
    - 完整覆盖 ECMAScript 语法
    - 对标准变化快速响应
    - 保持模块化，使其易于嵌入各种工具链
  - `Tern` 也是最小化设计：用尽量少的配置，构建一个能供编辑器使用的静态分析模型。

- **可恢复错误的解析（Error Recovery）**
  - 在编辑环境中，代码往往是“不完整的”：
    - 缺括号
    - 写到一半的表达式
  - MH 的 parser 设计会在错误处**智能恢复**，继续构建 AST：
    - 这对 IDE 来说极其关键，否则任何半写的代码都会让工具瘫痪。

**对前端工程师的启示**：  
- 当你设计 DSL（表单配置、工作流语言、低代码描述语言）时：
  - 不要只考虑“合法代码长什么样”
  - 还要考虑“非法 / 不完整的输入如何被优雅处理”
- 可恢复的 parser、清晰的 AST 设计，是很多高级系统的必备能力。

---

## 七、工程与教学哲学：**简单、可解释、可验证**

MH 的作品有一个共同特点：**代码和文档都非常“讲道理”**。

- **论文级文档 + 可读源码**
  - `ProseMirror` 的 principles 文档，基本是一篇“论文 + 工程设计说明书”。
  - 源码中大量注释，解释“为什么要这么设计”，而不仅仅是“这么用”。

- **偏爱函数式与纯度**
  - 在《Eloquent JavaScript》以及他的库设计中，你会看到：
    - 较多不可变数据结构
    - 纯函数式更新
    - 清晰分离“计算逻辑”和“副作用”
  - 这让系统具备：
    - 更易测试（输入 → 输出，可预测）
    - 更易调试（Transaction 可回放）
    - 更易重构（依赖关系清晰）

- **通过真实使用来“证明”设计**
  - `CodeMirror`、`ProseMirror` 等项目，都是在长期被真实项目使用中不断打磨：
    - 设计不是一次性定死，而是在实际复杂场景中不断矫正。
    - 他非常强调“**简单到可以解释、严谨到经得起大量使用**”。

---

## 八、对个人成长与面试的落地建议：如何“向 MH 学习”

结合上面这些哲学，如果你想在**工程能力 / 架构思维 / 面试谈吐**上向 MH 靠近，可以刻意练习几个方向：

- **（1）刻意训练“状态机视角”**
  - 看到一个需求（富文本、画布、审批流程、拖拽排序）时，先问：
    - 我能不能把它抽象成一个**状态机 + 操作集合**？
    - 状态有哪些？操作有哪些？哪些操作是可逆的？

- **（2）为你的系统设计“Schema 与不变量”**
  - 学 ProseMirror：
    - 给你的业务数据（表单 / 工作流 / 图形模型）设计一个 Schema。
    - 明确列出：**什么状态是合法的？有哪些状态是禁止出现的？**
  - 把“非法状态不可表示”变成架构目标，而不是事后补救。

- **（3）为复杂操作引入 Transaction 概念**
  - 不要只在 reducer / store 里做一堆 flag 切换。
  - 而是定义：
    - 原子操作（Step）
    - 大粒度操作（Transaction）
    - 并在日志中记录 Transaction，用于：
      - Undo/Redo
      - 调试回放
      - 协作同步

- **（4）学习插件式设计**
  - 设计任何可扩展系统时问自己：
    - “这部分能不能做成插件 / middleware / extension？”
    - “核心能否保持极简？只提供扩展点，而不提供具体业务逻辑？”

- **（5）向下钻研一两个 MH 的实际项目**
  - 推荐顺序：
    - 看 `CodeMirror 6` 的 State / View / Extension 设计
    - 看 `ProseMirror` 的 Transaction / Step / Schema 设计
    - 边读边在脑子里对照：**如果让我来实现，我会怎么做？我会踩哪些坑？**

---

## 九、总结：MH 的“隐形标准”究竟是什么？

综合来看，MH 的经典架构理论与设计哲学可以浓缩成几条对前端非常关键的“隐形标准”：

- **数据优先、UI 是投影**：编辑器 / 画布 / 低代码都应该有独立的状态机与操作模型。
- **Schema 与不变量驱动设计**：让非法状态“构造不出来”，而不是在 UI 层打补丁。
- **操作中心、事务化、可逆**：用 Step / Transaction / History 重构对“修改”的理解。
- **增量与局部性**：只为真正变动的部分付费，结构上支持增量计算与局部渲染。
- **插件化内核、组合式扩展**：小内核 + 高度可组合的插件体系，是复杂系统的最佳形态之一。
- **简单但可验证**：每个设计都有清晰的解释路径和可验证性，而不是“只要能跑就行”。


如果你能把这些思想融入到自己日常的前端架构决策中，你不仅是在“用好 ProseMirror / CodeMirror”，而是在**站在 MH 搭好的那套抽象之上重新设计自己的系统**——这也是很多高级前端工程师和架构师真正关心的东西，也非常适合作为面试中体现深度的谈资。


# 个人背景 与 岗位 JD 分析

## 个人背景

我是to C应用(Trip.com Fights 预订网站)的前端研发工程师 工作4年, 考虑到此类纯业务的前端开发发展受限 并且很容易被AI取代, 因此希望转型 找一份技术细节和思维含量更加复杂和深入的"泛前端研发"工作, 这可能延长我的职业生涯长度、加深深度。
我目前调研来看, 类似于前端文档、编辑器、白板类效率工具应用的研发似乎比较符合。
因此我想通过设计和实现一个以 "在线白板工具研发岗位求职面试" 为导向的实操项目, 做好提前学习和充足准备, 让面试官能认为我"真实设计决策过、实操过调试过、踩坑解决过、深入研究过", 以为我是前端复杂应用这方面的“经历者”、“思考者”、“主导者”。

因此, 我在构想一个以在线协作白板编辑器功能为核心的多人协同出行规划应用 "Triplanner"：

```
需求场景是这样的：我经常和几个不同出发地 相同目的地的好朋友 为了旅游行程规划 而开一个线上会议 通过共享屏幕和共享文档 实时地协同交互地 查询交通(机票/火车)、景点、住宿(酒店), 通过讨论最终得到某种形式的“旅行规划”, 最后还要把这个规划分享给旅行团其他朋友, 这个过程涉及多个工具、网站、界面的切换跳转、决策和信息整合, 还是比较麻烦的。

我们把这个需求场景, 设计为一个与 Trip.com 旅行业务紧密相关的 Hackathon 项目, 将白板、协同等复杂前端设计体现出来

---
## 界面设计

1. Trip.com 功能集成区 (地图/交通/景点/住宿) 查询侧边栏
2. 规划功能白板区(白板/时间轴) 是应用的核心页面, 用户可在此进行头脑风暴, 随意放置来自左侧边栏的搜索结果卡片或自由创建元素。

白板区域是一个自由画布, 用户可以随意拖拽、放置来自侧边栏查询到的交通方式、住宿、景点卡片 (我们称之为 TripBlock), 或自由创建文本、图片等元素。

同时提供一个可展开/折叠的“时间轴面板”, 插入自由画布的行程卡片 会显示在时间轴面板中的特定日期和时间段, 从而将探索性的信息结构化为具体行程。

### 核心功能

**自由行程画布**强调其核心的协作和行程规划能力。它是一个无限大的虚拟空间, 背景是浅灰色, 带有可切换的网格或点阵。

从左侧“Trip.com功能集成区”拖拽的交通、住宿、景点搜索结果会以统一的、Trip.com 品牌风格的卡片形式呈现在画布上。这些卡片可自由移动、调整大小、编辑删除, 并显示核心信息。

除了自由创建文本、图片等元素的工具，有向箭头连接器也是核心功能：用户可以通过点击首个 TripBlock 然后点击第二个 TripBlock 的方式, 创建带有箭头的连接线, 清晰表达两个 TripBlock 之间的时序或逻辑关系 (例如从一个航班卡片连接到下一个酒店卡片)。连接线包含始末时间信息，可调整样式和删除。

## 技术设计

- 使用React构建UI用户界面, 但是白板画布绘制应该是单独通过canvas渲染，
- 应用本身不需要太多服务端逻辑, 甚至完全依赖于NextJS即可, 毕竟本项目只是定位为一个 Hackathon 项目，并不是面向真实流量商用
- 样式可以用Tailwind(非必须), 但是组件元素一定要有语义化的className 否则人类进行调试和维护困难
- Monorepo 架构：
  - packages/core: 纯TS/JS（未来用Rust/WASM），包含所有数据结构、几何计算、协同逻辑。它不依赖任何DOM或UI框架。
  - packages/renderer-canvas: 依赖 core 包，负责实现一个渲染器，将 core 中的数据结构绘制到 Canvas 2D 上下文中。
  - packages/app: 主应用，使用React。它依赖 core 和 renderer-canvas，负责UI界面和将两者粘合起来。
  (这样做的好处是，升级到 WebGL 只需要新增一个 packages/renderer-webgl 包，并在 app 中替换渲染器即可(比如加入Pixi.js的适配器)，而 core 层的逻辑完全不用动)

### 白板渲染

- 技术路线可以完全参考优秀开源编辑器项目, 借此机会 向面试官表达出“我还深入了解过多个项目”源码以及汲取其优秀思想的信息
- 项目重点是 我要自己实现一个“精简版的Excalidraw/tldraw”或者类似的渲染机制, 我不需要它的全部功能 只需要实现必要的白板渲染
- 自己实现的过程中可以进行性能监控和比对，由 MVP 版本的 Canvas 切换到 WebGL，再加入各种优化策略、手段 
  - 此处我只听说过一些零散的概念：脏矩形、包围盒、命中检测、空间索引 (QuadTree R-Tree)、、视口剔除 (Culling)、瓦片渲染、脏标记、Draw Calls、顶点数量 (Vertices)、批处理 (Batching)、LOD (Level of Detail) 纹理图集 (Texture Atlas)……但我还没理清逻辑链条和知识结构，甚至不知道用在哪里，我们可以逐渐学习补充、深入理解
- 最重要的是 自己实现渲染引擎 似乎是在“造轮子”, 实际的价值 是为了向面试官证明我的学习调研能力、从零搭建架构设计能力、潜在的底层改造能力 以及获得真实白板应用开发经验, 提高面试评价中的“经历业务匹配度”

### 多人协同

- 计划采用 Y.js 的 CRDT，因为我们不可能搭建 OT 服务器，另外它似乎有基于 Rust 的 WASM 实现版本，我们可以渐进式改造，进行性能监控和比对
- 由于考虑多人协同，那么强类型的数据模型Schema、操作描述、撤销机制 也是不可或缺的 (学习、应用 Marijn Haverbeke 的哲学，参考 ProseMirror 源码设计)

### 性能测试与监控

- 我们业务功能并不是重点，引擎实现和优化才是核心，因此需要提前做好性能测试和监控功能
- 支持自动插入大量元素在白版上，渲染、移动、拖拽、缩放时观察各种指标进行对比
```

## 目标岗位

其实，我是看到下面这个岗位才萌生了上述想法 并进行了基本的调研
希望能够通过一个“简历项目”的设计和迭代，来证明或者暗示面试官：我已经具备胜任岗位的能力与经验
```
**前端开发工程师 (白板方向)** 25-45K·16薪 3-5年
**职位详情**
**岗位职责:**
1.  负责白板工具的优化工作, 涉及多人协同场景的渲染以及性能优化工作；
2.  负责人事系统前端开发工作, 与产品经理和UI设计师合作, 确保产品达到最佳效果和用户体验；
3.  深入理解业务和产品, 通过技术, 帮助和驱动业务发展。
**任职要求:**
1.  熟悉多人在线白板/多维表, 有相关模块迭代与优化经验；
2.  熟悉底层架构设计, 有Canvas/WebGL相关渲染引擎开发经验, 可针对业务诉求进行优化迭代；
3.  3年及以上WEB端开发经验, 熟练掌握React框架以及相关工具；
4.  在前端监控、性能或者架构优化方面有一定的实践经验。
**加分项:**
1.  对WebGL有深入了解, 对于相关指标监控以及优化有实际工作经验；
2.  具备webassembly实际开发经验, 了解相关特性。
```

我注意到任职要求里“有Canvas/WebGL相关渲染引擎开发经验”，并且加分项是"对WebGL有深入了解, 对于相关指标监控以及优化有实际工作经验"

**既然是社招 只满足及格线远远不够 加分项我们也需要得分**


## 先说结论：你的方向是对的，需要的是“一套能被面试官当真”的白板项目

你现在的目标很清晰：  
从纯业务 ToC 研发 → 转型到“复杂交互 + 底层架构 + 性能优化”的**白板 / 编辑器方向前端**。  
要做到“被信”，关键不是会不会用某个库，而是要让面试官感觉你**真的主导过一个复杂系统的设计与实现**。

下面我会围绕这份 JD，帮你设计一套**可落地、可展示、可讲故事**的白板项目蓝图 + 学习/实战路径。

---

## 一、先对齐：你和 JD 的差距在哪？

对照这份 JD，大概是这样：

- **你已经具备的**
  - 4 年 Web 前端经验，React/业务开发能力没问题
  - ToC 业务经验，对用户体验敏感
  - 一定工程经验（协作、需求推进）

- **JD 强调而你需要补齐的**
  - **多人协同白板 / 多维表**的经验 → 协同模型、数据结构、冲突解决
  - **Canvas/WebGL 渲染引擎经验** → 渲染架构 + 性能模型 + 交互抽象
  - **监控与性能优化** → 前端监控点怎么打？指标怎么选？如何针对性优化？
  - **加分项：WebGL / WASM** → 不一定要精通，但要有“做过一个合理的尝试”的项目点

所以你的项目必须做到：

- 不只是一个“画图 Demo”
- 而是：
  - 有清晰的**文档/画布状态模型**
  - 有**多人协同**（哪怕先用第三方 Yjs 这类）
  - 有**确凿的性能问题与优化前后对比**
  - 至少一个 **Canvas / WebGL / WASM** 的深入点

---

## 二、项目目标：一个“可面试用”的在线协同白板

建议项目定位为：

> **一个支持基本图形、文本、缩放、撤销重做、多用户协同的在线白板，重点在架构与性能，而不是炫 UI。**

### 1. 功能范围（从基础到进阶）

- **基础能力（MVP）**
  - **画布视图**：无限平移 + 缩放
  - **基础图形**：矩形、圆、箭头、文本节点
  - **选中 / 拖拽 / 缩放 / 旋转**
  - **对齐辅助线 / 吸附**
  - **撤销 / 重做（History 栈）**

- **协同能力**
  - 多用户同时编辑同一画布
  - 实时看到其他人的：
    - 光标位置
    - 选中的元素
  - 冲突解决策略：最后写入 / 基于操作的 CRDT（可选）

- **性能 & 监控相关**
  - 大量节点（如 1k / 5k 个）下的交互性能优化：
    - 拖动画布是否流畅
    - 缩放、拖拽节点是否掉帧
  - 前端监控：
    - FPS / 关键交互耗时
    - 错误上报
    - 协同连接质量（WebSocket RTT、重连次数）

- **技术 depth 点（针对 JD）**
  - **Canvas 渲染管线**（必要）
  - 选做一项：
    - WebGL（例如用 PixiJS / regl 做一版 WebGL 渲染）
    - 或用 Rust/Go 写一个小模块，编译成 WASM 做部分计算（如碰撞检测/布局）

---

## 三、整体架构设计（用“编辑器思维”来设计白板）

这里是面试时“特别加分”的部分：把白板当成**状态机 + 渲染器 + 协同层**。

### 1. 客户端分层（建议）

- **View 层：React + Canvas/WebGL 容器**
  - React 管理 UI 框架、工具栏、属性面板等
  - Canvas/WebGL 负责画布内容渲染
  - 把画布封装成一个 `WhiteboardView` 组件，只通过 props/state 与外部通信

- **State 层：白板文档模型**
  - 借鉴 ProseMirror 的思路，定义：
    - `Document`：整个白板
    - `Node`：每个图形（rect/circle/text）
    - `Connection`：连线
    - `Viewport`：当前视图窗口（平移/缩放）
  - 统一放在一个可预测、不可变的状态树里（可以用 Redux/ Zustand + Immer）

- **操作与历史：Step / Transaction 模型**
  - **Step**：
    - 插入节点
    - 删除节点
    - 移动节点
    - 更新节点属性（颜色、大小…）
    - 改变视图（pan/zoom）
  - **Transaction**：
    - 用户的一次操作 → 一组 Step
    - 带 metadata（是否记录到 history、是否协同广播）
  - **History**：
    - 两个栈：undo / redo
    - 每次提交 Transaction，自动生成 inverseTransaction

- **协同层**
  - 可以先用 **Yjs** 或自己简化版本：
    - 文档状态→映射到协同数据结构
    - 每个 Transaction → 序列化后经 WebSocket 广播到其他客户端
  - 简化版：
    - 用 “operation log”（操作日志） + 版本号
    - 避免直接同步整棵状态树，提高效率

### 2. 渲染层：Canvas / WebGL 设计重点

- **渲染目标**
  - 大量节点下保持流畅（60fps 尽量，至少 > 30fps）
  - 支持缩放平移下的清晰度

- **Canvas 方案**
  - 在 Canvas 上自己管理：
    - 世界坐标 → 屏幕坐标变换
    - 层级（选中节点 / 工具辅助层）
  - 优化点：
    - 只重绘“脏区域”，而不是每次全量重绘
    - 把不变背景（网格、背景图）绘制在单独的 Canvas 层
    - 使用 `requestAnimationFrame` 合并多次更新

- **WebGL 方案（进阶 / 加分）**
  - 使用 **PixiJS / regl / deck.gl** 等库快速起步
  - 优化点：
    - 把节点属性放入 GPU buffer，由 shader 批量渲染
    - 缩放平移只需要变换 view matrix

### 3. 协同模型：怎么设计得“说得过去”

- **最小可用版本**
  - 使用 Yjs 做协同文档：
    - Y.Map / Y.Array 存白板节点
    - 客户端监听 Yjs 更新，应用到本地状态
  - 不纠结 CRDT 细节，把重心放在：
    - 和渲染/交互的对接
    - LOL：先“站在巨人肩膀”拿协同，不靠自己造轮子

- **可以讲出来的设计点**
  - 为什么用“操作层同步（操作日志 / CRDT）而不是整树覆盖”：
    - 减少网络流量
    - 避免覆盖用户本地未同步的操作
  - 如何避免“抖动”：
    - 本地先乐观应用操作
    - 远端来操作时做冲突解决

---

## 四、监控 & 性能优化：要留坑、要有前后对比

### 1. 前端监控设计

- **基础监控**
  - JS 错误捕获 + 上报（window.onerror / unhandledrejection）
  - 性能计时：
    - 首屏 / 首次可交互（不必严谨到 Web Vitals，但要有指标）
    - 关键交互耗时（如：选中一个 1000 节点的大组）

- **白板专项指标**
  - 帧率（FPS）：用 `requestAnimationFrame` 简单计算
  - 每次渲染的节点数
  - 协同延迟：
    - 本地操作到远端可见之间的时间
    - WebSocket RTT

- **如何“讲”监控**
  - 监控不是埋点工具，而是“验证架构是否健康的仪表盘”
  - 在项目文档中列出：
    - 初始指标 & 瓶颈
    - 针对性优化方案
    - 优化后的指标变化（用图/表）

### 2. 性能优化点（需要你亲自踩坑）

你可以故意先写一个“朴素实现”，然后再优化，这样面试时有故事可讲：

- **朴素版本的典型问题**
  - 每次 state 更新 → 全量重绘所有节点
  - 所有计算（命中检测、布局）都在主线程同步执行
  - 大数据量时拖动画布明显掉帧

- **优化手段**
  - 绘制层拆分：背景、主内容、交互层
  - 基于视口做**视口裁剪**：只绘制当前可见范围内节点
  - 想象以下几个“可讲的点”：
    - 命中检测由遍历全部节点 → 改为空间索引（如 grid / quadtree）
    - 大量布局计算（比如自动对齐、自动排布）下放到 Web Worker / WASM
    - 把某些计算改为“懒执行”（只在需要时计算）

---

## 五、WebGL & WASM：如何合理地“加分而不过度”

### 1. WebGL 方向

- 选择一个典型场景：
  - 比如：**大量小节点（sticky notes）** 的白板视图
- 用 WebGL 替代 Canvas：
  - 用 PixiJS 渲染节点
  - 支持缩放平移
  - 对比：
    - 1k / 5k / 10k 节点下的帧率差异

你可以在 README 里写一节：

- “为什么在大量节点场景下，我们考虑从 Canvas 迁移到 WebGL”
- “迁移过程中遇到的坑：坐标系、事件系统、文字渲染等”

### 2. WASM 方向（轻量版）

不是让你写一个复杂的引擎，而是：

- 找一个**CPU 计算比较密集但逻辑清晰的功能**：
  - 比如：给大量节点自动做分组布局 / 自动排版
  - 或者复杂的路径碰撞检测
- 用 Rust / Go 实现算法，编译为 WASM：
  - JS 与 WASM 交互参数设计（序列化/反序列化）
- 重点在于：
  - 能讲出：什么逻辑适合放到 WASM，为什么
  - 能展示：性能前后对比

---

## 六、项目实施路线图（约 2–3 个月可以拿得出手）

可以按时间阶段来规划，同时保证每阶段都能“产出可以展示的成果”。

### 阶段 1（2~3 周）：单人白板 + 基本架构

- **目标**
  - 搭起 React + Canvas 的白板基础框架
  - 建立文档模型 + 基本操作 + 撤销 / 重做

- **可交付物**
  - 可用的单人白板 Demo（只在本地用）
  - README：架构说明 + 文档模型设计图（状态机图）

- **你可以刻意踩的坑**
  - 选中/拖拽的命中检测设计
  - History 栈对复杂操作（如批量移动）的处理

### 阶段 2（3~4 周）：协同 + 监控 + 性能问题

- **目标**
  - 接入简易协同（推荐先用 Yjs）
  - 加入基础监控
  - 构造“大数据量场景”，暴露性能问题

- **可交付物**
  - 多人协同白板 Demo
  - 一份“性能分析报告 v1”：  
    - 指标  
    - 瓶颈点  
    - 初步优化

- **特别值得记录的东西**
  - 当多个用户同时改同一个节点时，你怎么处理？（哪怕很简单）
  - 协同延迟指标怎么采集的

### 阶段 3（3~4 周）：优化 + 深度技术点（WebGL 或 WASM）

- **目标**
  - 实现 1~2 个比较硬核的优化 / 深入技术点：
    - Canvas → WebGL 重写一个场景
    - 或者用 WASM 优化某个计算密集模块
  - 完成一份“架构与演进文档”

- **可交付物**
  - 优化后的 Demo（有明显性能进步）
  - README 中的：
    - 架构演进章节
    - 性能优化前后对比章节
    - 技术难点与坑的记录

---

## 七、面试时怎么“讲这个项目”，才能体现你是“主导者”

可以准备一个**5~10 分钟的结构化讲述**，大致框架：

- **1. 背景 & 目标**
  - “我希望从 ToC 业务开发转向复杂交互系统，所以自己设计了一个在线协同白板项目，尽量模拟真实白板业务涉及的架构、协同和性能问题。”

- **2. 架构核心思想**
  - 白板被设计为一个**状态机 + 渲染器**：
    - 文档模型
    - 操作（Step/Transaction）
    - History 撤销/重做
  - 这部分可以顺带提到你受 ProseMirror / CodeMirror 的影响，是有明确思想来源的。

- **3. 协同与数据流**
  - 如何建模多用户操作
  - 为什么选择操作层同步，而不是直接同步整个状态树

- **4. 性能 & 监控实践**
  - 遇到的具体性能瓶颈
  - 怎么定位（监控数据 / 性能分析）
  - 你做了哪些优化，收益如何

- **5. 底层加分点**
  - Canvas / WebGL / WASM 的使用场景
  - 做完之后你对“什么时候该上 WebGL / WASM”有什么判断标准

- **6. 反思 & 未来改进**
  - 哪些地方如果在公司里做，会做得更工程化
  - 哪些是你刻意简化，但思路已经有了

这样讲出来，面试官很容易把你归类为：

- **“认真思考过复杂前端架构的人”**
- 而不是“画 UI 的 React 码农”

---
# 提出 Triplanner 项目

为了防止面试官以为我的经历是“生搬硬造”、“凭空捏造”，我尝试与本职工作业务场景相关联，并称其是“去年我们参加 Hackathon 比赛时设计的项目”。我把这个需求场景和产品定位为一个与 Trip.com 旅行业务紧密相关的多人行程协同规划白板，将复杂前端设计体现出来
```
## 界面设计

1. Trip.com 功能集成区 (地图/交通/景点/住宿) 查询侧边栏
2. 规划功能白板区(白板/时间轴) 是应用的核心页面, 用户可在此进行头脑风暴, 随意放置来自左侧边栏的搜索结果卡片或自由创建元素。

白板区域是一个自由画布, 用户可以随意拖拽、放置来自侧边栏查询到的交通方式、住宿、景点卡片 (我们称之为 TripBlock), 或自由创建文本、图片等元素。
同时提供一个可展开/折叠的“时间轴面板”, 插入自由画布的行程卡片 会显示在时间轴面板中的特定日期和时间段, 从而将探索性的信息结构化为具体行程。

### 核心功能

**自由行程画布**强调其核心的协作和行程规划能力。它是一个无限大的虚拟空间, 背景是浅灰色, 带有可切换的网格或点阵。
从左侧“Trip.com功能集成区”拖拽的交通、住宿、景点搜索结果会以统一的、Trip.com 品牌风格的卡片形式呈现在画布上。这些卡片可自由移动、调整大小、编辑删除, 并显示核心信息。
除了自由创建文本、图片等元素的工具，有向箭头连接器也是核心功能：用户可以通过点击首个 TripBlock 然后点击第二个 TripBlock 的方式, 创建带有箭头的连接线, 清晰表达两个 TripBlock 之间的时序或逻辑关系 (例如从一个航班卡片连接到下一个酒店卡片)。连接线包含始末时间信息，可调整样式和删除。

## 技术设计

- 使用React构建UI用户界面, 但是白板画布绘制应该是单独通过canvas渲染，
- 应用本身不需要太多服务端逻辑, 甚至完全依赖于NextJS即可, 毕竟本项目只是定位为一个 Hackathon 项目，并不是面向真实流量商用
- 样式可以用Tailwind(非必须), 但是组件元素一定要有语义化的className 否则人类进行调试和维护困难
- Monorepo 架构：
  - packages/core: 纯TS/JS（未来用Rust/WASM），包含所有数据结构、几何计算、协同逻辑。它不依赖任何DOM或UI框架。
  - packages/renderer-canvas: 依赖 core 包，负责实现一个渲染器，将 core 中的数据结构绘制到 Canvas 2D 上下文中。
  - packages/app: 主应用，使用React。它依赖 core 和 renderer-canvas，负责UI界面和将两者粘合起来。
  (这样做的好处是，升级到 WebGL 只需要新增一个 packages/renderer-webgl 包，并在 app 中替换渲染器即可，而 core 层的逻辑完全不用动)

### 白板渲染

- 技术路线可以完全参考优秀开源编辑器项目, 借此机会 向面试官表达出“我还深入了解过多个项目”源码以及汲取其优秀思想的信息
- 项目重点是 我要自己实现一个渲染机制(类似于“精简版的Excalidraw/tldraw”), 我不需要它的全部功能 只需要实现必要的白板渲染
- 自己实现的过程中可以进行性能监控和比对，由 MVP 版本的 Canvas 切换到 WebGL，再加入各种优化策略、手段 
  - 此处我只听说过一些零散的概念：脏矩形、包围盒、命中检测、空间索引 (QuadTree R-Tree)、、视口剔除 (Culling)、瓦片渲染、脏标记、Draw Calls、顶点数量 (Vertices)、批处理 (Batching)、LOD (Level of Detail) 纹理图集 (Texture Atlas)……但我还没理清逻辑链条和知识结构，甚至不知道用在哪里，我们可以逐渐学习补充、深入理解
- 最重要的是 自己实现渲染引擎 似乎是在“造轮子”, 实际的价值 是为了向面试官证明我的学习调研能力、从零搭建架构设计能力、潜在的底层改造能力 以及获得真实白板应用开发经验, 提高面试评价中的“经历业务匹配度”

### 多人协同
- 计划采用 Y.js 的 CRDT，因为我们不可能搭建 OT 服务器；
另外它似乎有基于 Rust 的 WASM 实现版本，我们可以渐进式改造，进行【性能监控】和比对
- 由于考虑多人协同，那么强类型的数据模型Schema、操作描述、撤销机制 也是不可或缺的 (学习、应用 Marijn Haverbeke 的哲学，参考 ProseMirror 设计)

### 性能测试与监控
注意到JD中要求“对WebGL有深入了解 对于【相关指标】监控以及优化”
我们业务功能并不是重点 只是一个包装。渲染引擎的实现和优化才是核心。
因此需要提前做好性能模拟测试和监控功能；
我想象中的模拟测试大概是：支持自动插入大量元素在白版上，渲染、移动、拖拽、缩放时观察【各种指标】进行对比
各种指标可能是指：Draw Calls、Vertices……

Triplanner 项目不是最终目的，而是“沙盒”和“试验田”。 要利用这个具体的业务场景外壳，作为学习实践、优化尝试、最终向面试官表达我对这些底层技术认知与思考的舞台。
```
## 一、Triplanner：产品和模型怎么讲，才像一个真实项目？

### 1. 产品定位（可以在简历 & 面试时直接说）

- **产品名**：Triplanner（Trip + Planner）
- **一句话描述**：  
  **一个 Trip.com 场景下的多人行程协同规划白板，结合地图/机酒搜索与自由白板，支持团队协作设计复杂行程。**
- **使用场景**：
  - 多人旅行小组一起规划路线
  - 公司团建/团体出游的行程设计
  - 旅行顾问与客户在线协同讨论方案

这段话本身就已经非常“可信”，能顺利接上你现有 Trip.com 经验。

### 2. 核心概念模型（要体现“强类型 / Schema”思维）

你可以借 MH 和 ProseMirror 的思想，设计一套**强 Schema 的 Trip 文档模型**，在面试里讲出来非常加分：

- **核心实体**
  - **TripBlock**
    - 类型：`flight` / `hotel` / `attraction` / `note` / `image` / `custom`
    - 元数据：标题、副标题、时间段（start/end）、地点、价格等
    - 关联：`sourceId`（Trip.com 搜索结果 ID）
    - 画布属性：位置（x, y）、尺寸、旋转、层级、选中状态等
  - **Connector**
    - `fromBlockId` / `toBlockId`
    - 表达关系：时间顺序 / 逻辑依赖
    - 可选的时间信息（比如：从航班到酒店的入住时间）
  - **TimelineItem**
    - 与 TripBlock 关联，用于映射到右侧/底部 Timeline 面板  
    - 不合法的时间组合，在 Schema 层就可以拒绝（体现“非法状态不可表示”）

- **文档结构**
  - `TripDocument`
    - `blocks: Map<BlockId, TripBlock>`
    - `connectors: Map<ConnectorId, Connector>`
    - `timeline: TimelineItem[]`
    - `viewport: { x, y, zoom }`（本地不协同 / 或部分协同）
    - `meta: { title, description, members… }`

你可以说：

> “我们给 Triplanner 设计了一套类似 ProseMirror 的强 Schema 文档模型，比如一个 `flight` 类型的 TripBlock 必须有出发/到达时间，否则这个状态根本构造不出来。这保证了后续统计、Timeline 展示、协同同步都建立在结构化数据之上，而不是随意的 JSON。”

---

## 二、Monorepo 架构：怎么讲才显得有“架构感”

你提的 Monorepo 结构本身非常好，我帮你稍微“包装 +细化”一下，让它听起来非常有设计感。

### 1. packages/core（白板+行程的“内核引擎”）

- **职责**
  - 定义 **Schema / 数据结构 / 不变量**（TripDocument / TripBlock / Connector 等）
  - 封装所有 **命令 / 操作（Step / Transaction）**
    - `addTripBlock`
    - `updateTripBlockPosition`
    - `connectBlocks`
    - `updateTimeline`
  - 实现 **History（撤销/重做）** 栈
  - 实现 **协同逻辑（与 Yjs 打交道的适配层）**
  - 实现 **几何/命中检测/空间索引算法**（QuadTree 等）

- **特点**
  - 不依赖 DOM 和 React，**纯 TypeScript**，将来可以部分迁移为 WASM。
  - 你可以说：“我们刻意把 core 做成 framework-agnostic，这样未来如果要接 WebGL / 原生客户端 / Electron，仅需要替换渲染器。”

### 2. packages/renderer-canvas（Canvas 渲染器）

- **职责**
  - 接收 core 的 `TripDocument` 和 `Viewport`
  - 在 `<canvas>` 上绘制所有 TripBlock / Connector
  - 实现：
    - 视口变换（pan + zoom）
    - 脏矩形标记与局部重绘（后面细讲）
    - 基于空间索引的命中检测（点击 / 框选）

- **重要点**
  - 它不关心协同、不关心业务，只关心“**给我一棵状态树，我负责高效画出来**”。
  - 将来切换到 WebGL，只需要新增 `renderer-webgl`，**core 完全不用改**。

### 3. packages/app（Next.js + React 的应用层）

- **职责**
  - 负责 Trip.com 相关 UI：左侧搜索面板、右侧时间轴、顶部协作成员信息
  - 把用户输入转换成 core 的命令（Step/Transaction）
  - 管理协同会话（房间、成员、权限）
  - 接入监控与性能面板

- **表现出来的“工程感”**
  - 你可以说：“我们在这个项目里刻意实践了‘小内核 + 可替换渲染器 + UI 适配层’的架构风格，这样未来即使业务需求变化，核心行程模型和操作模型仍然是稳定可复用的。”

---

## 三、渲染知识链条：这些名词分别解决什么问题，用在哪一层？

你列出的这些概念其实可以分成几层，你在面试时如果能按这个结构讲，会显得非常清晰。

### 1. “画什么”与“画多少”：视口 & 剔除 & 空间索引

- **视口（Viewport）**
  - 概念：屏幕上当前看到的区域（世界坐标 → 屏幕坐标）
  - 用途：
    - 只渲染视口内的元素，减少无用工作
  - 在 Triplanner：
    - 画布无限大，但我们只画当前视口范围内的 TripBlock 和 Connector

- **视口剔除（Culling）**
  - 问题：元素很多（几千个 TripBlock），没必要把屏幕外的都画一遍
  - 方案：对每个元素计算**包围盒（Bounding Box）**：
    - 若与视口不相交 → 直接跳过
  - Canvas / WebGL 都适用

- **空间索引（QuadTree / R-Tree / Grid）**
  - 问题：命中检测/选中时，不能每次都 O(N) 遍历所有元素
  - 方案：
    - 用 QuadTree 等结构把平面划分成区域，快速筛选“可能命中的元素”
  - 在 Triplanner：
    - 鼠标点击选中 TripBlock
    - 框选一片区域
    - 实时拖拽时频繁做命中检测

> 面试里你可以说：“我们在 MVP 版本是 O(N) 命中检测，后面在 2k+ 元素时掉帧明显，于是引入了简单的网格索引/QuadTree，把命中检测降低到近似 O(logN)，配合视口剔除后交互明显变流畅。”

### 2. “什么时候重画”：脏矩形 / 脏标记 / 瓦片渲染

- **脏标记（Dirty Flag）**
  - 粒度：**对象级**
  - 含义：某个 TripBlock/Connector 是否需要重新绘制
  - 用例：
    - 拖动一个卡片，只标记这个卡片和与之相关的连线为脏

- **脏矩形（Dirty Rectangles）**
  - 粒度：**区域级**
  - 含义：画布上哪些矩形区域受到影响，需要重绘
  - Canvas 优化常用手法：
    - 不清空整个 Canvas，而只清空脏区域，再重画这块区域内的元素

- **瓦片渲染（Tiled Rendering）**
  - 思路：把整个画布划分成多个 tile（格子）
  - 只重绘受影响的 tile
  - 在超大白板场景下有价值，但 Triplanner 初期可以先不做，只在设计上预留空间。

### 3. “怎么画得更省”：Draw Calls / Batching / Vertices / Texture Atlas（WebGL 主场）

这些是你从 Canvas 迁到 WebGL 后，面试官会问的关键点。

- **Draw Call**
  - 定义：GPU 的一次绘制调用（如 `gl.drawArrays`）
  - 问题：Draw Call 太多 → CPU 与 GPU 交互开销大 → 性能下降
  - 优化：
    - **Batching（批量渲染）**：一次 Draw Call 画一批元素，而不是一个元素一个 Draw Call
  - 在 Triplanner：
    - 先 naive：每个 TripBlock / Connector 一个 Draw Call
    - 再优化：同一材质/样式的 TripBlock 合并到一批，压缩 Draw Call 数

- **Vertices（顶点数量）**
  - 每个图形（矩形、线条）最终会拆成顶点数据提交给 GPU
  - 顶点越多 → 顶点着色阶段开销越大
  - 优化：
    - 简化几何（比如用两三角形画矩形，而不是细分很多点）
    - 对远处小图形用更简单的几何（LOD）

- **LOD（Level of Detail）**
  - 概念：远处元素渲染细节降低，近处元素渲染细节提高
  - 在 Triplanner 中的简化应用：
    - 当前缩放很小时：只画 TripBlock 的轮廓和简略图标，不画详细文本
    - 放大时：再加载详细信息

- **Texture Atlas（纹理图集）**
  - 问题：如果每个图标/贴图是独立纹理，会频繁切换 texture，增加开销
  - 方案：把常用图标/贴图合成一张大图，用不同的 UV 区域采样
  - 在 Triplanner：
    - 各种 TripBlock icon（机票、酒店、景点）可以合成一个 atlas

> 面试时可以这样串起来讲：  
> “Canvas 版本主要靠脏矩形和视口剔除优化，迁移 WebGL 后，我们开始关注 GPU 侧的瓶颈，比如 Draw Call 和顶点数。后来对 TripBlock 做了简单的批处理，把相同 style 的节点合批成一次 Draw Call，同时在低缩放级别只绘制节点的轮廓和 icon，减少顶点数和 fragment 运算，整体帧率提升比较明显。”

---

## 四、多人协同：如何把 Yjs + MH 思想讲得“像你自己做的设计”

### 1. 为什么选 Yjs，而不是自己写 OT/CRDT

你的说法可以非常坦诚、又显得专业：

- “Hackathon 项目时间有限，我们不打算自己实现 OT 服务端，所以选择了 Yjs 这个成熟的 CRDT 库。”
- “我们重点工作放在：**如何把行程文档模型映射到 Yjs 的结构，以及如何在协同场景下保持操作语义与撤销机制的一致性**。”

### 2. Schema + Step + Transaction + History 与 Yjs 的结合

你可以这样设计、也这样讲：

- **核心原则**：
  - 本地编辑仍然通过 **core 的 Step/Transaction 系统**：
    - `addBlockStep`
    - `moveBlockStep`
    - `connectBlocksStep`
  - 每个 Transaction：
    - 本地先应用到 `TripDocument`
    - 同时转化为 Yjs 的变更（对 `Y.Map` / `Y.Array` 的操作）
  - 远端变更：
    - Yjs 同步到本地
    - 转回 Step/Transaction 应用

- **撤销/重做如何处理**
  - 可以有两级：
    - 本地 undo/redo：基于 core 的 History 栈
    - 全局协同 undo：借助 Yjs 的 undo 插件（如果需要）
  - 面试时可以讲你怎么权衡的（多数产品会选择只做“每人自己的撤销栈”）。

> 这样讲的效果是：你既有 **工程 pragmatism（用 Yjs）**，又有 **架构理想（用 Step/Transaction/Schema）**，很符合高级前端的气质。

---

## 五、性能测试与监控：怎么设计一套“实验室”，让面试官相信你真的测过

### 1. “沙盒模式 / 压测模式”设计

你可以在项目里专门做一个“Performance Lab”模式：

- **自动生成大量 TripBlock**
  - 比如一键生成：
    - 100 / 500 / 2000 / 5000 个 TripBlock
    - 随机分布在画布上
  - 自动创建一些 Connector

- **自动执行一套脚本化交互**
  - 自动平移画布（模拟用户拖动画布）
  - 自动缩放（zoom in/out）
  - 自动选中 & 拖动一批节点

- **同时记录指标**
  - FPS / 每帧耗时
  - 当前视口内元素数量
  - Canvas 版本：
    - 每次渲染遍历元素数
  - WebGL 版本：
    - Draw Call 数
    - 顶点数（可以在自己封装的 draw 层统计）
  - 协同延迟（本地行动 → 远端看到的时间）

你可以说：

> “为了避免凭感觉优化，我们做了一个 `Performance Lab` 模式，允许我们一键生成几千个 TripBlock 并自动执行一系列交互脚本，然后实时展示 FPS、渲染对象数以及 WebGL 的 Draw Call 数，方便我们对比不同渲染策略前后的性能差异。”

### 2. 监控实现方法（不需要特别重，只要说得出）

- **前端性能 overlay**
  - 类似 `stats.js` 的小面板：显示 FPS、帧耗
  - 自己使用 `requestAnimationFrame + performance.now()` 实现即可

- **埋点 & 日志**
  - 可以简单用一个 mock 后端 / 本地记录，重点是：
    - 能保存压测实验结果（不同策略下的 FPS/Draw Call/节点数量）
  - 目的是为了在 README/文档中展示：

    > “Canvas naive 渲染 vs Canvas + culling + dirty rect vs WebGL + batching 的性能对比图。”

---

## 六、怎么讲“这不是造轮子，而是验证自己能力”的价值

在面试时，你可以很直接地把“造轮子”的质疑转成优势：

- **避免被说“造轮子”的说法**
  - “我们没有打算做一个真正替代 tldraw/Excalidraw 的产品，而是刻意做了一个**缩减版、业务定制的白板引擎**，重点在于验证：
    - 文档模型 + 操作模型设计能力
    - Canvas/WebGL 渲染优化路径
    - 协同与性能监控集成能力”

- **强调可迁移性**
  - “这些能力是通用的：不管是白板、流程编排、低代码画布，只要有复杂交互和大规模图形渲染，这套架构和优化思路都是可以迁移的。”

- **承认不完美，反而显得真实**
  - 主动说出 2~3 个你“没有搞定/不够满意”的点：
    - 比如：
      - WebGL 版本里，文本渲染和选中框依然用 Canvas overlay，还没有做完全 GPU 化。
      - Yjs 在极端网络条件下会有一些同步延迟，我们只做了简单 retry，没有做复杂冲突可视化。
      - WASM 只用在了布局计算上，还没来得及再挖更深。
  - 这会让人觉得你是真做过，而不是背稿子。

---

## 七、下一步建议：我们可以怎么继续往下拆

如果你愿意，下一步我建议这样推进（我可以和你逐步做）：

- **第一步：把 `core` 的文档模型和操作集合完整设计出来**
  - 列出所有 `TripBlock` 类型、字段、合法/非法状态
  - 设计一套 Step/Transaction（类似 MH 的做法），加上 History 规则
- **第二步：画出 Canvas 渲染管线 & 命中检测/视口剔除结构图**
  - MVP 版本 → 优化版本清晰对比
- **第三步：列一个“性能实验矩阵”**
  -（多少节点 × 哪种渲染策略 × 哪类交互）→ 哪些指标

你可以告诉我，你更想先从哪块动手：  
- 是 **core 的数据模型 + 操作系统设计**？  
- 还是先从 **Canvas 渲染和性能优化路径** 开始，我帮你连点成完整知识链？

---
# 关于渲染引擎

### 一、先把话说明白：公司说的“渲染引擎”，通常指什么

在 JD 里写的：

> **有 Canvas/WebGL 相关渲染引擎开发经验**

一般不是指“会用 `<canvas>` 画几条线”，而是指你在下面这些事情上**自己做过架构设计 + 实现**：

- **场景抽象**：有一套自己的“场景/节点/图形对象”数据结构，而不是随手 `ctx.fillRect`。
- **渲染管线**：有“从场景数据 → 绘制命令”的固定流程（遍历、排序、裁剪、合批等）。
- **状态管理**：自己决定 retained 模式（保留场景树）还是 immediate 模式（每帧重画），或混合。
- **性能策略**：脏矩形、视口裁剪、空间索引、批处理（WebGL 下）、减少 Draw Calls 等。
- **事件映射**：从鼠标/触摸事件到场景对象的命中检测、hover/选中/拖拽。
- **可扩展性**：可以方便地新增一种图形/节点，而不用把所有代码散落在业务层。

**能说清以上这些，才算“渲染引擎开发经验”，而不是“画布使用经验”。**

---

### 二、你的 `packages/renderer-*` 算不算“引擎”？

**答案是：可以算，但取决于你做到多深。**

只要你让 `renderer-canvas` / `renderer-webgl` 具备下面这些特征，就完全可以在简历和面试里正大光明地称为：

> “白板渲染引擎（Canvas/WebGL）”

**至少要做到：**

- **有清晰边界**：  
  - 输入：`TripDocument`（或抽象后的 SceneGraph）、`Viewport`。  
  - 输出：在给定的 Canvas/WebGL 上完成绘制。  
  - 它不关心 React、协同、业务，只关心“如何高效画”。

- **有一套统一绘制流程**（而不是组件各画各的）：
  - 遍历场景 → 视口裁剪 → 排序（z-index）→ 生成 draw command → 提交给 Canvas/WebGL。
  - 有统一的 render loop（`requestAnimationFrame` 管理），支持只在“脏”时重绘。

- **有自己的“对象模型 + 命中检测”**：
  - 每个 TripBlock/Connector 对应引擎里的一个 render object（含包围盒/路径）。
  - 命中检测由引擎负责：点击 / 框选 → 找到被命中的 object 列表（用空间索引/包围盒）。

- **有明确的性能策略**：
  - Canvas 版：视口剔除 + 脏矩形（或至少局部重画）+ 分层 Canvas。
  - WebGL 版：基础的 VBO/IBO 管理、简单的 batching（相同样式一批）、控制 Draw Calls 数量。

只要你是**按这个层次来设计实现的**，就不只是“一个 util 模块”，而就是一个小型但正规的渲染引擎。

---

### 三、怎么判断自己是否已经达到“可以写进 JD”的程度？

可以用一个简短 checklist 自我检验——如果你能自信回答“是”，那就可以写“有渲染引擎开发经验”：

- **架构层面**
  - **是否有独立的 renderer 包**，只依赖数据模型，不依赖 UI 框架？
  - 是否支持**替换渲染后端**（Canvas / WebGL）而不动业务逻辑？

- **渲染机制层面**
  - 是否自己设计过**场景树/对象列表 + 渲染遍历顺序**？
  - 是否实现过**视口坐标变换**、z-index 排序、局部重绘（或等价机制）？

- **交互与命中**
  - 是否在引擎层实现过命中检测（点击/框选），而不是在业务层乱写 for 循环？
  - 在元素很多时，是否用过**包围盒 + 空间索引**来优化命中检测？

- **性能与优化**
  - 是否**真实遇到过性能瓶颈**（如大量节点拖动/缩放卡顿），并通过修改渲染引擎来优化？
  - WebGL 版：你是否自己控制过缓冲区、纹理、Draw Call，而不是只用现成高层库？

如果你按我们前面规划的方式去做 `renderer-canvas` 和 `renderer-webgl`，答案基本都会是“是”。

---

### 四、在简历 / 面试里该怎么表述才专业？

你以后可以用类似这样的描述（根据实际完成程度微调）：

- **简历一句话版本**
  - “独立设计并实现 Trip 行程协同白板的 Canvas/WebGL 渲染引擎：基于场景图 + 视口裁剪 + 脏矩形/批量渲染，支持上千节点下的平滑缩放、拖拽和命中检测。”

- **面试展开版本**
  - “我们在 Hackathon 项目 Triplanner 中，把前端分成 core（文档/操作）、renderer-canvas / renderer-webgl（渲染引擎）和 app（React UI）三层。  
    渲染引擎层负责场景管理、坐标变换、命中检测和性能优化，Canvas 版使用视口剔除 + 脏矩形，WebGL 版进一步引入批量渲染和 Draw Call 控制，针对 2k+ TripBlock 的场景做了多轮性能实验。”

这样讲，**既对得起事实，又完全符合 JD 的“渲染引擎开发经验”**。

---

如果你愿意，下一步我可以帮你更具体地勾一版 `renderer-canvas` 的“引擎级”职责清单（模块划分 + 核心函数/类），让你实现时知道哪些东西必须自己写，才能在面试里讲得硬气。
---
# 第一步：把 `core` 的文档模型和操作集合完整设计出来

### 整体思路先定一下

`core` 要做到两件事：

- **把“行程白板”抽象成一个强 Schema 的文档模型**（非法状态尽量构造不出来）。
- **把所有变化收敛成 Step / Transaction / History 三层**，像 ProseMirror 那样可推理、可协同、可撤销。

下面我给你一版可以直接落地为 `packages/core` 的设计草案，你后面实现时可以按这个骨架填肉。

---

## 一、文档模型：核心实体与 Schema 设计

### 1. TripBlock 类型与字段设计

先做“够用但不乱”的版本，重点是字段清晰 + 不变量明确。

```ts
// TripBlock 的类型枚举
export type TripBlockKind =
  | 'flight'
  | 'hotel'
  | 'attraction'
  | 'transport'   // 其他交通：火车、地铁、巴士
  | 'note'
  | 'image';

export type BlockId = string;

export interface Vec2 {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

// 画布几何和展示相关（所有类型通用）
export interface BlockLayout {
  position: Vec2;          // 世界坐标
  size: Size;
  rotation: number;        // 角度，单位 deg
  zIndex: number;
  locked: boolean;         // 是否可编辑
}

export interface BaseTripBlock {
  id: BlockId;
  kind: TripBlockKind;
  layout: BlockLayout;
  createdAt: number;
  updatedAt: number;
  // 来源：是否来自 Trip.com 搜索结果
  source?: {
    provider: 'trip.com';
    // 比如 productId、poiId 等
    externalId: string;
    url?: string;
  };
}
```

再按类型拆出强类型字段（关键在“不变量”）：

```ts
// 统一用时间区间表达「占用时间」的 Block
export interface TimeRange {
  start: string; // ISO 8601
  end: string;   // ISO 8601
}

// flight：要求有起降城市 + 时间
export interface FlightBlock extends BaseTripBlock {
  kind: 'flight';
  title: string;
  fromAirport: string;
  toAirport: string;
  carrier?: string;
  flightNumber?: string;
  time: TimeRange;
}

// hotel：要求有 checkIn / checkOut
export interface HotelBlock extends BaseTripBlock {
  kind: 'hotel';
  title: string;
  address: string;
  time: TimeRange; // checkIn / checkOut
}

// attraction：可以有预估停留时间
export interface AttractionBlock extends BaseTripBlock {
  kind: 'attraction';
  title: string;
  address?: string;
  city?: string;
  estimatedStayHours?: number;
  date?: string; // 仅日期
}

// transport：非航班交通（地铁/火车/打车）
export interface TransportBlock extends BaseTripBlock {
  kind: 'transport';
  title: string;
  from?: string;
  to?: string;
  time?: TimeRange;
  mode?: 'train' | 'metro' | 'bus' | 'car' | 'walk' | 'other';
}

// 纯文本 / 备注
export interface NoteBlock extends BaseTripBlock {
  kind: 'note';
  text: string;
}

// 图片（比如贴一张目的地截图）
export interface ImageBlock extends BaseTripBlock {
  kind: 'image';
  url: string;
  alt?: string;
}

export type TripBlock =
  | FlightBlock
  | HotelBlock
  | AttractionBlock
  | TransportBlock
  | NoteBlock
  | ImageBlock;
```

#### 合法 / 非法状态举例（面试可讲）

- **合法约束（在构造层就 enforce）**
  - `FlightBlock.time.start < time.end`
  - `HotelBlock.time.start < time.end`
  - `HotelBlock` 的 `time.start` 与 `time.end` 至少差 1 小时（避免 0 天酒店）
  - 所有 `BlockLayout.size.width/height > 0`
  - `zIndex` 是整数，不允许 `NaN`/`Infinity`

- **非法状态不允许构造**
  - `flight` 没有 `time` → 不能通过工厂方法创建
  - `hotel` 没有 `checkOut` → 不能通过 Schema 校验
  - 坐标/尺寸为负/NaN → 拒绝 Step

你可以在 core 内部约定：**所有新建/修改 Block 必须通过工厂/Step，不允许直接 new/随意改字段**。

---

### 2. Connector（连接线）

连接 TripBlock 表达时序/逻辑关系，同时可以带时间信息：

```ts
export type ConnectorId = string;

export interface Connector {
  id: ConnectorId;
  from: BlockId;
  to: BlockId;
  // 可选的时间/耗时信息
  label?: string;
  // 例如 40min drive
  durationMinutes?: number;
  // 样式信息
  style: {
    color: string;
    width: number;
    dashed: boolean;
    arrowHead: 'none' | 'end' | 'both';
  };
}
```

**合法性约束：**

- `from !== to`
- `from` 和 `to` 必须在 `document.blocks` 中存在
- 不允许存在完全重复的 `(from,to)`（或者你允许但视为多条路径）

---

### 3. Timeline 映射（结构化行程）

你可以把 Timeline 设计成 “日期 → 多个条目”，每个条目引用一个 Block：

```ts
export type TimelineId = string;

export interface TimelineItem {
  id: TimelineId;
  blockId: BlockId;       // 引用画布上的 TripBlock
  day: string;            // '2025-11-17'
  // 在当天的时间段（可选，对 note/attraction 可能是模糊的）
  timeRange?: TimeRange;
  // 排序权重（同一天内）
  order: number;
}
```

**不变量：**

- 每个 `TimelineItem.blockId` 必须存在。
- 对于有 `timeRange` 的 Block（flight/hotel/transport），你可以要求：
  - `TimelineItem.timeRange` 与 Block 自身时间一致/兼容；
  - 或者由 core 自动推导。

---

### 4. Viewport / Selection / 文档根

```ts
export interface Viewport {
  center: Vec2;   // 画布世界坐标
  zoom: number;   // 比例 > 0
}

// 当前用户选中状态（本地态，可选择协同与否）
export interface Selection {
  selectedBlockIds: BlockId[];
  selectedConnectorIds: ConnectorId[];
  // 正在拖动/创建的临时信息可以扩展在这里
}

export interface TripDocument {
  id: string;
  title: string;
  blocks: Map<BlockId, TripBlock>;
  connectors: Map<ConnectorId, Connector>;
  timeline: Map<TimelineId, TimelineItem>;
  // 纯文档状态，不含 UI 本地态
}

export interface EditorState {
  doc: TripDocument;
  viewport: Viewport;
  selection: Selection;
  // 未来：协同相关 meta、用户光标等
}
```

---

## 二、Step / Transaction 设计（MH 风格）

### 1. Step 抽象：最小原子操作

核心思想：**每个 Step 都是“可序列化 + 可应用 + 可逆”的**。

```ts
export interface StepApplyResult {
  state: EditorState;
  failed?: string; // 若非法，返回错误信息
}

export interface Step {
  // 用于运行时识别类型
  kind: string;
  apply(state: EditorState): StepApplyResult;
  invert(before: EditorState): Step; // 生成逆操作
}
```

#### 核心 Step 类型（初版就够用）

- 文档结构相关
  - `AddBlockStep`
  - `UpdateBlockPropsStep`（修改 block 字段：title、business 字段）
  - `UpdateBlockLayoutStep`（移动、缩放、旋转、zIndex）
  - `RemoveBlockStep`
  - `AddConnectorStep`
  - `UpdateConnectorStep`
  - `RemoveConnectorStep`

- 时间轴相关
  - `AddTimelineItemStep`
  - `UpdateTimelineItemStep`
  - `RemoveTimelineItemStep`

- 视图/选择（可选是否记入 History）
  - `SetViewportStep`
  - `SetSelectionStep`

举个例子（移动 Block）：

```ts
export interface UpdateBlockLayoutStep extends Step {
  kind: 'updateBlockLayout';
  blockId: BlockId;
  // 这里使用「patch」而不是整 Layout 替换，避免冲掉其他字段
  patch: Partial<BlockLayout>;
}
```

`apply` 内部要做的事：

- 检查 `blockId` 是否存在；
- 应用 `patch` 后校验不变量（size > 0、rotation 合法）；
- 返回新的 `EditorState` 或 failed。

`invert` 要能算出逆操作：

- 拿 `beforeState` 中该 block 的旧 `layout`；
- 生成一个新的 `UpdateBlockLayoutStep`，`patch` 为“恢复到旧值”。

> 你可以统一用工厂函数产生 Step，禁止外部直接构造，保证合法性。

---

### 2. Transaction：带语义的一组 Step

Transaction 要做的事：

- 把多个 Step 组成一个“用户操作单元”，可一起撤销；
- 携带 metadata：来源（本地/远端）、是否入历史、label 等。

```ts
export type TransactionSource = 'local' | 'remote' | 'system';

export interface TransactionMeta {
  addToHistory: boolean;
  source: TransactionSource;
  label?: string;        // 'move-block', 'add-flight', ...
  clientId?: string;     // 协同客户端 ID
  timestamp?: number;
}

export interface Transaction {
  steps: Step[];
  meta: TransactionMeta;
}
```

Transaction 的 `applyTransaction(state)`：

- 按顺序依次 `apply` 每个 Step；
- 如果任何 Step `failed`：
  - 可以整体 fail（编辑期间不推荐部分成功）；
- 同时构造一个 **inverseTransaction**（对 History 用）：
  - 逆序遍历 Steps
  - 对每个 `step.invert(beforeState)` 得到 inverseStep
  - 组成 `inverseTransaction.steps`

---

### 3. History 规则

History 只记录 **Transaction 的逆操作**：

```ts
export interface HistoryEntry {
  transaction: Transaction;
  inverse: Transaction;
}

export interface HistoryState {
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
}
```

#### 基本规则

- **应用本地 Transaction 时：**
  - 若 `meta.addToHistory === true` 且 `meta.source === 'local'`：
    - `undoStack.push({ transaction, inverse })`
    - `redoStack` 清空
- **执行 Undo：**
  - 从 `undoStack.pop()` 拿到 `entry.inverse`
  - 应用 `entry.inverse` 的 steps（source 可标为 `'system'`）
  - `redoStack.push(entry)`
- **执行 Redo：**
  - 从 `redoStack.pop()` 拿到 `entry.transaction`
  - 再次应用
  - `undoStack.push(entry)`

#### Step 合并（拖拽时的连续移动）

为了让拖拽移动变成“一步撤销”，你可以在 Transaction 层做**合并策略**：

- 在 `TransactionMeta` 中加：
  - `groupId?: string`
  - `timeGroup?: number`（时间窗口）
- 拖拽过程中：
  - 持续产生 `UpdateBlockLayoutStep`，但归入同一个 `groupId`
  - 结束拖拽时提交一个 Transaction
- History 可以选择在短时间内把同 `groupId` 的 Transaction 合并为一个 entry。

---

## 三、非法状态如何在 Step 层被阻止

这块是面试时体现“强 Schema + MH 思想”的关键点。

- **所有改变文档的 Step，在 `apply` 中都必须做 Schema 校验**：
  - 如 `AddBlockStep`：
    - 飞机：校验 `time.start < time.end`，`fromAirport`、`toAirport` 不为空；
    - 酒店：`checkIn < checkOut`。
  - `AddConnectorStep`：
    - `from` / `to` 两个 Block 必须存在；
    - 不允许自连（`from === to`）。
- **如果不合法 → 返回 failed，并拒绝修改**：
  - UI 层看到 `failed` 可以提示用户；
  - 协同层也不会把非法状态传播出去。

你可以对标 ProseMirror 的做法：**“通过 Step / Transaction 的 apply 来 enforce 不变量，而不是让任意地方可以改 state。”**

---

## 四、这一步做完，你能向面试官说什么？

当你按上面这个设计实现 `packages/core` 后，你就可以自然地说：

- “我们为协同行程白板设计了一套强 Schema 的文档模型（TripBlock/Connector/Timeline），非法状态在核心层就构造不出来。”
- “所有修改都通过 Step/Transaction 进入核心状态树，Transaction 决定是否入历史、如何被协同，History 用 inverseTransaction 做撤销重做，类似 ProseMirror 的架构。”
- “视图、渲染器、协同库（Yjs）都只是在这套核心之上做绑定。”

这会给人明显的“MH 式”工程思维印象。

---
> 如果你愿意，下一步我可以帮你把上面这些抽象进一步落成一套 **`core` 的目录结构 + 关键 TS 文件划分**（例如 `schema/`, `steps/`, `transaction/`, `history/`），这样你照着写就行。
---
### 总体目标：`core` 像一个“小型 ProseMirror 内核”

`packages/core` 要做到：

- 对外暴露很少的 API：**文档模型类型 + 创建/更新命令 + 应用事务 + 撤销重做**。
- 内部清晰分层：Schema / State / Step / Transaction / History / 协同适配。

下面我给你一套**建议目录结构 + 各文件职责 + 核心类型/函数骨架**，你可以几乎原样落地。

---

## 一、目录结构设计

建议：

```txt
packages/core/
  src/
    index.ts                // 对外导出的公共 API 入口

    schema/                 // 文档模型 & 类型定义（强 Schema）
      block.ts
      connector.ts
      timeline.ts
      document.ts
      viewport.ts
      selection.ts
      types.ts              // 通用小类型 Vec2/Size/TimeRange 等
      validators.ts         // Schema 级校验逻辑

    state/
      editorState.ts        // EditorState 结构 & 工厂
      factories.ts          // 创建各种 Block/Connector 等的工厂函数

    steps/                  // 原子操作 Step 定义
      types.ts              // Step 接口 & StepApplyResult
      blockSteps.ts
      connectorSteps.ts
      timelineSteps.ts
      viewSteps.ts          // 视口/选中相关 Step
      registry.ts           // Step 注册表（kind ↔ class/实现）

    transaction/
      transaction.ts        // Transaction 类型 & applyTransaction
      meta.ts               // TransactionMeta 相关工具：groupId/标签等

    history/
      history.ts            // HistoryState & undo/redo 实现
      policies.ts           // 合并策略等

    commands/               // 更高层的“命令”，给 app 用的 API
      blockCommands.ts      // add/move/update/remove Block
      connectorCommands.ts
      timelineCommands.ts
      viewCommands.ts
      index.ts

    collab/                 // 将来与 Yjs 集成的适配层（先留空/简单实现）
      types.ts              // 协同相关 meta（clientId/version 等）
      yjsAdapter.ts         // 未来：EditorState <-> Yjs 映射

    utils/
      id.ts                 // 生成 BlockId/ConnectorId 等
      time.ts
      result.ts             // Result 类型（ok/fail）
```

---

## 二、`schema/`：文档模型 & 不变量

### 1. `schema/types.ts`

放通用小类型：

```ts
// schema/types.ts
export interface Vec2 {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface TimeRange {
  start: string; // ISO 8601
  end: string;
}
```

### 2. `schema/block.ts`

放 `TripBlock` 全家桶（你前面那套类型）：

```ts
// schema/block.ts
import { Vec2, Size, TimeRange } from './types';

export type TripBlockKind =
  | 'flight'
  | 'hotel'
  | 'attraction'
  | 'transport'
  | 'note'
  | 'image';

export type BlockId = string;

export interface BlockLayout {
  position: Vec2;
  size: Size;
  rotation: number;
  zIndex: number;
  locked: boolean;
}

export interface BaseTripBlock {
  id: BlockId;
  kind: TripBlockKind;
  layout: BlockLayout;
  createdAt: number;
  updatedAt: number;
  source?: {
    provider: 'trip.com';
    externalId: string;
    url?: string;
  };
}

// ... FlightBlock / HotelBlock / AttractionBlock / TransportBlock / NoteBlock / ImageBlock

export type TripBlock =
  | FlightBlock
  | HotelBlock
  | AttractionBlock
  | TransportBlock
  | NoteBlock
  | ImageBlock;
```

### 3. 其他：`connector.ts` / `timeline.ts` / `viewport.ts` / `selection.ts` / `document.ts`

基本就是前面我们定义的接口拆文件放；`document.ts` 负责组合：

```ts
// schema/document.ts
import { TripBlock, BlockId } from './block';
import { Connector, ConnectorId } from './connector';
import { TimelineItem, TimelineId } from './timeline';

export interface TripDocument {
  id: string;
  title: string;
  blocks: Map<BlockId, TripBlock>;
  connectors: Map<ConnectorId, Connector>;
  timeline: Map<TimelineId, TimelineItem>;
}
```

### 4. `schema/validators.ts`：集中不变量校验逻辑

这里很关键：Step 在 `apply` 时要调用这些函数。

```ts
// schema/validators.ts
import { TripBlock, FlightBlock, HotelBlock } from './block';
import { Connector } from './connector';
import { TripDocument } from './document';

export function validateFlightBlock(block: FlightBlock): string | null {
  if (!block.time) return 'Flight must have time range';
  if (block.time.start >= block.time.end) {
    return 'Flight time start must be before end';
  }
  if (!block.fromAirport || !block.toAirport) {
    return 'Flight must have from/to airport';
  }
  return null;
}

export function validateHotelBlock(block: HotelBlock): string | null {
  if (!block.time || block.time.start >= block.time.end) {
    return 'Hotel check-in must be before check-out';
  }
  return null;
}

export function validateBlock(block: TripBlock): string | null {
  switch (block.kind) {
    case 'flight':
      return validateFlightBlock(block);
    case 'hotel':
      return validateHotelBlock(block);
    default:
      return null;
  }
}

export function validateConnector(conn: Connector, doc: TripDocument): string | null {
  if (conn.from === conn.to) return 'Connector cannot link to itself';
  if (!doc.blocks.has(conn.from) || !doc.blocks.has(conn.to)) {
    return 'Connector refers to non-existing block';
  }
  return null;
}
```

---

## 三、`state/`：EditorState & 工厂函数

### 1. `state/editorState.ts`

```ts
// state/editorState.ts
import { TripDocument } from '../schema/document';
import { Viewport } from '../schema/viewport';
import { Selection } from '../schema/selection';
import { HistoryState } from '../history/history';

export interface EditorState {
  doc: TripDocument;
  viewport: Viewport;
  selection: Selection;
  history: HistoryState;
}

export function createEmptyEditorState(): EditorState {
  return {
    doc: {
      id: 'untitled',
      title: 'Untitled trip',
      blocks: new Map(),
      connectors: new Map(),
      timeline: new Map(),
    },
    viewport: {
      center: { x: 0, y: 0 },
      zoom: 1,
    },
    selection: {
      selectedBlockIds: [],
      selectedConnectorIds: [],
    },
    history: {
      undoStack: [],
      redoStack: [],
    },
  };
}
```

### 2. `state/factories.ts`

提供安全创建 Block/Connector/Timeline 的工厂（统一走校验）：

```ts
// state/factories.ts
import { FlightBlock, TripBlock, BlockLayout } from '../schema/block';
import { generateId } from '../utils/id';
import { validateBlock } from '../schema/validators';

export function createDefaultLayout(position = { x: 0, y: 0 }): BlockLayout {
  return {
    position,
    size: { width: 200, height: 120 },
    rotation: 0,
    zIndex: 0,
    locked: false,
  };
}

export function createFlightBlock(input: Omit<FlightBlock, 'id' | 'layout' | 'createdAt' | 'updatedAt'> & { position?: { x: number; y: number } }): TripBlock {
  const now = Date.now();
  const block: FlightBlock = {
    id: generateId('block'),
    kind: 'flight',
    layout: createDefaultLayout(input.position),
    createdAt: now,
    updatedAt: now,
    // 业务字段铺进去
    ...input,
  };
  const err = validateBlock(block);
  if (err) throw new Error(err);
  return block;
}
```

> 面试时可以说：**“所有 Block 都通过工厂 + Schema 校验创建，外部无法直接构造非法状态。”**

---

## 四、`steps/`：Step 定义与实现

### 1. `steps/types.ts`：Step 抽象

```ts
// steps/types.ts
import { EditorState } from '../state/editorState';

export interface StepApplyResult {
  state: EditorState;
  failed?: string;
}

export interface Step {
  kind: string;
  apply(state: EditorState): StepApplyResult;
  invert(before: EditorState): Step;
}
```

### 2. `steps/blockSteps.ts`：Block 相关 Step

示意两个：

```ts
// steps/blockSteps.ts
import { Step, StepApplyResult } from './types';
import { EditorState } from '../state/editorState';
import { TripBlock, BlockLayout, BlockId } from '../schema/block';
import { validateBlock } from '../schema/validators';

export interface AddBlockStep extends Step {
  kind: 'addBlock';
  block: TripBlock;
}

export interface RemoveBlockStep extends Step {
  kind: 'removeBlock';
  blockId: BlockId;
}

export interface UpdateBlockLayoutStep extends Step {
  kind: 'updateBlockLayout';
  blockId: BlockId;
  patch: Partial<BlockLayout>;
}

// 实现可以用 class 或工厂，这里示意工厂函数实现：

export function createAddBlockStep(block: TripBlock): AddBlockStep {
  return {
    kind: 'addBlock',
    block,
    apply(state: EditorState): StepApplyResult {
      if (state.doc.blocks.has(block.id)) {
        return { state, failed: 'Block already exists' };
      }
      const err = validateBlock(block);
      if (err) return { state, failed: err };

      const newDoc = {
        ...state.doc,
        blocks: new Map(state.doc.blocks).set(block.id, block),
      };
      return { state: { ...state, doc: newDoc } };
    },
    invert(before: EditorState): Step {
      return createRemoveBlockStep(block.id);
    },
  };
}

export function createRemoveBlockStep(blockId: BlockId): RemoveBlockStep {
  return {
    kind: 'removeBlock',
    blockId,
    apply(state: EditorState): StepApplyResult {
      if (!state.doc.blocks.has(blockId)) {
        return { state, failed: 'Block not found' };
      }
      const newBlocks = new Map(state.doc.blocks);
      newBlocks.delete(blockId);
      // TODO: 同时删除关联的 connector/timeline 可选
      const newDoc = { ...state.doc, blocks: newBlocks };
      return { state: { ...state, doc: newDoc } };
    },
    invert(before: EditorState): Step {
      const block = before.doc.blocks.get(blockId);
      if (!block) {
        // 理论上不会发生
        return this;
      }
      return createAddBlockStep(block);
    },
  };
}
```

其他 Step（connector/timeline/view）同理分别放在对应文件。

### 3. `steps/registry.ts`（可选）

如果你需要序列化 Step（协同/持久化），可以做一个 kind ↔ 实现 的注册表：

```ts
// steps/registry.ts
import { Step } from './types';

type StepJSON = { kind: string; [key: string]: any };

type StepFromJSON = (json: StepJSON) => Step;

const registry = new Map<string, StepFromJSON>();

export function registerStep(kind: string, fromJSON: StepFromJSON) {
  registry.set(kind, fromJSON);
}

export function stepFromJSON(json: StepJSON): Step {
  const factory = registry.get(json.kind);
  if (!factory) throw new Error(`Unknown step kind: ${json.kind}`);
  return factory(json);
}
```

---

## 五、`transaction/`：Transaction & apply

### 1. `transaction/transaction.ts`

```ts
// transaction/transaction.ts
import { Step } from '../steps/types';
import { EditorState } from '../state/editorState';
import { HistoryState, pushToHistory } from '../history/history';

export type TransactionSource = 'local' | 'remote' | 'system';

export interface TransactionMeta {
  addToHistory: boolean;
  source: TransactionSource;
  label?: string;
  clientId?: string;
  timestamp?: number;
  groupId?: string; // 用于拖拽合并
}

export interface Transaction {
  steps: Step[];
  meta: TransactionMeta;
}

export interface TransactionApplyResult {
  state: EditorState;
  failed?: string;
  inverse?: Transaction;
}

export function applyTransaction(state: EditorState, tr: Transaction): TransactionApplyResult {
  let current = state;
  const inverseSteps: Step[] = [];

  for (const step of tr.steps) {
    const before = current;
    const res = step.apply(current);
    if (res.failed) {
      return { state, failed: res.failed };
    }
    // 逆操作基于「应用前」的状态
    const inverse = step.invert(before);
    inverseSteps.unshift(inverse); // 逆序
    current = res.state;
  }

  const inverseTr: Transaction = {
    steps: inverseSteps,
    meta: {
      ...tr.meta,
      // 撤销的撤销仍然记到 history 的策略可以视情况调整
    },
  };

  // 更新 history
  let newHistory = current.history;
  if (tr.meta.addToHistory && tr.meta.source === 'local') {
    newHistory = pushToHistory(current.history, tr, inverseTr);
  }

  return {
    state: { ...current, history: newHistory },
    inverse: inverseTr,
  };
}
```

---

## 六、`history/`：HistoryState & undo/redo

### 1. `history/history.ts`

```ts
// history/history.ts
import { Transaction } from '../transaction/transaction';

export interface HistoryEntry {
  transaction: Transaction;
  inverse: Transaction;
}

export interface HistoryState {
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
}

export function pushToHistory(history: HistoryState, tr: Transaction, inverse: Transaction): HistoryState {
  return {
    undoStack: [...history.undoStack, { transaction: tr, inverse }],
    redoStack: [], // 新操作发生后清空 redo
  };
}

export function canUndo(history: HistoryState): boolean {
  return history.undoStack.length > 0;
}

export function canRedo(history: HistoryState): boolean {
  return history.redoStack.length > 0;
}
```

### 2. `commands` 层里的 undo/redo 命令

完整 undo/redo 要结合 Transaction 应用，你可以放在 `commands` 层实现（见下一节）。

---

## 七、`commands/`：给 React / 应用层用的高层 API

**核心观点：**  
UI 层不直接拼 Step，而是调用“命令函数”，命令函数内部封装 Step/Transaction/History 细节。

### 1. `commands/blockCommands.ts`

```ts
// commands/blockCommands.ts
import { EditorState } from '../state/editorState';
import { Transaction, applyTransaction } from '../transaction/transaction';
import { createAddBlockStep, createUpdateBlockLayoutStep } from '../steps/blockSteps';
import { TripBlock, BlockLayout } from '../schema/block';

export function addBlock(state: EditorState, block: TripBlock): EditorState {
  const step = createAddBlockStep(block);
  const tr: Transaction = {
    steps: [step],
    meta: {
      addToHistory: true,
      source: 'local',
      label: 'add-block',
      timestamp: Date.now(),
    },
  };
  const res = applyTransaction(state, tr);
  if (res.failed) {
    // UI 可以选择抛错或忽略
    throw new Error(res.failed);
  }
  return res.state;
}

export function moveBlock(state: EditorState, blockId: string, patch: Partial<BlockLayout>): EditorState {
  const step = createUpdateBlockLayoutStep(blockId, patch);
  const tr: Transaction = {
    steps: [step],
    meta: {
      addToHistory: true,
      source: 'local',
      label: 'move-block',
      timestamp: Date.now(),
      groupId: 'drag', // 可用于拖拽合并
    },
  };
  const res = applyTransaction(state, tr);
  if (res.failed) throw new Error(res.failed);
  return res.state;
}
```

### 2. `commands/viewCommands.ts`（视口/选中不一定入历史）

```ts
// commands/viewCommands.ts
import { EditorState } from '../state/editorState';
import { Transaction, applyTransaction } from '../transaction/transaction';
import { createSetViewportStep, createSetSelectionStep } from '../steps/viewSteps';

export function setViewport(state: EditorState, viewportPatch: Partial<Viewport>): EditorState {
  const step = createSetViewportStep(viewportPatch);
  const tr: Transaction = {
    steps: [step],
    meta: {
      addToHistory: false, // 通常不进历史
      source: 'local',
      label: 'set-viewport',
      timestamp: Date.now(),
    },
  };
  return applyTransaction(state, tr).state;
}
```

### 3. `commands/index.ts`

对外暴露的统一命令入口（让 `index.ts` 再 re-export 一层）：

```ts
// commands/index.ts
export * from './blockCommands';
export * from './connectorCommands';
export * from './timelineCommands';
export * from './viewCommands';
export * from './historyCommands';
```

### 4. `commands/historyCommands.ts`

```ts
// commands/historyCommands.ts
import { EditorState } from '../state/editorState';
import { applyTransaction } from '../transaction/transaction';

export function undo(state: EditorState): EditorState {
  const { undoStack, redoStack } = state.history;
  if (undoStack.length === 0) return state;

  const entry = undoStack[undoStack.length - 1];
  const res = applyTransaction(
    { ...state, history: { ...state.history, undoStack: undoStack.slice(0, -1) } },
    entry.inverse
  );
  return {
    ...res.state,
    history: {
      undoStack: res.state.history.undoStack,
      redoStack: [...redoStack, entry],
    },
  };
}

export function redo(state: EditorState): EditorState {
  const { undoStack, redoStack } = state.history;
  if (redoStack.length === 0) return state;

  const entry = redoStack[redoStack.length - 1];
  const res = applyTransaction(
    { ...state, history: { ...state.history, redoStack: redoStack.slice(0, -1) } },
    entry.transaction
  );
  return {
    ...res.state,
    history: {
      undoStack: [...undoStack, entry],
      redoStack: res.state.history.redoStack,
    },
  };
}
```

---

## 八、`index.ts`：core 对外 API 入口

```ts
// src/index.ts
export * from './schema/block';
export * from './schema/connector';
export * from './schema/timeline';
export * from './schema/document';
export * from './schema/viewport';
export * from './schema/selection';

export * from './state/editorState';
export * from './state/factories';

export * from './commands'; // 命令是 UI/app 的主要入口
```

---

## 九、这样设计的好处 & 面试可以怎么讲

- **“强 Schema + 工厂 + Step 校验”**：非法状态在 core 层就构造不出来。
- **“Step / Transaction / History 三层”**：清晰可回放、可协同、可 Undo/Redo。
- **“commands 把复杂度封装掉”**：React / 渲染器不需要知道 Step 细节，只调命令。
- **对协同/WebGL 的扩展能力**：
  - Yjs 适配可以在 `collab` 层工作，只触碰 `Transaction` 与 `EditorState`。
  - 渲染引擎只依赖 `EditorState.doc + viewport + selection`。

---

如果你愿意，下一步我们可以：

- 选一个完整链条从上到下走一遍，比如“添加一个 FlightBlock + 映射到 Timeline + 撤销”，我帮你串联：**工厂 → Step → Transaction → History → commands → React 调用方式**；  
- 或者先切到 `renderer-canvas` 的设计，把 `EditorState` 如何喂给渲染引擎、命中检测如何反向生成命令，串成完整闭环。
---
# 第二步：Canvas 渲染管线

### 先说这一步的目标

`renderer-canvas` 要做到两件事：

- 从 `core` 的 `EditorState` 中**读**数据，建立自己的「场景 & 渲染状态」；
- 提供一套「渲染 + 命中检测」API，供 React / 交互层调用，不反向修改 `EditorState`。

你可以把它想成：**「只会画画和算命中，完全不懂业务」的白板引擎**。

下面我分成 4 块讲：

- 包结构 & 核心类/模块
- MVP 版渲染管线（先跑起来）
- 命中检测 & 空间索引设计
- 为后续优化（脏矩形/视口剔除/WebGL）预留的结构

---

## 一、`renderer-canvas` 包结构 & 核心概念

### 1. 目录结构建议

```txt
packages/renderer-canvas/
  src/
    index.ts                // 对外入口，暴露 WhiteboardRenderer 等

    core/
      WhiteboardRenderer.ts // 核心引擎类
      RenderScene.ts        // 渲染场景模型（从 EditorState 投影而来）
      RenderLoop.ts         // 渲染调度（rAF / 手动触发）

    layers/                 // 多层渲染（背景 / 主内容 / Overlay）
      BackgroundLayer.ts
      MainLayer.ts
      OverlayLayer.ts

    geometry/
      transform.ts          // 世界坐标 ↔ 屏幕坐标
      bounds.ts             // 包围盒计算
      hitTest.ts            // 精确命中检测

    spatial/
      SpatialIndex.ts       // 空间索引接口
      GridIndex.ts          // 简单网格实现（MVP）
      QuadTreeIndex.ts      // 进阶优化时可替换

    types.ts                // 渲染相关类型（RenderBlock / RenderConnector 等）
```

### 2. 渲染引擎对外接口：`WhiteboardRenderer`

先用概念级接口说明它应该干什么：

```ts
// types.ts（renderer 内部的 view model）
export interface RenderBlock {
  id: string;
  kind: string;             // flight/hotel/...
  // 世界坐标系下的几何信息（来自 core 的 layout）
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  // 渲染风格（颜色、圆角、图标类型等）
  style: BlockRenderStyle;
  // 未来：可缓存的 path / text layout 等
}

export interface RenderConnector {
  id: string;
  fromBlockId: string;
  toBlockId: string;
  // 预计算后的世界坐标折线/贝塞尔点
  points: { x: number; y: number }[];
  style: ConnectorRenderStyle;
}

export interface RenderScene {
  blocks: RenderBlock[];
  connectors: RenderConnector[];
}
```

`WhiteboardRenderer` 负责：

```ts
// WhiteboardRenderer.ts（概念接口）
export interface WhiteboardRendererOptions {
  // 画布宿主：可以是单个 canvas，也可以是多个 layer 的 container
  canvas: HTMLCanvasElement;
  // 初始尺寸 / DPR 等
}

export class WhiteboardRenderer {
  constructor(options: WhiteboardRendererOptions);

  // 更新来自 core 的状态（doc + viewport + selection）
  updateState(editorState: EditorState): void;

  // 手动触发一次渲染（一般由 React 在 state 更新后调用）
  render(): void;

  // 画布尺寸改变时调用
  resize(width: number, height: number, devicePixelRatio: number): void;

  // 命中检测（屏幕坐标）
  hitTestBlockAt(screenX: number, screenY: number): BlockId | null;
  hitTestConnectorAt(screenX: number, screenY: number): ConnectorId | null;

  // 清理资源
  destroy(): void;
}
```

对 React 来说，它就像一个「黑盒」：

- React 管的是：工具栏/侧栏/选中状态/命令调用；
- 渲染引擎管的是：**怎样把当前 `EditorState` 画在屏幕上**。

---

## 二、MVP 版 Canvas 渲染管线（先简单跑起来）

我们先设计一个**清晰但不复杂的流程**，后面再往里塞优化。

### 1. 坐标系与 Viewport

定义两层坐标：

- **世界坐标系（world）**：`TripBlock.layout.position` 所在的坐标，白板无限大。
- **屏幕坐标系（screen）**：Canvas 像素坐标。

Viewport 决定「世界坐标 → 屏幕坐标」的映射：

```ts
// geometry/transform.ts
export interface Viewport {
  center: { x: number; y: number }; // 世界坐标中心
  zoom: number;                     // 缩放比例
}

export interface CanvasSize {
  width: number;
  height: number;
}

export function worldToScreen(
  world: { x: number; y: number },
  viewport: Viewport,
  canvas: CanvasSize
): { x: number; y: number } {
  const { center, zoom } = viewport;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  return {
    x: cx + (world.x - center.x) * zoom,
    y: cy + (world.y - center.y) * zoom,
  };
}

export function screenToWorld(
  screen: { x: number; y: number },
  viewport: Viewport,
  canvas: CanvasSize
): { x: number; y: number } {
  const { center, zoom } = viewport;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  return {
    x: (screen.x - cx) / zoom + center.x,
    y: (screen.y - cy) / zoom + center.y,
  };
}
```

> 这套 API 在未来 WebGL 版也能沿用，只是换成矩阵乘法。

### 2. MVP 渲染流程（全量重绘版）

第一版可以先不做脏矩形，只保证架构干净：

1. `updateState(editorState)`
   - 把 `EditorState.doc` 投影成 `RenderScene`（blocks/connector 排好 zIndex）。
   - 更新内部 `viewport`、`selection`。
   - 标记 `this.dirty = true`。

2. `render()`
   - 如果 `dirty === false` 且没强制渲染 → 可以直接 return；
   - 否则：
     - 清空整个 Canvas；
     - 先画背景网格；
     - 遍历 `RenderScene.connectors`，按 zIndex/规则画出所有线；
     - 遍历 `RenderScene.blocks`，按 zIndex 画出所有块；
     - 再画 selection overlay（高亮框/控制点）；
   - 将 `dirty` 置 `false`。

简单伪代码：

```ts
render() {
  if (!this.dirty) return;
  const ctx = this.ctx;
  const { width, height } = this.canvas;

  ctx.save();
  // 清空
  ctx.clearRect(0, 0, width, height);

  // 画背景（网格）
  this.backgroundLayer.render(ctx, this.viewport, { width, height });

  // 画连线
  this.mainLayer.renderConnectors(ctx, this.scene, this.viewport, { width, height });

  // 画块
  this.mainLayer.renderBlocks(ctx, this.scene, this.viewport, { width, height });

  // 画选中状态
  this.overlayLayer.renderSelection(ctx, this.scene, this.viewport, this.selection, { width, height });

  ctx.restore();
  this.dirty = false;
}
```

> 优点：实现快速、易调试。  
> 后面你可以在 `MainLayer.renderBlocks` 里逐步加上「只画视口内元素」「局部重绘」等优化，而不影响外围结构。

### 3. 分层 Canvas（推荐）

MVP 就可以一开始设计为**多层 Canvas**，好处是后面做局部重绘、hover 效果更好：

- `backgroundCanvas`：只画背景网格/地图底图 → 变化很少。
- `mainCanvas`：画 Block + Connector → 变化最多。
- `overlayCanvas`：画选中框、hover 高亮、光标等 → 尤其频繁变化。

`WhiteboardRenderer` 的 options 可以改为：

```ts
export interface WhiteboardRendererOptions {
  backgroundCanvas: HTMLCanvasElement;
  mainCanvas: HTMLCanvasElement;
  overlayCanvas: HTMLCanvasElement;
}
```

React 里可以写一个 `WhiteboardCanvasStack` 组件，叠三层 `<canvas>`，renderer 只管拿元素和 context。

---

## 三、命中检测 & 空间索引：交互的“入口”

命中检测是 Canvas 引擎的关键：拖拽/点击/框选都要靠它。

### 1. 基本思路：两阶段命中检测

典型两步：

1. **粗筛选**：根据包围盒 + 空间索引，从所有元素中找出「可能被点中的」一小批。
2. **精确检测**：对这小批元素做精确命中（矩形/圆/Path）。

#### 粗筛选：包围盒 + GridIndex（MVP 实现）

在 `geometry/bounds.ts`：

```ts
export interface Rect {
  x: number;  // 左上角
  y: number;
  width: number;
  height: number;
}

export function getBlockBounds(block: RenderBlock): Rect {
  // MVP：先不考虑 rotation，直接把 width/height 当 axis-aligned
  return {
    x: block.x,
    y: block.y,
    width: block.width,
    height: block.height,
  };
}

export function rectContainsPoint(rect: Rect, point: { x: number; y: number }): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}
```

`spatial/GridIndex.ts`：

```ts
export interface SpatialObject {
  id: string;
  bounds: Rect;
}

export interface SpatialIndex {
  insert(obj: SpatialObject): void;
  remove(id: string): void;
  update(obj: SpatialObject): void;
  queryPoint(p: { x: number; y: number }): string[];    // 返回可能命中的 id 列表
  queryRect(r: Rect): string[];                         // 框选用
  clear(): void;
}
```

GridIndex 核心思想：把平面划成固定大小的网格，每个网格存一个元素 id 列表，`queryPoint` 就是查那个格子。

`WhiteboardRenderer.updateState` 时，顺便重建或增量更新这个 index（MVP 可以直接重建）。

#### 精确检测：根据类型做

在 `geometry/hitTest.ts`：

```ts
export function hitTestBlock(
  block: RenderBlock,
  worldPoint: { x: number; y: number }
): boolean {
  // MVP：忽略 rotation，只按 axis-aligned 矩形判断
  const bounds = getBlockBounds(block);
  return rectContainsPoint(bounds, worldPoint);
}
```

连接线命中可以先简单一点（例如判断到最近线段距离 < 阈值）。

### 2. `WhiteboardRenderer.hitTestBlockAt` 实现思路

流程：

1. `screen` 坐标 → `world` 坐标（用 `screenToWorld`）。
2. 通过 `SpatialIndex.queryPoint(worldPoint)` 拿到候选 blockId 列表。
3. 倒序按 zIndex 遍历候选列表，调用 `hitTestBlock`。
4. 命中的第一个就是顶部元素。

伪代码：

```ts
hitTestBlockAt(screenX: number, screenY: number): BlockId | null {
  const worldPoint = screenToWorld({ x: screenX, y: screenY }, this.viewport, this.canvasSize);
  const candidateIds = this.spatialIndex.queryPoint(worldPoint);
  // 从 scene 中拿对应 block，并按 zIndex 排序
  const candidates = candidateIds
    .map(id => this.scene.blockById.get(id))
    .filter(Boolean)
    .sort((a, b) => a.zIndex - b.zIndex); // 或降序

  for (let i = candidates.length - 1; i >= 0; i--) {
    const block = candidates[i]!;
    if (hitTestBlock(block, worldPoint)) {
      return block.id;
    }
  }
  return null;
}
```

> 这套设计以后迁移到 WebGL，也就是把命中检测从「CPU + 几何」换成「一定程度 GPU 辅助 / Pick Buffer」，但是接口保持不变。

---

## 四、为后续优化和 WebGL 预留结构（现在就埋点）

你现在做的是 Canvas MVP，但要「当个事儿办」，所以结构上提前预留几个点，方便你后面讲“引擎演进”。

### 1. 渲染策略分层：MVP → 优化版

在 `MainLayer` 里，可以这样划分方法：

```ts
class MainLayer {
  renderBlocks(
    ctx: CanvasRenderingContext2D,
    scene: RenderScene,
    viewport: Viewport,
    canvasSize: CanvasSize
  ) {
    const visibleBlocks = this.computeVisibleBlocks(scene.blocks, viewport, canvasSize);
    for (const block of visibleBlocks) {
      this.drawBlock(ctx, block, viewport, canvasSize);
    }
  }

  // MVP：直接返回全部 blocks
  computeVisibleBlocks(blocks: RenderBlock[], viewport: Viewport, canvasSize: CanvasSize) {
    // 未来：这里加视口剔除（culling）
    return blocks;
  }

  drawBlock(...) {
    // 未来：这里可以用不同 detail level（LOD）
  }
}
```

后续优化：

- **视口剔除**：在 `computeVisibleBlocks` 里用包围盒 + viewport 判断是否可见；
- **LOD**：在 `drawBlock` 里根据 `viewport.zoom` 选择画复杂/简化形态；
- **渲染顺序优化**：预排序 blocks，减少状态切换（即使在 Canvas 也有一点价值）。

### 2. 脏矩形机制

可以在 `WhiteboardRenderer` 内部预留一个「渲染区域」概念：

```ts
// WhiteboardRenderer.ts
private fullDirty: boolean = true;
private dirtyRects: Rect[] = [];

markAllDirty() {
  this.fullDirty = true;
  this.dirtyRects = [];
}

markDirtyRect(rect: Rect) {
  if (this.fullDirty) return;
  this.dirtyRects.push(rect);
}
```

`render()`：

- 如果 `fullDirty` → 清空整张主画布全量重绘；
- 否则：
  - 合并 `dirtyRects`;
  - 只对这些区域做 `ctx.clearRect` + 重绘区域内元素。

MVP 阶段可以始终 `fullDirty = true`，逻辑先跑通即可。  
等你做拖拽/批量移动的时候，再把拖前/拖后的包围盒合并成脏矩形，真正启用。

### 3. 为 WebGL 渲染器预留“相同的场景模型”

`RenderScene` 设计成**只依赖 core 文档，不依赖 Canvas**：

- `RenderBlock` / `RenderConnector` 这些类型将来可以直接喂给 `renderer-webgl`；
- WebGL 渲染器只需要把 `drawBlock` 换成填 VBO + 调 shader。

这就能在面试时讲出：

> “我们刻意把 core 文档模型与 RenderScene 抽象出来，Canvas 和 WebGL 渲染器共享同一套场景模型和命中检测 API，只需要替换渲染后端。”

---

## 五、闭环视角：React / core / renderer 如何串起来？

最终交互流程你可以设计成这样（面试很好讲）：

- React 组件中：
  - 持有 `EditorState`（通过 core 的 `commands` 修改）；
  - 挂载 `<WhiteboardCanvasStack>`，内部初始化 `WhiteboardRenderer`；
  - 在 `EditorState` 变化时调用 `renderer.updateState(state); renderer.render()`；
  - 在鼠标事件中调用 `renderer.hitTestBlockAt`，得到 `BlockId` 后再调用 core 的 `selectBlock` / `moveBlock` 命令。

> 这样交互链就是：**用户事件 → renderer 命中检测 → core 命令（Step/Transaction/History）→ 新的 EditorState → renderer 再渲染**。  
> 非常符合“状态机 + 渲染器”的 MH 式设计。

---

如果你愿意，下一步我们可以更「具体」一点，选一个完整场景，比如：

- “画布中点击选中一个 TripBlock 并高亮”的完整链路：  
  包括 React 事件 → `hitTest` → 调 `core.commands.setSelection` → 再 `updateState + render`，我可以帮你把这一条流程的代码框架写出来，作为你实现其他交互的模板。
---
# 场景串联
> 我们现在串联两个场景，完整链条从上到下走一遍：
> - “添加一个 FlightBlock + 映射到 Timeline + 撤销”，串联：**工厂 → Step → Transaction → History → commands → React 调用方式**；
> - “画布中点击选中一个 TripBlock 并高亮”的完整链路：包括 React 事件 → hitTest → 调 core.commands.setSelection → 再 updateState + render；
> - "连续拖拽 → 命中检测 → 增量更新 layout → Step 合并 → 性能优化（脏矩形）"

### 场景一：添加一个 FlightBlock + 映射到 Timeline + 撤销（从上到下完整链）

#### 0. 故事版（你在面试可以这么讲）

> “用户在左侧 Trip.com 搜索面板点击一个航班结果，我会在 core 里通过工厂构造一个 `FlightBlock`，同时自动创建对应的 `TimelineItem`，打包成一个 Transaction 提交。这个 Transaction 会进入 History，所以用户可以一键撤销，行程卡片和时间轴一起回滚。”

下面用两条链路把它拆开：

---

#### 1. 工厂：从业务数据构造合法的 FlightBlock

```ts
// core/state/factories.ts
import { FlightBlock, TripBlock } from '../schema/block';
import { TimeRange } from '../schema/types';
import { generateId } from '../utils/id';
import { validateBlock } from '../schema/validators';
import { createDefaultLayout } from './factories-layout';

interface CreateFlightBlockInput {
  title: string;
  fromAirport: string;
  toAirport: string;
  time: TimeRange;
  carrier?: string;
  flightNumber?: string;
  sourceExternalId?: string;
  position?: { x: number; y: number };
}

export function createFlightBlock(input: CreateFlightBlockInput): TripBlock {
  const now = Date.now();
  const block: FlightBlock = {
    id: generateId('block'),
    kind: 'flight',
    layout: createDefaultLayout(input.position),
    createdAt: now,
    updatedAt: now,
    source: input.sourceExternalId
      ? { provider: 'trip.com', externalId: input.sourceExternalId }
      : undefined,
    title: input.title,
    fromAirport: input.fromAirport,
    toAirport: input.toAirport,
    carrier: input.carrier,
    flightNumber: input.flightNumber,
    time: input.time,
  };

  const err = validateBlock(block);
  if (err) throw new Error(err);
  return block;
}
```

> 不变量（起飞时间 < 落地时间、机场必填等）都在 `validateBlock` 里 enforce。

---

#### 2. Step：AddBlock + AddTimelineItem

```ts
// core/steps/blockSteps.ts
export function createAddBlockStep(block: TripBlock): AddBlockStep {
  return {
    kind: 'addBlock',
    block,
    apply(state) {
      if (state.doc.blocks.has(block.id)) {
        return { state, failed: 'Block already exists' };
      }
      const err = validateBlock(block);
      if (err) return { state, failed: err };

      const blocks = new Map(state.doc.blocks);
      blocks.set(block.id, block);
      return { state: { ...state, doc: { ...state.doc, blocks } } };
    },
    invert(before) {
      return createRemoveBlockStep(block.id);
    },
  };
}
```

```ts
// core/steps/timelineSteps.ts
export function createAddTimelineItemStep(item: TimelineItem): AddTimelineItemStep {
  return {
    kind: 'addTimelineItem',
    item,
    apply(state) {
      const timeline = new Map(state.doc.timeline);
      if (timeline.has(item.id)) {
        return { state, failed: 'TimelineItem already exists' };
      }
      timeline.set(item.id, item);
      return { state: { ...state, doc: { ...state.doc, timeline } } };
    },
    invert(before) {
      return createRemoveTimelineItemStep(item.id);
    },
  };
}
```

---

#### 3. Transaction：把两个 Step 打包成一个“用户操作单元”

```ts
// core/commands/blockCommands.ts
import { EditorState } from '../state/editorState';
import { createFlightBlock } from '../state/factories';
import { createAddBlockStep } from '../steps/blockSteps';
import { createAddTimelineItemStep } from '../steps/timelineSteps';
import { applyTransaction, Transaction } from '../transaction/transaction';
import { TimelineItem } from '../schema/timeline';
import { generateId } from '../utils/id';

interface AddFlightWithTimelineInput {
  title: string;
  fromAirport: string;
  toAirport: string;
  time: TimeRange;       // 航班时间
  position?: { x: number; y: number };
  sourceExternalId?: string;
}

export function addFlightWithTimeline(
  state: EditorState,
  input: AddFlightWithTimelineInput
): EditorState {
  // 1. 工厂：创建合法 FlightBlock
  const flightBlock = createFlightBlock(input);

  // 2. 自动推导 TimelineItem（按日期映射）
  const day = input.time.start.slice(0, 10); // 简化为 yyyy-mm-dd
  const timelineItem: TimelineItem = {
    id: generateId('timeline'),
    blockId: flightBlock.id,
    day,
    timeRange: input.time,
    order: Date.parse(input.time.start),
  };

  // 3. 构造 Steps
  const steps = [
    createAddBlockStep(flightBlock),
    createAddTimelineItemStep(timelineItem),
  ];

  const tr: Transaction = {
    steps,
    meta: {
      addToHistory: true,        // 加入撤销栈
      source: 'local',
      label: 'add-flight-with-timeline',
      timestamp: Date.now(),
    },
  };

  const res = applyTransaction(state, tr);
  if (res.failed) throw new Error(res.failed);
  return res.state;
}
```

> 这里你可以强调：**“一个用户操作对应一个 Transaction，Block 和 Timeline 一起被修改，撤销时也一起回滚，不会拆开。”**

---

#### 4. History：撤销时如何回滚 Block + Timeline

`applyTransaction` 已经帮你保存了 inverseTransaction 到 History。  
撤销逻辑在 `commands/historyCommands.ts`：

```ts
// core/commands/historyCommands.ts
export function undo(state: EditorState): EditorState {
  const { undoStack, redoStack } = state.history;
  if (undoStack.length === 0) return state;

  const entry = undoStack[undoStack.length - 1];
  const res = applyTransaction(
    { ...state, history: { ...state.history, undoStack: undoStack.slice(0, -1) } },
    entry.inverse
  );

  return {
    ...res.state,
    history: {
      undoStack: res.state.history.undoStack,
      redoStack: [...redoStack, entry],
    },
  };
}
```

> 因为 inverseTransaction 里包含 `RemoveBlockStep + RemoveTimelineItemStep`（按相反顺序），所以撤销后 flight 卡片和时间轴条目一起消失。

---

#### 5. React 调用方式（从 UI 到 core 再到 renderer）

```tsx
// app/TripPlannerPage.tsx（伪代码）
import { useState, useEffect, useRef } from 'react';
import { EditorState, createEmptyEditorState } from '@triplanner/core';
import { addFlightWithTimeline, undo } from '@triplanner/core/commands';
import { WhiteboardRenderer } from '@triplanner/renderer-canvas';

function TripPlannerPage() {
  const [editorState, setEditorState] = useState<EditorState>(
    () => createEmptyEditorState()
  );

  const rendererRef = useRef<WhiteboardRenderer | null>(null);

  // 初始化 renderer
  useEffect(() => {
    const renderer = new WhiteboardRenderer({
      backgroundCanvas: backgroundCanvasRef.current!,
      mainCanvas: mainCanvasRef.current!,
      overlayCanvas: overlayCanvasRef.current!,
    });
    rendererRef.current = renderer;
    // 初始渲染
    renderer.updateState(editorState);
    renderer.render();
    return () => renderer.destroy();
  }, []);

  // 每次 editorState 变化，通知 renderer
  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.updateState(editorState);
    rendererRef.current.render();
  }, [editorState]);

  // 1）点击左侧航班卡片
  const handleFlightClick = (result: FlightSearchResult) => {
    setEditorState(prev =>
      addFlightWithTimeline(prev, {
        title: result.title,
        fromAirport: result.from,
        toAirport: result.to,
        time: {
          start: result.departureTime,
          end: result.arrivalTime,
        },
        sourceExternalId: result.id,
        position: { x: 0, y: 0 }, // 初始放在画布中心附近
      })
    );
  };

  // 2）用户按下 Ctrl+Z 撤销
  const handleUndo = () => {
    setEditorState(prev => undo(prev));
  };

  // ...
}
```

> 你在面试可以一句话概括这个链条：  
> **“左侧点击航班卡片 → 命令 `addFlightWithTimeline` → 工厂 + 双 Step 的 Transaction → History 记录 → React setState → renderer 接收新的 EditorState 重绘 → Ctrl+Z 调 `undo`，Block 和 Timeline 一起撤销。”**

---

### 场景二：画布点击选中 TripBlock 并高亮（React → hitTest → core → renderer）

#### 0. 故事版

> “画布上的点击事件先交给渲染引擎做命中检测，算出命中的 BlockId，再通过 core 的 `setSelection` 命令更新 EditorState，产生新的 selection。renderer 只从状态中读 selection，根据它决定高亮哪个 Block。”

---

#### 1. renderer：hitTest + selection 绘制

```ts
// renderer-canvas/src/WhiteboardRenderer.ts（核心接口片段）
export class WhiteboardRenderer {
  // ...
  private scene: RenderScene;
  private viewport: Viewport;
  private selection: Selection;
  private spatialIndex: SpatialIndex;

  updateState(editorState: EditorState) {
    // 1. 更新 viewport / selection
    this.viewport = editorState.viewport;
    this.selection = editorState.selection;

    // 2. 从 doc 转成 RenderScene（简化示意）
    this.scene = projectDocToRenderScene(editorState.doc);

    // 3. 重建空间索引（MVP 直接重建）
    this.spatialIndex.clear();
    for (const block of this.scene.blocks) {
      this.spatialIndex.insert({
        id: block.id,
        bounds: getBlockBounds(block),
      });
    }

    this.dirty = true;
  }

  // 命中检测：从屏幕坐标 → world → index → 精确命中
  hitTestBlockAt(screenX: number, screenY: number): string | null {
    const world = screenToWorld(
      { x: screenX, y: screenY },
      this.viewport,
      this.canvasSize
    );
    const candidateIds = this.spatialIndex.queryPoint(world);

    const candidates = candidateIds
      .map(id => this.scene.blockById.get(id))
      .filter(Boolean)
      .sort((a, b) => a!.zIndex - b!.zIndex) as RenderBlock[];

    for (let i = candidates.length - 1; i >= 0; i--) {
      const block = candidates[i];
      if (hitTestBlock(block, world)) return block.id;
    }
    return null;
  }

  render() {
    if (!this.dirty) return;
    // ...背景 & 主内容

    // overlay：高亮 selection
    this.overlayLayer.renderSelection(
      this.overlayCtx,
      this.scene,
      this.viewport,
      this.selection,
      this.canvasSize
    );

    this.dirty = false;
  }
}
```

`OverlayLayer.renderSelection` 大致逻辑：

```ts
// renderer-canvas/src/layers/OverlayLayer.ts
renderSelection(ctx, scene, viewport, selection, canvasSize) {
  for (const blockId of selection.selectedBlockIds) {
    const block = scene.blockById.get(blockId);
    if (!block) continue;
    const bounds = getBlockBounds(block);
    const topLeftScreen = worldToScreen(
      { x: bounds.x, y: bounds.y },
      viewport,
      canvasSize
    );

    ctx.save();
    ctx.strokeStyle = '#0071ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.strokeRect(
      topLeftScreen.x,
      topLeftScreen.y,
      bounds.width * viewport.zoom,
      bounds.height * viewport.zoom
    );
    ctx.restore();
  }
}
```

---

#### 2. core：setSelection 命令（不进 History）

```ts
// core/steps/viewSteps.ts
export function createSetSelectionStep(
  selectedBlockIds: BlockId[],
  selectedConnectorIds: ConnectorId[]
): SetSelectionStep {
  return {
    kind: 'setSelection',
    selectedBlockIds,
    selectedConnectorIds,
    apply(state) {
      return {
        state: {
          ...state,
          selection: {
            selectedBlockIds,
            selectedConnectorIds,
          },
        },
      };
    },
    invert(before) {
      // selection 通常不做 undo，这里可以返回「恢复到 before.selection」的 Step，
      // 但 Transaction meta 会设置 addToHistory: false。
      return createSetSelectionStep(
        before.selection.selectedBlockIds,
        before.selection.selectedConnectorIds
      );
    },
  };
}
```

```ts
// core/commands/viewCommands.ts
export function setSelection(
  state: EditorState,
  selectedBlockIds: BlockId[],
  selectedConnectorIds: ConnectorId[] = []
): EditorState {
  const step = createSetSelectionStep(selectedBlockIds, selectedConnectorIds);
  const tr: Transaction = {
    steps: [step],
    meta: {
      addToHistory: false,   // 选择不计入撤销栈
      source: 'local',
      label: 'set-selection',
      timestamp: Date.now(),
    },
  };
  return applyTransaction(state, tr).state;
}
```

---

#### 3. React：鼠标事件 → hitTest → core → renderer（完整闭环）

```tsx
// app/components/WhiteboardCanvasStack.tsx（伪代码）
import { useRef, useEffect } from 'react';
import { WhiteboardRenderer } from '@triplanner/renderer-canvas';
import { EditorState } from '@triplanner/core';
import { setSelection } from '@triplanner/core/commands';

interface Props {
  editorState: EditorState;
  onChangeState: (updater: (prev: EditorState) => EditorState) => void;
}

export function WhiteboardCanvasStack({ editorState, onChangeState }: Props) {
  const bgRef = useRef<HTMLCanvasElement>(null);
  const mainRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WhiteboardRenderer | null>(null);

  // 初始化 renderer
  useEffect(() => {
    const renderer = new WhiteboardRenderer({
      backgroundCanvas: bgRef.current!,
      mainCanvas: mainRef.current!,
      overlayCanvas: overlayRef.current!,
    });
    rendererRef.current = renderer;

    renderer.updateState(editorState);
    renderer.render();

    return () => renderer.destroy();
  }, []);

  // editorState 变化时，更新 render
  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.updateState(editorState);
    rendererRef.current.render();
  }, [editorState]);

  // 画布点击事件
  const handleCanvasClick = (evt: React.MouseEvent<HTMLCanvasElement>) => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    const rect = overlayRef.current!.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;

    const blockId = renderer.hitTestBlockAt(x, y);
    onChangeState(prev => {
      if (blockId) {
        return setSelection(prev, [blockId]);  // 选中一个 Block
      }
      return setSelection(prev, []);           // 点击空白，清空 selection
    });
    // setSelection 触发上面的 useEffect，renderer.updateState + render
  };

  return (
    <div className="whiteboard-stack">
      <canvas ref={bgRef} className="whiteboard-canvas whiteboard-canvas--bg" />
      <canvas ref={mainRef} className="whiteboard-canvas whiteboard-canvas--main" />
      <canvas
        ref={overlayRef}
        className="whiteboard-canvas whiteboard-canvas--overlay"
        onClick={handleCanvasClick}
      />
    </div>
  );
}
```

---

#### 你可以对面试官怎么总结这两条链路？

- **添加航班 + Timeline + 撤销：**

  > “左侧点击航班 → 用工厂按 Schema 构造合法 FlightBlock → 用两个 Step（AddBlock + AddTimelineItem）组成一个 Transaction → applyTransaction 更新 EditorState 并记录 inverseTransaction 到 History → React setState → renderer 读新状态重绘 → Ctrl+Z 调 core 的 undo，一次性回滚航班卡片和 Timeline 条。”

- **画布点击选中并高亮：**

  > “画布点击交给 renderer 做命中检测（screen → world → 空间索引 → 几何命中）得到 BlockId → 调 core 的 `setSelection` 命令生成新的 EditorState.selection，但不写入 History → React 更新状态 → renderer 在 overlay 层按 selection 画出高亮框。”

这两条链路一讲，能同时体现你：

- 有 **MH 式状态机与 Transaction 思维**；
- 能 **把 core / renderer / React 分层得很干净**；
- 对 **渲染引擎、命中检测、撤销栈**都有真实设计与实现经验。

如果你接下来想继续深入，我们可以选一个“拖拽移动 Block”的场景，把：  
**连续拖拽 → 命中检测 → 增量更新 layout → Step 合并 → 性能优化（脏矩形）**串成第三条故事线。

### 场景三：连续拖拽 → 命中检测 → 增量更新 layout → Step 合并 → 性能优化

这条链路要体现“引擎思维”，不是纯事件堆砌

我们要把这条链讲成一个完整的技术故事：

> **连续拖拽 → 命中检测 → 增量更新 layout → Step/Transaction 合并成一次历史记录 → Canvas 层用脏矩形减少重绘**

我会按真实实现的角度走一遍，同时给你“面试可以怎么讲”的版本。

---

#### 一、整体时序概览（一句话描图）

以拖动一个已存在的 FlightBlock 为例：

1. `mousedown`：  
   - `renderer.hitTestBlockAt` → 命中 `blockId`
   - core：`setSelection([blockId])`
   - React：记录一个 `dragSession`（起点坐标 + 初始 layout）

2. `mousemove`（拖拽中，多次触发）：
   - 将 `screen` 坐标转世界坐标，计算 `delta`
   - 把 `delta` 通知 renderer 做**预览渲染**（不写 core / History）  
   - 同时用脏矩形标记旧位置和新位置，最小化重绘区域

3. `mouseup`：
   - 终止拖拽，取消预览
   - 用最终 `delta` 调 core 的 `moveBlock` 命令 → 产生一个 Transaction + 写入 History（一次）
   - React 更新 `EditorState` → renderer 用新 state 全量/局部重绘

> 故意把“状态 commit”集中在 mouseup，这样拖拽过程不污染 History，也不会在 core 里产生一堆 Step。

下面详细拆。

---

#### 二、命中检测 & 拖拽初始化（mousedown）

##### 1. React 层：管理 `dragSession`

```ts
// app/state/dragSession.ts（可简单用 React useState 管）
export interface DragSession {
  blockIds: string[];               // 支持多选拖拽
  startScreen: { x: number; y: number };
  startWorld: { x: number; y: number };
  initialLayouts: Map<string, BlockLayout>; // 记录每个 block 的原始 layout.position
}
```

`mousedown` 时：

```tsx
const [dragSession, setDragSession] = useState<DragSession | null>(null);

const handleMouseDown = (evt: React.MouseEvent<HTMLCanvasElement>) => {
  const renderer = rendererRef.current;
  if (!renderer) return;

  const rect = overlayRef.current!.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;

  const blockId = renderer.hitTestBlockAt(x, y);
  if (!blockId) {
    // 点击空白：清空 selection
    onChangeState(prev => setSelection(prev, []));
    setDragSession(null);
    return;
  }

  // 更新 selection 到 core
  onChangeState(prev => setSelection(prev, [blockId]));

  // 根据当前 editorState 拿到选中的 block 布局（支持多选）
  const state = currentEditorStateRef.current; // 用 ref 存最新状态
  const selectedIds = [blockId]; // 简化：只支持单选
  const initialLayouts = new Map<string, BlockLayout>();
  selectedIds.forEach(id => {
    const block = state.doc.blocks.get(id);
    if (block) initialLayouts.set(id, block.layout);
  });

  const worldPoint = renderer.screenToWorld({ x, y }); // 封一层方法给 renderer

  setDragSession({
    blockIds: selectedIds,
    startScreen: { x, y },
    startWorld: worldPoint,
    initialLayouts,
  });

  // tell renderer 开始拖拽预览（可选）
  renderer.beginDragPreview(selectedIds, worldPoint);
};
```

> 面试说法：  
> **“mousedown 时不直接改 layout，只是完成 hitTest + selection + 记录拖拽起点和初始几何，用于后面 delta 计算。”**

---

#### 三、拖拽过程：只让 renderer 预览，最后一次性写 core

##### 1. 关键设计决策

拖拽过程中会产生大量 `mousemove`，如果每次都：

- 调 core 的 `moveBlock` → 生成 Step/Transaction；
- 更新 EditorState → React 重渲染 → renderer.updateState；

性能和复杂度都会爆炸。

所以我们采用**两层模型**：

- **视觉预览层（renderer 内部本地状态）**：高频更新，轻量、无 History；
- **真实文档层（core EditorState）**：低频更新，只在拖拽结束时提交一次。

这非常符合编辑器/白板常见做法。

##### 2. renderer：预览 API

```ts
// renderer-canvas/src/WhiteboardRenderer.ts
export class WhiteboardRenderer {
  // 拖拽预览用的 delta
  private dragPreview: {
    active: boolean;
    blockIds: string[];
    delta: { dx: number; dy: number }; // 世界坐标系
  } = { active: false, blockIds: [], delta: { dx: 0, dy: 0 } };

  beginDragPreview(blockIds: string[], startWorld: { x: number; y: number }) {
    this.dragPreview = {
      active: true,
      blockIds,
      delta: { dx: 0, dy: 0 },
    };
  }

  updateDragPreview(delta: { dx: number; dy: number }) {
    if (!this.dragPreview.active) return;
    this.dragPreview.delta = delta;
    this.markDragDirty(); // 脏矩形（后面解释）
  }

  endDragPreview() {
    this.dragPreview = { active: false, blockIds: [], delta: { dx: 0, dy: 0 } };
    this.markDragDirty();
  }
}
```

在绘制 block 时应用预览偏移：

```ts
// MainLayer.renderBlocks 内：
for (const block of scene.blocksSorted) {
  const dx = renderer.dragPreview.active && renderer.dragPreview.blockIds.includes(block.id)
    ? renderer.dragPreview.delta.dx
    : 0;
  const dy = renderer.dragPreview.active && renderer.dragPreview.blockIds.includes(block.id)
    ? renderer.dragPreview.delta.dy
    : 0;

  const worldPos = {
    x: block.x + dx,
    y: block.y + dy,
  };

  const screenPos = worldToScreen(worldPos, viewport, canvasSize);
  // 用 screenPos 渲染
}
```

##### 3. React：mousemove 中只更新预览，不碰 core

```tsx
const handleMouseMove = (evt: React.MouseEvent<HTMLCanvasElement>) => {
  if (!dragSession || !rendererRef.current) return;

  const renderer = rendererRef.current;
  const rect = overlayRef.current!.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;

  const worldNow = renderer.screenToWorld({ x, y });
  const dx = worldNow.x - dragSession.startWorld.x;
  const dy = worldNow.y - dragSession.startWorld.y;

  renderer.updateDragPreview({ dx, dy });
  renderer.render(); // 预览渲染（只动 Canvas，不动 core）
};
```

> 面试说法：  
> **“我们刻意把拖拽预览放在渲染引擎内部做 delta 偏移，不在每次 mousemove 时改 EditorState，从而避免产生大量 Transaction 和 React 重渲染。”**

---

#### 四、拖拽结束：一次性增量更新 layout（Step / Transaction / History）

`mouseup` 时，根据最终 `dx/dy` 计算每个 block 的新位置，调用 core 命令生成一个 Transaction。

##### 1. core 命令：支持多块移动

```ts
// core/commands/blockCommands.ts
export function moveBlocks(
  state: EditorState,
  patches: { blockId: BlockId; patch: Partial<BlockLayout> }[],
  label = 'move-blocks'
): EditorState {
  const steps: Step[] = patches.map(p =>
    createUpdateBlockLayoutStep(p.blockId, p.patch)
  );

  const tr: Transaction = {
    steps,
    meta: {
      addToHistory: true,
      source: 'local',
      label,
      timestamp: Date.now(),
      groupId: undefined, // 简化为一次移动不需要 groupId
    },
  };

  const res = applyTransaction(state, tr);
  if (res.failed) throw new Error(res.failed);
  return res.state;
}
```

##### 2. React：mouseup 中提交一次移动

```tsx
const handleMouseUp = (evt: React.MouseEvent<HTMLCanvasElement>) => {
  if (!dragSession || !rendererRef.current) return;

  const renderer = rendererRef.current;

  const rect = overlayRef.current!.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;

  const worldNow = renderer.screenToWorld({ x, y });
  const dx = worldNow.x - dragSession.startWorld.x;
  const dy = worldNow.y - dragSession.startWorld.y;

  // 结束预览
  renderer.endDragPreview();

  // 如果移动距离几乎为 0，就当点击，直接结束
  const epsilon = 1e-2;
  if (Math.abs(dx) < epsilon && Math.abs(dy) < epsilon) {
    setDragSession(null);
    return;
  }

  // 计算所有 block 的新 position patch
  const patches: { blockId: string; patch: Partial<BlockLayout> }[] = [];
  dragSession.blockIds.forEach(blockId => {
    const layout = dragSession.initialLayouts.get(blockId);
    if (!layout) return;
    patches.push({
      blockId,
      patch: {
        position: {
          x: layout.position.x + dx,
          y: layout.position.y + dy,
        },
      },
    });
  });

  onChangeState(prev => moveBlocks(prev, patches, 'drag-move-blocks'));
  setDragSession(null);
};
```

> 这样一次拖拽 = **一个 Transaction + 多个 Step + 一个 History entry**。Undo 时所有块一起回到起点。

---

#### 五、Step 合并策略（如果你想做“实时写 core”版本）

上面的设计是“只在 mouseup 提交一次 Transaction”，History 天然只有一个 entry，不用合并。

如果你未来想要“**拖拽中也实时写入 EditorState**”（例如联动其他依赖位置的 UI），可以：

1. 在 `moveBlocks` 的 meta 中加 `groupId: 'drag-<sessionId>'`；
2. 在 `History.pushToHistory` 时，检测栈顶 entry 是否同组：
   - 同 `groupId` 且时间间隔很短 → 把新 Transaction 合并到栈顶 entry；
3. 最终 History 里仍然是“一次拖拽 = 一个 undo”。

这部分你可以口头概述，无需马上实现，面试时讲思路即可。

---

#### 六、Canvas 脏矩形：拖拽时只重绘必要区域

我们给拖拽预览引入**脏矩形优化**：

- 每次拖拽更新时，只清除 & 重绘「旧位置区域 ∪ 新位置区域」，其它地方不动；
- 对白板有大量元素时关键。

##### 1. renderer 内部：记录 drag 的旧/新 bounds

```ts
// WhiteboardRenderer.ts 内部
private fullDirty = true;
private dirtyRects: Rect[] = [];

private markAllDirty() {
  this.fullDirty = true;
  this.dirtyRects = [];
}

private markDirtyRect(rect: Rect) {
  if (this.fullDirty) return;
  this.dirtyRects.push(rect);
}

// 保守做法：一次拖拽更新时，把所有拖拽块的旧/新 bounds 都标为 dirty
private markDragDirty() {
  if (!this.dragPreview.active) {
    // 结束拖拽时，整块 union 标记一下
    // 可以简单 markAllDirty 或重算 block bounds
    this.markAllDirty(); // MVP 先粗暴一点
    return;
  }

  const dx = this.dragPreview.delta.dx;
  const dy = this.dragPreview.delta.dy;

  for (const id of this.dragPreview.blockIds) {
    const block = this.scene.blockById.get(id);
    if (!block) continue;

    const oldBounds = getBlockBounds(block);               // 未偏移
    const newBounds = {
      x: oldBounds.x + dx,
      y: oldBounds.y + dy,
      width: oldBounds.width,
      height: oldBounds.height,
    };

    this.markDirtyRect(oldBounds);
    this.markDirtyRect(newBounds);
  }
}
```

##### 2. `render()` 中：按脏矩形局部重绘

MVP 可以先实现“脏矩形版本 1”：

```ts
render() {
  const ctx = this.mainCtx;
  const { width, height } = this.canvasSize;

  if (this.fullDirty) {
    ctx.clearRect(0, 0, width, height);
    // 全量重绘所有 connectors + blocks
    this.mainLayer.renderAll(ctx, this.scene, this.viewport, this.canvasSize);
  } else if (this.dirtyRects.length > 0) {
    // 合并 dirtyRects（简单取 bounding box union）
    const dirty = mergeRects(this.dirtyRects);
    // 清空 dirty 区域
    const dirtyScreenRect = worldRectToScreenRect(dirty, this.viewport, this.canvasSize);
    ctx.clearRect(
      dirtyScreenRect.x,
      dirtyScreenRect.y,
      dirtyScreenRect.width,
      dirtyScreenRect.height
    );
    // 只重绘与 dirty 区域相交的元素
    this.mainLayer.renderInRect(
      ctx,
      this.scene,
      this.viewport,
      this.canvasSize,
      dirty
    );
  }

  // overlay（选中框等）可以先全量重绘，开销不大
  this.overlayLayer.renderSelection(
    this.overlayCtx,
    this.scene,
    this.viewport,
    this.selection,
    this.canvasSize
  );

  this.fullDirty = false;
  this.dirtyRects = [];
}
```

`renderInRect` 内部用空间索引/包围盒判断哪些元素与 dirty rect 相交，再绘制。

> 面试说法：  
> **“拖拽时我们不会重绘整个画布，而是先计算被拖拽元素拖前拖后位置的 union 脏矩形，只清空和重绘这个区域，配合空间索引确定需要重绘的元素，拖 1000+ 节点时帧率提升明显。”**

---

#### 七、面试时如何一口气讲完这条链？

你可以非常结构化地说（真的会很加分）：

- **1）命中检测与拖拽初始化**

  > “`mousedown` 时先通过 Canvas 渲染引擎做 hitTest 找到顶层 TripBlock，同时更新 core 的 selection，并记录拖拽 session 的起点和初始布局，不直接改文档状态。”

- **2）拖拽预览与增量渲染**

  > “拖拽过程中我们没有在每个 mousemove 调 Step，而是把拖拽 delta 存在 renderer 的本地状态，通过在绘制 block 时叠加这个 delta 来做视觉预览，同时用脏矩形标记拖前拖后的区域，只重绘必要区域。”

- **3）拖拽结束时的状态提交 & 历史**

  > “`mouseup` 时根据最终 delta 为所有被拖拽的 block 生成 `UpdateBlockLayoutStep`，打包为一个 Transaction 调用 core 的 `moveBlocks` 命令，写入 History，这样一次拖拽对应一次 undo/redo 操作。”

- **4）扩展：Step 合并策略**

  > “如果未来希望拖拽过程中实时写入 EditorState，我们也预留了 Transaction `groupId` 字段，可以在 History 层把同一拖拽 session 内的多次 move Transaction 合并成一个 History entry。”

这条链把：**渲染引擎、交互、状态机、性能优化** 全部串起来了，已经是非常完整的“白板引擎经验素材”。

---

如果你愿意，下一步我们可以补上：  
- “缩放/平移（pan/zoom）的交互链路”，或者  
- “多选框选 + 批量拖拽”的完整设计，  
让这个白板引擎在交互维度上再丰满一点。

# 第三步：性能实验室

### 是的，现在进入第三步：**性能实验室（Performance Lab）**

你现在已经有：

- **core**：稳定的文档模型 + Step/Transaction/History  
- **renderer-canvas**：结构清晰的渲染引擎 + 命中检测 + 拖拽交互框架  

第三步 **“性能实验室”** 的目标不是“随便看看流畅不流畅”，而是：

> **用一套可重复的实验场景 + 指标体系，定量对比不同渲染策略 / 不同渲染后端（Canvas vs WebGL）的表现，并形成可以给面试官讲的“实验报告”。**

下面我帮你设计一套可以直接落地的性能实验室方案，分三块：

- 性能实验室的整体形态（放在哪里 / 怎么用）
- 指标体系：Canvas 必须有的指标 + 为 WebGL 预留的指标
- 压测场景设计：怎么自动生成大量数据、自动执行交互脚本

---

## 一、性能实验室长什么样？

### 1. 工程结构：建议一个独立的“Lab 页面 / 模块”

你可以在 `packages/app` 里单独做一块：

- `pages/perf-lab.tsx` 或 `/lab/performance` 路由
- 或者在开发环境通过某个 toggle 打开“Performance Overlay + 控制面板”

**建议有一个专门的 PerfLab 组件**：

```txt
packages/app/
  src/
    pages/
      PerfLabPage.tsx       // 性能实验室入口页面
    perf/
      scenarios.ts          // 压测场景预置
      metrics.ts            // FPS/帧耗等采集逻辑
      PerfPanel.tsx         // 右侧控制面板 + 指标展示
```

场景界面结构可以是：

- 左侧：控制区
  - 场景选择（例如：1k/3k/5k block）
  - 操作脚本选择（自动 pan / zoom / drag）
  - 开始/停止按钮
- 中间：真实白板画布（用你的 `WhiteboardCanvasStack`）
- 右侧：指标面板（FPS、每帧耗时、当前渲染对象数量、渲染策略标记等）

> 面试时可以直接说：“我们在项目里做了一个 Perf Lab 页面，可以一键生成几千个节点、自动执行拖拽/缩放脚本，并实时看 FPS 和渲染开销，用来评估 Canvas 与 WebGL 渲染策略的差异。”

---

## 二、指标体系：要监控什么，怎样采集？

尽量让指标**既贴近 JD 又可实现**：

### 1. Canvas 阶段必须有的指标

- **FPS / 每帧耗时**
  - 采集方式：`requestAnimationFrame` + `performance.now()`，常规做法。
- **每帧渲染对象数量**
  - 当前视口内实际绘制的 `RenderBlock` / `RenderConnector` 数量。
- **重绘策略开销**
  - 是否启用视口剔除（culling）
  - 是否启用脏矩形
  - 每帧脏区域的面积占画布的百分比（粗略估计）
- **命中检测压力**
  - 每秒命中检测调用次数（在自动拖拽/框选时）

这类可以在你的 `WhiteboardRenderer` 里，用一个简单的 `StatsCollector` 记录：

```ts
// renderer-canvas/src/Stats.ts
export interface RenderStats {
  frameTimeMs: number;          // 本帧渲染耗时
  blocksRendered: number;       // 本帧绘制的 block 数
  connectorsRendered: number;   // 本帧绘制的 connector 数
  dirtyAreaRatio?: number;      // 脏矩形面积 / 总画布面积（可选）
}

export class StatsTracker {
  lastFrameTime: number = 0;
  fps: number = 0;

  updateFrameTime(dtMs: number) {
    this.lastFrameTime = dtMs;
    // 简化计算 FPS（可以做 EMA）
    this.fps = 1000 / dtMs;
  }
}
```

在 `WhiteboardRenderer.render()` 里：

- 渲染前后用 `performance.now()` 算 `dt`
- 调 `stats.updateFrameTime(dt)`
- 把 `blocksRendered`、`connectorsRendered` 计数挂上

### 2. 为 WebGL 预留的指标（先设计接口，后面实现）

JD 里写了：

> “对 WebGL 有深入了解，对于相关指标监控以及优化”

这里的“相关指标”，在白板场景下通常是：

- **Draw Calls 数量**
- **Vertices（顶点数）**
- **纹理切换次数 / 使用纹理数量**
- **渲染 Pass 数量（如果有多 pass）**

你可以现在就把这些字段**加进抽象层**，即使 Canvas 版先填 0：

```ts
// 一个抽象的渲染统计模型（Canvas/WebGL 通用）
export interface UnifiedRenderStats {
  frameTimeMs: number;
  fps: number;

  // 对象级
  blocksRendered: number;
  connectorsRendered: number;

  // Canvas 特有
  dirtyAreaRatio?: number;

  // WebGL 特有（Canvas 先填 0）
  drawCalls: number;
  vertices: number;
  texturesBound: number;
}
```

- Canvas 版：
  - `drawCalls = blocksRendered + connectorsRendered`（粗略）
  - `vertices = blocksRendered * 4 + connectorsRendered * ?`（或者简单 0）
- WebGL 版：
  - 真正记录 `gl.drawArrays` 调用次数和缓冲区大小

**这样在 Perf Lab 的 UI 里，不同渲染后端用同一套指标视图**，你就可以比较：

- 在 5000 个节点场景下：
  - Canvas：FPS ~ X、blocksRendered = 5000、drawCalls ~ 5000
  - WebGL：FPS ~ Y、blocksRendered = 5000、drawCalls ~ 10（批量渲染）

面试时你就能说：“我们通过 Perf Lab 验证，WebGL 下批处理将 Draw Call 从 N 降到 1x，在大规模节点场景下 FPS 有明显提升。”

---

## 三、性能实验场景：怎么“造压”，怎么自动跑

### 1. 实验维度：你要控制哪些变量？

建议控制 3 个维度：

- **数据规模**
  - Block 数量：100 / 500 / 1000 / 3000 / 5000
  - Connector 数量：按一定比例（如 2× Block）
- **交互模式**
  - 静态：只渲染，不操作（考察 pure render 开销）
  - 连续 pan（画布平移）
  - 连续 zoom（缩放）
  - 连续 drag（拖动大量元素）
- **渲染策略**
  - Canvas naive（不启用 culling / 脏矩形）
  - Canvas + culling
  - Canvas + culling + 脏矩形
  - WebGL naive
  - WebGL + batching

你可以在 Perf 面板里，让用户选择：

- `场景`：如 “1k Blocks 平移测试”、“5k Blocks 缩放测试”
- `渲染策略`：一个 dropdown（对于 Canvas 引擎，对应不同的 flag）

### 2. 数据生成器：自动生成大量白板元素

在 `core` 或 `app/perf` 中实现一个“数据注入脚本”，生成 `EditorState`：

```ts
// app/perf/scenarios.ts
interface ScenarioConfig {
  blocks: number;
  connectors: number;
  layout: 'grid' | 'random-clusters';
}

export function generateGridScenario(config: ScenarioConfig): EditorState {
  const state = createEmptyEditorState();
  const blocksPerRow = Math.ceil(Math.sqrt(config.blocks));
  const gap = 250;

  let current = state;

  for (let i = 0; i < config.blocks; i++) {
    const row = Math.floor(i / blocksPerRow);
    const col = i % blocksPerRow;
    const x = col * gap;
    const y = row * gap;

    const block = createNoteBlock({
      text: `Block ${i}`,
      position: { x, y },
    });

    current = addBlock(current, block); // 或者你在 core 里做一个批量 add 的命令
  }

  // 同理生成 connectors（比如串成一条 path）

  return current;
}
```

你可以准备几种场景：

- `grid-1k`: 1000 个节点，规则网格分布
- `clusters-3k`: 3000 个节点，集中在几个区域（更接近真实画布使用）
- `lines-2k`: 2000 个节点 + 密集连接线

### 3. 交互脚本：自动执行 pan/zoom/drag

你可以做一个简单的“脚本 runner”，每一帧执行某个动作：

```ts
// app/perf/scenarios.ts
type PerfAction = (ctx: {
  step: number;
  renderer: WhiteboardRenderer;
  setState: (updater: (prev: EditorState) => EditorState) => void;
}) => void;

export const panScenario: PerfAction = ({ step, renderer, setState }) => {
  // 让 viewport 在一个方向上缓慢移动
  const dx = Math.sin(step / 60) * 5; // 或固定值
  setState(prev => setViewport(prev, { center: { x: prev.viewport.center.x + dx, y: prev.viewport.center.y } }));
};

export const zoomScenario: PerfAction = ({ step, setState }) => {
  const zoom = 1 + 0.5 * Math.sin(step / 120);
  setState(prev => setViewport(prev, { zoom }));
};

// 拖拽 scenario 可以简单模拟：选中一个块，按固定 delta 移动，循环
```

Perf Lab 页面中：

- 有一个 `running` 状态；
- 每一帧（通过 `requestAnimationFrame`）：
  - 调当前 `PerfAction`；
  - 触发 core 更新 → renderer.updateState + render；
  - 采集统计数据 → 更新右侧指标面板。

---

## 四、Perf Panel：怎么展示结果才能“会说话”

右侧 PerfPanel 可以简单但有信息量：

- 实时显示：
  - FPS（当前值 + 滑动平均）
  - 本帧耗时（ms）
  - blocksRendered / connectorsRendered
  - dirtyAreaRatio
  - drawCalls / vertices（WebGL 时更有意义）

- 可视化：
  - 用简单的折线图展示最近 N 帧的 FPS / frameTime 变化（甚至用纯 div + canvas 画都行）
  - 显示当前渲染策略 & 场景配置（方便截图写入文档）

- 加一个「导出当前结果为 JSON」按钮：
  - 方便你后面写 README / 文档时直接附数据。

**文档里可以有一节：**

> “Canvas vs WebGL 渲染性能对比（Perf Lab 实验数据）”  
>  - 场景：grid-3000，自动水平平移 10 秒  
>  - Canvas naive：FPS ~ 25，平均 frameTime ~ 40ms，blocksRendered = 3000  
>  - Canvas + culling + 脏矩形：FPS ~ 45，frameTime ~ 22ms，dirtyAreaRatio ~ 0.3  
>  - WebGL + batching：FPS ~ 58，frameTime ~ 17ms，drawCalls ~ 8，vertices ~ 12k  

这就是非常有说服力的“我不是只会写业务，而是做过系统性性能实验”的证据。

---

## 五、面试叙事：把 Perf Lab 讲成“实验文化”

你可以用这样一段话收束：

> “在这个白板项目里，我不满足于‘看起来还行’的性能，而是做了一个 Perf Lab 模块，专门用来构造高压场景和自动交互脚本，配合统一的 Canvas/WebGL 渲染统计接口（FPS、渲染对象数、Draw Call、脏区域比例等）做对比实验。  
>  这让我在 Canvas 阶段就能有针对性地引入视口剔除、脏矩形和空间索引，也为后续迁移到 WebGL 提供了客观的基线数据，而不是凭感觉觉得“WebGL 一定快”。”

---

如果你愿意，下一步我们可以做两件事中的一件：

- 帮你**具体写一版 PerfLabPage 的骨架代码**（包括控制面板 / rAF 循环 / metrics 连接），你可以直接照着实现；  
- 或者开始设计 **WebGL 渲染器的抽象接口**，让 Canvas/WebGL 共享一套 `RenderScene + UnifiedRenderStats`，为后续阶段铺路。

# 接下来做什么？
### 先回答你问的核心：三步设计完，还不够构成“可用 MVP”

- **core**：只是“脑子”（文档模型 + 操作系统）  
- **renderer-canvas**：只是“眼睛和手”（画画 + 命中检测）  
- **perf-lab**：只是“体检室”（验证体能的地方）  

这三块目前还是**“引擎 + 实验环境”**，还没有真正的**“产品层”**——也就是一个真实用户能打开、理解、完成一次 Trip 行程规划协同的完整流程。

你现在已经把“底座”想得很清楚了，**下一步要做的是把底座包装成一个完整的、可演示的产品 MVP**，从候选人角度，它至少要满足：

> 一个朋友/面试官打开页面，  
> 能看懂这是“Trip 行程协同白板”，  
> 能自己完成一次 **搜索机酒 → 拖到白板 → 调整布局 → 看时间轴 → 和另一个人一起改** 的体验。

所以，接下来可以按“第四步、第五步、甚至第六步”来推进。

---

## 第四步：`packages/app` 产品层 MVP（把引擎“长成一个应用”）

**目标：**  
在不引入协同的前提下，做一个**单人版 Triplanner**，功能闭环完整，可演示。

### 4.1 页面和布局搭好：把骨架立起来

- 用 Next.js 或 CRA 建一个页面，比如 `/triplanner`：
  - **左侧**：`Trip.com 功能区`（先只做假数据/本地搜索）
  - **中间**：`WhiteboardCanvasStack`（你已有的三层 canvas）
  - **右侧（或底部）**：`Timeline 面板`
  - **顶部**：简单工具条（Undo/Redo、Zoom in/out、重置视图）

技术上要做的：

- 选一个全局 state 管理方案（简单用 React `useState`/`useReducer` 即可，或 Zustand）：
  - 存 `EditorState`
  - 提供 `dispatchCommand(fn: (state) => state)` 把 core 命令串起来
- 把 `WhiteboardRenderer` 装进 React 组件（你前面已经有雏形）。

### 4.2 左侧 Trip.com 区域：先用 mock 数据假装搜索

MVP 不必连真实 Trip.com 接口：

- 固定几组航班/酒店/景点 JSON 数据
- 设计一个类似 Trip 卡片的组件：
  - 航班：起降机场、时间段、价格
  - 酒店：名称、地址、评分
- 点击卡片时：
  - 调用 core 的 `addFlightWithTimeline` / `addHotelWithTimeline` 命令
  - 把 block 放到白板中间、映射到 Timeline

这一步很重要，因为它让项目**从“抽象白板”变成“明确是 Trip 行程工具”**，极大增强可信度和记忆点。

### 4.3 白板交互：把核心交互真正跑起来

你前面已经设计了很多链路，现在要**真的在 app 层接起来**：

- 单选 / 清空选中（点击元素 / 点击空白）
- 拖拽移动 block（用你刚才那套预览 + mouseup 提交）
- 删除 block（工具条上的删除按钮 → `removeBlock` + 删除关联 connector/timeline）
- 连接器：
  - 点击第一个 block → 切换到“连线工具”状态 → 点击第二个 block → 创建 `Connector`
- 画布平移 / 缩放：
  - 鼠标滚轮缩放 → core `setViewport({ zoom })`
  - 右键拖拽平移 → core `setViewport({ center })`
- 撤销 / 重做:
  - 顶部按钮或快捷键（Ctrl+Z / Ctrl+Shift+Z） → core `undo/redo`

做到这一步，你就已经有一个**真实可玩的行程白板**，即使只有一个人使用，也足以在面试时开屏 demo。

### 4.4 Timeline 面板：把“探索 → 结构化”这条价值展示出来

MVP 的 Timeline 不需要太复杂，但要能体现“行程结构化”的价值：

- 展示形式：
  - 以“日期”为分组（Day 1 / Day 2...）
  - 每天下面列出该天的 `TimelineItem`，显示关联 block 的标题和时间段
- 功能：
  - 点击 TimelineItem → 同步白板选中对应 block，并居中视图
  - 拖动 TimelineItem 调整顺序（order） → core `updateTimelineItem order`
  - （可选）拖动到另一天 → 修改 day 字段

这块在面试里可以说成：

> “我们希望白板上的脑暴结果能逐步结构化成清晰的行程，所以设计了 Timeline 作为对文档模型的另一种投影。它和白板共用同一份 TripDocument，通过 blockId/TimelineItem 建立关联。”

---

## 第五步：协同能力（Yjs 集成 + Presence）

当单机版 MVP 可用之后，下一步才是 **“多人在线白板”** 核心卖点：协作。

### 5.1 文档同步：用 Yjs 管理 TripDocument 的共享副本

思路：

- 在 `packages/core/collab` 里做一个适配层：
  - `TripDocument` ↔ `Y.Doc`（Y.Map/Y.Array）的映射
  - `Transaction` ↔ Yjs 更新的打包/解包
- 在 app 层：
  - 每个房间有一个 `roomId`（从 URL 获取：`/triplanner/room/[id]`）
  - 每个客户端连到同一个 Yjs provider（例如 y-websocket 本地起服务）
  - 本地 core 的 Doc 状态由 Yjs 驱动：
    - 本地命令 → 生成 Transaction → 同步到 Yjs
    - 远端更新 → Yjs 事件 → 同步为本地 Transaction → apply 到 EditorState

初期可以 **不做复杂冲突 UI**，只保证：

- 多人操作同一个文档时，节点不会丢；
- 体验上看起来“大家都在同一个白板上拖卡片”。

### 5.2 Presence：光标 / 选中状态 / 用户标识

为了更像真实白板：

- 为每个协同用户分配一个颜色 + 名称（假数据即可）
- 显示：
  - 每个远端用户当前视口中心（可以画一个小头像在边缘）
  - 远端用户当前选中的 block outline（用对应颜色虚线框）
- 技术上：
  - presence 通常单独一个 Y.Map（或者 ephemeral channel），不必写入 TripDocument

这块在面试里可以说你：

> “区分了持久文档数据和短暂存在的 presence 数据，避免把 transient 状态写死在 schema 里。”

---

## 第六步：收尾 & 打磨：监控、WebGL、文档与叙事

当 **core + renderer-canvas + perf-lab + app + collab** 都有了，  
你就具备了一个非常完整的“可 demo、可讲故事、可被追问”的项目。

最后的增值项可以分优先级：

### 6.1 必要收尾：监控 + 错误收集

- 在 app 层接一个简单的错误边界 + `window.onerror` 上报（即便只是 console/本地存储）
- 在 Perf Lab 的指标之上：
  - 增加一个简单“日志列表”，记录：
    - 场景变换
    - 渲染策略切换
    - FPS 明显跌落时的上下文

你可以说：“我们把 perf 工具也当成监控的一部分，而不是只在开发时随便开开。”

### 6.2 进阶加分：初版 WebGL 渲染器

在你有空时，可以开一个 `packages/renderer-webgl`：

- 共享 `RenderScene` 类型；
- 用 PixiJS/regl 实现一个简单版：
  - 先只渲染矩形节点，忽略复杂箭头
  - 做一个 `RenderBackend` 抽象：
    - Canvas 和 WebGL 共享同一接口：
      - `beginFrame` / `drawBlock` / `drawConnector` / `endFrame`
- 在 Perf Lab 中加一个 toggle：Canvas vs WebGL，对比指标

这就是你 JD 中“渲染引擎 + WebGL + 性能监控”的硬核体现。

### 6.3 文档与“讲稿”：给自己准备面试素材

最后非常关键的一步（很多工程师会忽略）：

- 写一份项目的 `ARCHITECTURE.md` 或中文长文，主要讲：
  - 为什么要把 core / renderer / app 拆成三层？
  - core 中 Step/Transaction/History 的设计思路（引用 MH/ProseMirror）
  - 渲染引擎从 naive Canvas → culling → 脏矩形 → WebGL 的演进过程（配图 + 性能数据）
  - 协同集成中遇到的问题和你的取舍（例如撤销策略、presence 设计）
- 根据这份文档，整理一个 **5~10 分钟结构化叙事**（我们之前的那些链路就可以直接用）。

---

## 总结一下接下来的优先顺序

在你当前的进度基础上，我会建议这个顺序：

1. **第四步**：先做 `packages/app` 的单机 MVP（左侧 Trip 区 + 白板 + Timeline + 基本交互 & Undo/Redo）  
2. **第五步**：再加协同（Yjs 文档同步 + presence），让它真的成为“多人行程白板”  
3. **第六步（可并行）**：
   - 一边完善 Perf Lab（用于 Canvas 策略对比）
   - 一边在空档尝试 WebGL 渲染器初版
   - 最后写好架构/实验文档，整理你的讲述脚本

如果你愿意，下一步我们可以先聚焦到 **“第四步：app 层单机 MVP 的页面 & 状态流设计”**，我帮你把 `TripPlannerPage` 的状态结构、组件划分和和 core/renderer 的粘合方式画清楚，这会是你实际 coding 的直接蓝图。

# 第四步：APP 层单机 MVP 的页面 & 状态流设计

### 整体目标：把“引擎”长成一个可玩的单机版 Triplanner

这一阶段的目标：在 `packages/app` 里搭出一个**单人可用的行程白板 MVP**：

- 有 Trip.com 风格的左侧“机酒景点”区
- 中间是可拖拽的白板（你已经有的 Canvas 引擎）
- 右侧（或底部）是行程 Timeline
- 顶部有 Undo/Redo、Zoom 等基础操作

同时，**状态流要干净**：所有状态变化都走 core 的命令，renderer 只负责画。

下面我按三个层次设计：

- 页面与组件结构
- 状态与命令流转（App 层如何粘合 core + renderer）
- 关键组件的骨架代码（你可以直接落地）

---

## 一、页面与组件结构设计

### 1. 路由与页面入口

假设你用 Next.js，页面可以是：

- 路由：`/triplanner`（单人版）
- 入口组件：`TripPlannerPage`

```txt
packages/app/
  src/
    pages/
      triplanner.tsx          // 单机 MVP 页面
    components/
      layout/
        AppShell.tsx
      triplanner/
        TripPlannerPage.tsx
        TripSidebar.tsx
        WhiteboardCanvasStack.tsx
        TimelinePanel.tsx
        TopToolbar.tsx
    state/
      useEditorState.ts       // 封装 core EditorState 的 hook
```

### 2. 页面布局（UX）

`TripPlannerPage` 的布局大致：

- **顶部**：`TopToolbar`
  - 按钮：Undo / Redo / Zoom In / Zoom Out / Reset View
- **中间三栏布局**：
  - 左：`TripSidebar`（模拟 Trip.com 搜索结果）
  - 中：`WhiteboardCanvasStack`（白板画布）
  - 右/底：`TimelinePanel`（行程列表）

你可以用 CSS grid 简单实现三栏布局即可。

---

## 二、状态与命令流：App 如何粘合 core + renderer

### 1. App 层状态：只保存 core 的 `EditorState` + 少量 UI 状态

**核心原则**：  
- 所有“业务 & 文档状态”都放在 core 的 `EditorState` 里  
- App 层自己只维护少量**纯 UI 状态**：比如当前工具模式（选择 / 连线）、拖拽 session

#### 1）`EditorState` 管理：`useEditorState` hook

```ts
// app/state/useEditorState.ts
import { useCallback, useRef, useState, useEffect } from 'react';
import { EditorState, createEmptyEditorState } from '@triplanner/core';

export type EditorCommand = (state: EditorState) => EditorState;

export function useEditorState() {
  const [editorState, setEditorState] = useState<EditorState>(() =>
    createEmptyEditorState()
  );

  // 方便在事件回调中拿到最新 state（尤其是 canvas 事件）
  const stateRef = useRef<EditorState>(editorState);
  useEffect(() => {
    stateRef.current = editorState;
  }, [editorState]);

  const runCommand = useCallback((command: EditorCommand) => {
    setEditorState(prev => command(prev));
  }, []);

  return { editorState, runCommand, stateRef };
}
```

#### 2）工具模式 / 本地 UI 状态（可选）

比如：

```ts
export type ToolMode = 'select' | 'connect' | 'pan';

const [toolMode, setToolMode] = useState<ToolMode>('select');
// 复杂一点的拖拽信息我们放在 WhiteboardCanvasStack 内部管理
```

### 2. 统一命令调用：所有状态变化走 core.commands

我们前面已经有 core 的命令：

- `addFlightWithTimeline`
- `moveBlocks`
- `setSelection`
- `setViewport`
- `undo` / `redo`
- 等等…

App 层只做包一下：

```ts
// app/TripPlannerPage.tsx 中的用法
runCommand(prev =>
  addFlightWithTimeline(prev, {
    title: result.title,
    fromAirport: result.from,
    toAirport: result.to,
    time: { start: result.departureTime, end: result.arrivalTime },
    sourceExternalId: result.id,
    position: { x: 0, y: 0 },
  })
);
```

**统一规则：**

- 不直接 `setEditorState({...})`，一律 `runCommand(prev => command(prev, ...))`
- 所有命令都在 core，App 不直接改内部字段（blocks/timeline…）

### 3. Renderer 的使用模式：单向依赖 `EditorState`

`WhiteboardCanvasStack` 接口设计（App → Renderer）：

```ts
interface WhiteboardCanvasStackProps {
  editorState: EditorState;
  runCommand: (command: EditorCommand) => void;
}
```

内部做三件事：

1. 初始化 `WhiteboardRenderer`（canvas 引擎）
2. 在 `editorState` 变化时调用：
   - `renderer.updateState(editorState)`
   - `renderer.render()`
3. 处理画布事件：
   - `mousedown` / `mousemove` / `mouseup`
   - `wheel`（缩放）
   - 命中检测 → 调 `runCommand(setSelection)` / `runCommand(moveBlocks)` / `runCommand(setViewport)`

---

## 三、关键组件骨架（你可以直接落地）

### 1. `TripPlannerPage`：总装配

```tsx
// app/components/triplanner/TripPlannerPage.tsx
import React from 'react';
import { useEditorState } from '../../state/useEditorState';
import { TopToolbar } from './TopToolbar';
import { TripSidebar } from './TripSidebar';
import { WhiteboardCanvasStack } from './WhiteboardCanvasStack';
import { TimelinePanel } from './TimelinePanel';

export const TripPlannerPage: React.FC = () => {
  const { editorState, runCommand, stateRef } = useEditorState();

  return (
    <div className="triplanner-page flex flex-col h-screen">
      <TopToolbar editorState={editorState} runCommand={runCommand} />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r border-gray-200">
          <TripSidebar runCommand={runCommand} />
        </div>

        <div className="flex-1 relative bg-slate-50">
          <WhiteboardCanvasStack
            editorState={editorState}
            editorStateRef={stateRef}
            runCommand={runCommand}
          />
        </div>

        <div className="w-80 border-l border-gray-200">
          <TimelinePanel editorState={editorState} runCommand={runCommand} />
        </div>
      </div>
    </div>
  );
};
```

> 这里 `TripSidebar` 不需要 `editorState`，只要能发命令；`TimelinePanel` 需要读 `editorState`；Canvas 既要读 state，又要能发命令。

---

### 2. `TripSidebar`：模拟 Trip.com 搜索结果 → 添加 Block + Timeline

```tsx
// app/components/triplanner/TripSidebar.tsx
import React from 'react';
import { EditorCommand } from '../../state/useEditorState';
import { addFlightWithTimeline } from '@triplanner/core/commands';
import { TimeRange } from '@triplanner/core/schema/types';

interface TripSidebarProps {
  runCommand: (cmd: EditorCommand) => void;
}

// 简化的搜索结果类型
interface FlightSearchResult {
  id: string;
  title: string;
  from: string;
  to: string;
  departureTime: string; // ISO
  arrivalTime: string;   // ISO
}

const mockFlights: FlightSearchResult[] = [
  {
    id: 'FL001',
    title: '上海 → 东京',
    from: 'PVG',
    to: 'NRT',
    departureTime: '2025-11-17T09:00:00+08:00',
    arrivalTime: '2025-11-17T12:30:00+09:00',
  },
  // ...更多
];

export const TripSidebar: React.FC<TripSidebarProps> = ({ runCommand }) => {
  const handleFlightClick = (flight: FlightSearchResult) => {
    const time: TimeRange = {
      start: flight.departureTime,
      end: flight.arrivalTime,
    };
    runCommand(prev =>
      addFlightWithTimeline(prev, {
        title: flight.title,
        fromAirport: flight.from,
        toAirport: flight.to,
        time,
        sourceExternalId: flight.id,
        position: { x: 0, y: 0 }, // 初始放在画布中心附近，后续可根据 viewport 计算
      })
    );
  };

  return (
    <div className="trip-sidebar h-full flex flex-col">
      <div className="p-3 border-b font-semibold">Trip.com 功能区</div>
      <div className="p-3 text-xs text-gray-500">
        这里用 mock 数据模拟航班/酒店/景点搜索结果
      </div>
      <div className="flex-1 overflow-auto">
        <div className="px-3 py-2 text-sm font-medium text-gray-700">航班推荐</div>
        {mockFlights.map(f => (
          <button
            key={f.id}
            onClick={() => handleFlightClick(f)}
            className="w-full text-left px-3 py-2 mb-1 rounded hover:bg-blue-50 border border-transparent hover:border-blue-200"
          >
            <div className="text-sm font-semibold">{f.title}</div>
            <div className="text-xs text-gray-500">
              {f.from} → {f.to}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
```

---

### 3. `TopToolbar`：Undo/Redo + Zoom

```tsx
// app/components/triplanner/TopToolbar.tsx
import React from 'react';
import { EditorState } from '@triplanner/core';
import { EditorCommand } from '../../state/useEditorState';
import { undo, redo } from '@triplanner/core/commands/historyCommands';
import { setViewport } from '@triplanner/core/commands/viewCommands';

interface TopToolbarProps {
  editorState: EditorState;
  runCommand: (cmd: EditorCommand) => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  editorState,
  runCommand,
}) => {
  const handleUndo = () => runCommand(prev => undo(prev));
  const handleRedo = () => runCommand(prev => redo(prev));

  const handleZoomIn = () =>
    runCommand(prev =>
      setViewport(prev, { zoom: prev.viewport.zoom * 1.1 })
    );

  const handleZoomOut = () =>
    runCommand(prev =>
      setViewport(prev, { zoom: prev.viewport.zoom / 1.1 })
    );

  const handleResetView = () =>
    runCommand(prev =>
      setViewport(prev, { center: { x: 0, y: 0 }, zoom: 1 })
    );

  return (
    <div className="top-toolbar flex items-center justify-between px-4 py-2 border-b bg-white">
      <div className="font-semibold">Triplanner · 行程协同白板（单人版）</div>
      <div className="flex items-center gap-2 text-sm">
        <button onClick={handleUndo} className="px-2 py-1 border rounded">
          撤销
        </button>
        <button onClick={handleRedo} className="px-2 py-1 border rounded">
          重做
        </button>
        <div className="w-px h-5 bg-gray-200 mx-2" />
        <button onClick={handleZoomOut} className="px-2 py-1 border rounded">
          -
        </button>
        <span className="w-12 text-center">
          {Math.round(editorState.viewport.zoom * 100)}%
        </span>
        <button onClick={handleZoomIn} className="px-2 py-1 border rounded">
          +
        </button>
        <button onClick={handleResetView} className="px-2 py-1 border rounded">
          视图重置
        </button>
      </div>
    </div>
  );
};
```

---

### 4. `TimelinePanel`：从 `EditorState` 投影结构化行程

```tsx
// app/components/triplanner/TimelinePanel.tsx
import React, { useMemo } from 'react';
import { EditorState } from '@triplanner/core';
import { EditorCommand } from '../../state/useEditorState';
import { setSelection } from '@triplanner/core/commands/viewCommands';
import { centerViewportOnBlock } from '@triplanner/core/commands/viewCommandsPlus'; 
// 假设你有一个根据 block 居中视图的命令

interface TimelinePanelProps {
  editorState: EditorState;
  runCommand: (cmd: EditorCommand) => void;
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  editorState,
  runCommand,
}) => {
  const groupedByDay = useMemo(() => {
    const map = new Map<string, string[]>(); // day -> TimelineId[]
    for (const [id, item] of editorState.doc.timeline.entries()) {
      const day = item.day;
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(id);
    }
    // 按日期排序
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1));
  }, [editorState.doc.timeline]);

  const handleItemClick = (timelineId: string) => {
    const item = editorState.doc.timeline.get(timelineId);
    if (!item) return;
    const blockId = item.blockId;
    runCommand(prev => {
      let next = setSelection(prev, [blockId]);
      next = centerViewportOnBlock(next, blockId);
      return next;
    });
  };

  return (
    <div className="timeline-panel h-full flex flex-col">
      <div className="p-3 border-b font-semibold">行程时间轴</div>
      <div className="flex-1 overflow-auto text-sm">
        {groupedByDay.length === 0 && (
          <div className="p-3 text-xs text-gray-400">
            从左侧添加航班/酒店/景点，将自动映射到时间轴
          </div>
        )}

        {groupedByDay.map(([day, ids]) => (
          <div key={day} className="px-3 py-2 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-500 mb-1">
              {day}
            </div>
            <div className="space-y-1">
              {ids.map(tid => {
                const item = editorState.doc.timeline.get(tid)!;
                const block = editorState.doc.blocks.get(item.blockId);
                if (!block) return null;
                return (
                  <button
                    key={tid}
                    onClick={() => handleItemClick(tid)}
                    className="w-full text-left px-2 py-1 rounded hover:bg-blue-50"
                  >
                    <div className="text-xs font-medium">
                      {block.kind.toUpperCase()} ·{' '}
                      {'title' in block ? block.title : block.id}
                    </div>
                    {item.timeRange && (
                      <div className="text-[11px] text-gray-500">
                        {item.timeRange.start.slice(11, 16)} -{' '}
                        {item.timeRange.end.slice(11, 16)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

### 5. `WhiteboardCanvasStack`：App 与 Renderer 的桥梁

这里只给简化骨架，核心点是：  
- 初始化 renderer  
- 监听 `editorState` 更新 renderer  
- 处理鼠标事件 → 调 core 命令（我们前面已经详细拆过）

```tsx
// app/components/triplanner/WhiteboardCanvasStack.tsx
import React, { useEffect, useRef, useState } from 'react';
import { EditorState } from '@triplanner/core';
import { EditorCommand } from '../../state/useEditorState';
import { WhiteboardRenderer } from '@triplanner/renderer-canvas';
import { setSelection } from '@triplanner/core/commands/viewCommands';
import { moveBlocks } from '@triplanner/core/commands/blockCommands';

interface Props {
  editorState: EditorState;
  editorStateRef: React.MutableRefObject<EditorState>;
  runCommand: (cmd: EditorCommand) => void;
}

export const WhiteboardCanvasStack: React.FC<Props> = ({
  editorState,
  editorStateRef,
  runCommand,
}) => {
  const bgRef = useRef<HTMLCanvasElement>(null);
  const mainRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WhiteboardRenderer | null>(null);

  // 拖拽 session 等 UI 状态可以放这里（略）

  // 初始化 renderer
  useEffect(() => {
    if (!bgRef.current || !mainRef.current || !overlayRef.current) return;
    const renderer = new WhiteboardRenderer({
      backgroundCanvas: bgRef.current,
      mainCanvas: mainRef.current,
      overlayCanvas: overlayRef.current,
    });
    rendererRef.current = renderer;

    renderer.updateState(editorState);
    renderer.render();

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  // editorState 变化时，更新 renderer
  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.updateState(editorState);
    rendererRef.current.render();
  }, [editorState]);

  // 事件处理（命中检测/拖拽逻辑略，之前我们已经详细设计）
  const handleMouseDown = (evt: React.MouseEvent<HTMLCanvasElement>) => {
    // 1. hitTest
    // 2. setSelection / 开始 dragSession
  };

  const handleMouseMove = (evt: React.MouseEvent<HTMLCanvasElement>) => {
    // 1. 更新 dragPreview
  };

  const handleMouseUp = (evt: React.MouseEvent<HTMLCanvasElement>) => {
    // 1. 结束预览
    // 2. runCommand(prev => moveBlocks(...))
  };

  return (
    <div className="whiteboard-stack w-full h-full relative">
      <canvas
        ref={bgRef}
        className="absolute inset-0 pointer-events-none"
      />
      <canvas
        ref={mainRef}
        className="absolute inset-0 pointer-events-none"
      />
      <canvas
        ref={overlayRef}
        className="absolute inset-0"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </div>
  );
};
```

> 真正拖拽/命中逻辑你已经有了设计，这里重点是**把 renderer 嵌入 React 生命周期里**。

---

## 总结：这一步完成后你会拥有的东西

当你按这套设计把 `TripPlannerPage` 和几个组件拼起来，你就有了：

- 一个 **真实可玩的单机 Triplanner**：能从“Trip 区”拉航班卡片 → 白板 → Timeline
- 清晰的 **状态流**：所有业务动作走 core 命令，renderer 单向读 EditorState
- 一个适合在面试中现场打开、边演示边讲架构的 MVP

下一步，在这个基础上你就可以：

- 接上 Perf Lab（同一套渲染引擎，用 Lab 页面压测）
- 接上 Yjs 做协同（在 App 层替换 `useEditorState` 的实现，将本地 state 与 Yjs 同步）

如果你想继续细化，我们可以下一步专门把 **“工具模式 + 连线工具 + 框选多选”** 的 UI/状态流设计出来，让这个 MVP 在交互层面更接近真实白板产品。
---
### 整体目标：把“工具模式”这层 UI 状态和 core / renderer 串起来

我们要设计三块东西：

- **工具模式（ToolMode）**：决定“当前鼠标在白板上的语义”；
- **连线工具（Connect Tool）**：从一个 TripBlock 连到另一个 TripBlock，创建 `Connector`；
- **框选多选（Marquee Selection）**：拉一个矩形框，选中其中多个 TripBlock。

设计要求：

- 不破坏你现在的分层：**core 只管文档，renderer 只管画，工具逻辑在 app 层**。
- 所有对文档的修改仍然走 core 的命令（`setSelection` / `addConnector` 等）。
- overlay 绘制（连线预览/框选矩形）由 `renderer-canvas` 负责，但状态由 app 层驱动。

---

## 一、工具模式（ToolMode）设计

### 1. ToolMode 枚举与状态

先定义一个简单但可扩展的工具模式：

```ts
export type ToolMode = 'select' | 'connect' | 'pan';
```

- **`select`**：默认模式
  - 点击：命中 block 则选中，命中空白则清空选中
  - 拖拽 block：移动元素（我们之前已设计）
  - 从空白拖拽：开启“框选”模式，选中矩形内元素
- **`connect`**：连线模式
  - 点击第一个 block：作为起点
  - 移动鼠标：显示从起点到鼠标位置的预览线
  - 点击第二个 block：创建 `Connector`
  - 点击空白 / ESC：取消当前连线
- **`pan`**：平移模式
  - 鼠标左键拖动：改变 viewport.center，白板整体移动

在 `TripPlannerPage` 中维护这个状态：

```ts
const [toolMode, setToolMode] = useState<ToolMode>('select');
```

传给 `TopToolbar`（用于切换）、`WhiteboardCanvasStack`（用于决定事件行为）。

### 2. Toolbar 上的工具按钮

`TopToolbar` 增加一个“工具组”：

- **选择工具**：光标图标
- **连线工具**：箭头/连线图标
- **平移工具**：小手图标（或用 space 暂时切换）

示意：

```tsx
interface TopToolbarProps {
  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;
  // ... editorState / runCommand 省略
}

// Toolbar 中：
<button
  className={toolMode === 'select' ? 'btn-active' : 'btn'}
  onClick={() => setToolMode('select')}
>
  选择
</button>
<button
  className={toolMode === 'connect' ? 'btn-active' : 'btn'}
  onClick={() => setToolMode('connect')}
>
  连线
</button>
<button
  className={toolMode === 'pan' ? 'btn-active' : 'btn'}
  onClick={() => setToolMode('pan')}
>
  平移
</button>
```

这样工具模式是单一的“高层 UI 状态”，在 canvas 事件里根据 `toolMode` 决定逻辑。

---

## 二、连线工具（Connect Tool）设计

### 1. 额外 UI 状态：ConnectSession

在 `WhiteboardCanvasStack` 中维护一次连线操作的会话状态：

```ts
interface ConnectSession {
  fromBlockId: string;              // 起点 block
  fromWorldPos: { x: number; y: number }; // 起点中心/锚点（世界坐标）
  currentWorldPos: { x: number; y: number }; // 鼠标当前位置（世界坐标）
}
```

组件中：

```ts
const [connectSession, setConnectSession] = useState<ConnectSession | null>(null);
```

### 2. 交互流程（时序）

**前置条件**：当前 `toolMode === 'connect'`。

1. **mousedown / click**（这里用 `onMouseDown` 即可）：
   - 用 `renderer.hitTestBlockAt(screenX, screenY)` 判断是否点中了某个 block
   - 如果命中：
     - 若 `connectSession == null`：
       - 进入“选择起点”阶段 → 创建 `ConnectSession`
     - 若已有 `connectSession`：
       - 当前 block 作为终点 → 创建 `Connector` → 结束 session
   - 如果没命中任何 block：
     - 取消现有 `ConnectSession`（点击空白取消）

2. **mousemove**：
   - 若存在 `connectSession`：
     - 更新 `currentWorldPos`（用 `screenToWorld`）
     - 通知 renderer 更新“连线预览”的终点

3. **mouseup / second click on block**：
   - 见第一步“已有 session 时命中 block 的分支”。

4. **键盘 ESC**（可选）：
   - 取消 `connectSession`

### 3. 与 core 的对接：addConnector 命令

core 层定义一个命令（你可以在 `commands/connectorCommands.ts` 中）：

```ts
// core/commands/connectorCommands.ts
export function addConnector(
  state: EditorState,
  from: BlockId,
  to: BlockId,
  label?: string
): EditorState {
  const connector: Connector = {
    id: generateId('connector'),
    from,
    to,
    label,
    style: {
      color: '#333',
      width: 2,
      dashed: false,
      arrowHead: 'end',
    },
  };

  const err = validateConnector(connector, state.doc);
  if (err) throw new Error(err);

  const step = createAddConnectorStep(connector);
  const tr: Transaction = {
    steps: [step],
    meta: {
      addToHistory: true,
      source: 'local',
      label: 'add-connector',
      timestamp: Date.now(),
    },
  };
  return applyTransaction(state, tr).state;
}
```

面试时可以说：**连线本质是文档层两个 Block 之间的关系，由 core 的 Connector 模型管理，不依赖画布。**

### 4. renderer：连线预览绘制

`WhiteboardRenderer` 内部增加一个预览状态（类似拖拽预览）：

```ts
class WhiteboardRenderer {
  private connectPreview: {
    active: boolean;
    fromWorld: { x: number; y: number } | null;
    toWorld: { x: number; y: number } | null;
  } = { active: false, fromWorld: null, toWorld: null };

  setConnectPreview(
    fromWorld: { x: number; y: number } | null,
    toWorld: { x: number; y: number } | null
  ) {
    if (!fromWorld || !toWorld) {
      this.connectPreview = { active: false, fromWorld: null, toWorld: null };
    } else {
      this.connectPreview = { active: true, fromWorld, toWorld };
    }
    this.markOverlayDirty(); // 只重绘 overlay 层
  }
}
```

在 `OverlayLayer.render` 中：

```ts
renderConnectPreview(ctx, viewport, canvasSize, preview) {
  if (!preview.active || !preview.fromWorld || !preview.toWorld) return;
  const from = worldToScreen(preview.fromWorld, viewport, canvasSize);
  const to = worldToScreen(preview.toWorld, viewport, canvasSize);

  ctx.save();
  ctx.strokeStyle = '#0071ff';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}
```

> 这样预览线完全在 renderer 内部画，app 层只要更新 world 坐标即可。

### 5. WhiteboardCanvasStack 中的事件逻辑（简化版）

只看 connect 模式相关片段：

```tsx
const handleMouseDown = (evt: React.MouseEvent<HTMLCanvasElement>) => {
  const renderer = rendererRef.current;
  if (!renderer) return;
  const rect = overlayRef.current!.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;

  if (toolMode === 'connect') {
    const blockId = renderer.hitTestBlockAt(x, y);
    const worldPos = renderer.screenToWorld({ x, y });

    if (!blockId) {
      // 点击空白：取消当前连线
      setConnectSession(null);
      renderer.setConnectPreview(null, null);
      return;
    }

    if (!connectSession) {
      // 选中起点
      setConnectSession({
        fromBlockId: blockId,
        fromWorldPos: worldPos,
        currentWorldPos: worldPos,
      });
      renderer.setConnectPreview(worldPos, worldPos);
    } else {
      // 已有起点，再次命中 block 作为终点
      const fromId = connectSession.fromBlockId;
      const toId = blockId;
      if (fromId !== toId) {
        runCommand(prev => addConnector(prev, fromId, toId));
      }
      setConnectSession(null);
      renderer.setConnectPreview(null, null);
    }
    return;
  }

  // 其他模式逻辑（select/drag/pan/框选）...
};
```

`mousemove` 中：

```tsx
const handleMouseMove = (evt: React.MouseEvent<HTMLCanvasElement>) => {
  const renderer = rendererRef.current;
  if (!renderer) return;
  if (toolMode === 'connect' && connectSession) {
    const rect = overlayRef.current!.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    const worldNow = renderer.screenToWorld({ x, y });

    setConnectSession(prev =>
      prev ? { ...prev, currentWorldPos: worldNow } : prev
    );
    renderer.setConnectPreview(connectSession.fromWorldPos, worldNow);
    renderer.render(); // 只影响 overlay（你可以内部按标记优化）
    return;
  }

  // 其他模式...
};
```

---

## 三、框选多选（Marquee Selection）设计

### 1. 额外 UI 状态：MarqueeSession

```ts
interface MarqueeSession {
  startScreen: { x: number; y: number };
  currentScreen: { x: number; y: number };
  startWorld: { x: number; y: number };
  currentWorld: { x: number; y: number };
}

const [marqueeSession, setMarqueeSession] = useState<MarqueeSession | null>(null);
```

**规则：**

- 仅在 **工具模式为 `select` 且 mousedown 命中空白区域** 时，进入框选模式；
- 按住鼠标左键拖动 → 更新 `currentScreen/world`；
- mouseup → 计算世界坐标下的选框矩形 → 用 `spatialIndex.queryRect(worldRect)` 得到候选 blockId → 设置 selection；
- selection 不进 History。

### 2. 判定：这是拖动 block 还是框选？

`select` 模式下 `mousedown` 时，用 hitTest 决定：

- 命中 block（且按在 block 上）：进入拖拽移动逻辑（之前已经设计）
- 没命中 block：
  - 左键：开始框选（Marquee）
  - 右键/中键：可选作为平移，视你设计（或者依赖 pan 工具）

伪代码：

```tsx
const handleMouseDown = (evt: React.MouseEvent<HTMLCanvasElement>) => {
  const renderer = rendererRef.current;
  if (!renderer) return;
  const rect = overlayRef.current!.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;
  const worldPoint = renderer.screenToWorld({ x, y });

  if (toolMode === 'select') {
    const blockId = renderer.hitTestBlockAt(x, y);
    if (blockId) {
      // 走拖拽逻辑（我们之前已经设计过 dragSession）
      beginDrag(blockId, { x, y }, worldPoint);
    } else {
      // 空白区域 → 开始框选
      setMarqueeSession({
        startScreen: { x, y },
        currentScreen: { x, y },
        startWorld: worldPoint,
        currentWorld: worldPoint,
      });
      renderer.setMarqueePreview(
        { x: worldPoint.x, y: worldPoint.y },
        { x: worldPoint.x, y: worldPoint.y }
      );
    }
    return;
  }

  // pan / connect 模式逻辑...
};
```

### 3. mousemove：更新选框预览

```tsx
const handleMouseMove = (evt: React.MouseEvent<HTMLCanvasElement>) => {
  const renderer = rendererRef.current;
  if (!renderer) return;

  const rect = overlayRef.current!.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;

  if (toolMode === 'select' && marqueeSession) {
    const worldNow = renderer.screenToWorld({ x, y });
    setMarqueeSession(prev =>
      prev
        ? {
            ...prev,
            currentScreen: { x, y },
            currentWorld: worldNow,
          }
        : prev
    );
    renderer.setMarqueePreview(marqueeSession.startWorld, worldNow);
    renderer.render();
    return;
  }

  // 其他逻辑（拖拽/连线/pan 预览）...
};
```

### 4. mouseup：计算选中集，调用 core.setSelection

`mouseup` 时：

```tsx
const handleMouseUp = (evt: React.MouseEvent<HTMLCanvasElement>) => {
  const renderer = rendererRef.current;
  if (!renderer) return;

  // 框选结束逻辑
  if (toolMode === 'select' && marqueeSession) {
    const { startWorld, currentWorld } = marqueeSession;

    const minX = Math.min(startWorld.x, currentWorld.x);
    const maxX = Math.max(startWorld.x, currentWorld.x);
    const minY = Math.min(startWorld.y, currentWorld.y);
    const maxY = Math.max(startWorld.y, currentWorld.y);

    const worldRect = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };

    // 用 renderer 内部的空间索引找所有在 worldRect 内的 blocks
    const blockIds = renderer.queryBlocksInWorldRect(worldRect);

    runCommand(prev => setSelection(prev, blockIds));

    setMarqueeSession(null);
    renderer.setMarqueePreview(null, null);
    renderer.render();
    return;
  }

  // 拖拽结束 / pan 结束 / connect 已在各自逻辑处理
};
```

- 注意：`setSelection` 的 Transaction meta 已设置 `addToHistory: false`，不会进入撤销栈。

### 5. renderer：框选预览绘制

同连线预览一样，renderer 持有一个 marqueePreview 状态：

```ts
class WhiteboardRenderer {
  private marqueePreview: {
    active: boolean;
    fromWorld: { x: number; y: number } | null;
    toWorld: { x: number; y: number } | null;
  } = { active: false, fromWorld: null, toWorld: null };

  setMarqueePreview(
    fromWorld: { x: number; y: number } | null,
    toWorld: { x: number; y: number } | null
  ) {
    if (!fromWorld || !toWorld) {
      this.marqueePreview = { active: false, fromWorld: null, toWorld: null };
    } else {
      this.marqueePreview = { active: true, fromWorld, toWorld };
    }
    this.markOverlayDirty();
  }
}
```

在 `OverlayLayer.render` 中：

```ts
renderMarqueePreview(ctx, viewport, canvasSize, marquee) {
  if (!marquee.active || !marquee.fromWorld || !marquee.toWorld) return;

  const from = worldToScreen(marquee.fromWorld, viewport, canvasSize);
  const to = worldToScreen(marquee.toWorld, viewport, canvasSize);

  const x = Math.min(from.x, to.x);
  const y = Math.min(from.y, to.y);
  const w = Math.abs(to.x - from.x);
  const h = Math.abs(to.y - from.y);

  ctx.save();
  ctx.strokeStyle = '#1d4ed8';
  ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 2]);
  ctx.strokeRect(x, y, w, h);
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}
```

> 这样框选矩形在 overlay 层画，底下的 block 不需要参与，逻辑简单清晰。

---

## 四、平移工具（Pan Tool）设计（顺带补完）

### 1. PanSession 状态

```ts
interface PanSession {
  startScreen: { x: number; y: number };
  startCenter: { x: number; y: number }; // viewport 初始 center
}

const [panSession, setPanSession] = useState<PanSession | null>(null);
```

### 2. 交互逻辑

**前置条件**：`toolMode === 'pan'`（或者在 `select` 模式下按住 space / 鼠标中键临时 pan）。

- `mousedown`：
  - 记录 `startScreen`（当前屏幕坐标）
  - 记录 `startCenter`（当前 viewport.center）
- `mousemove`：
  - 计算 `deltaScreen` → 转换为 `deltaWorld = { dx = -deltaScreen.x/zoom, dy = -deltaScreen.y/zoom }`
  - 调 core 的 `setViewport(prev, { center: { x: startCenter.x + dx, y: startCenter.y + dy } })`
- `mouseup`：
  - 结束 `PanSession`

> 可以根据场景选择：  
> 每次 `mousemove` 都调一次 `setViewport`（实现简单）；  
> 或者用 rAF 合并更新（高性能版本）。

---

## 五、对面试官的“工具模式 + 连线 + 框选”总结话术

最后你可以用一段结构化的描述，把这一块讲清楚：

- **工具模式**
  - “白板交互通过一个 `ToolMode` 状态来驱动，包括 select / connect / pan 等模式。所有 Canvas 事件首先根据 ToolMode 决定语义，再调用核心命令或 renderer 预览。”

- **连线工具**
  - “连线工具本质上是起点 + 终点两个 block 之间的关系，在 app 层通过 `ConnectSession` 状态控制起点选择和预览，renderer 只负责画预览线，真正的关系通过 core 的 `addConnector` 命令写入文档模型，可撤销可协同。”

- **框选多选**
  - “在选择模式下，点击空白区域并拖拽会开启 `MarqueeSession`，renderer 在 overlay 层绘制框选矩形，鼠标释放时用世界坐标下的矩形去查询空间索引，得到候选 blockId，然后通过 core 的 `setSelection` 批量更新 selection。框选不进入 History，只是视图状态。”

- **平移工具**
  - “平移工具则是对 viewport.center 的连续调整，我们把鼠标位移映射到世界坐标偏移，再调用 core 的 `setViewport` 命令，renderer 始终根据最新 viewport 渲染。”

这样，你的“工具模式 + 连线 + 框选”就不仅是交互上的完整度，更是整个 **状态机 + 渲染引擎 + 文档模型** 一致性的体现，非常适合高级前端/白板方向的面试深入追问。

如果你接下来想继续，我们可以针对 **“connector 的布局与美观”（比如折线/贝塞尔、避免穿过 block、箭头朝向）** 再做一层几何/渲染优化设计，这也是白板产品里常见的细节点。
---
> 我非常渴望这种产品细节点，因为它会在面试中大大增加我的经历可信度
---
## 整体目标：把「线」做成一个能讲故事的细节点

你可以把这部分定位成：  
**“我们不仅有连线功能，而且对连线的几何、可读性和美观做了专门设计和迭代。”**

下面我按“可以真实实现 + 可以在面试中讲”的标准，把连线细节拆成几块：

- Connector 模型补强（core 层）
- 锚点（anchor）选择规则
- 路由策略：直线 / 直角折线 + 简单避障
- 箭头朝向与缩放
- 文案标签位置（label）
- 命中区域优化（好点中）
- 性能与架构上的落点（geometry 模块）

---

## 一、Connector 模型补强：给「线」留出表达空间

在 `core/schema/connector.ts` 里可以把 Connector 稍微设计得“产品化”一点：

- **基础字段**（我们已有）：
  - `from: BlockId`
  - `to: BlockId`
  - `style: { color, width, dashed, arrowHead }`

- **可以补充的字段**（用于表现“我们想过细节”）：
  - `routing: 'straight' | 'orthogonal'`  
    - 是否走直线还是直角折线（类似流程图）
  - `fromAnchor?: 'top' | 'right' | 'bottom' | 'left'`
  - `toAnchor?: 'top' | 'right' | 'bottom' | 'left'`
    - Anchor 可以由几何算法自动选，也允许用户后期手动调整（未来扩展）
  - `label?: string`
  - `labelSide?: 'above' | 'below' | 'left' | 'right'`
    - 供后续 label 放置用

> 面试说法：  
> “我们没有把连线当成‘两点一条线’，而是一个有路由风格、锚点、标签位置的对象，这样后面可以随时扩展 orthogonal 路由、自动布局等能力。”

---

## 二、锚点（Anchor）选择：线要从块「边缘」长出来

### 1. 为什么要 Anchor？

- 如果线总是从块中心出发，视觉上会**穿过内容**，很乱。
- 更合理的做法：让线从 block 的边缘中点出发：
  - 上边中点 `(cx, y)`
  - 右边中点 `(x + w, cy)`
  - 下边中点 `(cx, y + h)`
  - 左边中点 `(x, cy)`

### 2. 简单但好用的规则

对 `fromBlock`、`toBlock` 各做一次：

- 先计算两个块中心：

```ts
const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
const toCenter   = { x: to.x + to.width   / 2, y: to.y + to.height   / 2 };
const dx = toCenter.x - fromCenter.x;
const dy = toCenter.y - fromCenter.y;
```

- **水平差更大** → 用左右 anchor：
  - `Math.abs(dx) >= Math.abs(dy)`
    - dx > 0 → fromAnchor = 'right', toAnchor = 'left'
    - dx < 0 → fromAnchor = 'left',  toAnchor = 'right'
- **垂直差更大** → 用上下 anchor：
  - dy > 0 → fromAnchor = 'bottom', toAnchor = 'top'
  - dy < 0 → fromAnchor = 'top',    toAnchor = 'bottom'

最后再把这些 anchor 转成真实的 **世界坐标锚点**：

```ts
function anchorToPoint(block: RenderBlock, anchor: AnchorSide): Vec2 {
  const cx = block.x + block.width / 2;
  const cy = block.y + block.height / 2;
  switch (anchor) {
    case 'top':    return { x: cx, y: block.y };
    case 'bottom': return { x: cx, y: block.y + block.height };
    case 'left':   return { x: block.x, y: cy };
    case 'right':  return { x: block.x + block.width, y: cy };
  }
}
```

> 面试可以说：  
> “连线起止点是通过一个简单的 anchor 算法决定的，我们根据两个块的相对位置自动选择上下左右边中点，让线尽量从块侧面伸出，不穿过内容。”

---

## 三、路由策略：直线 vs 直角折线 + 简单避障

### 1. 直线模式（`routing: 'straight'`）

最简单的情况：

- 从 `fromAnchorPoint` 到 `toAnchorPoint` 画一条线；
- 若你想避免线太靠近 block 内部，可以在起点沿锚点方向稍微「拉出」一点距离：

```ts
// 举例：从右侧 anchor 出发，先向右偏移 8px 再连过去
const offset = 8;
if (fromAnchor === 'right') {
  fromPoint.x += offset;
}
// toAnchor 相反方向偏移一点
```

这样线不会紧贴 block 边缘，视觉上更舒服。

### 2. Orthogonal 直角折线（`routing: 'orthogonal'`）

更“流程图感”的做法，是画成直角折线：

- 常见形态：  
  - **L 型**：from → 中转点 → to  
  - **Z 型**：from → midX → midY → to

简单可实现的策略：

- 仍然按 anchor 选出 fromAnchor / toAnchor；
- 第一个中转点（例 L 型）：
  - 若左右 anchor：  
    - from at right, to at left → 可以选 `midX` 并用同一 y
  - 若上下 anchor：  
    - from at bottom, to at top → 选 `midY` 用同一 x
- 一般情况可用 3 段：

```txt
fromAnchor → (中转点1：same y as from, x 为某个值) → (中转点2：same x as to, y 为某个值) → toAnchor
```

你可以先做一个**简单版**：

- 一律采用：**水平 → 垂直** 或 **垂直 → 水平** 路由：
  - 如果 `|dx| >= |dy|` （更偏水平）：  
    - p1 = { x: toCenter.x, y: fromAnchor.y }  
    - path: fromAnchor → p1 → toAnchor
  - 反之：  
    - p1 = { x: fromAnchor.x, y: toCenter.y }  
    - path: fromAnchor → p1 → toAnchor

这种虽然不完美，但已经是**明显优于直线穿来穿去**的效果。

### 3. 简单避障（高级点）

要展示“我们考虑过避免线穿过其他 block”，你可以做一个**简化版避障**：

- 思路：
  - 在计算中转点时，检查该线段是否与其他 block 的包围盒相交；
  - 若发生冲突，尝试稍微平移中转点（比如在 y 方向 +N px）重算一次；
  - 限制几次重试（2~3 次），避免复杂度爆炸。

你可以直接把它描述成：

> “我们没有做完整的图论级路由，但在 orthogonal 线路里加了简单的避障：  
> 在生成中转点后，会检查中间线段是否与其他块的包围盒相交，如果相交就沿垂直方向小幅平移中转点重算一次，这样在大部分场景下线可以绕开节点边缘，不会直接穿中间。”

---

## 四、箭头朝向与缩放：让箭头“永远是箭头”

### 1. 箭头朝向：基于最后一段线段的方向

无论直线还是折线，最后一段线段一定是从倒数第二个点 `p_{n-1}` 到终点 `p_n`，箭头向这个方向。

算法：

```ts
const p1 = points[points.length - 2];
const p2 = points[points.length - 1];

const vx = p2.x - p1.x;
const vy = p2.y - p1.y;
const len = Math.sqrt(vx*vx + vy*vy) || 1;
const ux = vx / len;
const uy = vy / len;
```

- `u = (ux, uy)` 就是方向单位向量；
- 箭头可以画成一个等腰三角形：

```ts
const arrowLength = ARROW_LENGTH_IN_SCREEN_PIXELS; // 注意是屏幕尺度
const arrowWidth  = ARROW_WIDTH_IN_SCREEN_PIXELS;

const baseX = p2.x - ux * arrowLength;
const baseY = p2.y - uy * arrowLength;

// 垂直方向向量 n = (-uy, ux)
const nx = -uy;
const ny = ux;

const leftX  = baseX + nx * (arrowWidth / 2);
const leftY  = baseY + ny * (arrowWidth / 2);
const rightX = baseX - nx * (arrowWidth / 2);
const rightY = baseY - ny * (arrowWidth / 2);
```

然后在 **screen 坐标系** 下画：

```ts
ctx.beginPath();
ctx.moveTo(p2.x, p2.y);
ctx.lineTo(leftX, leftY);
ctx.lineTo(rightX, rightY);
ctx.closePath();
ctx.fill();
```

### 2. 缩放时的箭头尺寸：用屏幕像素固定而不是世界坐标

关键点：

- 线的几何点是在世界坐标；
- 但箭头大小最好是**固定屏幕像素**，比如 10px 长 / 6px 宽；
- 因此需要：
  - 先把世界坐标 `p1、p2` 转换成屏幕坐标；
  - 在屏幕坐标空间计算 arrow 的三角形点，再画。

> 面试可以说：  
> “箭头的大小是按屏幕像素定的，这样缩放白板时箭头不会巨大或过小，始终保持视觉一致性。”

---

## 五、标签（Label）位置：让文本不挡住线 & 节点

### 1. 中点 + 法线偏移的简单策略

对于带 label 的 Connector（例如写“Day1 晚上”、“40min 车程”）：

- 首先在 polyline 上取一个“中点”：
  - 简单版：取中间线段的中点；
  - 更准一点：计算整条 polyline 的路径长度，在 50% 处算出点。
- 得到一点 `M` 与该处切向方向向量 `t` 后：
  - 法线 `n = (-t_y, t_x)`；
  - 沿法线方向偏移 `d` 像素：

```ts
const labelOffset = 12; // 屏幕像素
const labelPosScreen = {
  x: M.x + n.x * labelOffset,
  y: M.y + n.y * labelOffset,
};
```

- 在这个点画 label 文本；
- 文本基线可以根据 `labelSide`（above/below）决定偏移方向（+n / -n）。

### 2. 简单避免遮挡 block

一个可以讲但不必完美的“小细节”：

- 在放 label 前，检查 label 的包围盒（根据文本宽高）是否与附近 block 包围盒大量重叠；
- 若重叠：
  - 尝试反向偏移（`-n`）；
  - 仍重叠则再往外多偏移一点（2×labelOffset）。

你可以说：

> “为避免 label 把节点内容遮挡，我们在放置 label 时会沿着线法线方向尝试几个位置，优先选不与邻近节点包围盒相交的点。”

---

## 六、命中区域（Hit Area）：线要“好点中”

线本身在几何上是一个**零宽**对象，人手操作没有那么精准，所以要扩大命中区域：

### 1. 几何上扩大成“宽度为 r 的管道”

每次 hitTest 时，计算**点到线段的最小距离**，如果 < 某个阈值 `r`，就认为命中。

- 计算公式：点 P 到线段 AB 的距离（屏幕坐标）；
- 阈值 `r` 可以设 6~8 像素。

**关键：在 screen 坐标系中做这件事**：

- 先把 polyline 每个点的世界坐标转成 screen 坐标；
- 再用屏幕单位判断距离，这样缩放时命中体验保持一致。

### 2. 多段线 hitTest：检查所有 line segment

伪逻辑：

```ts
function hitTestConnectorAt(screenP, connector): boolean {
  const pts = connector.screenPoints; // 预先缓存好的 screen 坐标 polyline
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i+1];
    if (distancePointToSegment(screenP, p1, p2) <= HIT_RADIUS) {
      return true;
    }
  }
  return false;
}
```

> 面试点：  
> “为了不让用户点线点到崩溃，我们在命中检测时用屏幕坐标下的固定半径来定义‘点中线’，而不是严格几何线条。这对缩放场景尤其重要。”

---

## 七、架构落点：Geometry 模块 & 可扩展性

最后，把这些细节放进一个**可讲结构**里：

- 在 `renderer-canvas/geometry/` 下拆文件：
  - `anchors.ts`：从 block 得到 anchor / anchor point；
  - `routing.ts`：根据 routing style + anchors 生成 polyline 点；
  - `arrow.ts`：计算箭头三角形坐标（屏幕空间）；
  - `label.ts`：计算 label 放置点；
  - `hitTest.ts`：点到线段距离算法；
- 所有函数都尽量是**纯函数**，接受 RenderBlock/Connector + viewport/canvas 信息，返回一组可绘制点。

这方便你在未来：

- 把相同的 `routing`/`anchors` 逻辑直接给 WebGL 渲染器使用；
- 或者在 core 层做“智能布局”（比如自动选 `routing: orthogonal` + `from/toAnchor`），renderer 只负责画。

---

## 面试话术小总结（可以背下来用）

你可以用类似这样一段话收束：

> “在连线这块，我们做了不少几何和视觉上的优化。  
>  起止点并不是简单连块中心，而是通过 anchor 算法自动选择上下左右边中点，让线从块边缘伸出；路由支持直线和直角折线两种模式，并在 orthogonal 路线里加了简单的避障逻辑，尽量避免线穿过其他节点。  
>  箭头和命中检测全部基于屏幕坐标做像素级控制，比如箭头大小固定为 10px，不随缩放变形；命中检测用“点到线段的最小距离 < 8px”这种宽线段模型，让用户在各种缩放下都能轻松点中。  
>  对带文本的连线，我们还在 polyline 上取了等长中点，然后沿法线方向偏移放 label，并尝试选择不和邻近节点包围盒相交的位置。这一整套几何逻辑被抽到 renderer 的 geometry 模块，Canvas 和未来的 WebGL 渲染器可以共享。”

这段话一讲，面试官一般就不会再怀疑你是“只会连个线的业务前端”了，而是会觉得你真的动过“编辑器/白板产品级”的心思。

如果你还想再往下挖，我们可以再聊 **“连接线在缩放和平移中的防抖与抗锯齿、如何用不同线型表达不同语义（时间顺序 / 依赖 / 可选路径）”** 等视觉层的小细节。
———
> 也就是说我们的 renderer 还需要设置一个 geometry 模块咯？请继续聊细节
———
好的，我们就把 `geometry` 当成“渲染引擎里的数学大脑”来设计。

我会分三层讲：

- 模块划分：`geometry/` 下面有哪些文件、各自职责是什么  
- 核心数据流：从 `RenderBlock/Connector` + `Viewport` → 几何结果 → Canvas/WebGL 使用  
- 一些可以在面试里拿出来说的“细节 & 取舍”

---

## 一、`geometry` 的模块划分（目录 & 职责）

建议在 `renderer-canvas` 里这样组织：

```txt
renderer-canvas/
  src/
    geometry/
      anchors.ts       // 从 Block 计算锚点（anchor）与 anchor 点位置
      routing.ts       // 根据锚点 & routing style 生成 polyline 路径
      arrow.ts         // 箭头的几何计算（屏幕坐标）
      label.ts         // 连线文本 label 的放置点计算
      bounds.ts        // Block/Connector 包围盒、视口裁剪相关
      hitTest.ts       // 命中检测：点到矩形、点到折线的距离
      metrics.ts       // polyline 的长度、分段等（给 label/动画用）
      transform.ts     // world ↔ screen 转换（可共用）
```

**原则：**

- 这些模块都尽量写成 **纯函数**：  
  输入是 `RenderBlock/Connector` + `Viewport/CanvasSize` + 配置，输出是几何/顶点集合。
- `WhiteboardRenderer` 不直接写几何算法，而是组合这些函数：
  - 这让同一套几何逻辑以后可以被 WebGL 渲染器直接复用。

---

## 二、核心数据流：从文档到几何，再到 Canvas/WebGL

### 1. 输入：RenderScene + Viewport + CanvasSize

在渲染前，你已经有这样的数据：

```ts
interface RenderBlock {
  id: string;
  kind: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;       // MVP 可以先不做旋转
  zIndex: number;
  style: BlockRenderStyle;
}

interface RenderConnector {
  id: string;
  fromBlockId: string;
  toBlockId: string;
  routing: 'straight' | 'orthogonal';
  fromAnchor?: AnchorSide;
  toAnchor?: AnchorSide;
  style: ConnectorRenderStyle;
  label?: string;
}

interface RenderScene {
  blocks: RenderBlock[];
  connectors: RenderConnector[];
  blockById: Map<string, RenderBlock>;
}
```

几何模块负责把这些变成：

- 各个连线的世界坐标 polyline（用于命中检测 / label 等）
- 各个连线的屏幕坐标 polyline + 箭头三角形（用于 Canvas 绘制）

---

## 三、各子模块的职责与核心函数

### 1. `anchors.ts`：从 Block 得到「线的起止点」

**目标：**  
给定两个 block，决定：

- `fromAnchor` / `toAnchor`：上 / 下 / 左 / 右
- 对应的 world 坐标点 `fromPoint` / `toPoint`

核心类型：

```ts
export type AnchorSide = 'top' | 'right' | 'bottom' | 'left';

export interface AnchorInfo {
  side: AnchorSide;
  point: { x: number; y: number };  // 世界坐标
}
```

核心函数：  

```ts
export function computeAnchorsForBlocks(
  from: RenderBlock,
  to: RenderBlock
): { from: AnchorInfo; to: AnchorInfo } {
  const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const toCenter   = { x: to.x   + to.width   / 2, y: to.y   + to.height   / 2 };
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;

  let fromSide: AnchorSide;
  let toSide: AnchorSide;

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) {
      fromSide = 'right';
      toSide = 'left';
    } else {
      fromSide = 'left';
      toSide = 'right';
    }
  } else {
    if (dy >= 0) {
      fromSide = 'bottom';
      toSide = 'top';
    } else {
      fromSide = 'top';
      toSide = 'bottom';
    }
  }

  return {
    from: { side: fromSide, point: anchorSideToPoint(from, fromSide) },
    to:   { side: toSide,   point: anchorSideToPoint(to,   toSide)   },
  };
}

export function anchorSideToPoint(block: RenderBlock, side: AnchorSide) {
  const cx = block.x + block.width / 2;
  const cy = block.y + block.height / 2;
  switch (side) {
    case 'top':    return { x: cx, y: block.x };                 // 注意这里写成 block.y
    case 'bottom': return { x: cx, y: block.y + block.height };
    case 'left':   return { x: block.x, y: cy };
    case 'right':  return { x: block.x + block.width, y: cy };
  }
}
```

> 你可以在文档/面试里展示这段逻辑，说明你考虑了 anchor 的自动选择。

---

### 2. `routing.ts`：根据 routing style 生成 polyline

#### 2.1 API 设计

```ts
export type RoutingStyle = 'straight' | 'orthogonal';

export function buildConnectorPathWorld(
  from: RenderBlock,
  to: RenderBlock,
  routing: RoutingStyle,
  fromAnchor?: AnchorSide,
  toAnchor?: AnchorSide
): { points: { x: number; y: number }[]; fromSide: AnchorSide; toSide: AnchorSide } {
  // 内部：
  // 1. 如果没指定 anchor，就用 anchors.ts 算
  // 2. 根据 routing 生成世界坐标 polyline
}
```

#### 2.2 Straight 路由

简单版：

```ts
function buildStraightPath(
  fromPoint: Vec2,
  toPoint: Vec2
): Vec2[] {
  return [fromPoint, toPoint];
}
```

可加一点 offset 让线不要太贴 block 边。

#### 2.3 Orthogonal 路由（直角折线）

简单策略（分两类）：

- 更水平（`|dx| >= |dy|`）→ 优先水平再垂直：
  - `p1 = { x: (fromPoint.x + toPoint.x) / 2, y: fromPoint.y }`
  - `p2 = { x: p1.x, y: toPoint.y }`
  - path: `from → p1 → p2 → to`
- 更垂直 → 优先垂直再水平：
  - 类似，只不过先凑 y，再凑 x。

示意函数：

```ts
function buildOrthogonalPath(
  fromPoint: Vec2,
  toPoint: Vec2
): Vec2[] {
  const dx = toPoint.x - fromPoint.x;
  const dy = toPoint.y - fromPoint.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    // 水平主导：from -> (midX, fromY) -> (midX, toY) -> to
    const midX = (fromPoint.x + toPoint.x) / 2;
    const p1 = { x: midX, y: fromPoint.y };
    const p2 = { x: midX, y: toPoint.y };
    return [fromPoint, p1, p2, toPoint];
  } else {
    // 垂直主导：from -> (fromX, midY) -> (toX, midY) -> to
    const midY = (fromPoint.y + toPoint.y) / 2;
    const p1 = { x: fromPoint.x, y: midY };
    const p2 = { x: toPoint.x, y: midY };
    return [fromPoint, p1, p2, toPoint];
  }
}
```

> 将来要加避障，可以在 `buildOrthogonalPath` 里对 `p1/p2` 做微调，并用 `bounds.ts` 检查与 block 包围盒是否相交。

---

### 3. `bounds.ts`：包围盒 + 视口裁剪

**职责：**

- 计算 block/connector 的世界包围盒；
- 判断是否和 viewport 相交，用于视口剔除；
- 供命中检测与脏矩形处理复用。

例子：

```ts
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getBlockBoundsWorld(block: RenderBlock): Rect {
  // MVP: 不考虑 rotation
  return {
    x: block.x,
    y: block.y,
    width: block.width,
    height: block.height,
  };
}

export function getConnectorBoundsWorld(points: Vec2[]): Rect {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}
```

**viewport 裁剪**：

- 把 viewport（center + zoom + canvasSize）变成一个世界坐标的矩形；
- 对每个 block/connector 的 bounds 做 `rectsIntersect` 判断，决定是否参与渲染。

这会在 Perf Lab 中直接体现你有“视口剔除”的策略。

---

### 4. `hitTest.ts`：点到矩形 & 点到 polyline

**职责：**

- 点到矩形 → 供 block hitTest；
- 点到 polyline（线段集合） → 供 connector hitTest。

核心算法是**点到线段距离**，用在 screen 坐标里：

```ts
export function distancePointToSegment(
  p: Vec2,
  a: Vec2,
  b: Vec2
): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = p.x - a.x;
  const wy = p.y - a.y;

  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(p.x - a.x, p.y - a.y);

  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(p.x - b.x, p.y - b.y);

  const t = c1 / c2;
  const projX = a.x + t * vx;
  const projY = a.y + t * vy;
  return Math.hypot(p.x - projX, p.y - projY);
}

export function hitTestPolyline(
  pointScreen: Vec2,
  polylineScreen: Vec2[],
  radius: number
): boolean {
  for (let i = 0; i < polylineScreen.length - 1; i++) {
    if (distancePointToSegment(pointScreen, polylineScreen[i], polylineScreen[i+1]) <= radius) {
      return true;
    }
  }
  return false;
}
```

renderer 里会先把 polyline 的 world 点转换成 screen 点后调用这个函数。

---

### 5. `arrow.ts`：箭头的屏幕空间计算

前面我们已经给你了大致思路，模块化后就是：

```ts
export interface ArrowShape {
  tip: Vec2;       // 箭头尖屏幕坐标
  left: Vec2;
  right: Vec2;
}

export function computeArrowShape(
  fromScreen: Vec2,
  toScreen: Vec2,
  arrowLength: number,
  arrowWidth: number
): ArrowShape {
  const vx = toScreen.x - fromScreen.x;
  const vy = toScreen.y - fromScreen.y;
  const len = Math.hypot(vx, vy) || 1;
  const ux = vx / len;
  const uy = vy / len;

  const baseX = toScreen.x - ux * arrowLength;
  const baseY = toScreen.y - uy * arrowLength;

  const nx = -uy;
  const ny = ux;

  const leftX  = baseX + nx * (arrowWidth / 2);
  const leftY  = baseY + ny * (arrowWidth / 2);
  const rightX = baseX - nx * (arrowWidth / 2);
  const rightY = baseY - ny * (arrowWidth / 2);

  return {
    tip: { x: toScreen.x, y: toScreen.y },
    left: { x: leftX, y: leftY },
    right: { x: rightX, y: rightY },
  };
}
```

Canvas 绘制时只要调用这个函数，把结果画出来即可；WebGL 时可以把这三个点写成三角形顶点。

---

### 6. `label.ts`：连线文本的位置

一种简单但专业的设计：

- 输入：
  - polyline 的 **screen 坐标**点集合
  - 配置（偏移量、允许方向）
- 输出：
  - 文本 anchor 点（screen）

功能结构：

```ts
export function computeLabelPositionOnPolyline(
  polylineScreen: Vec2[],
  offsetPixels: number
): Vec2 {
  // 1. 计算 polyline 总长度
  // 2. 找到路径中 50% 的位置（中点）
  // 3. 求出中点处的切线方向 t
  // 4. 用法线 n = (-t_y, t_x)，向一侧偏移 offsetPixels
}
```

你可以先做一个简化版：

- 只在中间线段上取中点作为 labelPoint；
- 法线方向固定一个（例如“朝上”），不考虑遮挡；
- 如果以后有时间，再用 bounds 检测对附近 block 的遮挡。

---

## 四、怎么在 renderer 中“用”这些 geometry 函数？

以连线渲染为例：

```ts
// MainLayer.renderConnectors
for (const conn of scene.connectors) {
  const fromBlock = scene.blockById.get(conn.fromBlockId);
  const toBlock   = scene.blockById.get(conn.toBlockId);
  if (!fromBlock || !toBlock) continue;

  // 1. world 空间 polyline
  const { points } = buildConnectorPathWorld(
    fromBlock,
    toBlock,
    conn.routing,
    conn.fromAnchor,
    conn.toAnchor
  );

  // 2. culling：如果整个 polyline bounds 在 viewport 外，可以跳过

  // 3. world → screen
  const screenPoints = points.map(p =>
    worldToScreen(p, viewport, canvasSize)
  );

  // 4. Canvas 画线
  drawConnectorStroke(ctx, screenPoints, conn.style);

  // 5. 箭头
  if (conn.style.arrowHead === 'end' || conn.style.arrowHead === 'both') {
    const n = screenPoints.length;
    const arrow = computeArrowShape(
      screenPoints[n - 2],
      screenPoints[n - 1],
      10,  // length
      6    // width
    );
    fillArrow(ctx, arrow, conn.style);
  }

  // 6. Label
  if (conn.label) {
    const labelPos = computeLabelPositionOnPolyline(screenPoints, 12);
    drawConnectorLabel(ctx, labelPos, conn.label, conn.style);
  }
}
```

WebGL 渲染器只需要在：

- 步骤 1（世界 polyline）、2（bounds）、7（命中/label）复用 geometry；
- 在“画线”这一步改成构建 VBO/IBO。

---

## 五、面试视角：为什么 geometry 模块是个“卖点”

你可以把这部分包装成两点：

- **架构级卖点：**
  - “我们刻意把渲染引擎中的几何逻辑抽到一个 `geometry` 模块，让 Canvas 和 WebGL 渲染器都复用同一套 anchor/routing/hitTest 算法，这样后续切换渲染后端不会影响连线表现和交互逻辑。”
- **体验级卖点：**
  - “连线不是简单画一条线，而是有路由策略、anchor、箭头和 label 的完整几何系统。比如命中检测在屏幕空间采用固定 radius 的管道模型，箭头和 label 的尺寸也是按屏幕像素而不是世界坐标定的，所以缩放时体验很稳定。”

这样，**geometry 模块既体现你的工程能力（抽象和复用），又体现你对产品细节的在意**，非常适合在白板/图形编辑器岗位的面试中深挖。

如果你愿意，下一步可以选几段你最想实现的几何函数（比如 `buildOrthogonalPath` + `hitTestPolyline`），我帮你整理成更接近真实代码的版本，方便你直接开写。