# OpenPage × OpenPencil 融合架构与 PoC 实施方案

**文档版本：** v1.0  
**方案定位：** AI-native UI Engineering Platform 技术验证  
**核心技术：** OpenPencil、统一 UI DSL、Vue 3、TypeScript、XState v5  
**核心原则：** JSON-first、Design as Data、Visual Editing、Agent-native

---

# 1. 项目目标与总体判断

## 1.1 项目目标

构建一个面向 AI Agent 的 UI 工程平台，将视觉设计、组件结构、交互状态、数据绑定和代码生成统一到一份 JSON DSL 中。

平台需要解决目前 AI 前端开发中的几个核心问题：

1. **视觉设计与业务逻辑分离：** 设计稿只描述视觉，交互逻辑需要另外编写，二者容易脱节。
2. **AI 生成结果难以维护：** AI 直接修改 Vue/React 源码，容易产生不稳定的代码结构和难以审查的变更。
3. **设计工具与代码工具割裂：** 设计工具、CLI、MCP 和代码生成器之间缺少统一的数据模型。
4. **页面难以持续迭代：** 缺少稳定的结构化数据源，后续修改容易破坏已有页面。

最终希望实现：

- 人可以通过可视化编辑器修改页面。
- AI Agent 可以通过 CLI/MCP 修改页面。
- 交互逻辑可以通过 XState 状态机定义和预览。
- 所有修改最终都写入同一份 JSON DSL。
- 通过编译器生成 Vue 3 + TypeScript 项目代码。

## 1.2 项目融合定位

| 项目 | 在融合架构中的定位 | 主要复用能力 |
|---|---|---|
| OpenPencil | 核心工程底座 | 设计画布、SceneGraph、渲染、布局、CLI、MCP、Vue SDK |
| OpenPage | 产品模型与页面构建参考 | JSON-first、Block/Variant、页面配置、主题系统、AI 生成思路 |
| 统一 UI DSL | 平台核心资产 | 视觉、组件、交互、数据绑定的统一数据模型 |
| XState v5 | 交互运行时 | 状态机、事件、Guard、Action、状态转换 |
| Vue 3 | 目标代码运行平台 | 页面渲染、组件体系、业务集成 |

**重要判断：不建议直接把 OpenPage 和 OpenPencil 的代码仓库合并。**

更合理的方式是：

- 复用 OpenPencil 的设计引擎和编辑能力。
- 借鉴 OpenPage 的 JSON-first 页面建模思想。
- 自己定义统一 DSL。
- 通过 Adapter 和 Compiler 连接各个模块。

这样可以避免继承 OpenPage 现有编辑器的技术限制，也不会被 OpenPencil 的原生设计文件格式绑定。

## 1.3 项目边界

第一阶段不追求完整的低代码平台，也不追求完整的 Figma 替代品。

PoC 只需要证明：

1. 统一 JSON DSL 能够表达一个真实业务页面。
2. JSON 可以转换成 OpenPencil SceneGraph。
3. OpenPencil 编辑后的视觉变化可以回写 JSON。
4. XState 可以独立描述页面交互，并与视觉组件绑定。
5. JSON 可以编译为可运行的 Vue 3 页面。

---

# 2. 总体架构设计

## 2.1 核心架构

采用五层架构：

```text
┌──────────────────────────────────────────────┐
│                 使用入口层                    │
│                                              │
│   Visual Editor       Agent / Claude Code    │
│   可视化编辑器          CLI / MCP              │
└───────────────┬──────────────────┬───────────┘
                │                  │
                ▼                  ▼
┌──────────────────────────────────────────────┐
│                 Operation Layer              │
│                                              │
│  统一操作接口 / Schema Validation             │
│  JSON Patch / Undo-Redo / Version Control     │
│  Conflict Detection / Operation History       │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                 Unified UI DSL                │
│                                              │
│  tokens       design       components        │
│  pages        machines     bindings          │
│  data         assets       metadata          │
│                                              │
│             Single Source of Truth           │
└──────────────┬──────────────────┬────────────┘
               │                  │
               ▼                  ▼
┌───────────────────────┐  ┌───────────────────┐
│   Design Adapter      │  │ Interaction       │
│                       │  │ Runtime           │
│   DSL ↔ SceneGraph    │  │                   │
│   OpenPencil Core     │  │ XState v5         │
│   OpenPencil Vue SDK  │  │ Preview           │
└───────────────────────┘  └───────────────────┘
               │                  │
               └────────┬─────────┘
                        ▼
┌──────────────────────────────────────────────┐
│                  Compiler                     │
│                                              │
│       Unified DSL → Vue 3 + TypeScript        │
│                                              │
│   Component Mapping / Template / Style        │
│   State Machine / Data Binding / Assets       │
└──────────────────────────────────────────────┘
```

