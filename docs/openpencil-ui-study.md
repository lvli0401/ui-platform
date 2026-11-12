# OpenPencil 在线编辑器学习笔记（迭代 1）

## 目的与边界

本文记录对 OpenPencil 在线编辑器的功能与视觉研究，以及 `@vui/editor-web` 在迭代 1 中实际落地的范围。研究目标是理解交互模式与设计语言，不是复制实现。

约束：

- OpenPencil 源码仅作只读参考，本地路径为 `/Users/lvli/code/open-pencil`。
- 本仓库不引入 `@open-pencil/*` 包、SceneGraph、Renderer 或内部数据结构。
- 不复制 OpenPencil 源码；只借鉴公开的交互模式、尺寸与颜色。
- 编辑器 chrome 使用中文，技术值（节点 id、组件名、CSS 枚举）保持原文。
- 迭代 1 不新增运行时依赖，不使用 Tailwind、Reka UI 等库。

参考来源：

- 仓库：<https://github.com/open-pencil/open-pencil>
- 许可证：MIT
- 主要参考目录：`src/theme/`、`src/components/`、`src/app/editor/`

## 功能矩阵

| 区域 | OpenPencil | 迭代 1 已实现 | 后续迭代 |
|---|---|---|---|
| 顶栏 | 多文档 Tab、首页、菜单、脏标记、关闭 | 单文档 Tab 外壳、脏点、修订数、撤销/重做、导入/导出 | 多文档、页面切换、持久化 |
| 左栏 | Pages 与 Layers、Assets、搜索、重命名、显隐、锁定、拖拽排序 | Layers 深色视觉、类型图标、折叠箭头、上下移/移出/删除 | 重命名、显隐、锁定、拖拽排序、搜索 |
| 画布 | 深色背景、白色画板、标尺、参考线、吸附、框选、缩放手柄 | 深色背景、白色 1024px 画板、工具浮条、缩放、平移 | 形状工具、框选、多选、手柄、吸附 |
| 工具 | V/H/F/R/O/T/P/C，带 flyout | V 选择、H 抓手、T 文本 | Frame、矩形、椭圆、钢笔等 |
| 右栏 | Design/Code/AI/Lint、折叠分区 | Design 风格折叠分区、缩放菜单 | 标签页、自动布局、变量、AI |
| 主题 | 深色默认、浅色覆盖 | 深色 CSS 变量 | 浅色主题切换 |
| 协作 | 评论、多人协同、AI | 无 | 后置 |

## 视觉 tokens

迭代 1 将 OpenPencil 深色主题的主要色值映射为 `packages/editor-web/src/styles/tokens.css` 中的 CSS 变量。

| 用途 | OpenPencil 值 | 本仓库变量 |
|---|---|---|
| 面板 | `#2a2a2a` | `--color-panel` |
| 次级面板 | `#242424` | `--color-panel-secondary` |
| 输入框 | `#383838` | `--color-panel-field` |
| 悬停 | `#353535` | `--color-hover` |
| 边框 | `#3a3a3a` | `--color-border` |
| 画布背景 | `#1e1e1e` | `--color-canvas` |
| 强调色 | `#2563eb` | `--color-accent` |
| 选中蓝 | `#2f6fdd` | `--color-panel-selected` |
| 主文本 | `#f0f0f0` | `--color-surface` |
| 次文本 | `#a6a6a6` | `--color-muted` |
| 错误 | `#fa8585` | `--color-error` |

尺寸约定：

| 元素 | 尺寸 |
|---|---|
| 顶栏 / Tab | 36px |
| 面板头 | 36px |
| 左栏 | 240px |
| 右栏 | 280px |
| 工具按钮 | 32×32，图标 16px |
| 工具浮条 | 底部居中，12px 圆角，4px 内边距，2px 间距 |
| 图层行 | 24px 行高，11px 文本 |
| 画板 | 宽 1024px，最小高 768px |

## 交互模式

### 外壳

- 顶栏高度与画布背景一致，活动文档 Tab 使用面板色，并以底边融入面板。
- 撤销/重做、导入/导出使用 16px 图标按钮，不占用整行文字按钮。
- 脏状态只在 `revision > 0` 时显示 6px 强调色圆点。

### 画布与视口

