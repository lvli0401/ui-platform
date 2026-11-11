# AI-native UI Engineering Platform — 技术架构方案

## 1. 项目定位

构建一个面向 AI Agent 的 UI Engineering Platform，让 AI 能够直接创建、修改、预览和验证 UI，并最终生成可运行、可维护的 Vue 3 工程代码。

平台不以复刻 Figma 为目标，而是聚焦工程化 UI：

- 页面与组件的结构化创建和编辑
- 组件属性、样式、布局的可视化调整
- 交互状态机与数据绑定
- AI Agent 对页面进行精准、增量式修改
- 从设计数据生成生产级 Vue 3 代码

### 核心设计原则

1. **Virtual UI 是唯一事实来源**：设计数据、编辑器数据、AI 操作数据和持久化数据统一使用同一套节点模型。
2. **不直接持久化 Vue VNode**：使用可序列化的 Virtual UI 节点描述界面，运行时通过 Vue `h()` 创建 VNode。
3. **编辑器完全独立**：自研 Vue 3 Web Editor，不依赖 OpenPencil 或其他设计引擎。
4. **渲染与编辑分离**：Runtime 负责渲染，Editor 负责编辑，两者共享 Virtual UI 协议和组件注册信息。
5. **交互逻辑独立建模**：视觉结构与 XState 状态机分离，通过绑定关系连接。
6. **AI 直接操作结构化数据**：不通过截图识别、坐标模拟或中间设计工具来修改页面。

---

## 2. 总体架构

```text
                    AI Agent
                       │
                CLI / MCP API
                       │
                 Virtual UI Core
                       │
              Virtual UI Document
                       │
          ┌────────────┼────────────┐
          │            │            │
       Runtime       Editor       Codegen
          │            │            │
       Vue 3        Vue 3 Web     Vue 3 Project
       Renderer     Editor       Generator
          │            │            │
          └────────────┴────────────┘
                       │
                 Component Registry
                       │
             Schema / Metadata / Components

          Interaction Layer: XState
          Data Layer: Bindings / Data Sources
          Persistence: JSON Document
```

### 核心模块

| 模块 | 职责 |
|---|---|
| Virtual UI | 统一的可序列化 UI 节点协议 |
| Virtual UI Core | 文档管理、节点操作、校验、序列化 |
| Runtime Vue | 将 Virtual UI 渲染为 Vue 3 页面 |
| Editor Core | 选择、命令、历史记录、几何计算 |
| Editor Web | Canvas、图层面板、属性面板、交互界面 |
| Component Registry | 组件注册、属性 Schema、编辑器元数据 |
| Interaction Layer | XState 状态机及事件处理 |
| Codegen Vue | 生成生产级 Vue 3 项目 |
| CLI / MCP | 提供 AI Agent 操作接口 |

---

## 3. Virtual UI：统一数据模型

这是整个系统最核心的部分。

不再同时维护 Unified UI DSL 和 Vue VNode 两套模型，而是定义一套 **Serializable Virtual UI**。

它借鉴 Vue VNode 和 React Virtual DOM 的树形结构，但只保留声明式、可序列化的 UI 信息。

### 3.1 节点类型

```ts
type UINodeType =
  | 'element'
  | 'component'
  | 'text'
  | 'fragment'

interface UINode {
  id: string
  type: UINodeType

  // 原生元素
  tag?: string

  // 注册组件名称
  component?: string

  // 节点属性
  props?: Record<string, unknown>

  // 样式
  style?: Record<string, unknown>

  // 子节点
  children?: UINode[]

  // 数据绑定
  bindings?: Record<string, BindingDefinition>

  // 事件定义
  events?: Record<string, EventDefinition>

  // 同级节点稳定标识
  key?: string
}
```

说明：

- `id`：编辑器和文档层面的稳定节点身份。
- `key`：运行时同级节点的稳定标识，默认可以使用 `id`。
- `type`：区分原生元素、组件、文本和 Fragment。
- `tag`：原生 HTML 标签，例如 `div`、`span`。
- `component`：组件注册表中的名称，例如 `Button`、`Card`。
- `props`：组件属性。
- `style`：样式定义。
- `children`：子节点。
- `bindings`：响应式数据绑定。
- `events`：事件定义。

