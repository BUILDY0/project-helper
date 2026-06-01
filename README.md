# Project Helper

一个基于 **Vue 3 + Electron + Vite** 的开发项目本地管理器。

> 📖 在线文档：[https://buildy0.github.io/project-helper/](https://buildy0.github.io/project-helper/)

---

## 配置文件

**位置**：用户主目录下应用工作目录 `%USERPROFILE%\.project-helper\config.json`

`paths` 以对象数组保存扫描根目录；旧版 `string[]` 配置会在读取/保存时自动归一化为对象格式：

```json
{
  "paths": [
    {
      "path": "D:/work",
      "type": "SYSTEM",
      "cfg": {
        "forced": false
      }
    }
  ]
}
```

其中 `cfg.forced` 为 `true` 时，即使目录本身不包含 `.git` 或 `package.json`，扫描时也会强制作为项目命中。

> 完整字段说明见 [配置文档](https://buildy0.github.io/project-helper/guide/config.html)。

## 目录结构

```
project-helper/
├─ src/
│  ├─ main/                           # 主进程（Node 环境）
│  │  ├─ index.js                     # 入口：app 生命周期 + 模块装配
│  │  └─ modules/                     # 主进程领域模块
│  │      ├─ config-store.js          # 配置读写、pinned 管理、config:* / pin:toggle
│  │      ├─ system-bridge.js         # 窗口、对话框、shell、IDE 探测、剪贴板、属性框
│  │      ├─ project-scanner.js       # 项目识别 / meta 读取 / BFS 扫描 + projects:scan
│  │      └─ updater.js               # 自动更新 + updater:* / app:get-version
│  ├─ preload/                        # 预加载脚本（contextBridge 暴露 window.api）
│  │  └─ index.js
│  ├─ shared/                         # 主进程 / 渲染进程共享的纯 JS（'@shared' 别名指向此目录）
│  │  ├─ README.md                    # 编写约束 / 加载约定（require(ESM)）
│  │  ├─ path-types.js                # PathType 枚举 + BasePath/SystemPath 等路径类
│  │  └─ theme.js                     # 主题枚举与归一化函数
│  └─ renderer/                       # 渲染进程（Vue + Vite，'@' 别名指向此目录）
│     ├─ App.vue                      # 根组件，含 tab 切换拦截
│     ├─ main.js
│     ├─ index.html
│     ├─ assets/                      # 渲染层静态资源说明（应用 logo 统一从 build/icon.png 引用）
│     ├─ styles/
│     │   ├─ global.css                # 全局样式 / 公共 CSS 变量
│     │   ├─ themes.css                # 浅色 / 深色主题色定义
│     │   └─ tooltip.css               # 自定义 tooltip 指令样式
│     ├─ composables/                  # 跨页复用的组合式 API（use-xxx.js）
│     │   ├─ use-ides.js
│     │   └─ use-theme.js              # 主题切换（浅色/深色/跟随系统）
│     ├─ utils/                        # 跨页复用的纯函数（按需新增）
│     ├─ directives/
│     │   └─ tooltip.js                # v-tooltip 自定义指令（替代原生 title）
│     ├─ components/
│     │   ├─ business/                 # 跨页复用的业务组件
│     │   │   ├─ top-banner.vue
│     │   │   └─ update-banner.vue
│     │   ├─ common/                   # 跨页复用的通用 UI 组件
│     │   │   ├─ confirm-dialog.vue
│     │   │   ├─ context-menu.vue
│     │   │   ├─ help-circle-link.vue
│     │   │   ├─ inline-toggle.vue
│     │   │   ├─ number-input.vue
│     │   │   ├─ popconfirm.vue
│     │   │   ├─ switch-input.vue
│     │   │   ├─ theme-switch.vue
│     │   │   ├─ toast.vue
│     │   │   └─ unsaved-dialog.vue
│     │   └─ icons/                    # SVG 图标组件库（详见 README.md）
│     │       ├─ icon-*.vue
│     │       └─ README.md
│     └─ pages/                        # 路由级页面（详见 README.md）
│         ├─ README.md
│         ├─ projects/                 # 项目展示页
│         │   ├─ index.vue
│         │   ├─ components/
│         │   └─ composables/
│         └─ settings/                 # 配置页
│             ├─ index.vue
│             ├─ components/
│             └─ composables/
├─ docs/                              # VitePress 站点（GitHub Pages）
│  ├─ index.md                        # 首页
│  ├─ guide/                          # 使用指南
│  ├─ changelog/                      # 更新日志
│  ├─ public/                         # 站点静态资源（logo 由 npm run prepare:assets 同步生成）
│  └─ .vitepress/                     # 站点配置 / 主题 / 自定义组件
├─ build/                             # 应用图标源资源：icon.png + 生成的 icon.ico
├─ scripts/                           # 构建辅助脚本
│  └─ prepare-assets.js               # 同步统一图标资源到文档站并清理旧副本
├─ .husky/pre-commit                  # commit 前自动 prettier 格式化（lint-staged）
├─ .github/workflows/
│  ├─ release.yml                     # 推送 v* tag 自动构建并发布 GitHub Release
│  └─ deploy-docs.yml                 # 推送 v* tag 自动部署文档到 GitHub Pages
├─ feat.md                            # 开发功能规划清单
├─ jsconfig.json                      # 让 IDE 识别 '@' 别名
├─ vite.config.mjs
├─ package.json
├─ .prettierrc.json                   # Prettier 格式化规则
├─ .prettierignore
├─ .editorconfig
└─ README.md
```

---

## 依赖前提

- Windows 10 / 11（仅构建 Windows 版本）。
- 已安装 [VSCode](https://code.visualstudio.com/) 且 `code` 命令在 PATH 中
  （安装时勾选「添加到 PATH」即可）。
- 开发需要 Node.js ≥ 22（与 Electron 34 内嵌 Node 对齐；shared 模块依赖 `require(ESM)` 能力）。

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
应用 PNG 源图统一维护在 `build/icon.png`；构建时会自动生成 `build/icon.ico`，并同步文档站所需的 `docs/public/logo.png`。

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