- 画布 DOM 分为四层：视口、未变换表面、缩放层、白色画板。
- 选择框、悬停框、拖拽预览、插入标记放在未变换的叠加层，使用屏幕像素坐标，因此任意缩放下线宽保持恒定。
- 视口变换为 `translate(offset) scale(scale)`，缩放范围 0.1–4。
- 初始缩放固定为 100%，画板左上留 24px，水平方向尽量居中。这样导入文档后不会跳视图，像素级拖拽断言保持稳定。
- `Ctrl/Cmd + 滚轮` 以光标为锚点缩放；普通滚轮平移；`Shift + 滚轮` 横向平移。
- 抓手工具、空格临时抓手、中键拖拽都只更新视口，不写文档。
- 所有叠加层坐标相对未变换表面测量；绝对定位提交时按缩放折算回画板坐标。

### 工具与快捷键

迭代 1 只保留三个必要工具：

| 工具 | 快捷键 | 行为 |
|---|---|---|
| 选择 | V | 选择、悬停、拖拽排序、绝对定位移动 |
| 抓手 | H | 平移视口 |
| 文本 | T | 在点击处插入 Text 组件，随后回到选择工具 |

快捷键：

| 操作 | 快捷键 |
|---|---|
| 撤销 / 重做 | `Cmd/Ctrl+Z` / `Shift+Cmd/Ctrl+Z`、`Ctrl+Y` |
| 删除选中节点 | `Delete` / `Backspace` |
| 取消拖拽并回到选择工具 | `Escape` |
| 微移绝对定位节点 | 方向键 1px，`Shift+方向键` 10px |
| 缩放 | `Cmd/Ctrl+=`、`Cmd/Ctrl+-`、`+`、`-` |
| 100% / 适应画布 | `Cmd/Ctrl+0` 或 `Shift+0` / `Shift+1` |
| 临时抓手 | 按住空格拖拽 |

命令层会忽略可编辑目标（输入框、文本域、下拉框、`contenteditable`），避免在属性面板输入时误触删除或撤销。

### 面板

- 左栏为图层树，行内展示类型图标、名称和灰显 id；选中行为强调蓝底。
- 右栏按“位置与尺寸 / 布局 / 外观 / 文字”分区，分区可折叠。
- 缩放菜单放在右栏头部，与 OpenPencil 的 ZoomDropdown 位置一致，包含放大、缩小、适应画布与 50/100/200% 预设。
- 颜色字段同时提供文本输入和原生色块，文本输入保留 E2E 钩子。

## 本仓库映射

| 能力 | 文件 |
|---|---|
| 设计 tokens | `packages/editor-web/src/styles/tokens.css` |
| 顶栏外壳 | `packages/editor-web/src/components/AppTabBar.vue` |
| 画布与视口 | `packages/editor-web/src/components/CanvasView.vue` |
| 工具浮条 | `packages/editor-web/src/components/CanvasToolbar.vue` |
| 缩放菜单 | `packages/editor-web/src/components/ZoomControl.vue` |
| 图标 | `packages/editor-web/src/components/ui/Icon.vue`、`IconButton.vue` |
| 视口状态 | `packages/editor-core/src/editor-store.ts`、`geometry.ts` |
| 视口控制 | `packages/editor-web/src/editor/viewport-controls.ts` |
| 文本插入 | `packages/editor-web/src/editor/tool-insert.ts`、`insertion-target.ts` |
| 快捷键命令层 | `packages/editor-web/src/editor/commands.ts`、`use-editor-shortcuts.ts` |

## 迭代路线

1. 迭代 1（已完成）：深色外壳、顶部 Tab、三栏视觉、画板、三工具、缩放/平移、文本插入、快捷键。
2. 图层面板功能：重命名、显隐、锁定、拖拽排序、搜索。
3. 属性面板功能：颜色选择器、混合值、自动布局、约束。
4. 页面与多文档：Pages、文档 Tab、localStorage 自动保存。
5. 画布进阶：Frame、矩形、椭圆、缩放手柄、框选、多选、复制粘贴、吸附、标尺与参考线。
6. 组件、变量、代码与 AI 面板。

## 明确不做

- 不引入 OpenPencil 包或其内部数据结构。
- 不复制源码文件。
- 不为模仿而新增第三方 UI 依赖。
- 不把选择、悬停、视口或拖拽状态写入 `UIDocument`。
- 不在文档中保存可执行 JavaScript。
