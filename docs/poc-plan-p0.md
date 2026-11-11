# Virtual UI P0 执行计划

| 项 | 内容 |
|---|---|
| 版本 | 1.0 |
| 状态 | 待执行 |
| 上位文档 | [poc.md](./poc.md) |
| 适用范围 | P0 阶段，登录页闭环 |
| 更新日期 | 2026-11-11 |

## 0. 文档状态与前置动作

本计划以 `docs/poc.md` 为唯一架构依据。`docs/plan.md` 描述的是已废弃的 OpenPencil + Unified DSL 方案，与 `poc.md` 的依赖约束互斥，不得作为实现依据。

执行前建议完成两个动作：

1. 提交 `docs/poc.md`，使其成为版本控制中的现行架构文档。
2. 将 `docs/plan.md` 移动到 `docs/archive/plan-openpencil-superseded.md`，或在文件头标注 `SUPERSEDED`。仓库中不得同时存在两份互相矛盾的现行方案。

本计划只覆盖 P0。P1（增强编辑）、P2（AI 与代码生成）不在本文档范围内。

---

## 1. 目标与范围

### 1.1 P0 目标

用登录页验证一条完整闭环：

```text
JSON 文档
  → Virtual UI Core 校验与索引
  → Vue Runtime 渲染
  → Editor 选择与属性编辑
  → Command 提交与撤销
  → 导出 JSON
  → 重新导入
  → 结构、属性、样式与导出前一致
```

P0 结束时应能回答三个问题：

1. Virtual UI 节点模型是否足以表达一个真实页面，并能稳定序列化。
2. Vue `h()` 渲染路径是否能忠实、可定位地渲染该模型。
3. 自研编辑器能否在不污染文档的前提下完成选择、编辑、撤销和保存。

### 1.2 P0 范围

- 登录页单一验收页面
- `element` / `component` / `text` / `fragment` 四类节点
- 4 个基础组件：`Text`、`Card`、`Input`、`Button`
- Flex 与绝对定位两种布局
- 单选、属性编辑、样式编辑
- 插入、删除、同级与跨级移动
- 画布内拖动（两种定位模式）
- Undo / Redo
- JSON 文件导入导出
- 单元测试、组件测试、Playwright E2E
- CI 与 OpenPencil 依赖禁令

### 1.3 非目标

- Dashboard 页面（P1）
- XState 求值、交互预览（P1）
- CLI、MCP、AI 生成与节点级修改（P2）
- Vue Codegen（P2）
- Zoom / Pan、吸附、网格、Resize、多选、复制粘贴（P1）
- CSS Grid 完整支持（P1）
- 后端存储、多人协同、版本迁移实现
- 完整设计系统、主题系统、图标库
- 组件插槽、异步组件、错误边界、动态组件

---

## 2. 架构不变量

以下约束贯穿所有任务，任何实现不得违反：

1. **Virtual UI 是唯一事实来源。** 设计数据、编辑器数据、AI 操作数据、持久化数据使用同一套可序列化节点模型。
2. **不持久化 Vue VNode。** VNode 只在运行时由 `h()` 创建，不进入文档、不进入 JSON、不进入历史快照。
3. **编辑器完全独立。** 不引入 `@open-pencil/*` 任何包、SceneGraph、Renderer 或内部数据结构。
4. **渲染与编辑分离。** Runtime 只负责渲染；Editor 只负责编辑；二者共享 Virtual UI 协议与组件注册表。
5. **编辑器状态不进入文档。** 选择、悬停、视口、拖拽几何、Overlay 状态只存在于 `EditorStore`。
6. **所有文档变更经 Command。** 编辑器 UI、快捷键、未来的 AI 操作使用同一套命令接口。
7. **JSON 中不保存可执行代码。** `props` 限定为 `JsonValue`；事件与绑定只保存注册名引用。
8. **布局使用浏览器原生能力。** Flexbox、绝对定位、`getBoundingClientRect()`；不实现 Figma 式布局引擎。
9. **组件定义存在于代码。** 文档只保存组件名与 props，不保存组件实现或 Schema。
10. **依赖方向单向。** `@vui/core` ← `@vui/runtime-vue` ← `@vui/editor-core` ← `@vui/editor-web`。`@vui/core` 与 `@vui/editor-core` 不依赖 Vue。

---

## 3. 里程碑与任务总表

### 3.1 里程碑

核心策略：先纵切一条可运行骨架，再横向加固。不做“先写完所有底层模块，最后集成”的瀑布式推进。

| 里程碑 | 任务 | 退出标准 |
|---|---|---|
| M0 契约与基座 | T01–T03 | `pnpm verify` 全绿；依赖禁令生效；文档、索引、序列化契约有测试 |
| M1 纯渲染 | T04–T05（T06 可并行） | 登录页 fixture 经 `h()` 渲染，`data-node-id` 完整，样式正确 |
| M2 只读编辑器 | T07–T08 | Playwright：点击节点后选中态与 Layers 高亮同步，文档 revision 不变 |
| M3 Walking Skeleton | T09–T10 | Playwright：加载 → 选中 → 改属性 → 导出 → 重新加载 → 结构一致。**go/no-go 门** |
| M4 编辑加固 | T11–T12 | 增删移、画布拖拽、undo/redo 的 E2E 全绿 |
| M5 健壮性与验收 | T13 | 非法文档拒绝、事件惰性、完整验收套件与生产构建通过 |

T10 是 go/no-go 门。T10 未通过时暂停 T11、T12，先修复闭环。禁止在闭环未成立时继续铺开功能。

### 3.2 任务总表

| ID | 任务 | 依赖 | 主要产出 | 独立验证 |
|---|---|---|---|---|
| T01 | Monorepo 与依赖禁令 | — | workspace、CI、扫描器 | `pnpm verify`、扫描器单测 |
| T02 | Virtual UI 类型与校验 | T01 | `@vui/core` 类型、校验、fixture | `pnpm vitest run packages/virtual-ui` |
| T03 | 文档存储、索引、序列化 | T01、T02 | 索引、序列化、DocumentStore | 同上 |
| T04 | 组件注册表与 4 个组件 | T02 | `@vui/runtime-vue/component-registry` | `pnpm vitest run packages/runtime-vue` |
| T05 | Vue Runtime Renderer | T02、T04 | `renderNode`、`VirtualUIRuntime`、playground | 渲染快照 |
| T06 | Command Engine 与 History | T03 | 命令、历史、dispatch | 命令单测 |
| T07 | Editor Core 状态与选择 | T03、T06 | `@vui/editor-core` 选择逻辑 | 选择单测 |
| T08 | Editor Web 外壳 | T05、T07 | Canvas、Layers、应用壳 | Playwright selection |
| T09 | 属性面板与属性编辑 | T06、T08 | Properties Panel、控件 | 组件测试 + E2E |
| T10 | 持久化与 Walking Skeleton | T09 | 导入导出、验收脚本 | `pnpm test:e2e --grep walking` |
| T11 | 结构编辑 | T09、T10 | 插入、删除、移动接入 UI | 命令测试 + E2E |
| T12 | Canvas 拖拽与布局验证 | T11 | 拖动、临时几何、提交 | Playwright drag |
| T13 | 健壮性与 P0 验收 | T12 | 错误处理、构建、全量验收 | `pnpm verify && pnpm build && pnpm test:e2e` |