### 3.2 JSON 示例

```json
{
  "version": "1.0.0",
  "type": "fragment",
  "id": "login-page",
  "children": [
    {
      "id": "login-card",
      "type": "component",
      "component": "Card",
      "props": {
        "title": "用户登录"
      },
      "children": [
        {
          "id": "username",
          "type": "component",
          "component": "Input",
          "props": {
            "placeholder": "请输入用户名"
          }
        },
        {
          "id": "password",
          "type": "component",
          "component": "Input",
          "props": {
            "placeholder": "请输入密码",
            "type": "password"
          }
        },
        {
          "id": "submit",
          "type": "component",
          "component": "Button",
          "props": {
            "type": "primary",
            "label": "登录"
          }
        }
      ]
    }
  ]
}
```

### 3.3 文档结构

节点树是页面的核心，但完整项目还需要其他描述信息。

```ts
interface UIDocument {
  version: string

  project?: ProjectDefinition

  theme?: ThemeDefinition

  tokens?: DesignTokens

  components?: ComponentDefinition[]

  pages: PageDefinition[]

  machines?: MachineDefinition[]

  bindings?: BindingDefinition[]

  dataSources?: DataSourceDefinition[]

  assets?: AssetDefinition[]

  metadata?: Record<string, unknown>
}
```

建议将页面树、状态机、数据绑定和设计 Token 分开组织，避免把所有业务信息塞进节点属性。

---

## 4. Runtime Vue：基于 Vue 3 渲染

### 4.1 渲染流程

```text
Virtual UI JSON
      │
      ▼
Virtual UI Runtime
      │
      ├── 节点类型解析
      ├── 组件注册表解析
      ├── Props / Style 解析
      ├── Binding 解析
      ├── Event 解析
      │
      ▼
Vue h() 创建 VNode
      │
      ▼
Vue Renderer
      │
      ▼
DOM
```

这里不需要再建立一套独立的 DSL-to-VNode 架构层。

Virtual UI Runtime 直接根据节点描述调用 Vue `h()`，创建 Vue VNode。Vue 自己负责后续的组件更新和 DOM Patch。

### 4.2 Runtime 示例

```ts
import { h, Fragment } from 'vue'

function renderNode(node: UINode) {
  if (node.type === 'fragment') {
    return h(
      Fragment,
      {},
      node.children?.map(renderNode)
    )
  }

  if (node.type === 'text') {
    return String(node.props?.text ?? '')
  }

  const component =
    node.type === 'element'
      ? node.tag
      : componentRegistry[node.component!]?.component

  if (!component) {
    return h('div', {}, `Unknown component`)
  }

  return h(
    component,
    {
      ...resolveProps(node),
      ...resolveEvents(node),
      key: node.key ?? node.id,
      'data-node-id': node.id,
      style: resolveStyle(node)
    },
    node.children?.map(renderNode)
  )
}
```

这是概念示例。正式实现还需要处理动态插槽、条件渲染、组件模型绑定、事件参数、异步组件和错误边界等情况。

### 4.3 为什么不直接保存 Vue VNode？

Vue VNode 是运行时对象，不是稳定的 JSON 文档格式。

它包含 DOM 引用、组件实例、内部标记以及渲染过程使用的字段。直接持久化会导致：

- 无法可靠 JSON 序列化
- 依赖 Vue 内部实现细节
- 不利于版本迁移
- 不利于 AI 直接读写
- 编辑器无法稳定地操作节点

因此，Virtual UI 是持久化模型，Vue VNode 是运行时对象。

两者不是两套需要人工维护的 UI DSL，而是文档数据与运行时实例的关系。

---

## 5. Virtual UI Core：文档与节点操作

Virtual UI Core 不依赖 Vue，也不依赖编辑器。

它负责所有对文档的结构化操作。

### 5.1 核心能力

```text
virtual-ui/
├── types/
├── schema/
├── document/
├── operations/
├── serialization/
├── validation/
└── indexing/
```

主要职责：

- 文档创建、读取和保存
- 节点新增、删除、移动和更新
- 节点树结构校验
- JSON 序列化和反序列化
- 文档版本迁移
- 节点索引与父子关系维护
- 操作记录和变更追踪

