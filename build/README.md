# 应用打包图标

仅构建 Windows 版本，把图标放在本目录下，`electron-builder` 会在打包时自动使用：

| 平台    | 文件名     | 推荐规格                                      |
| ------- | ---------- | --------------------------------------------- |
| Windows | `icon.ico` | 多尺寸 ICO，至少包含 256 / 128 / 64 / 32 / 16 |

## 一键生成

把原图另存为 1024×1024 透明背景的 `icon.png` 后任选其一：

1. 在线工具：https://icoconvert.com / https://cloudconvert.com/png-to-ico
2. CLI（需 Node 环境）：
   ```bash
   npx png-to-ico icon.png > icon.ico
   ```

放好后执行 `npm run build` 即可生成带自定义图标的 .exe 安装包。