## 2.2 核心架构原则

### 原则一：统一 DSL 是唯一事实来源

不允许 `.fig`、Vue 源码或 XState 配置成为独立的主数据源。

各模块的关系：

- UI DSL：完整项目数据。
- `.fig`：设计编辑过程中的投影和交换文件。
- XState Runtime：从 DSL 交互定义构建的运行时对象。
- Vue 代码：由 DSL 编译生成的产物。

### 原则二：OpenPencil 只负责视觉设计域

OpenPencil SceneGraph 不直接承载所有业务逻辑。

它主要负责：

- 节点树。
- 几何信息。
- 颜色、字体、边框、阴影。
- 布局与约束。
- 组件和 Variant。
- 画布编辑、渲染和交互。

状态机、数据源、业务事件和接口定义由统一 DSL 管理。

### 原则三：编辑器和 Agent 使用同一套操作接口

不论用户通过鼠标拖拽，还是 Agent 通过 MCP 修改页面，都必须进入统一 Operation Layer。

例如：

```text
用户拖动组件
      │
      ▼
Editor Adapter
      │
      ▼
moveNode()
      │
      ▼
JSON Patch
      │
      ▼
Unified DSL
```

Agent 操作：

```text
Claude Code
      │
      ▼
MCP Tool
      │
      ▼
moveNode()
      │
      ▼
JSON Patch
      │
      ▼
Unified DSL
```

两条路径最终使用同一个操作接口，避免出现两套修改逻辑。

---

# 3. 统一 UI DSL 设计

这是整个项目最重要的核心资产。

建议使用 JSON Schema 约束 DSL，TypeScript 类型由 Schema 自动生成或保持同步。

## 3.1 DSL 顶层结构

建议采用以下结构：

```json
{
  "schemaVersion": "0.1.0",
  "project": {
    "id": "demo-project",
    "name": "Demo Project",
    "framework": "vue3"
  },
  "tokens": {},
  "components": {},
  "pages": {},
  "machines": {},
  "bindings": {},
  "data": {},
  "assets": {},
  "metadata": {}
}
```

各模块职责：

| 模块 | 作用 |
|---|---|
| project | 项目基本信息和目标框架 |
| tokens | 颜色、字体、间距、圆角、阴影 |
| components | 组件定义、属性、样式、Variant |
| pages | 页面节点树和组件实例 |
| machines | XState 状态机定义 |
| bindings | 视觉节点与交互状态的关联 |
| data | 数据模型、Mock 数据、数据源定义 |
| assets | 图片、图标、字体等资源 |
| metadata | 扩展信息、来源、版本等 |

## 3.2 页面节点模型

页面使用统一的节点结构：

```json
{
  "id": "node-login-button",
  "type": "component",
  "component": "Button",
  "props": {
    "label": "登录"
  },
  "layout": {
    "width": 120,
    "height": 40
  },
  "style": {
    "background": "{tokens.colors.primary}",
    "borderRadius": "{tokens.radius.md}"
  },
  "children": []
}
```

节点需要具备：

- 稳定 ID。
- 节点类型。
- 组件引用。
- Props。
- Layout。
- Style。
- Children。
- 扩展元数据。

**节点 ID 必须稳定。**

不能每次导入或转换都重新生成 ID，否则无法可靠地进行差异比较、交互绑定和增量更新。

## 3.3 Design Token

建议建立统一 Token 系统：

