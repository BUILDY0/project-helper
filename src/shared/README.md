# `src/shared`

主进程（Electron）与渲染进程（Vue）共用的纯 JS 模块。

## 加载方式

| 端               | 加载方式                               |
| ---------------- | -------------------------------------- |
| 渲染进程（Vite） | `import { ... } from '@shared/xxx.js'` |
| 主进程（Node）   | `require('../../shared/xxx.js')`       |

主进程能 `require` 这些 ESM 文件，依赖 **Electron 33+ / Node 22+** 的 `require(ESM)` 能力（见 [Node 22 release notes](https://nodejs.org/en/blog/announcements/v22-release-announce#support-requireing-synchronous-esm-graphs)）。`require(ESM)` 同步加载有一条硬性约束：

> 被加载的 ESM 模块**不能含有 top-level `await`**（包括其依赖图中任意一个模块）。

## 编写约束

放进来的文件必须满足：

1. **纯 ESM**：只用 `export` 导出，不要 `module.exports`。
2. **同步**：禁止 top-level `await`，否则主进程 `require` 会抛 `ERR_REQUIRE_ASYNC_MODULE`。
3. **运行环境无关**：不引入 `fs`/`path`/`electron`/`window`/`document` 等仅在某一端可用的 API。
4. **零运行时依赖**：不 import `node_modules` 里的包（如 `vue`、`lodash` 等），保证两端都能加载。

适合放进来的内容：类型 / 枚举 / 常量、与 IO 无关的归一化函数、纯计算工具。