### 3.3 依赖图

```text
T01 ── T02 ── T03 ──┬── T04 ── T05 ──┬── T08 ── T09 ── T10 ── T11 ── T12 ── T13
                    │                │
                    └── T06 ── T07 ──┘
```

并行说明：

- T04 与 T06 可在 T02 完成后并行。
- T05 依赖 T04；T07 依赖 T06。
- T08 汇合 T05 与 T07。
- T09 之后为串行主链，不提前铺开。

---

## 4. 任务明细

每个任务必须满足统一 Definition of Done：

1. 代码通过 `pnpm typecheck` 与 `pnpm lint`。
2. 新增逻辑有对应 Vitest 测试，且该任务的测试命令可单独执行。
3. 不引入非必要依赖；不引入 `@open-pencil/*`。
4. 导出类型与本文档契约一致；契约变更需先修改本文档。
5. 不提前实现后续任务的 UI 或 API。

### T01 Monorepo 与依赖禁令

**目标**：建立可重复构建、可重复验证的工程基座。

**范围**

- pnpm workspace，包含 `packages/*` 与 `apps/*`。
- 根 `package.json`、`pnpm-workspace.yaml`、`tsconfig.base.json`、`.gitignore`。
- ESLint flat config：`typescript-eslint`、`eslint-plugin-vue`、`no-eval`、`no-new-func`、`no-restricted-imports` 禁止 `@open-pencil/*`。
- Vitest 根配置、Playwright 配置（仅 chromium）。
- GitHub Actions：install → check:ban → typecheck → lint → test → e2e。
- 依赖扫描器 `scripts/lib/banned-deps.mjs`，导出 `scanRepository(rootDir)`。
- 扫描范围：所有 `package.json` 的 dependencies / devDependencies / peerDependencies / optionalDependencies、`pnpm-lock.yaml`、`packages/**` 与 `apps/**` 中 `.ts/.tsx/.vue/.js/.mjs` 的 import 说明符。
- 命中 `@open-pencil/` 或 `open-pencil` 时输出 `{ file, line, match, kind }` 并以退出码 1 结束。
- 扫描器自带 `scripts/test-fixtures/clean/` 与 `scripts/test-fixtures/banned/` 测试夹具，且扫描时排除自身夹具目录。

**包命名与依赖**

| 包 | npm 名称 | 依赖 |
|---|---|---|
| `packages/virtual-ui` | `@vui/core` | 无，不依赖 Vue |
| `packages/runtime-vue` | `@vui/runtime-vue` | `vue`、`@vui/core` |
| `packages/editor-core` | `@vui/editor-core` | `@vui/core`，不依赖 Vue |
| `packages/editor-web` | `@vui/editor-web` | 以上全部、`vue` |
| `apps/playground` | `@vui/playground` | `vue`、`@vui/core`、`@vui/runtime-vue` |

P0 中包直接导出 TypeScript 源码，由 Vite 与 Vitest 解析，不引入构建步骤。发布构建推迟到 P1。

**非目标**：发布流程、Changesets、多浏览器矩阵、Docker。

**产出**

```text
package.json
pnpm-workspace.yaml
tsconfig.base.json
eslint.config.js
vitest.config.ts
playwright.config.ts
.github/workflows/ci.yml
scripts/check-banned-deps.mjs
scripts/lib/banned-deps.mjs
scripts/test-fixtures/{clean,banned}/
packages/{virtual-ui,runtime-vue,editor-core,editor-web}/package.json
apps/playground/package.json
```

**验收标准**

1. `pnpm install --frozen-lockfile && pnpm verify` 通过。
2. 在任意包源码中加入 `import '@open-pencil/core'` 后，`pnpm check:ban` 失败并输出文件与行号。
3. 移除该 import 后恢复通过。
4. CI 在 PR 上按既定顺序执行；任一步失败即阻断。
5. 扫描器单测覆盖：依赖字段命中、lockfile 命中、源码 import 命中、干净仓库不误报。

**验证**：`pnpm verify` + 扫描器单测。

### T02 Virtual UI 类型、Schema、校验

**目标**：固定 P0 的文档协议，使后续所有模块围绕同一份类型开发。

**范围**

- `UINode`、`UINodeType`、`UIStyle`、`UIDocument`、`PageDefinition`、`ThemeDefinition`、`BindingDefinition`、`EventDefinition`、`JsonValue`。
- `DOCUMENT_SCHEMA_VERSION = '0.1.0'`。
- `validateDocument(value: unknown): ValidationIssue[]`。校验规则：
  - 顶层必填字段与类型。
  - `schemaVersion` 必须为已知版本。
  - `pages` 非空且 `id` 唯一。
  - 节点 `id` 全局唯一，非空字符串。
  - `type` 必须为四种之一。
  - `element` 必须有非空 `tag`。
  - `component` 必须有非空 `component`。
  - `text` 必须有 `props.text`，且不得有 `children`。
  - `fragment` 不得有 `tag` 或 `component`。
  - props / style / meta 必须为 JSON 可序列化值，拒绝函数、`undefined`、`Symbol`、循环引用。
  - `style` 只允许 `UIStyle` 白名单键。
- `createDocument(name?: string): UIDocument`。
- `createNodeId(prefix?: string): string`。
- `fixtures/login.page.json` 与 `fixtures/login.page.invalid.json`。

**非目标**：迁移实现、远程 Schema 加载、Ajv、复杂 JSON Schema 支持。

**产出**

```text
packages/virtual-ui/src/types.ts
packages/virtual-ui/src/schema.ts
packages/virtual-ui/src/validation.ts
packages/virtual-ui/src/ids.ts
packages/virtual-ui/src/index.ts
fixtures/login.page.json
fixtures/login.page.invalid.json
```

**验收标准**

1. 合法 fixture 返回空 issue 数组。
2. `login.page.invalid.json` 中每一类错误均被单独捕获，且 issue 带 JSON 路径（如 `pages[0].root.children[1].id`）。
3. TypeScript 类型不允许在 `props` 中放函数。
4. `createDocument` 生成可被 `validateDocument` 接受的文档。
5. 校验器对未知 style 键给出警告级 issue（不阻断渲染）。

**验证**：`pnpm vitest run packages/virtual-ui`。

### T03 Document Store、索引、序列化

**目标**：提供 O(1) 节点定位与稳定的文档读写，不依赖 Vue。

**范围**

