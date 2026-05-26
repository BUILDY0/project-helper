# Project Helper

一个基于 **Vue 3 + Electron + Vite** 的开发项目本地管理器。

> 📖 在线文档：<https://buildy0.github.io/project-helper/>

---

## 配置文件

**位置**：用户主目录下应用工作目录 `%USERPROFILE%\.project-helper\config.json`

**字段**：

```json
{
  "paths": ["D:/work"],
  "depth": 1,
  "exclude_paths": ["D:/work/legacy"],
  "pinned": ["D:/work/my-favorite-project"]
}
```

| 字段            | 类型     | 说明                                     |
| --------------- | -------- | ---------------------------------------- |
| `paths`         | string[] | 扫描根目录列表                           |
| `depth`         | number   | 扫描深度，0 - 5，默认 1                  |
| `exclude_paths` | string[] | 排除目录列表，命中即跳过整棵子树         |
| `pinned`        | string[] | 置顶项目绝对路径，扫描时会自动清理失效项 |

## 目录结构

```
project-helper/
├─ src/
│  ├─ main/                        # 主进程（Node 环境）
│  │  ├─ index.js                  # 入口：app 生命周期 + 模块装配
│  │  └─ modules/                  # 主进程领域模块
│  │      ├─ config-store.js       # 配置读写、pinned 管理、config:* / pin:toggle
│  │      ├─ system-bridge.js      # 窗口、对话框、shell、IDE 探测、剪贴板、属性框
│  │      ├─ project-scanner.js    # 项目识别 / meta 读取 / BFS 扫描 + projects:scan
│  │      └─ updater.js            # 自动更新 + updater:* / app:get-version
│  ├─ preload/                     # 预加载脚本（contextBridge 暴露 window.api）
│  │  └─ index.js
│  └─ renderer/                    # 渲染进程（Vue + Vite）
│     ├─ App.vue                   # 根组件，含 tab 切换拦截
│     ├─ main.js
│     ├─ index.html
│     ├─ assets/                   # 静态资源（应用 logo 等）
│     ├─ styles/global.css         # 全局样式 / CSS 变量
│     ├─ components/
│     │   ├─ TopBanner.vue
│     │   ├─ ProjectCard.vue
│     │   ├─ ContextMenu.vue
│     │   ├─ ConfirmDialog.vue     # 两按钮通用确认弹窗
│     │   ├─ UnsavedDialog.vue     # 三按钮未保存提示
│     │   ├─ UpdateBanner.vue      # 右下角自动更新提示
│     │   ├─ NumberInput.vue
│     │   └─ Toast.vue
│     └─ pages/
│         ├─ ProjectsPage.vue
│         └─ SettingsPage.vue
├─ docs/                           # VitePress 站点（GitHub Pages）
├─ build/                          # 应用打包图标资源（icon.ico）
├─ .github/workflows/release.yml   # 推送 v* tag 自动发布到 GitHub Release
├─ vite.config.js
├─ package.json
└─ README.md
```

---

## 依赖前提

- Windows 10 / 11（仅构建 Windows 版本）。
- 已安装 [VSCode](https://code.visualstudio.com/) 且 `code` 命令在 PATH 中
  （安装时勾选「添加到 PATH」即可）。
- 开发需要 Node.js ≥ 18。

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
打包前请确保 `build/icon.png` 图标资源已就位（详见 `build/README.md`）。

## 发布与自动更新

仓库已接入 [`electron-updater`](https://www.electron.build/auto-update)，可通过 GitHub Release 进行自动更新。

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

应用启动 5 秒后会自动检查 GitHub Release，每小时再检查一次：

- **发现新版本**：右下角弹出提示，用户点「下载」后开始下载并显示进度。
- **下载完成**：提示「重启安装」，用户点击后立刻重启替换文件；不点也会在下次退出时自动安装。
- **检查失败**：右下角短暂显示错误信息后自动消失，不打扰主流程。

> Windows 不签名也能更新；首次双击安装会经过 SmartScreen 提示一次，后续 autoUpdater 内部下载更新无感。

---

## 第三方资源

- 按钮图标部分来自[microsoft/vscode-codicons](https://github.com/microsoft/vscode-codicons)，版权归 Microsoft 所有，遵循[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 协议。