```json
{
  "colors": {
    "primary": "#2563EB",
    "background": "#FFFFFF",
    "textPrimary": "#111827"
  },
  "spacing": {
    "xs": 4,
    "sm": 8,
    "md": 16,
    "lg": 24
  },
  "radius": {
    "sm": 4,
    "md": 8,
    "lg": 12
  }
}
```

Token 应当同时被：

- OpenPencil Adapter。
- 可视化编辑器。
- Vue Renderer。
- Vue Compiler。

共同使用。

这样才能保证设计稿和最终代码的视觉一致性。

## 3.4 交互状态机模型

建议直接采用接近 XState v5 的可序列化配置，而不是自行创造一套复杂状态机 DSL。

示例：

```json
{
  "id": "loginMachine",
  "initial": "idle",
  "states": {
    "idle": {
      "on": {
        "SUBMIT": "loading"
      }
    },
    "loading": {
      "on": {
        "SUCCESS": "success",
        "ERROR": "failure"
      }
    },
    "success": {},
    "failure": {
      "on": {
        "RETRY": "loading"
      }
    }
  }
}
```

注意：

JSON 只负责描述可序列化配置。

Guard、Action、异步请求等具体实现通过 TypeScript Registry 注册：

```ts
const actions = {
  submitLogin: async ({ event }) => {
    // 登录请求
  }
}

const guards = {
  hasValidForm: ({ context }) => {
    return Boolean(context.username && context.password)
  }
}
```

运行时由 XState v5 将 JSON 配置与 Registry 组合成 Machine。

不建议把 JavaScript 函数直接塞进 JSON。

## 3.5 视觉与交互绑定

通过 `bindings` 将节点与状态机关联：

```json
{
  "bindings": {
    "login-button-binding": {
      "nodeId": "node-login-button",
      "machineId": "loginMachine",
      "events": {
        "click": "SUBMIT"
      },
      "variants": [
        {
          "when": "loading",
          "props": {
            "loading": true,
            "disabled": true
          }
        },
        {
          "when": "failure",
          "props": {
            "status": "error"
          }
        }
      ]
    }
  }
}
```

这样视觉组件不需要知道完整业务流程，只需要根据绑定接收状态和事件。

---

# 4. OpenPage 与 OpenPencil 的融合方式

## 4.1 OpenPencil：设计引擎

主要复用：

- `@open-pencil/core`
- `@open-pencil/scene-graph`
- `@open-pencil/fig`
- `@open-pencil/vue`
- `@open-pencil/cli`
- `@open-pencil/mcp`

建议优先研究：

1. SceneGraph 节点类型和数据结构。
2. `createEditor()` 的创建流程。
3. 节点增删改、层级调整和布局操作。
4. Editor 事件机制。
5. `.fig` 导入导出。
6. Vue SDK 如何嵌入自定义编辑器。

OpenPencil 已经提供 Vue 3 Headless SDK，核心引擎与 Vue UI 适配层是分离的，因此适合用来构建自己的定制编辑器。

参考：
- https://openpencil.dev/development/architecture
- https://openpencil.dev/programmable/sdk/architecture
- https://openpencil.dev/programmable/sdk/getting-started

## 4.2 OpenPage：页面模型参考

OpenPage 不建议作为核心引擎直接继承。

重点借鉴：

- `SiteConfig` JSON-first 设计。
- Block 类型与 Variant。
- Theme 配置。
- 页面级结构组织。
- JSON 驱动的实时预览。
- AI 生成结构化页面配置。

OpenPage 的区块化模型适合营销网站，但对于复杂后台系统，需要进一步扩展：

- 任意容器嵌套。
- 复杂组件树。
- 表格、表单、弹窗等业务组件。
- 动态状态机。
- 数据绑定。
- 组件属性与事件定义。

因此，建议将 OpenPage 的 Block 理念吸收进统一 DSL 的组件体系，而不是保留两套 JSON 格式。

## 4.3 两者之间的关系

```text
                 Unified UI DSL
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
       OpenPencil Adapter   Page Renderer
              │                 │
              ▼                 ▼
        SceneGraph         Vue Component
              │                 │
              ▼                 ▼
        Design Editor      Runtime Preview
```