- `buildDocumentIndex(document): DocumentIndex`，包含 `nodeMap`、`parentMap`、`childrenMap`、`pageRootMap`、`nodePageMap`。
- `findNode`、`findParentNode`、`getNodePath`。
- `assertIndexInvariants(document, index)`：检查索引与树一致、节点只能从唯一页根到达、无重复 id、父子关系双向一致。
- `serializeDocument(document): string`：稳定输出（键顺序固定，2 空格缩进，末尾换行）。
- `parseDocument(json: string): ParseResult`：语法错误与校验错误均返回 issue，不抛异常。
- `DocumentStore`：持有文档与索引；`replaceDocument`、`subscribe`；`revision` 规则。
- 版本迁移占位 `migrateDocument(document): UIDocument`，P0 只接受 `0.1.0`。

**非目标**：命令、历史、编辑器状态、持久化后端。

**产出**

```text
packages/virtual-ui/src/indexing.ts
packages/virtual-ui/src/serialization.ts
packages/virtual-ui/src/document-store.ts
packages/virtual-ui/src/migration.ts
对应测试与 500 节点随机树生成器（测试工具）
```

**验收标准**

1. 索引覆盖全部节点；500 节点随机树上 `findNode` 与递归查找结果一致。
2. 序列化 → 解析 → 再序列化，两次输出字节一致。
3. 未知 `schemaVersion` 返回 `{ ok: false, issues: [...] }`。
4. `assertIndexInvariants` 能发现人为制造的父子映射错误。
5. 导入文档保留原 `revision`；`replaceDocument` 不做隐式递增。

**验证**：`pnpm vitest run packages/virtual-ui`。

### T04 Component Registry 与最小组件

**目标**：让 Runtime 能按名解析组件，并让 Editor 获得属性 Schema。

**范围**

- `PropertySchema`：`string | number | boolean`，支持 `enum`、`format: 'color'`、`minimum`、`maximum`、`default`。
- `ComponentDefinition`：`name`、`component`、`propsSchema`、`category`、`defaultProps`、`defaultStyle`、`editor`。
- `ComponentRegistry`：`register`、`get`、`list`、`createNode`。
- `createBasicRegistry()` 注册 4 个组件：

| 组件 | props | 默认值 | 用途 |
|---|---|---|---|
| `Text` | `text` 字符串（必填）、`as` 枚举 `span/p/h1/h2` | `{ text: 'Text', as: 'span' }` | 标题与文本 |
| `Card` | 无 | `{}`；默认 flex column、padding 32、gap 16、圆角 12、白底 | 卡片容器 |
| `Input` | `placeholder`、`type`（`text/password`）、`value`、`disabled` | `{ placeholder: '', type: 'text', value: '', disabled: false }` | 表单输入 |
| `Button` | `label`（必填）、`variant`（`primary/secondary`）、`disabled` | `{ label: 'Button', variant: 'primary', disabled: false }` | 操作按钮 |

- 组件实现为普通 Vue SFC；只消费 props，不读取全局状态。
- 组件定义只存在于代码中，不写入文档。

**非目标**：主题、图标、插槽、异步组件、组件嵌套注册、完整 JSON Schema。

**产出**

```text
packages/runtime-vue/src/component-registry/types.ts
packages/runtime-vue/src/component-registry/registry.ts
packages/runtime-vue/src/component-registry/basic/{Text.vue,Card.vue,Input.vue,Button.vue,definitions.ts}
```

**验收标准**

1. `registry.get('Button')` 返回定义；`registry.get('Unknown')` 返回 `undefined`。
2. `registry.createNode('Button')` 自动合入 defaultProps，并生成唯一 id。
3. 4 个组件均有 Vue Test Utils 渲染测试。
4. `propsSchema` 可枚举，且每个字段有 `type` 与 `title`。
5. 组件实现中不存在对 `UIDocument` 的直接引用。

**验证**：`pnpm vitest run packages/runtime-vue`。

### T05 Vue Runtime Renderer

**目标**：把 Virtual UI 节点树忠实渲染为 Vue VNode。

**范围**

- `resolveStyle(style?: UIStyle): Record<string, string | number> | undefined`。
- `renderNode(node, context): VNodeChild`。
- `renderPage(page, context): VNode`。
- `VirtualUIRuntime` 组件：接收 `page`、`registry`、`revision?`、`interactive?`。
- 节点处理：
  - `fragment`：Vue `Fragment`。
  - `text`：输出 `props.text` 原始文本。
  - `element`：`h(node.tag, ...)`。
  - `component`：从注册表取实现；未知名渲染 `<div data-node-id data-unknown-component="Name">Unknown component: Name</div>`，不抛错。
- 所有节点写 `data-node-id`；`key = node.key ?? node.id`。
- 事件只在 `context.resolveHandler` 存在时挂载；P0 默认不传。
- 绑定字段不参与渲染（P0 惰性）。
- `apps/playground`：加载 fixture 并渲染的最小 Vite 页面，用于隔离 Runtime 问题。

**非目标**：绑定求值、XState、异步组件、错误边界、CSS 变量、主题注入。

**产出**

```text
packages/runtime-vue/src/renderer/resolve-style.ts
packages/runtime-vue/src/renderer/render-node.ts
packages/runtime-vue/src/renderer/VirtualUIRuntime.ts
packages/runtime-vue/src/index.ts
apps/playground/{index.html,vite.config.ts,src/main.ts}
```

**验收标准**

1. 登录页 fixture 渲染快照稳定；4 种节点类型全部覆盖。
2. 树中每个节点对应 DOM 均带 `data-node-id`，且值与节点 id 一致。
3. 未知组件产生可见降级块并带 `data-unknown-component`。
4. 数字型长度样式输出为 px；字符串样式原样输出；camelCase 正确转 inline style。
5. 源码中不存在 `eval`、`new Function`。
6. `apps/playground` 启动后可见登录页，无控制台错误。

**验证**：`pnpm vitest run packages/runtime-vue` + `pnpm --filter @vui/playground dev` 人工检查。

### T06 Command Engine 与 History

**目标**：让所有文档变更可撤销、可重做、可测试。

**范围**

- `CommandState { document, index }`。
- `UICommand { kind, execute(state), undo(state) }`。
- `CommandHistory`：`execute`、`undo`、`redo`、`clear`、`canUndo`、`canRedo`。
- `DocumentStore.dispatch(command)`：执行命令、重建或增量更新索引、递增 `revision`、通知订阅者。
- 5 个命令：

| 命令 | 参数 | 行为 |
|---|---|---|
| `UpdatePropsCommand` | `nodeId`、`patch` | 合并 props；undo 恢复被触及的键 |
| `UpdateStyleCommand` | `nodeId`、`patch` | 合并 style；undo 恢复被触及的键 |
| `InsertNodeCommand` | `parentId`、`node`、`index?` | 插入子树并重建该子树索引 |
| `DeleteNodeCommand` | `nodeId` | 摘除子树，按引用保留以便 undo |
| `MoveNodeCommand` | `nodeId`、`parentId`、`index` | 同层或跨层移动；禁止移入自身后代 |

- 惰性快照：命令首次 `execute` 时记录 before 状态；redo 复用首次快照，不覆盖。
- 提交时浅拷贝顶层文档并递增 `revision`；不深拷贝节点树。
- 命令抛出异常时不写入历史。

**非目标**：事务合并、批量命令 UI、JSON Patch、操作日志持久化、协同。

