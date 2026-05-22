# Project Helper

一个基于 **Vue 3 + Electron + Vite** 的本地开发项目管理器。
扫描你电脑上的项目目录，把它们以卡片形式平铺展示，支持双击 / 右键直接用 VSCode 打开，
并可以置顶常用项目、搜索过滤、调用系统原生属性面板等。

> 视觉风格：扁平化 + 圆角 + 中性色（macOS 风），自定义无边框窗口。

---

## 功能一览

### 项目展示页

- **平铺卡片**：自适应网格，圆角矩形，悬浮抬起。
- **基本信息**：图标 / 项目名 / 项目简介（来自 `package.json` 的 `name` 与 `description`，缺失时回退到文件夹名）。
- **打开方式**：
  - **双击** 卡片 → 调用 `code <path>` 用 VSCode 打开。
  - **右键** 卡片 → 浮层菜单：
    - vscode 打开
    - 打开项目文件夹（系统文件管理器）
    - 查看属性（Windows 调出原生属性对话框；macOS 用 Finder 显示信息）
    - 置顶 / 取消置顶
    - 删除项目（含二次确认，物理删除文件夹）
- **置顶（pin）**：
  - 卡片右上角 `★` 按钮（pinned 时常显金色实星，未 pinned 时仅 hover 时出现空心星）。
  - pinned 项排在最前；持久化到 `config.json` 的 `pinned` 字段。
  - 启动 / 扫描时自动清理已失效的 pinned 路径，避免冗余残留。
- **搜索**：
  - 输入框带 200ms 防抖，模糊匹配 `name` / `description` / 文件夹名（path basename）。
  - 命中数 / 总数实时展示，固定占位避免位移抖动。
- **回到顶部**：滚动后右上角按钮可用，平滑回滚。
- **刷新**：手动触发重新扫描；最短显示 1s loading 动画，避免闪烁跳变。
- **首次进入 / 切回 tab 自动扫描一次**。

### 配置页

- **配置文件路径**：只读展示，按钮支持「打开文件」「打开文件夹」，并展示最后修改时间。
- **扫描目录**（多个）：选择系统目录加入；支持单项删除 + 整体清空（二次确认）。
- **扫描深度**：自定义数字组件，0 - 5，默认 1；支持「重置」（二次确认）。
- **排除文件夹**（多个）：选择目录加入；支持单项删除 + 整体清空（二次确认）。
- **置顶项目**：展示 `pinned` 列表，支持单项删除 + 整体清空（二次确认）。
- **保存**：写入 `config.json`；保存后会刷新「最后修改时间」。
- **未保存提示**：尝试切换到其它 tab 时若有未保存改动，弹出 `保存并切换 / 放弃修改 / 留在此页` 三选项。

### 顶部 Banner

- 自定义 `最小化 / 最大化 / 关闭` 按钮（替代系统默认）。
- 自定义 `项目 / 配置` Tab 切换。
- 应用 logo + 名称；窗口可拖拽（按钮区域不拖拽）。

### 自动更新

- 应用启动 5 秒后自动检查 GitHub Release，每小时再检查一次。
- 发现新版本时右下角弹出提示，点「下载」后展示进度；下载完成后点「重启安装」立即生效，
  不点也会在下次退出时自动安装。
- 仅打包后的应用启用更新检查；开发模式 (`npm run dev`) 不会触发请求。

---

## 项目判定与扫描

- **判定为项目**：文件夹下存在 `.git` 目录或 `package.json` 文件。
- **名称 / 简介**：优先取 `package.json` 的 `name` / `description`；否则用文件夹名，简介为空。
- **扫描算法**：广度优先（BFS）。
  - `paths` 是 root 列表，从每个 root 出发最多向下走 `depth` 层。
  - 命中 `exclude_paths`（绝对路径相等）则整棵子树跳过。
  - 命中项目（含 `.git` 或 `package.json`）则该路径不再下钻。
  - 自动忽略隐藏目录与 `node_modules`，避免无意义扫描。

> 例：`paths=["a"]`，`depth=1` → 只会扫描 `a/`、`a/aa/`、`a/bb/`，不会进入 `a/aa/aaa/`。

---

## 配置文件

**位置**：用户主目录下应用工作目录 `~/.project-helper/config.json`
（Windows 为 `%USERPROFILE%\.project-helper\config.json`）。

- 首次启动若不存在，会自动创建并写入默认模板。
- 兼容迁移：若发现旧版 `~/config.json`，会自动 rename 到新路径，避免历史用户配置丢失。

**字段**：