OpenPage 的 JSON-first 思想影响 DSL 的设计；OpenPencil 提供视觉编辑能力。

---

# 5. 核心模块设计

建议采用 Monorepo 管理。

## 5.1 推荐目录结构

```text
ui-platform/
│
├── apps/
│   ├── editor/                 # Vue 3 可视化编辑器
│   ├── preview/                # 页面交互预览
│   └── playground/             # DSL 调试工具
│
├── packages/
│   ├── ui-dsl/
│   │   ├── schema/
│   │   ├── types/
│   │   ├── parser/
│   │   └── validator/
│   │
│   ├── operation/
│   │   ├── commands/
│   │   ├── patches/
│   │   ├── history/
│   │   └── conflict/
│   │
│   ├── openpencil-adapter/
│   │   ├── import/
│   │   ├── export/
│   │   ├── mapping/
│   │   └── sync/
│   │
│   ├── interaction/
│   │   ├── machine/
│   │   ├── registry/
│   │   ├── binding/
│   │   └── runtime/
│   │
│   ├── vue-renderer/
│   │
│   ├── vue-compiler/
│   │
│   ├── cli/
│   │
│   └── mcp/
│
├── examples/
│   └── login-page/
│
└── package.json
```

技术选型建议：

| 领域 | 技术 |
|---|---|
| Monorepo | pnpm workspace |
| 开发语言 | TypeScript |
| 编辑器 | Vue 3 |
| 设计引擎 | OpenPencil |
| 交互引擎 | XState v5 |
| Schema | JSON Schema + Ajv |
| 数据变更 | JSON Patch |
| CLI | Node.js |
| MCP | OpenPencil MCP + 自定义业务 MCP |
| 构建 | Vite / tsup 或 tsdown |

具体构建工具可以在项目初始化时根据 OpenPencil 当前包的兼容性确定。

## 5.2 Operation Layer

这是必须独立设计的模块。

建议先实现以下接口：

```ts
interface UIEditorOperations {
  createNode(input: CreateNodeInput): void

  updateNode(id: string, patch: NodePatch): void

  deleteNode(id: string): void

  moveNode(id: string, parentId: string, index: number): void

  resizeNode(id: string, width: number, height: number): void

  updateStyle(id: string, style: StylePatch): void

  createMachine(machine: MachineDefinition): void

  updateMachine(id: string, machine: MachineDefinition): void

  bindMachine(binding: MachineBinding): void

  validate(): ValidationResult
}
```

每个操作都应：

1. 校验参数。
2. 检查目标节点是否存在。
3. 生成 JSON Patch。
4. 更新 DSL。
5. 记录操作历史。
6. 通知编辑器和预览层刷新。

不要让 MCP 直接修改 JSON 文件，也不要让 Editor 绕过 Operation Layer 直接写文件。

## 5.3 OpenPencil Adapter

Adapter 是项目最大的不确定性之一。

需要实现两个方向：

```ts
// DSL → OpenPencil SceneGraph
function toSceneGraph(
  document: UIDocument
): SceneGraph

// OpenPencil SceneGraph → DSL
function fromSceneGraph(
  graph: SceneGraph,
  previous: UIDocument
): UIDocument
```

特别注意：

`fromSceneGraph` 不能简单地重新创建一份完整 DSL。

它应该以原有 DSL 为基础，只更新视觉域中确实发生变化的字段。

例如用户修改了按钮颜色：

- 更新 `style.background`。
- 保留节点 ID。
- 保留组件引用。
- 保留原有机器定义。
- 保留数据绑定。
- 保留业务扩展元数据。

这是避免设计编辑破坏业务逻辑的关键。

## 5.4 交互运行时

建议将交互运行时独立于 OpenPencil。

运行过程：

```text
Unified DSL
     │
     ▼
Machine Factory
     │
     ▼
XState v5 Machine
     │
     ▼
Actor
     │
     ▼
Binding Resolver
     │
     ▼
Vue Component Props
     │
     ▼
页面交互预览
```

OpenPencil 的画布可以负责设计预览；真正的业务交互建议在独立 Preview Runtime 中运行。