**产出**

```text
packages/virtual-ui/src/commands/{types,update-props,update-style,insert-node,delete-node,move-node}.ts
packages/virtual-ui/src/history.ts
packages/virtual-ui/src/document-store.ts（扩展 dispatch/undo/redo）
```

**验收标准**

1. 每个命令执行后 `assertIndexInvariants` 通过。
2. 执行 → undo 后文档与执行前深比较相等。
3. 50 次随机合法操作后连续 undo 可回到初始文档。
4. `MoveNodeCommand` 拒绝移入自身或后代，且失败不写入历史。
5. 异常命令不改变 `revision`，不产生历史项。
6. 删除后 undo 恢复完整子树，节点引用与 props 不变。

**验证**：`pnpm vitest run packages/virtual-ui`。

### T07 Editor Core：状态与选择

**目标**：把编辑器状态与文档状态彻底分离。

**范围**

- `EditorStore` 包装 `DocumentStore`。
- `SelectionState { selectedNodeIds, hoveredNodeId }`。
- `CanvasTransform { scale, offsetX, offsetY }`。
- `select(nodeId | null, { additive? })`：P0 只支持单选，`additive` 预留。
- `hover(nodeId | null)`。
- `resolveNodeIdFromTarget(target, canvas)`：从事件目标向上查找最近的 `[data-node-id]`。
- `assertNoEditorState(document)` 测试助手：扫描序列化 JSON，拒绝 `selectedNodeIds`、`hoveredNodeId`、`drag`、`overlay` 等编辑器字段。
- 选中节点被删除后自动清空选择。

**非目标**：多选、框选、缩放、快捷键、命令面板。

**产出**

```text
packages/editor-core/src/editor-store.ts
packages/editor-core/src/selection.ts
packages/editor-core/src/geometry.ts
packages/editor-core/src/assert-no-editor-state.ts
packages/editor-core/src/index.ts
```

**验收标准**

1. 点击嵌套组件内部 DOM 时解析到最近的 `data-node-id`。
2. 点击画布空白处清空选择。
3. 选择、悬停、视口变化不改变 `revision`、不改变文档 JSON。
4. 删除选中节点后选择为空且不抛错。
5. `assertNoEditorState` 能在文档被污染时失败。

**验证**：`pnpm vitest run packages/editor-core`（happy-dom）。

### T08 Editor Web 外壳：Canvas + Layers

**目标**：形成可操作的最小编辑器界面。

**范围**

- `packages/editor-web` Vite 应用，三栏布局：Layers / Canvas / Properties 占位。
- Canvas 中挂载 `VirtualUIRuntime`，使用 `mode: 'edit'` 语义（P0 通过 `interactive` 与选择事件实现）。
- 选中框 Overlay 独立于文档渲染，定位使用 `getBoundingClientRect()`。
- Layers 树由文档递归生成，显示节点 id、类型、组件名。
- Canvas 点击选择、Layers 点击选择双向同步。
- 顶部工具栏占位（导入、导出按钮在 T10 启用）。
- 空状态与未知组件提示。

**非目标**：属性编辑、拖拽、缩放、右键菜单、多选。

**产出**

```text
packages/editor-web/index.html
packages/editor-web/vite.config.ts
packages/editor-web/src/main.ts
packages/editor-web/src/App.vue
packages/editor-web/src/components/{CanvasView.vue,LayersPanel.vue,LayerTree.vue}
packages/editor-web/src/components/PropertiesPanel.vue（占位）
packages/editor-web/src/editor/editor-instance.ts
```

**验收标准**

1. 启动后加载默认 fixture，Canvas 渲染登录页。
2. 点击 Canvas 中 `submit` 节点，Layers 对应项高亮。
3. 点击 Layers 中 `username`，Canvas 出现选中框。
4. Layers 层级顺序与 JSON 树完全一致。
5. 页面无控制台错误。

**验证**：`pnpm playwright test e2e/selection.spec.ts`。

### T09 Properties Panel 与属性编辑

**目标**：完成“选中 → 编辑 → 渲染更新”的编辑链路。

**范围**

- 面板展示：节点 id、类型、组件名、props、style。
- 按 `propsSchema` 生成控件，P0 支持 4 种：`string`（含 `format: 'color'` 用颜色输入）、`number`、`boolean`、`enum`。
- 未知 props 键以只读 JSON 展示。
- style 编辑提供固定字段集：宽度、高度、背景色、文字颜色、字号、圆角、padding、gap。
- 所有修改经 `UpdatePropsCommand` / `UpdateStyleCommand`；每次输入提交一个命令。
- 未选中时显示占位说明。

**非目标**：数组编辑、嵌套对象编辑、绑定编辑、批量编辑、颜色设计 Token。

**产出**

```text
packages/editor-web/src/components/PropertiesPanel.vue
packages/editor-web/src/components/PropertyControl.vue
packages/editor-core/src/editor-store.ts（扩展 updateProps/updateStyle）
```

**验收标准**

1. 选中 `Button` 后显示 `label`、`variant`、`disabled` 三个控件。
2. 修改 `label` 后 Canvas 文本即时更新；undo 后恢复原值。
3. 修改背景色后 Canvas 即时生效；undo 后恢复。
4. 面板通过 `EditorStore` 修改，不直接持有或修改 `UIDocument` 引用。
5. 切换选中节点后控件值与新节点一致，无残留旧值。

**验证**：`pnpm vitest run packages/editor-web` + `pnpm playwright test e2e/properties.spec.ts`。

### T10 持久化与 Walking Skeleton E2E

**目标**：证明“编辑后的文档可以离开进程并原样恢复”。这是 P0 的 go/no-go 门。

**范围**

- `DocumentPersistence` 接口；`BrowserFilePersistence` 实现：
  - `save(document, fileName?)`：序列化前执行 `assertNoEditorState`，再触发 JSON 文件下载。
  - `load(file)`：读取 `File` 文本并返回 `ParseResult`，语法与校验错误均返回 issue。
- 工具栏接入导出、导入。
- 导入失败时展示 `ValidationIssue.path` 与 `message`，不改变当前文档。
- 导出文件名由文档名生成 slug（如 `login-page.json`），便于 E2E 与人工复现。
- E2E `e2e/walking-skeleton.spec.ts`。

**非目标**：后端存储、自动保存、localStorage 持久化、版本迁移实现。

**产出**

```text
packages/editor-core/src/persistence.ts
packages/editor-web/src/components/DocumentActions.vue
e2e/walking-skeleton.spec.ts
```

**验收标准**

1. 导出文件为合法 JSON，且通过 `validateDocument`。
2. 导出文档不包含任何编辑器状态字段（`assertNoEditorState` 在 E2E 中断言）。
3. 导入刚导出的文件后，页面结构与样式与导出前一致。
4. 再次导出，两个 JSON 深比较相等（`revision` 允许因导入后的首次编辑递增，此用例中不得发生编辑）。
5. 完整脚本通过：加载 → 选中 `submit` → 修改 label → 修改背景色 → 导出 → 重新加载 → 校验。

