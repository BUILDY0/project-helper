# FEATURE

> 排序规则：major → minor → patch。

| 状态 | 级别  | 标题                                   | 详情                                                                             |
| ---- | ----- | -------------------------------------- | -------------------------------------------------------------------------------- |
| ⬜   | major | 支持网络仓库搜索                       | 多仓库搜索/配置；clone 到本地；仅收藏                                            |
| ⬜   | major | 项目整体迁移 TS 框架开发               | V2版本，[`electron-vite`](https://electron-vite.org/) / `vite-electron-builder`  |
| ⬜   | minor | 支持分组（pinned 和其他区分）          | 平铺模式 / 分组模式（按 tag 分组，同个项目不同 tag 可以多次出现）                |
| ⬜   | minor | 支持 tag 筛选（pinned 和其他区分）     | 仅做筛选功能；单项目支持多 tag                                                   |
| ⬜   | minor | 支持默认打开方式配置                   | —                                                                                |
| ⬜   | minor | 支持添加自定义 IDE 启动命令            | —                                                                                |
| ⬜   | minor | 支持 license 状态图标                  | —                                                                                |
| ✅   | minor | 强制添加项目文件夹                     | —                                                                                |
| ⬜   | minor | Tray 场景开发                          | 关闭最小化在托盘；退出                                                           |
| ⬜   | minor | 安装包路径展示及打开清理               | —                                                                                |
| ✅   | minor | VitePress 使用文档及 GitHub Pages 部署 | —                                                                                |
| ⬜   | minor | 复制项目                               | 默认复制到同个父级文件夹 + 自动命名后缀                                          |
| ⬜   | minor | 重命名文件夹名                         | —                                                                                |
| ⬜   | minor | 指定项目名规则                         | `projectName` / `fileName` / `projectName > fileName` / `fileName > projectName` |
| ⬜   | minor | 收藏夹 Collection 功能                 | 本地 pinned 项目；网络上的收藏项目                                               |
| ⬜   | minor | 排序方式                               | 按文件名；按最新修改时间                                                         |
| ⬜   | minor | 支持 clone repo 的能力                 | —                                                                                |
| ⬜   | minor | 支持远程连接/网络仓库存储              | —                                                                                |
| ⬜   | minor | IDE 启动面板                           | mini drawer                                                                      |
| ✅   | patch | 安装包选项配置研究                     | —                                                                                |
| ✅   | patch | 开机自动运行                           | —                                                                                |
| ✅   | patch | 自动更新的配置                         | —                                                                                |
| ✅   | patch | 开发模式下增加 console 打开按钮        | —                                                                                |
| ✅   | patch | 多开限制                               | 只允许开一个 app                                                                 |
| ✅   | patch | 删除操作区分软删除/硬删除              | —                                                                                |
| ✅   | patch | 添加项目文件夹改为可多选               | —                                                                                |

# UX

| 状态 | 标题                               | 详情                                  |
| ---- | ---------------------------------- | ------------------------------------- |
| ✅   | 应用图标调整                       | 整体调大                              |
| ✅   | 右上角操作栏图标                   | 整体调大                              |
| ✅   | 卡片容器顶部加宽度                 | 修复 hover 效果导致卡片边缘溢出的问题 |
| ✅   | 滚动条距离底部及卡片区域有一定距离 | —                                     |
| ✅   | 气泡文案改为自定义组件             | 不再使用 title 的默认属性             |
| ✅   | Dark 主题开发                      | —                                     |
