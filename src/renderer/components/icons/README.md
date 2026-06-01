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

## 何时新增 / 不新增图标

**新增**：满足以下任一即可下沉到本目录：

- 在 ≥ 2 个文件中重复使用。
- 在某个文件里以 `v-if` 切换出现，把切换逻辑独立到调用方更清晰。
- 通过组件化能让调用方模板**显著瘦身**（≥ 10 行 svg 内联）。

**不新增**（保留在原组件内）：

- 仅在某个组件内部出现一次，且该组件本身就是该图标的"专用容器"。例如 `ThemeSwitch` 里的 sun/moon、`HelpCircleLink` 里的 GitHub/Docs logo —— 它们已经被语义化了，再多套一层反而冗余。

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

| 文件                  | 用途                    | 特殊点                            |
| --------------------- | ----------------------- | --------------------------------- |
| `icon-search.vue`     | 搜索框放大镜            | —                                 |
| `icon-arrow-up.vue`   | 回到顶部                | —                                 |
| `icon-refresh.vue`    | 刷新（顺时针圆弧+箭头） | 配合 `class="spin"` 旋转          |
| `icon-refresh-cw.vue` | 检查更新（C 形圆弧）    | 配合 `class="is-spinning"` 旋转   |
| `icon-github.vue`     | 卡片状态图标            | octicons 风格                     |
| `icon-node.vue`       | 卡片状态图标            | 固定品牌绿 `#83cd29`              |
| `icon-readme.vue`     | 卡片状态图标            | 双 path + group fill              |
| `icon-terminal.vue`   | DevTools 入口           | VSCode codicons                   |
| `icon-minimize.vue`   | 窗口最小化              | VSCode codicons (chrome-minimize) |
| `icon-maximize.vue`   | 窗口最大化              | VSCode codicons (chrome-maximize) |
| `icon-restore.vue`    | 窗口还原                | VSCode codicons (chrome-restore)  |
| `icon-close.vue`      | 窗口关闭                | VSCode codicons (chrome-close)    |
