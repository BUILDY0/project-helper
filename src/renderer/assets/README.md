# 渲染层静态资源

| 文件         | 用途                            |
| ------------ | ------------------------------- |
| `folder.png` | 顶部 banner 左上角应用 logo 图标 |

将图标命名为 **`folder.png`** 并放在本目录下（建议 256×256 透明背景）。
Vite 会通过 `import folderIcon from '../assets/folder.png'` 把它打包到产物中。
