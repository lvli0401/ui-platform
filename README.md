# Virtual UI Platform

Virtual UI 是一个以可序列化节点树为唯一事实来源的 UI 工程平台。P0 已打通 **Virtual UI → Vue Runtime → Editor** 闭环：文档可以渲染、编辑、拖拽、撤销与导入导出，编辑器状态不会写入文档。

当前仓库不依赖 OpenPencil，也不使用其包、SceneGraph、Renderer 或内部实现。

## 架构

依赖方向固定为：

```text
@vui/core <- @vui/runtime-vue <- @vui/editor-core <- @vui/editor-web
```

| 包 | 职责 |
|---|---|
| `packages/virtual-ui`（`@vui/core`） | 文档类型、校验、索引、序列化、命令引擎 |
| `packages/runtime-vue`（`@vui/runtime-vue`） | 组件注册表与基于 Vue `h()` 的渲染器 |
| `packages/editor-core`（`@vui/editor-core`） | 编辑器状态、选择、拖拽、持久化 |
| `packages/editor-web`（`@vui/editor-web`） | 三栏编辑器应用：Layers、Canvas、Properties |
| `apps/playground`（`@vui/playground`） | 渲染器实验页面，不参与 P0 验收 |

关键约束：

- `UIDocument` 是唯一持久化模型，Vue VNode 从不持久化。
- 选择、悬停、视口、拖拽几何等编辑器状态永不写入文档。
- 所有编辑通过可逆命令执行。
- 文档 JSON 中不含可执行 JavaScript；事件只保存已注册的 action 名称。
- 组件定义只存在于代码，文档只引用组件名。
- 布局使用浏览器原生能力，不引入自研布局引擎。

## 环境要求

- Node.js >= 20
- pnpm 12.3.4（通过 Corepack 启用）

```bash
corepack enable
corepack prepare pnpm@12.3.4 --activate
```

## 安装与启动

```bash
pnpm install
pnpm dev
```

编辑器默认运行在 `http://127.0.0.1:5173`。

## 常用命令

| 命令 | 说明 |
|---|---|
| `pnpm dev` | 启动编辑器开发服务器 |
| `pnpm build` | 类型检查并构建 `editor-web` |
| `pnpm typecheck` | 所有包运行 TypeScript 检查 |
| `pnpm test` | 运行 Vitest 单元测试 |
| `pnpm test:watch` | Vitest 监听模式 |
| `pnpm test:e2e` | 运行 Playwright E2E |
| `pnpm lint` | ESLint 检查 |
| `pnpm check:ban` | 扫描 OpenPencil 依赖与 import |
| `pnpm verify` | `check:ban + typecheck + lint + test` |

完整验收：

```bash
pnpm verify && pnpm build && pnpm test:e2e
```

首次运行 Playwright 需要安装浏览器：

```bash
pnpm exec playwright install chromium
```

如果本机无法下载 Playwright 浏览器，可以使用系统 Chrome：

```bash
PW_USE_SYSTEM_CHROME=1 pnpm test:e2e
```

CI 使用安装版 Chromium，不使用该环境变量。

## 目录

```text
packages/          # P0 的四个包
apps/playground/   # 渲染实验页
fixtures/          # 合法、非法、绝对定位与大型文档
e2e/               # Playwright 主链路测试
scripts/           # 依赖禁令扫描
docs/              # 架构方案与 P0 执行计划
```

## 文档

- `docs/poc.md`：现行架构方案
- `docs/poc-plan-p0.md`：P0 任务拆分、接口契约与验收记录

## P0 范围

已包含：登录页渲染、选择联动、属性编辑、撤销重做、结构增删移、Canvas 拖拽、JSON 导入导出、非法文档提示、事件惰性处理。

不包含：后端存储、自动保存、协同编辑、代码生成、完整设计系统、多页面编辑、缩放与框选。