**验证**：`pnpm playwright test e2e/walking-skeleton.spec.ts`。

### T11 结构编辑：插入、删除、移动

**目标**：把命令层能力接入编辑器 UI，验证树结构变更的完整性。

**范围**

- 左侧组件面板：`Text`、`Card`、`Input`、`Button`，点击插入到当前选中节点的末尾；未选中时插入页根。
- Layers 面板操作：删除选中节点、上移、下移、移出到祖父节点。
- 删除保留完整子树，undo 一步还原。
- 插入后自动选中新节点。
- 所有操作经 `InsertNodeCommand` / `DeleteNodeCommand` / `MoveNodeCommand`。

**非目标**：画布内拖拽、复制粘贴、多选批量移动、拖拽排序动画。

**产出**

```text
packages/editor-web/src/components/LayersPanel.vue（Layers 操作与组件面板）
packages/editor-web/src/editor/editor-instance.ts（扩展结构命令）
e2e/structure.spec.ts
```

**验收标准**

1. 选中 Card 后插入 Input，新节点位于 Card 末尾并自动选中。
2. 删除 Card 后 undo，完整子树与所有 props 恢复。
3. 将 Input 从 Card 移到页根后，props 与 style 不丢失。
4. 移动节点时索引同步，`assertIndexInvariants` 通过。
5. 每次操作 undo 一步复原，redo 一步重做。

**验证**：`pnpm vitest run packages/virtual-ui` + `pnpm playwright test e2e/structure.spec.ts`。

### T12 Canvas 拖拽与布局验证

**目标**：在不频繁写文档的前提下完成画布拖动。

**范围**

- Pointer Events：`pointerdown` 开始，`pointermove` 更新临时几何，`pointerup` 提交一次命令。
- 拖动期间只更新 `EditorStore.drag` 与 Overlay，文档 JSON 与 `revision` 不变。
- 两种模式与判定顺序：
  1. 节点自身 `style.position === 'absolute'`：更新 `left` / `top`。
  2. 目标容器为 flex 容器且节点为普通流内节点：计算目标父级与插入索引，提交 `MoveNodeCommand`。
  3. 其他情况：不做结构变更，回退原位。
- 落点解析从指针下的节点向上寻找可接受子节点的祖先，仅 flex 容器产生插入标记。
- 使用 `requestAnimationFrame` 合并 `pointermove`。
- 500 节点 fixture 的拖动帧时长记录为基线，不设阻断阈值。

**非目标**：缩放、吸附、网格、Resize、多选拖拽、跨页面拖拽、布局引擎。

**产出**

```text
packages/editor-core/src/drag.ts
packages/editor-core/src/geometry.ts（坐标转换）
packages/editor-web/src/components/CanvasView.vue（选择、拖拽与 Overlay）
fixtures/absolute.page.json
e2e/drag.spec.ts（500 节点文档在测试内生成）
```

**验收标准**

1. 拖动过程中文档 JSON 不变，`revision` 不变。
2. 松开后仅发生一次目标变更（一次历史项）。
3. 绝对定位节点拖动后 `left` / `top` 更新；undo 一步复原。
4. Flex 容器内拖动后节点位于预期父级与插入索引；undo 一步复原。
5. 500 节点页面拖动无明显卡顿，记录平均帧时长。

**验证**：`pnpm vitest run packages/editor-core` + `pnpm playwright test e2e/drag.spec.ts`。

### T13 健壮性与 P0 验收

**目标**：把 P0 从“能跑”提升到“可交接”。

**范围**

- 非法文档导入的用户可见错误提示。
- 事件与绑定惰性：带 `events` 的节点正常渲染，未知 action 不崩溃，不执行任何代码。
- 生产构建与体积记录。
- 完整验收清单执行并记录结果。
- 更新 `README`（安装、启动、测试命令）。
- 确认仓库无 `@open-pencil/*` 依赖。

**非目标**：性能硬阈值、可访问性审计、浏览器兼容矩阵。

**产出**

```text
README.md
e2e/acceptance.spec.ts
docs/poc-plan-p0.md（验收记录追加）
```

**验收标准**

1. `pnpm verify && pnpm build && pnpm test:e2e` 全绿。
2. 导入非法 fixture 时显示具体路径与原因，当前文档保持不变。
3. 带 `events` 定义的节点渲染正常，控制台无错误。
4. 生产构建成功，产物体积记录在案。
5. P0 验收清单全部勾选。

**验证**：CI 全流程。

---

## 5. 接口契约

以下为 P0 的规范草案。实现必须与签名一致；变更契约需先更新本文档。

### 5.1 `@vui/core` 类型

```ts
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type UINodeType = 'element' | 'component' | 'text' | 'fragment'

export interface EventDefinition {
  /** 注册的 action 名称，绝不保存可执行源码。 */
  action: string
  params?: Record<string, JsonValue>
}

export interface BindingDefinition {
  /** 注册的数据源名称；P0 仅类型占位。 */
  source: string
  path?: string
}

export interface UINode {
  id: string
  type: UINodeType
  key?: string
  /** type === 'element' 时必填。 */
  tag?: string
  /** type === 'component' 时必填。 */
  component?: string
  props?: Record<string, JsonValue>
  style?: UIStyle
  children?: UINode[]
  bindings?: Record<string, BindingDefinition>
  events?: Record<string, EventDefinition>
  meta?: Record<string, JsonValue>
}

export type CSSLength = number | string

export interface UIStyle {
  // 布局
  display?: 'block' | 'flex' | 'none'
  position?: 'static' | 'relative' | 'absolute'
  flexDirection?: 'row' | 'column'
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around'
  alignItems?: 'stretch' | 'flex-start' | 'center' | 'flex-end'
  flexWrap?: 'nowrap' | 'wrap'
  flexGrow?: number
  flexShrink?: number
  gap?: CSSLength
  // 尺寸
  width?: CSSLength
  height?: CSSLength
  minWidth?: CSSLength
  maxWidth?: CSSLength
  minHeight?: CSSLength
  maxHeight?: CSSLength
  // 间距
  margin?: CSSLength
  marginTop?: CSSLength
  marginRight?: CSSLength
  marginBottom?: CSSLength
  marginLeft?: CSSLength
  padding?: CSSLength
  paddingTop?: CSSLength
  paddingRight?: CSSLength
  paddingBottom?: CSSLength
  paddingLeft?: CSSLength
  // 视觉
  backgroundColor?: string
  color?: string
  borderColor?: string
  borderWidth?: CSSLength
  borderStyle?: 'none' | 'solid' | 'dashed'
  borderRadius?: CSSLength
  // 排版
  fontFamily?: string
  fontSize?: CSSLength
  fontWeight?: 400 | 500 | 600 | 700 | string
  lineHeight?: number | string
  textAlign?: 'left' | 'center' | 'right'
  // 定位
  top?: CSSLength
  right?: CSSLength
  bottom?: CSSLength
  left?: CSSLength
  zIndex?: number
  opacity?: number
}

export interface ThemeDefinition {
  colors?: Record<string, string>
  radii?: Record<string, number>
}

export interface PageDefinition {
  id: string
  name: string
  /** 页根必须是单个节点；允许 type === 'fragment'。 */
  root: UINode
}

export interface UIDocument {
  schemaVersion: string
  id: string
  name: string
  /** 编辑计数。导入时保留，提交时递增。 */
  revision: number
  theme?: ThemeDefinition
  pages: PageDefinition[]
  metadata?: Record<string, JsonValue>
}
```