不要把 XState Runtime 强行塞入 SceneGraph。

---

# 6. PoC 实施计划

建议分为四个 PoC，采用逐步验证的方式。

## PoC 1：OpenPencil 与统一 DSL 双向转换

**优先级：P0，最先实施。**

目标：验证统一 JSON DSL 是否能够与 OpenPencil SceneGraph 进行可靠转换。

### 实施范围

只实现一个登录页面：

- 页面容器。
- 标题文本。
- 输入框。
- 登录按钮。
- Logo 图片。
- 基础布局。
- 基础颜色、字体、间距。

### 实施步骤

1. 安装 OpenPencil 相关 npm 包。
2. 使用 Vue 3 搭建最小测试页面。
3. 调用 `createEditor()` 创建编辑器。
4. 使用 Vue SDK 挂载 Canvas。
5. 定义最小版 UI DSL。
6. 实现 DSL → SceneGraph。
7. 将 SceneGraph 显示在 OpenPencil 画布。
8. 在画布中修改节点位置、尺寸、颜色。
9. 监听节点变更事件。
10. 实现 SceneGraph → DSL。
11. 保存 JSON 文件。
12. 重新导入 JSON，验证视觉一致性。

### 验收标准

| 测试项 | 验收要求 |
|---|---|
| JSON 导入 | 正常创建页面 |
| 节点映射 | 所有测试节点都能映射 |
| 视觉编辑 | 可以修改位置、尺寸、颜色 |
| JSON 回写 | 编辑结果能更新 JSON |
| ID 稳定性 | 往返转换后节点 ID 不变 |
| 元数据保留 | 未修改的扩展字段不丢失 |
| 重复转换 | 连续转换不会产生结构性漂移 |

**PoC 1 的核心验收不是能否导入，而是往返转换是否可靠。**

如果某些 OpenPencil 节点属性无法映射，必须明确记录为能力差异，不要静默丢弃。

## PoC 2：XState 交互与视觉绑定

**优先级：P0。**

目标：证明统一 DSL 不只是视觉设计 JSON，还能表达真实交互。

### 实施范围

继续使用登录页面：

- idle：初始状态。
- loading：登录请求中。
- success：登录成功。
- failure：登录失败。

### 实施步骤

1. 在 DSL 中增加 machines。
2. 使用 XState v5 加载状态机。
3. 定义 Action Registry。
4. 定义 Guard Registry。
5. 增加 bindings。
6. 将 Machine 状态映射到 Vue 组件 Props。
7. 在预览页面中执行真实交互。
8. 验证视觉状态和业务状态同步。

### 验收标准

- 点击登录按钮可以触发 SUBMIT。
- 按钮可以显示 Loading。
- 登录成功后显示 Success。
- 登录失败后显示错误状态。
- 可以重新触发登录。
- 交互定义与视觉节点相互独立。
- 重新加载 DSL 后交互仍然可用。

## PoC 3：CLI + MCP Agent 操作

**优先级：P1。**

目标：证明 Agent 能够直接操作统一 DSL，而不是生成大量 Vue 源码。

### CLI 命令设计

```bash
ui-platform init demo
ui-platform validate
ui-platform inspect
ui-platform export
ui-platform diff
```

### MCP 工具设计

初期只实现核心操作：

```text
get_project
get_page
get_node
create_page
create_node
update_node
move_node
delete_node
update_style
create_machine
update_machine
bind_machine
validate_project
export_vue
```

MCP 的工具调用最终进入统一 Operation Layer。

### 测试任务

让 Claude Code 完成以下工作：

> 在登录页面增加一个记住密码复选框，调整登录按钮宽度，并增加登录失败状态下的错误提示。

预期流程：

1. Agent 读取页面 DSL。
2. Agent 调用 MCP 创建节点。
3. Agent 修改按钮样式。
4. Agent 创建或更新状态机绑定。
5. Agent 调用 validate。
6. Editor 显示修改结果。

### 验收标准

- Agent 能够读取完整页面结构。
- Agent 能够创建、修改、删除节点。
- Agent 能够修改状态机。
- 修改结果能在编辑器中展示。
- 修改历史可追踪。
- 无效修改能够被 Schema 或业务校验拦截。

