# pages 目录约定

本目录存放路由级页面。每个页面是一个**独立的子目录**，内部按职责分层；目标是让 `index.vue` 只承担「**页面骨架（template + style）**」，业务逻辑全部下沉到 `composables/`。

## 目录结构

```
pages/
├── README.md                # 本文件
└── <pageName>/              # 一个页面一个目录，目录名 kebab-case
    ├── index.vue            # 页面入口；只写 template + style + 极少装配代码
    ├── components/          # 仅本页使用的业务组件（可选）
    ├── composables/         # 本页的 use-xxx.js 集合
    └── utils/               # 仅本页使用的纯函数（可选）
```

示例：

```
pages/
├── projects/
│   ├── index.vue
│   ├── components/
│   │   └── project-card.vue
│   └── composables/
│       ├── use-projects.js
│       ├── use-project-search.js
│       └── ...
└── settings/
    ├── index.vue
    ├── components/
    │   └── update-check-button.vue
    ├── composables/
    │   ├── use-config.js
    │   └── ...
    └── utils/
        └── path-helper.js
```

## 命名规则

- **目录名 / 文件名**：一律 **kebab-case**（如 `use-project-search.js`、`project-card.vue`）。`App.vue` 是 Vue 生态的根组件惯例，例外保留 PascalCase。
- **导出函数 / 组件名**：**camelCase / PascalCase**（如 `export function useProjectSearch()`、`<ProjectCard />`）。
- composable 文件名以 `use-` 前缀开头；导出的主函数以 `use` 前缀开头。
- 页面入口固定为 `index.vue`。

## index.vue 写什么

- `<template>`：页面 HTML 结构。
- `<style scoped>`：页面样式。
- `<script setup>`：**只做「装配」**——`import` 子组件 / 调用 composables / 把返回值映射到模板变量。
  - 推荐每个 composable 一行 `const { ... } = useXxx(...)`；不要在 `index.vue` 里写超过一两行的业务逻辑。
  - 如果发现 `index.vue` 又开始堆代码，说明应该再抽一个 `use-xxx.js`。

## composables 怎么拆

按「**功能/特性**」拆分，而不是按「数据类型」。一个 `use-xxx.js` 对应页面里一个**可独立讲清楚**的功能块。例如：

- `use-projects.js`：项目列表加载与刷新（loading、最短展示时长、刷新动画）。
- `use-project-search.js`：搜索关键字 + 防抖 + 过滤结果。
- `use-context-menu.js`：右键菜单的状态与分发。
- `use-delete-project.js`：删除二次确认与永久删除。

约定：

- composable 内部如果用到了**外部依赖**（如 `toastRef`、`projects` ref 等），通过**入参**显式传入，**不要**在 composable 里直接 `import` 兄弟 composable 形成隐式耦合。`index.vue` 是唯一的"装配点"。
- composable 顶部可以 `export` 该功能私有的常量（如 `SEARCH_DEBOUNCE_MS = 200`），不需要再单独建 constants 文件。

## 何时把组件 / composable "升格"到全局

- **页内 `components/`** ↔ **`src/renderer/components/business/` 或 `common/`**：当一个组件被**第二个页面**引用时，移到全局 `components/business/`（业务相关）或 `components/common/`（纯 UI）。
- **页内 `composables/`** ↔ **`src/renderer/composables/`**：当一个 composable 被多个页面或顶层组件复用时（如 `use-ides`、`use-theme`），移到全局 `composables/`。

## 关于 utils 与 constants

> 简言之：composable ≠ utils。**用了 Vue 响应式 API（`ref` / `computed` / `watch` / `onMounted` 等）→ composable；纯函数 → utils。**

文件层级（按"作用域从小到大"）：

| 位置                       | 适用                                    |
| -------------------------- | --------------------------------------- |
| `use-xxx.js` 顶部 `export` | 仅该 composable / 该功能私有的小常量    |
| `pages/<page>/utils/`      | 仅本页内多处使用、但还没跨页的纯函数    |
| `src/renderer/utils/`      | 多个页面 / 顶层组件共用的纯函数         |
| `src/shared/`              | 主进程 / preload / 渲染层都需要的纯函数 |

> 升格规则：当某个纯函数被**第二个页面 / 组件**用到时，从 `pages/<page>/utils/` 上移到 `src/renderer/utils/`；如果主进程也要用，再上移到 `src/shared/`。

约定：

- **不要**把纯函数（如 `formatTime`、`getPathText`）和 composable（如 `useConfig`）混在同一个 `use-xxx.js` 里 export。一个文件只承担一种职责，使用方 `import` 时心智更清晰。
- **本页内的小常量**（如 `SEARCH_DEBOUNCE_MS = 200`、`DEFAULT_DEPTH = 1`）可以写在最相关的那个 `use-xxx.js` 顶部 `export`，不需要单独建 `constants/`。

为什么 composable 不能完全替代 utils：

1. **可测试性**：纯函数能直接单测；包进 composable 反而要 mock Vue 运行时。
2. **可复用性**：composable 只能在渲染层用；纯函数主进程 / preload 可能也要用。
3. **运行时开销**：每次 `useXxx()` 调用都会创建新的闭包/响应式对象；纯常量没必要承担这层成本。