### 5.2 索引、校验、序列化

```ts
export interface ValidationIssue {
  code: string
  path: string
  message: string
  severity: 'error' | 'warning'
}

export type ParseResult =
  | { ok: true; document: UIDocument; warnings: ValidationIssue[] }
  | { ok: false; issues: ValidationIssue[] }

export function validateDocument(value: unknown): ValidationIssue[]
export function serializeDocument(document: UIDocument): string
export function parseDocument(json: string): ParseResult
export function createDocument(name?: string): UIDocument
export function createNodeId(prefix?: string): string
export function migrateDocument(document: UIDocument): UIDocument

export interface DocumentIndex {
  nodeMap: Map<string, UINode>
  parentMap: Map<string, string | null>
  childrenMap: Map<string, string[]>
  pageRootMap: Map<string, string>
  nodePageMap: Map<string, string>
}

export function buildDocumentIndex(document: UIDocument): DocumentIndex
export function findNode(index: DocumentIndex, id: string): UINode | undefined
export function findParentNode(index: DocumentIndex, id: string): UINode | null
export function getNodePath(index: DocumentIndex, id: string): string[]
export function assertIndexInvariants(document: UIDocument, index: DocumentIndex): void
```

### 5.3 命令与文档存储

```ts
export interface CommandState {
  document: UIDocument
  index: DocumentIndex
}

export interface UICommand {
  readonly kind: string
  execute(state: CommandState): void
  undo(state: CommandState): void
}

export class UpdatePropsCommand implements UICommand {
  constructor(nodeId: string, patch: Record<string, JsonValue>)
}

export class UpdateStyleCommand implements UICommand {
  constructor(nodeId: string, patch: Partial<UIStyle>)
}

export class InsertNodeCommand implements UICommand {
  constructor(parentId: string, node: UINode, index?: number)
}

export class DeleteNodeCommand implements UICommand {
  constructor(nodeId: string)
}

export class MoveNodeCommand implements UICommand {
  constructor(nodeId: string, parentId: string, index: number)
}

export class DocumentStore {
  constructor(document: UIDocument)
  get document(): UIDocument
  get index(): Readonly<DocumentIndex>
  get revision(): number
  dispatch(command: UICommand): void
  undo(): boolean
  redo(): boolean
  get canUndo(): boolean
  get canRedo(): boolean
  replaceDocument(document: UIDocument): void
  subscribe(listener: (document: UIDocument) => void): () => void
}
```

### 5.4 组件与运行时

```ts
import type { Component } from 'vue'

export interface PropertySchema {
  type: 'string' | 'number' | 'boolean'
  title: string
  description?: string
  default?: JsonValue
  enum?: string[]
  enumNames?: string[]
  format?: 'color' | 'multiline'
  minimum?: number
  maximum?: number
}

export interface ComponentDefinition {
  name: string
  component: Component
  propsSchema: {
    type: 'object'
    properties: Record<string, PropertySchema>
    required?: string[]
  }
  category: 'layout' | 'content' | 'form' | 'action'
  defaultProps: Record<string, JsonValue>
  defaultStyle?: UIStyle
  editor?: {
    label?: string
    propOrder?: string[]
    /** 是否允许作为结构编辑与拖拽的落点。默认 false。 */
    acceptsChildren?: boolean
  }
}

export class ComponentRegistry {
  register(definition: ComponentDefinition): void
  get(name: string): ComponentDefinition | undefined
  list(): ComponentDefinition[]
  createNode(name: string, id?: string): UINode
}

export interface RenderContext {
  registry: Pick<ComponentRegistry, 'get'>
  interactive?: boolean
  resolveHandler?: (
    node: UINode,
    eventName: string
  ) => ((...args: unknown[]) => void) | undefined
}

export function resolveStyle(style?: UIStyle): Record<string, string | number> | undefined
export function renderNode(node: UINode, context: RenderContext): VNodeChild
export function renderPage(page: PageDefinition, context: RenderContext): VNode
```

`VirtualUIRuntime` 组件 props：

```ts
interface VirtualUIRuntimeProps {
  page: PageDefinition
  registry: Pick<ComponentRegistry, 'get'>
  revision?: number
  interactive?: boolean
  resolveHandler?: RenderContext['resolveHandler']
}
```

### 5.5 编辑器与持久化

```ts
export interface SelectionState {
  selectedNodeIds: string[]
  hoveredNodeId: string | null
}

export interface CanvasTransform {
  scale: number
  offsetX: number
  offsetY: number
}

export type DragMode = 'absolute' | 'flex'

export interface DragDropTarget {
  parentId: string
  index: number
}

export interface DragState {
  nodeId: string
  mode: DragMode
  startPoint: Point
  delta: Point
  dropTarget: DragDropTarget | null
}

export type DragCommit =
  | { mode: 'absolute'; left: number; top: number }
  | { mode: 'flex'; parentId: string; index: number }

export class EditorStore {
  constructor(document: UIDocument)
  get document(): UIDocument
  get revision(): number
  get index(): Readonly<DocumentIndex>
  get selection(): Readonly<SelectionState>
  get canvasTransform(): Readonly<CanvasTransform>
  get drag(): Readonly<DragState> | null
  select(nodeId: string | null, options?: { additive?: boolean }): void
  hover(nodeId: string | null): void

  updateProps(nodeId: string, patch: Record<string, JsonValue>): void
  updateStyle(nodeId: string, patch: Partial<UIStyle>): void
  insertNode(parentId: string, node: UINode, index?: number): void
  deleteNode(nodeId: string): void
  moveNode(nodeId: string, parentId: string, index: number): void

  // mode 由节点 style.position === 'absolute' 自动决定。
  beginDrag(nodeId: string, startPoint: Point): void
  updateDrag(point: Point, dropTarget?: DragDropTarget | null): void
  // 提交一次命令；null 表示取消结构/样式变更，只清理拖拽状态。
  commitDrag(commit: DragCommit | null): boolean
  cancelDrag(): void

  undo(): boolean
  redo(): boolean
  replaceDocument(document: UIDocument): void
  subscribe(listener: () => void): () => void
}

export interface DocumentPersistence {
  save(document: UIDocument, fileName?: string): Promise<void>
  load(file: File): Promise<ParseResult>
}

export class BrowserFilePersistence implements DocumentPersistence {
  save(document: UIDocument, fileName?: string): Promise<void>
  load(file: File): Promise<ParseResult>
}

export function serializeDocumentForExport(document: UIDocument): string
export function defaultExportFileName(document: UIDocument): string
```

### 5.6 行为约定

