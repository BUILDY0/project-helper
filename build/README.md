# 应用图标资源

`build/icon.png` 是项目唯一维护的 PNG 图标源图，会被复用于：

| 用途                          | 资源                                                               |
| ----------------------------- | ------------------------------------------------------------------ |
| 渲染层顶部 banner logo        | `@resources/icon.png`                                              |
| VitePress favicon / 导航 logo | `docs/public/logo.png`，由 `npm run prepare:assets` 同步生成       |
| Windows 安装包 / 窗口图标     | `build/icon.ico`，由 `npm run build:icon` 从 `build/icon.png` 生成 |

## 更新图标

替换 `build/icon.png` 即可。建议使用 1024×1024 透明背景 PNG。

执行以下命令同步派生资源：

```bash
npm run prepare:assets
npm run build:icon
```

日常执行 `npm run build` 或 `npm run release` 时会自动完成同步和 ICO 生成。
