# utils

渲染层（renderer）通用**纯函数**集合。

## 适用条件

- 是纯函数（输入 → 输出，无副作用 / 无 Vue 依赖）。
- 被**两个或以上**页面 / 组件使用。

如果以上条件不满足：

- 仅本页用 → 写在 `pages/<page>/utils/` 内。
- 主进程也要用 → 升格到 `src/shared/`。
- 用到了 Vue 响应式 API → 它是 composable 而不是 util，放到 `composables/`。

## 命名

- 文件名 kebab-case：`format-time.js`、`path-helper.js`。
- 导出函数 camelCase：`export function formatTime(ms) { ... }`。

## 现有内容

| 文件             | 说明                                 |
| ---------------- | ------------------------------------ |
| `format-time.js` | 时间戳格式化为 `YYYY-MM-DD HH:mm:ss` |