```json
{
  "paths": ["D:/work"],
  "depth": 1,
  "exclude_paths": ["D:/work/legacy"],
  "pinned": ["D:/work/my-favorite-project"]
}
```

| 字段            | 类型      | 说明                                       |
| --------------- | --------- | ------------------------------------------ |
| `paths`         | string[]  | 扫描根目录列表                             |
| `depth`         | number    | 扫描深度，0 - 5，默认 1                    |
| `exclude_paths` | string[]  | 排除目录列表，命中即跳过整棵子树           |
| `pinned`        | string[]  | 置顶项目绝对路径，扫描时会自动清理失效项   |

---

## 目录结构

```
project-helper/
├─ electron/
│  ├─ main.js           # 主进程：窗口、IPC、扫描、shell、自动更新
│  └─ preload.js        # 暴露给渲染层的安全 API
├─ src/renderer/
│  ├─ App.vue           # 根组件，含 tab 切换拦截
│  ├─ main.js
│  ├─ index.html
│  ├─ assets/           # 静态资源（应用 logo 等）
│  ├─ styles/global.css # 全局样式 / CSS 变量
│  ├─ components/
│  │   ├─ TopBanner.vue
│  │   ├─ ProjectCard.vue
│  │   ├─ ContextMenu.vue
│  │   ├─ ConfirmDialog.vue   # 两按钮通用确认弹窗
│  │   ├─ UnsavedDialog.vue   # 三按钮未保存提示
│  │   ├─ UpdateBanner.vue    # 右下角自动更新提示
│  │   ├─ NumberInput.vue
│  │   └─ Toast.vue
│  └─ pages/
│      ├─ ProjectsPage.vue
│      └─ SettingsPage.vue
├─ build/                       # 应用打包图标资源（icon.ico）
├─ .github/workflows/release.yml # 推送 v* tag 自动发布到 GitHub Release
├─ vite.config.js
├─ package.json
└─ README.md
```

---

## 开发

```bash
npm install
npm run dev
```

`dev` 会并发启动 Vite dev server（5173 端口）与 Electron。

## 打包

```bash
npm run build
```

生成 `release/` 目录，含 NSIS 安装包与可执行文件。
打包前请确保 `build/icon.ico`（Windows）等图标资源已就位（详见 `build/README.md`）。

## 发布与自动更新

仓库已接入 [`electron-updater`](https://www.electron.build/auto-update)，可通过 GitHub Release 进行自动更新。

### 一次性准备

- 确认 GitHub 仓库为 `BUILDY0/project-helper`（已写入 `package.json` 的 `build.publish`）。
- `build/icon.ico` 已就位，否则发布的安装包不会带图标。

### 发布新版本

1. 更新 `package.json` 的 `version`，提交并推送到主分支。
2. 打 tag 并推送：
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
3. GitHub Actions（`.github/workflows/release.yml`）会自动在 Windows runner 上跑 `npm run release`：
   - 构建 NSIS 安装包
   - 上传到 GitHub Release（草稿）
4. 进入仓库 Releases 页面，确认无误后点击 **Publish release**。

> 也可以本地手动发布：`set GH_TOKEN=ghp_xxx && npm run release`（需具备 repo 权限的 PAT）。

### 客户端更新流程

应用启动 5 秒后会自动检查 GitHub Release：

- **发现新版本**：右下角弹出提示，用户点「下载」后开始下载并显示进度。
- **下载完成**：提示「重启安装」，用户点击后立刻重启替换文件；不点也会在下次退出时自动安装。
- **检查失败**：右下角短暂显示错误信息后自动消失，不打扰主流程。

> Windows 不签名也能更新；首次双击安装会经过 SmartScreen 提示一次，后续 autoUpdater 内部下载更新无感。

---

## 依赖前提

- Windows 10 / 11（仅构建 Windows 版本）。
- 已安装 [VSCode](https://code.visualstudio.com/) 且 `code` 命令在 PATH 中
  （安装时勾选「添加到 PATH」即可）。
- 开发需要 Node.js ≥ 18。

---

## 设计取舍

- **最小依赖**：除 Electron / Vue / Vite 与必要工具链外，不引入额外 UI 框架；所有组件自定义实现。
- **持久化简单**：只用一份 JSON 文件，便于用户直接编辑或备份。
- **失效自愈**：pinned 路径在扫描与切换时自动清理，无需手动维护。
- **单进程通信**：所有跨进程能力都走 `ipcRenderer.invoke`，统一返回 `{ ok, message }` 形式，便于 UI 层做提示。