## PoC 4：Vue 3 编译器

**优先级：P1。**

目标：证明统一 DSL 可以成为真正的代码生成源。

### 实施范围

只生成登录页面，不追求完整项目生成器。

生成结果：

```text
generated/
├── src/
│   ├── pages/
│   │   └── Login.vue
│   ├── machines/
│   │   └── login.machine.ts
│   ├── components/
│   └── styles/
│       └── tokens.css
└── package.json
```

### 编译流程

```text
Unified DSL
     │
     ▼
Schema Validation
     │
     ▼
AST / Intermediate Representation
     │
     ├── Vue Template
     ├── CSS Variables
     ├── Component Props
     ├── XState Machine
     └── Event Bindings
     │
     ▼
Vue 3 + TypeScript
```

### 验收标准

- 生成的 Vue 页面可以运行。
- 页面结构与设计稿基本一致。
- 页面交互符合 XState 定义。
- Token 能够正确生成 CSS。
- 生成代码不存在无效组件引用。
- DSL 修改后可以重新编译。

---

# 7. 关键技术风险与解决方案

| 风险 | 影响 | 应对策略 |
|---|---|---|
| SceneGraph 与 DSL 模型差异 | 双向转换困难 | 建立明确字段映射和能力矩阵 |
| `.fig` 元数据丢失 | 业务数据被破坏 | DSL 保留业务元数据，`.fig` 仅作为设计投影 |
| OpenPencil API 变化 | 依赖升级成本 | 封装 Adapter，固定版本并做兼容测试 |
| 复杂布局转换不一致 | 设计和代码视觉偏差 | 优先支持明确的布局子集，逐步扩展 |
| 节点 ID 不稳定 | 交互绑定失效 | 使用稳定 ID 与映射表 |
| Agent 修改冲突 | 数据覆盖 | Revision + JSON Patch + 冲突检测 |
| XState 函数不可序列化 | JSON 无法完整表达运行逻辑 | 使用 TypeScript Registry |
| 代码生成后不可逆编辑 | 源码和 DSL 分叉 | 将 DSL 设为主源，生成代码不作为编辑源 |

## 7.1 特别需要验证的三个技术点

### A. OpenPencil 的元数据扩展能力

不能假设任意自定义字段都能完整经过 `.fig` 导入导出。

建议做实验：

- 给节点附加自定义 metadata。
- 导出 `.fig`。
- 重新导入。
- 检查 metadata 是否存在。
- 检查节点 ID 是否保持。

无论实验结果如何，都不要依赖 `.fig` 保存完整 UI DSL。

### B. Auto Layout 与 CSS 布局映射

重点验证：

- Flex。
- Gap。
- Padding。
- Alignment。
- Width / Height。
- Hug / Fill。
- CSS Grid。

不必一开始支持所有 Figma 布局语义。

先定义 DSL 支持的布局子集，再验证映射是否可逆。

### C. 自定义业务组件映射

例如：

- ElTable。
- ElForm。
- ElDialog。
- ECharts 图表。
- 自定义业务组件。

这些组件不能简单地映射为普通矩形或文本节点。

建议使用双层组件模型：

1. Design Representation：在画布中可编辑的视觉表示。
2. Runtime Component：在 Vue 中运行的真实业务组件。

二者通过稳定的 `component` 标识和属性 Schema 关联。

---

# 8. 数据一致性与版本管理

统一 DSL 成为核心数据源后，需要解决多入口编辑的问题。

## 8.1 版本管理

建议顶层增加：

```json
{
  "schemaVersion": "0.1.0",
  "revision": 12,
  "updatedAt": "2026-11-11T10:00:00Z"
}
```

## 8.2 变更记录

每次修改记录：

```json
{
  "operationId": "op-001",
  "type": "updateStyle",
  "targetId": "node-login-button",
  "revision": 12,
  "source": "agent",
  "patch": []
}
```

`source` 可以是：

- editor
- agent
- cli
- compiler
- import

## 8.3 冲突处理

初期不需要引入复杂 CRDT。