1. 命令是对 `CommandState` 的可逆变更。首次 `execute` 捕获 before 快照，`undo` 恢复；redo 不覆盖首次快照。
2. 命令不得深拷贝整棵节点树。删除命令按引用保留被删子树。
3. 每次提交浅拷贝顶层文档并递增 `revision`。Vue 侧使用 `shallowRef` 接收新文档，禁止整份文档深层响应式。
4. `props` 类型为 `JsonValue`，类型层面排除函数。组件定义不进入文档。
5. 编辑器状态（选择、悬停、视口、拖拽几何）永不写入 `UIDocument`。
6. 样式键使用 camelCase；数字长度按 px 处理，字符串原样透传。
7. Runtime 遇到未知组件时降级为可见块，不抛错。
8. 事件只在 `resolveHandler` 存在时挂载；禁止 `eval`、`new Function`、动态 `import()` 用户输入。
9. `schemaVersion` 表示持久化格式版本；`revision` 表示编辑计数；导入保留二者。
10. 节点 `style` 只作用于节点根元素，组件内部样式不可被文档覆盖。
11. `parseDocument` 仅当存在 `severity: 'error'` 的 issue 时返回失败；warning 不阻断导入，但需在导入结果中可见。
12. 拖拽期间只修改 `EditorStore.drag`。`pointerup` 通过 `commitDrag` 最多提交一条 `UpdateStyleCommand` 或 `MoveNodeCommand`；`commitDrag(null)` 不产生历史项。
13. `MoveNodeCommand` 的 `index` 是原兄弟列表中的插入边界；同父向下移动需要换算，Canvas 层在提交前完成换算。
14. 导出文件名由文档名生成 slug（如 `Login Page` → `login-page.json`），无有效字符时回退为 `virtual-ui-document.json`。

---

## 6. 最小 UI 能力

### 6.1 组件

| 组件 | 是否必需 | 说明 |
|---|---|---|
| `Text` | 是 | 标题与文本 |
| `Card` | 是 | 登录卡片容器 |
| `Input` | 是 | 用户名与密码 |
| `Button` | 是 | 提交按钮 |

布局容器统一使用原生 `element` 节点 + flex 样式，不新增 `Box`、`Stack` 组件。

### 6.2 样式子集

- 布局：`display`、`position`、`flexDirection`、`justifyContent`、`alignItems`、`flexWrap`、`flexGrow`、`flexShrink`、`gap`
- 尺寸：`width`、`height`、`minWidth`、`maxWidth`、`minHeight`、`maxHeight`
- 间距：`margin*`、`padding*`
- 视觉：`backgroundColor`、`color`、`borderColor`、`borderWidth`、`borderStyle`、`borderRadius`
- 排版：`fontFamily`、`fontSize`、`fontWeight`、`lineHeight`、`textAlign`
- 定位：`top`、`right`、`bottom`、`left`、`zIndex`、`opacity`

P0 不支持：CSS 选择器、媒体查询、伪类、Grid、transform、动画、阴影、渐变、设计 Token 引用。

### 6.3 文档模型决策

1. 每页有且只有一个 `root` 节点；允许 `fragment`，避免多余 DOM。
2. 文本使用 `type: 'text'` + `props.text`；不接受裸字符串 children。
3. 组件定义不持久化；文档只保存组件名。
4. `schemaVersion` 表示格式版本，当前 `0.1.0`。
5. `revision` 由每次命令提交递增；导入时保留原值。
6. `meta` 保留给编辑器或工具使用，但不得放入选择、拖拽等运行时状态。

### 6.4 登录页 fixture

```json
{
  "schemaVersion": "0.1.0",
  "id": "doc-login",
  "name": "Login Page",
  "revision": 0,
  "pages": [
    {
      "id": "page-login",
      "name": "Login",
      "root": {
        "id": "login-root",
        "type": "element",
        "tag": "div",
        "style": {
          "display": "flex",
          "justifyContent": "center",
          "alignItems": "center",
          "minHeight": "100vh",
          "backgroundColor": "#f3f4f6"
        },
        "children": [
          {
            "id": "login-card",
            "type": "component",
            "component": "Card",
            "style": {
              "width": 360,
              "gap": 16,
              "padding": 32,
              "backgroundColor": "#ffffff",
              "borderRadius": 12
            },
            "children": [
              {
                "id": "login-title",
                "type": "component",
                "component": "Text",
                "props": { "text": "Sign in", "as": "h1" },
                "style": { "fontSize": 24, "fontWeight": 600, "color": "#111827" }
              },
              {
                "id": "username",
                "type": "component",
                "component": "Input",
                "props": { "placeholder": "用户名", "type": "text", "value": "", "disabled": false },
                "style": { "width": "100%" }
              },
              {
                "id": "password",
                "type": "component",
                "component": "Input",
                "props": { "placeholder": "密码", "type": "password", "value": "", "disabled": false },
                "style": { "width": "100%" }
              },
              {
                "id": "submit",
                "type": "component",
                "component": "Button",
                "props": { "label": "登录", "variant": "primary", "disabled": false },
                "style": { "width": "100%" }
              }
            ]
          }
        ]
      }
    }
  ]
}
```

### 6.5 绝对定位 fixture

`fixtures/absolute.page.json`：页根为 `position: relative`、固定尺寸的容器，内部放置一个 `position: absolute` 的 `Card`（带 `left` / `top`），用于 T12 的定位模式验证。

---

## 7. 测试与验收策略

### 7.1 分层

| 层级 | 工具 | 范围 | 要求 |
|---|---|---|---|
| 单元测试 | Vitest | `@vui/core`、`@vui/runtime-vue`、`@vui/editor-core` | 行覆盖率不低于 80% |
| 组件测试 | Vitest + `@vue/test-utils` | Runtime 输出、属性控件 | 只对 Runtime 输出做快照 |
| E2E | Playwright（chromium） | 渲染、选择、编辑闭环、结构操作、拖拽 | 只覆盖主链路，不做全交互覆盖 |
| 构建 | Vite build | `editor-web` | 必须通过；`playground` 至少通过类型检查 |

### 7.2 E2E 用例清单

| 文件 | 覆盖 | 引入任务 |
|---|---|---|
| `e2e/selection.spec.ts` | 应用加载、Canvas 与 Layers 双向选择 | T08 |
| `e2e/properties.spec.ts` | 属性与样式编辑、undo | T09 |
| `e2e/walking-skeleton.spec.ts` | 编辑 → 导出 → 导入 → 一致；非法导入拒绝 | T10（go/no-go） |
| `e2e/structure.spec.ts` | 插入、删除、移动、undo | T11 |
| `e2e/drag.spec.ts` | 绝对定位与 flex 拖动、单次提交、500 节点基线 | T12 |
| `e2e/acceptance.spec.ts` | 主链路回归、事件惰性、非法导入 | T13 |

### 7.3 测试数据