### 5.2 节点索引

不要在每次编辑时都递归遍历整棵树。

建议维护：

```ts
interface DocumentIndex {
  nodeMap: Map<string, UINode>
  parentMap: Map<string, string | null>
  childrenMap: Map<string, string[]>
}
```

这样可以快速定位节点、查找父节点以及执行移动操作。

索引属于运行时派生数据，不需要持久化到 JSON。

### 5.3 Command Engine

所有编辑操作统一通过 Command 执行。

```ts
interface UICommand {
  execute(document: UIDocument): void
  undo(document: UIDocument): void
}
```

例如：

- InsertNodeCommand
- DeleteNodeCommand
- UpdatePropsCommand
- UpdateStyleCommand
- MoveNodeCommand
- ResizeNodeCommand

这样可以统一支持：

- Undo / Redo
- AI 修改
- 编辑器交互
- 批量操作
- 操作审计

文档变更可以采用 JSON Patch 或自定义 Operation 记录，不必每次都复制整份 JSON。

---

## 6. Editor：独立 Web 编辑器

编辑器完全自研，使用 Vue 3 实现。

**不引入 OpenPencil 的任何包、SceneGraph、Renderer 或内部数据结构。**

### 6.1 编辑器结构

```text
editor-web/
├── canvas/
│   ├── viewport/
│   ├── renderer/
│   └── overlay/
│
├── layers/
├── properties/
├── toolbar/
└── panels/

editor-core/
├── store/
├── command/
├── history/
├── selection/
├── geometry/
└── snap/
```

### 6.2 核心功能

| 功能 | 实现方式 |
|---|---|
| Canvas | DOM + Vue Runtime |
| Zoom / Pan | CSS Transform |
| Layers | Virtual UI 节点树 |
| Selection | `data-node-id` 映射 |
| Properties | Component Schema 驱动 |
| Drag | Pointer Events |
| Resize | Overlay + Geometry |
| Snap | 自研吸附计算 |
| Undo / Redo | Command History |
| Preview | Runtime Vue |

### 6.3 节点选中

Runtime 渲染的 DOM 节点携带：

```html
<div data-node-id="login-card">
```

Selection Engine 通过 `data-node-id` 找到对应的 Virtual UI 节点。

选中状态和编辑器 Overlay 状态独立管理，不要把选中框、拖拽控制点等编辑器 UI 写入 Virtual UI 文档。

### 6.4 拖拽与调整大小

建议采用：

```text
Pointer Down
     │
     ▼
记录初始位置和尺寸
     │
     ▼
Pointer Move
     │
     ▼
更新临时几何状态
     │
     ▼
Canvas Overlay 实时预览
     │
     ▼
Pointer Up
     │
     ▼
提交 Command
     │
     ▼
更新 Virtual UI
```

拖动过程中不要频繁深拷贝整棵节点树。

高频几何计算使用 `requestAnimationFrame` 合并更新，最终只提交一次持久化操作。

### 6.5 布局策略

优先使用浏览器原生布局能力：

- Flexbox
- CSS Grid
- Absolute Positioning
- CSS Transform

通过 `getBoundingClientRect()` 获取实际几何信息。

需要统一处理 Canvas 缩放比例、浏览器坐标和文档坐标之间的转换。

不建议一开始就实现完整 Figma 式图形布局引擎。

---

## 7. Component Registry：统一组件体系

组件注册表是 Runtime、Editor 和 Codegen 之间的重要桥梁。

```ts
interface ComponentDefinition {
  name: string

  component: Component

  schema: JSONSchema

  category: string

  defaultProps: Record<string, unknown>

  editor?: EditorDefinition
}
```

每个组件需要提供：

1. Vue 组件实现
2. JSON Schema
3. 默认属性
4. 编辑器元数据
5. 属性分类与说明

### Schema 驱动属性面板

| Schema 类型 | 编辑器控件 |
|---|---|
| String | Input |
| Number | Number Input |
| Boolean | Switch |
| Enum | Select |
| Color | Color Picker |
| Object | Nested Properties |
| Array | List Editor |

