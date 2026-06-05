# icons

通用 SVG 图标组件库。每个图标一个独立的 `.vue` 文件，**按需 import**。

## 设计原则

- **每个图标一个文件**：随 import 即用，文件之间互不影响。
- **inline svg**：保留 `currentColor`、CSS 动画、`v-if` 切换等所有能力。
- **不引入构建插件**：纯 Vue 组件，无 svg loader / iconify 等额外依赖。
- **不写 `<style>`**：颜色、动画、定位都由调用方控制（例如 `<IconRefresh class="spin" />`）。

## 组件契约

每个图标组件都是这种最小骨架：

```vue
<template>
  <svg
    :width="size"
    :height="size"
    viewBox="..."
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="..." />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [Number, String], default: 14 }
})
</script>
```

约定：

- 文件名 kebab-case：`icon-search.vue`、`icon-arrow-up.vue`。
- 导入名 PascalCase：`import IconSearch from '@/components/icons/icon-search.vue'`。
- 统一只暴露 `size` 一个 prop（值为正方形宽高），如需异形通过 css 限制。
- 颜色优先使用 `fill="currentColor"`，跟随父级 `color`。带固定品牌色（如 Node.js 绿）则在 `<path fill="...">` 写死。
- `aria-hidden="true"`：装饰用图标默认对屏幕阅读器隐藏；如果是承担语义的图标，由调用方在外层 `<button :aria-label="...">` 上补语义。
- 默认 `size` 取该图标"最常见的展示尺寸"（窗口控制按钮通常 16，列表内嵌图标 14）。

## 何时新增图标

**所有 svg 都必须落在本目录**——业务/通用组件**不允许内联 svg**。无论该图标是否多处复用。

理由：

- 避免同一图标在多处分别维护 path（如 GitHub logo 在卡片状态图标和帮助链接里各写一份），不一致风险
- 业务组件模板更轻，关注点回归到布局/交互
- 主题色、动画、size 切换都靠 icon 组件统一封装，调用方仅决定"用哪个图标"

**例外**：仅当图标是组件内部高度耦合的"装饰元素"且不构成可识别图形（如分隔点、装饰小圆点），可保留内联。可识别的图标（GitHub、太阳、月亮、文档…）**一律下沉**。

## 笔触风格约定

- **优先 fill 实心**：`fill="currentColor"`，跟随父级 `color`，简单、易着色
- **stroke 描线**：少数图标设计上是描线风格（如 lucide 系的 sun / moon），保留 `stroke="currentColor" fill="none"` 写法即可，不必强行改为 fill
- 带固定品牌色（如 Node.js 绿）则在 `<path fill="...">` 写死

## 动画

动画交给调用方用 css 控制；本目录组件不内置任何 transition / animation。

### 写法 1：直接给图标加 class（推荐）

Vue scoped 会把组件根元素继承到子组件根 dom 上，所以**直接给 `<IconRefresh class="spin">` 加 class**，scoped 下的 `.spin { ... }` 选择器仍然有效。

```vue
<IconRefresh :size="14" :class="{ spin: loading }" />

<style scoped>
.spin {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
```

### 写法 2：通过父级状态间接控制 svg

如果动画选择器是后代选择器（`.btn.is-spinning svg { ... }`），由于子组件渲染的 svg 不携带父组件的 scope 属性，普通选择器**不会命中**。需要用 `:deep(svg)` 穿透：

```vue
<button class="btn" :class="{ 'is-spinning': checking }">
  <IconRefreshCw :size="16" />
</button>

<style scoped>
.btn.is-spinning :deep(svg) {
  animation: spin 1s linear infinite;
}
</style>
```

## 现有图标清单

| 文件                    | 用途                                   | 特殊点                            |
| ----------------------- | -------------------------------------- | --------------------------------- |
| `icon-search.vue`       | 搜索框放大镜                           | —                                 |
| `icon-arrow-up.vue`     | 回到顶部                               | —                                 |
| `icon-plus.vue`         | 新增扫描目录（项目页工具栏）           | fluent 实心加号                   |
| `icon-refresh.vue`      | 刷新（顺时针圆弧+箭头）                | 配合 `class="spin"` 旋转          |
| `icon-refresh-cw.vue`   | 检查更新（C 形圆弧）                   | 配合 `class="is-spinning"` 旋转   |
| `icon-github.vue`       | GitHub logo（卡片状态图标 / 帮助链接） | octicons 风格                     |
| `icon-docs.vue`         | 文档（帮助链接）                       | codicons book 风格                |
| `icon-sun.vue`          | 太阳（主题切换-浅色态）                | lucide 风格 stroke 描线           |
| `icon-moon.vue`         | 月亮（主题切换-深色态）                | lucide 风格 stroke 描线           |
| `icon-node.vue`         | 卡片状态图标                           | 固定品牌绿 `#83cd29`              |
| `icon-readme.vue`       | 卡片状态图标                           | 双 path + group fill              |
| `icon-terminal.vue`     | DevTools 入口                          | VSCode codicons                   |
| `icon-minimize.vue`     | 窗口最小化                             | VSCode codicons (chrome-minimize) |
| `icon-maximize.vue`     | 窗口最大化                             | VSCode codicons (chrome-maximize) |
| `icon-restore.vue`      | 窗口还原                               | VSCode codicons (chrome-restore)  |
| `icon-close.vue`        | 窗口关闭                               | VSCode codicons (chrome-close)    |
| `icon-info.vue`         | 关于弹窗入口                           | lucide 风格 stroke 描线           |
| `icon-copy.vue`         | 复制（ShellCode 复制按钮）             | lucide 风格 stroke 描线           |
| `icon-check.vue`        | 勾选（ShellCode 复制成功反馈）         | lucide 风格 stroke 描线           |
| `icon-edit.vue`         | 编辑（自定义 IDE 脚本表格操作）        | lucide 风格 stroke 描线           |
| `icon-trash.vue`        | 删除（自定义 IDE 脚本表格操作）        | lucide 风格 stroke 描线           |
| `icon-chevron-up.vue`   | 上移（自定义 IDE 脚本表格操作）        | lucide 风格 stroke 描线           |
| `icon-chevron-down.vue` | 下移（自定义 IDE 脚本表格操作）        | lucide 风格 stroke 描线           |