- `fixtures/login.page.json`：合法登录页。
- `fixtures/login.page.invalid.json`：覆盖全部校验错误类型。
- `fixtures/absolute.page.json`：绝对定位拖拽。
- 500 节点性能文档在 `e2e/drag.spec.ts` 内生成，不单独提交。
- 所有 fixture 纳入版本控制，不得在测试运行时依赖网络。

### 7.4 独立验收命令

每个任务必须有可单独执行的验证命令：

```bash
pnpm vitest run packages/virtual-ui
pnpm vitest run packages/runtime-vue
pnpm vitest run packages/editor-core
pnpm vitest run packages/editor-web
pnpm playwright test e2e/selection.spec.ts
pnpm playwright test e2e/walking-skeleton.spec.ts
pnpm playwright test e2e/structure.spec.ts
pnpm playwright test e2e/drag.spec.ts
pnpm playwright test e2e/acceptance.spec.ts
pnpm verify
```

### 7.5 P0 最终验收清单

- [x] 登录页 fixture 可在编辑器加载并渲染
- [x] 点击 Canvas 节点可选中，Layers 同步
- [x] 点击 Layers 项可选中，Canvas 选中框同步
- [x] 修改 Button label 后画布更新，undo 恢复
- [x] 修改背景色后画布更新，undo 恢复
- [x] 插入、删除、移动节点均可用，undo/redo 正确
- [x] 绝对定位节点可拖动，拖动期间文档不变
- [x] flex 容器内节点可拖动并改变父级或顺序
- [x] 导出 JSON 不含编辑器状态
- [x] 导入导出文件后结构与样式一致
- [x] 非法文档被拒绝并显示具体路径
- [x] 带 events 定义的节点渲染不崩溃
- [x] `pnpm verify && pnpm build && pnpm test:e2e` 全绿
- [x] 生产依赖与代码中不存在 `@open-pencil/*` 依赖或 import（扫描器测试夹具除外）

### 7.6 P0 验收记录

执行日期：2026-11-11。

环境：macOS（Darwin 27.2.0）、Node.js 20.19.5、pnpm 12.3.4、Playwright 1.65.0、Google Chrome 157.0.8103.51。

| 命令 | 结果 |
|---|---|
| `pnpm verify` | 通过。`check:ban` 未发现 OpenPencil；5 个 workspace 类型检查通过；ESLint 0 error、33 warning（仅 Vue 模板格式）；Vitest 12 个文件、80 个测试全部通过 |
| `pnpm build` | 通过。77 个模块；`index.js` 112.98 kB（gzip 40.54 kB）；`index.css` 8.30 kB（gzip 2.02 kB）；`index.html` 0.47 kB；dist 约 132 kB |
| `PW_USE_SYSTEM_CHROME=1 pnpm test:e2e` | 18 个 Playwright 测试全部通过，用时 6.5 s |

E2E 覆盖：

- `selection.spec.ts`：3 个测试，Canvas/Layers 双向选择、层级与 hover。
- `properties.spec.ts`：2 个测试，props/style 编辑、undo/redo、enum 与 boolean。
- `walking-skeleton.spec.ts`：2 个测试，编辑导出导入再导出字节一致；非法导入保留当前文档。
- `structure.spec.ts`：4 个测试，插入、删除子树、跨层移动、同层上下移动。
- `drag.spec.ts`：4 个测试，flex 重排、跨父级移动、绝对定位 left/top、500 节点基线。
- `acceptance.spec.ts`：3 个测试，主链路回归、事件惰性、非法导入路径提示。

500 节点拖拽基线：本轮平均帧时长 17.59 ms，采样 18 帧；仅记录，不设阻断阈值。

本机说明：Playwright bundled Chromium 下载速度不足以完成安装，因此本机 E2E 使用系统 Chrome。`playwright.config.ts` 仅在 `PW_USE_SYSTEM_CHROME=1` 时切换 channel；CI 仍执行 `playwright install chromium` 并使用捆绑版本。

验收结论：P0 的 Virtual UI → Vue Runtime → Editor 闭环成立，满足 go/no-go 条件。未完成项均为明确的 P1 范围，不属于 P0 缺陷。

---

## 8. 风险与退险点

| 风险 | 影响 | 退险点 |
|---|---|---|
| 文档与索引不一致 | 选择、移动、删除出现幽灵节点 | T03 的 `assertIndexInvariants` 在每次命令后执行；随机树测试 |
| 整份文档深层响应式 | 编辑卡顿、拖拽掉帧 | T03/T07 固定顶层浅拷贝 + `shallowRef`；T12 记录基线 |
| 编辑器状态污染文档 | JSON 不可移植，AI 读取到脏数据 | T07 契约 + `assertNoEditorState` 在 T10 强制执行 |
| 命令 undo 不精确 | 数据丢失 | T06 惰性快照 + 50 次随机操作回退测试 |
| 拖拽模型过度设计 | 工期失控 | T12 只允许两种模式；拒绝通用布局引擎 |
| 组件与属性面板范围膨胀 | P0 无法收敛 | T04 固定 4 组件；T09 固定 4 种控件 |
| Playwright 不稳定 | CI 频繁失败 | 只跑主链路；chromium only；失败重试 1 次 |
| OpenPencil 依赖回流 | 架构约束被破坏 | T01 CI 扫描 + ESLint `no-restricted-imports` |
| 过早引入 XState / Codegen | 闭环验证被拖慢 | 本文档明确列为非目标；代码中只保留类型占位 |

---

## 9. 附录

### 9.1 命令清单

| 命令 | 使用任务 | 主要调用方 |
|---|---|---|
| `UpdatePropsCommand` | T09 | Properties Panel |
| `UpdateStyleCommand` | T09 | Properties Panel |
| `InsertNodeCommand` | T11 | Component Palette |
| `DeleteNodeCommand` | T11 | Layers Panel、快捷键 |
| `MoveNodeCommand` | T11、T12 | Layers Panel、Canvas 拖拽 |

### 9.2 建议提交粒度

每个任务至少一个可回滚提交，提交信息使用中文 Conventional Commit：

```text
chore: 初始化 pnpm workspace 与依赖禁令
feat(virtual-ui): 定义 Virtual UI 类型与文档校验
feat(virtual-ui): 实现文档索引与序列化
feat(runtime-vue): 新增组件注册表与基础组件
feat(runtime-vue): 实现基于 h() 的渲染器
feat(virtual-ui): 实现命令引擎与撤销历史
feat(editor-core): 实现选择与编辑器状态
feat(editor-web): 搭建 Canvas 与 Layers 外壳
feat(editor-web): 接入属性面板编辑
feat(editor-web): 完成导入导出与闭环验收
feat(editor-web): 支持结构插入删除移动
feat(editor-web): 支持画布拖拽
chore: 完成 P0 健壮性收尾与验收
```

### 9.3 任务交接检查

任务完成时在 PR 或提交说明中回答：

1. 本任务独立验证命令是什么，结果如何。
2. 本任务修改了哪些接口契约，是否已同步本文档。
3. 是否引入新依赖，是否通过 `check:ban`。
4. 是否留下未覆盖的边界情况，记录在何处。
5. 下一任务可以直接开始的前提是否成立。