这样 AI 可以通过 Schema 理解组件能力，Editor 可以自动生成属性面板，Codegen 也可以复用组件定义。

---

## 8. Interaction Layer：XState 交互体系

视觉结构和交互逻辑分开建模。

Virtual UI 描述页面结构、样式和组件属性；XState 描述页面的交互状态。

### 8.1 结构

```text
Virtual UI
    │
    ├── Component Tree
    ├── Props / Style
    ├── Bindings
    └── Events
           │
           ▼
      XState Machines
           │
           ├── States
           ├── Events
           ├── Actions
           ├── Guards
           └── Services
```

### 8.2 示例

登录页面可以定义：

```json
{
  "id": "login-machine",
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
        "ERROR": "error"
      }
    },
    "success": {},
    "error": {}
  }
}
```

组件通过 Binding 关联状态：

```json
{
  "nodeId": "submit",
  "props": {
    "loading": {
      "type": "state",
      "machine": "login-machine",
      "path": "loading"
    }
  }
}
```

正式协议需要进一步明确状态值选择器、事件参数和类型校验。

### 8.3 安全边界

不要在 Virtual UI JSON 中直接保存任意 JavaScript 函数。

所有 Action、Guard、Service 都通过受控注册表引用，避免 AI 生成任意可执行代码。

---

## 9. CLI / MCP：AI Agent 操作入口

AI Agent 不应该直接修改任意 JSON 文本，而是通过 Virtual UI Core 提供的操作接口进行结构化编辑。

### 9.1 核心工具

```text
get_document
get_page
get_node
get_component_schema

insert_node
update_node
delete_node
move_node

validate_document
get_page_preview
```

### 9.2 设计原则

- CLI 和 MCP 共用同一套 Core API。
- 操作支持节点 ID 定位。
- 修改前后执行 Schema 和结构校验。
- 支持批量操作和事务。
- 返回明确的变更结果。
- 保留操作记录，便于 Undo / Redo。

例如，AI 想修改登录按钮颜色，不需要重新生成整个页面，只需要定位 `submit` 节点并更新其样式。

---

## 10. Codegen：生成生产级 Vue 3 项目

Codegen 负责把 Virtual UI 转换成真正的 Vue 3 工程代码。

```text
Virtual UI Document
        │
        ▼
    Codegen Vue
        │
        ├── Vue Components
        ├── CSS / SCSS
        ├── XState Machines
        ├── Data Bindings
        ├── Assets
        └── Project Config
        │
        ▼
Vue 3 + TypeScript Project
```

需要注意：

- Runtime 主要负责预览和动态渲染。
- Codegen 负责输出可维护的生产代码。
- 两者可以共享组件注册、Schema、绑定协议和布局定义。
- 不应该直接把编辑器内部组件复制到生产项目。
- 生成代码应尽可能保留组件语义，而不是输出大量无意义的嵌套 div。

---

## 11. 性能设计

Virtual UI 借鉴 Virtual DOM 的树形结构，但性能不会因为采用虚拟节点就自动得到保证。

重点关注以下方面：

1. 节点索引：通过 `nodeMap` 和 `parentMap` 减少树遍历。
2. 稳定 ID：避免无意义的节点重建。
3. 局部更新：只修改目标节点和相关属性。
4. 响应式粒度：避免整份 Document 作为一个深层响应式对象。
5. 拖拽优化：临时几何状态与持久化文档分离。
6. 渲染优化：合理拆分组件边界，避免无关组件重复更新。
7. 历史记录：采用操作记录，而不是频繁复制完整文档。

建议建立实际 Benchmark，至少测试：

- 100 个节点
- 500 个节点
- 1000 个节点

重点测量初次渲染时间、单节点属性更新耗时、拖拽帧率、批量节点更新耗时和内存占用。

---

## 12. 技术边界与依赖约束

### 明确采用

- Vue 3
- TypeScript
- XState v5
- JSON Schema
- 自研 Virtual UI Core
- 自研 Web Editor
- 自研 Vue Runtime
- 自研 Vue Codegen

### 明确不采用

- OpenPencil SceneGraph
- OpenPencil Renderer
- OpenPencil 内部 DSL
- OpenPencil Runtime
- 将 Vue VNode 直接作为持久化数据
- 在 JSON 中保存任意可执行 JavaScript