先使用：

- Revision 检查。
- JSON Patch。
- 乐观锁。
- 冲突提示。
- 手动合并。

等多人实时协同成为明确需求，再考虑 Yjs 等协同机制。

---

# 9. 开发顺序与资源投入

建议采用以下顺序：

| 阶段 | 工作内容 | 优先级 | 预估周期 |
|---|---|---|---|
| 技术预研 | OpenPencil API、SceneGraph、Vue SDK | P0 | 2～3 天 |
| PoC 1 | DSL 与 SceneGraph 双向转换 | P0 | 4～6 天 |
| PoC 2 | XState 交互与绑定 | P0 | 3～5 天 |
| PoC 3 | CLI + MCP | P1 | 3～5 天 |
| PoC 4 | Vue 3 Compiler | P1 | 4～6 天 |

以上是单人熟悉 TypeScript 和 Vue 3 情况下的粗略工程估算，不包含大规模视觉打磨、生产级测试和协作能力。

建议先投入约两周完成前三个 PoC 的核心验证，再决定是否进入平台化开发。

---

# 10. 最终技术决策

建议明确以下决策：

| 决策项 | 推荐方案 |
|---|---|
| 主工程底座 | OpenPencil |
| 页面模型参考 | OpenPage |
| 唯一数据源 | 自研 Unified UI DSL |
| 设计文件 | OpenPencil SceneGraph / `.fig` 投影 |
| 交互描述 | XState v5 JSON 配置 |
| 交互运行时 | XState v5 |
| 前端编辑器 | Vue 3 + OpenPencil Vue SDK |
| 页面运行时 | Vue 3 |
| 代码生成 | 自研 Vue Compiler |
| Agent 接入 | 自定义 CLI + MCP |
| 数据变更 | Operation Layer + JSON Patch |
| 版本控制 | Revision + Schema Version |

## 10.1 当前不建议做的事情

1. 不要直接 Fork OpenPage 并立即重写编辑器。
2. 不要把 OpenPencil SceneGraph 直接作为最终 DSL。
3. 不要把所有业务交互都塞进 OpenPencil。
4. 不要先做完整的 SDD 工作流。
5. 不要一开始就支持 React、Vue、Angular 多框架编译。
6. 不要过早实现多人协同和云端服务。
7. 不要把生成后的 Vue 源码当成第二个事实来源。

## 10.2 第一阶段最终交付物

第一阶段完成后，应该得到：

- 一个最小版统一 UI DSL Schema。
- 一个 Vue 3 + OpenPencil 编辑器 Demo。
- 一个 DSL → SceneGraph Adapter。
- 一个 SceneGraph → DSL Adapter。
- 一个可以双向编辑的登录页面。
- 一份字段映射与能力差异报告。
- 一套往返转换自动化测试。

**第一阶段的成功标准：同一份 JSON 能够驱动设计画布，用户修改设计画布后又能可靠更新原 JSON，而且不会破坏状态机、数据绑定和业务元数据。**

---

# 11. 最终建议

整个项目最难的部分不是把 OpenPencil 嵌入 Vue 页面，也不是开发 MCP，而是建立一个足够稳定的统一 DSL，并解决它与设计引擎之间的双向同步。

因此，建议按照以下顺序推进：

**先打通数据模型，再打通视觉编辑，再打通交互，最后打通 Agent 和代码生成。**

不要一开始就试图构建一个完整的 AI 低代码平台。

先用一个真实的登录页面验证完整闭环：

```text
        AI / 人工创建 DSL
                │
                ▼
          Unified JSON
                │
                ▼
         OpenPencil 编辑
                │
                ▼
          JSON 自动回写
                │
                ▼
          XState 交互绑定
                │
                ▼
          Vue 3 页面生成
                │
                ▼
           实际运行验证
```

只要这个闭环成立，后续增加表单、表格、图表、复杂业务组件、更多页面和 Agent 工作流，就有了可靠的工程基础。

**最终产品不应该只是一个 AI Design Tool，而应该是一个以结构化 UI 数据为核心、同时服务于人类设计师、开发者和 AI Agent 的 UI Engineering Platform。**