在线编辑器必须能够独立安装、构建和运行，不依赖 OpenPencil 包。

建议在 CI 中扫描 `package.json`、lockfile 和源码 import，禁止引入 `@open-pencil/*` 及其他 OpenPencil 内部依赖。

---

## 13. Monorepo 目录结构

```text
packages/
├── virtual-ui/
│   ├── types/
│   ├── schema/
│   ├── document/
│   ├── operations/
│   ├── serialization/
│   ├── validation/
│   └── indexing/
│
├── runtime-vue/
│   ├── component-registry/
│   ├── binding/
│   └── renderer/
│
├── editor-core/
│   ├── store/
│   ├── command/
│   ├── history/
│   ├── selection/
│   ├── geometry/
│   └── snap/
│
├── editor-web/
│   ├── canvas/
│   ├── layers/
│   ├── properties/
│   ├── toolbar/
│   └── panels/
│
├── interaction-xstate/
│
├── codegen-vue/
│
├── cli/
│
└── mcp/
```

---

## 14. POC 实施路线

不建议一开始就开发完整平台。先验证最核心的技术闭环。

### P0：验证 Virtual UI 到编辑器的闭环

- [ ] 定义 Virtual UI 基础类型
- [ ] 定义 JSON Schema
- [ ] 实现 Document Store
- [ ] 实现 nodeMap / parentMap
- [ ] 实现 Vue Runtime Renderer
- [ ] 实现 Component Registry
- [ ] 实现基础 Canvas
- [ ] 实现 Layers Panel
- [ ] 实现节点选择
- [ ] 实现 Properties Panel
- [ ] 实现节点新增、删除、拖拽
- [ ] 实现 Flex / Absolute 布局
- [ ] 实现 Command Engine
- [ ] 实现 Undo / Redo
- [ ] 实现 JSON 保存和加载

**P0 验收标准：**

能够从 JSON 加载页面，在编辑器中选择组件、修改属性、拖拽节点，并将修改后的 Virtual UI 保存为 JSON。重新加载后，页面结构和样式保持一致。

### P1：增强编辑能力

- [ ] Zoom / Pan
- [ ] Snap / Alignment
- [ ] Resize
- [ ] 多选
- [ ] 复制粘贴
- [ ] Grid 布局
- [ ] Schema-driven 属性面板
- [ ] XState 交互预览
- [ ] 增量更新性能测试

### P2：接入 AI 与代码生成

- [ ] CLI
- [ ] MCP
- [ ] AI Virtual UI Generator
- [ ] AI 节点级修改
- [ ] Vue Code Generator
- [ ] 数据绑定编辑器
- [ ] 状态机编辑器
- [ ] 多人协同（后续再考虑）

---

## 15. POC 验证页面

建议先做两个典型页面。

### 登录页面

验证：

- 基础组件渲染
- Flex 布局
- 表单属性
- 组件 Schema
- XState 状态机
- 数据绑定
- 事件处理

### Dashboard 页面

验证：

- 多层级节点树
- Flex / Grid 混合布局
- 复杂组件组合
- 组件复用
- 绝对定位
- 多节点选择
- 拖拽与吸附
- 增量更新性能

---

## 16. 最终架构决策

本方案最终收敛为：

**Virtual UI 是唯一的 UI 数据模型，Vue 3 是运行时和渲染引擎，自研 Editor 是直接操作 Virtual UI 的编辑工具。**

不再保留独立 DSL 到 Vue VNode 的重量级转换架构，也不再依赖 OpenPencil。

需要保留的唯一运行时适配是：根据 Virtual UI 节点调用 Vue `h()` 创建 VNode。这个过程属于 Runtime 的内部实现，不是另一套数据模型。

最终形成四个核心能力：

| 核心能力 | 统一职责 |
|---|---|
| Virtual UI | 描述 UI |
| Virtual UI Runtime | 运行 UI |
| Virtual UI Editor | 编辑 UI |
| Virtual UI Codegen | 生成代码 |

这套架构的关键价值是：**AI、编辑器、运行时和代码生成围绕同一份结构化 UI 数据协作，不需要在多个设计模型之间反复转换。**